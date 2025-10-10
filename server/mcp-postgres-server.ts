#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import pg from "pg";

const { Pool } = pg;

// 環境変数を読み込み
dotenv.config();

// データベース接続設定
const DATABASE_URL = process.env.DATABASE_URL;
const POSTGRES_SCHEMA = process.env.POSTGRES_SCHEMA || "public";

if (!DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is not set");
  process.exit(1);
}

// PostgreSQL接続プール
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : false,
});

// MCPサーバーの作成
const server = new Server(
  {
    name: `postgres-${POSTGRES_SCHEMA}`,
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 利用可能なツールの定義
const tools: Tool[] = [
  {
    name: "list_tables",
    description: `List all tables in the ${POSTGRES_SCHEMA} schema`,
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "describe_table",
    description: `Get detailed information about a table including columns, types, and constraints in the ${POSTGRES_SCHEMA} schema`,
    inputSchema: {
      type: "object",
      properties: {
        table_name: {
          type: "string",
          description: "Name of the table to describe",
        },
      },
      required: ["table_name"],
    },
  },
  {
    name: "execute_query",
    description: `Execute a SQL query (SELECT, INSERT, UPDATE, DELETE) in the ${POSTGRES_SCHEMA} schema`,
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "SQL query to execute",
        },
        params: {
          type: "array",
          description: "Optional parameters for parameterized queries",
          items: {
            type: ["string", "number", "boolean", "null"],
          },
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_table_schema",
    description: `Get the full schema information for a table including indexes and foreign keys in the ${POSTGRES_SCHEMA} schema`,
    inputSchema: {
      type: "object",
      properties: {
        table_name: {
          type: "string",
          description: "Name of the table",
        },
      },
      required: ["table_name"],
    },
  },
];

// ツール一覧を返すハンドラー
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// ツール実行ハンドラー
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_tables": {
        const result = await pool.query(
          `SELECT table_name, table_type 
           FROM information_schema.tables 
           WHERE table_schema = $1 
           ORDER BY table_name`,
          [POSTGRES_SCHEMA]
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.rows, null, 2),
            },
          ],
        };
      }

      case "describe_table": {
        const tableName = args?.table_name as string;
        if (!tableName) {
          throw new Error("table_name is required");
        }

        const result = await pool.query(
          `SELECT 
             column_name, 
             data_type, 
             is_nullable, 
             column_default,
             character_maximum_length
           FROM information_schema.columns 
           WHERE table_schema = $1 AND table_name = $2
           ORDER BY ordinal_position`,
          [POSTGRES_SCHEMA, tableName]
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.rows, null, 2),
            },
          ],
        };
      }

      case "get_table_schema": {
        const tableName = args?.table_name as string;
        if (!tableName) {
          throw new Error("table_name is required");
        }

        // カラム情報
        const columns = await pool.query(
          `SELECT 
             column_name, 
             data_type, 
             is_nullable, 
             column_default,
             character_maximum_length
           FROM information_schema.columns 
           WHERE table_schema = $1 AND table_name = $2
           ORDER BY ordinal_position`,
          [POSTGRES_SCHEMA, tableName]
        );

        // インデックス情報
        const indexes = await pool.query(
          `SELECT 
             indexname, 
             indexdef
           FROM pg_indexes 
           WHERE schemaname = $1 AND tablename = $2`,
          [POSTGRES_SCHEMA, tableName]
        );

        // 外部キー情報
        const foreignKeys = await pool.query(
          `SELECT
             tc.constraint_name,
             kcu.column_name,
             ccu.table_schema AS foreign_table_schema,
             ccu.table_name AS foreign_table_name,
             ccu.column_name AS foreign_column_name
           FROM information_schema.table_constraints AS tc
           JOIN information_schema.key_column_usage AS kcu
             ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
           JOIN information_schema.constraint_column_usage AS ccu
             ON ccu.constraint_name = tc.constraint_name
           WHERE tc.constraint_type = 'FOREIGN KEY'
             AND tc.table_schema = $1
             AND tc.table_name = $2`,
          [POSTGRES_SCHEMA, tableName]
        );

        const schema = {
          table_name: tableName,
          schema: POSTGRES_SCHEMA,
          columns: columns.rows,
          indexes: indexes.rows,
          foreign_keys: foreignKeys.rows,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(schema, null, 2),
            },
          ],
        };
      }

      case "execute_query": {
        const query = args?.query as string;
        const params = (args?.params as unknown[]) || [];

        if (!query) {
          throw new Error("query is required");
        }

        // スキーマを明示的に設定
        await pool.query(`SET search_path TO ${POSTGRES_SCHEMA}`);

        const result = await pool.query(query, params);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  rowCount: result.rowCount,
                  rows: result.rows,
                  command: result.command,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: errorMessage }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// サーバーの起動
async function main() {
  console.error(`Starting MCP PostgreSQL Server for schema: ${POSTGRES_SCHEMA}`);
  console.error(`Database: ${DATABASE_URL?.replace(/:[^:@]+@/, ':****@') ?? 'Not configured'}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // グレースフルシャットダウン
  process.on("SIGINT", async () => {
    console.error("Shutting down MCP server...");
    await pool.end();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.error("Shutting down MCP server...");
    await pool.end();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});


