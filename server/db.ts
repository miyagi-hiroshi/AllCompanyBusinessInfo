import { drizzle as drizzleNeon, NeonDatabase } from "drizzle-orm/neon-serverless";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzlePg, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import ws from "ws";
import * as schema from "@shared/schema";
import dotenv from "dotenv";

// 環境変数を読み込み
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

let pool: NeonPool | PgPool;
let db: NeonDatabase<typeof schema> | NodePgDatabase<typeof schema>;

// Replit環境かどうかを判定 (REPL_IDの有無)
const isReplit = !!process.env.REPL_ID;

if (isReplit) {
  // Replit環境: Neon serverless driver を使用
  console.log("Running in Replit environment, using Neon driver.");
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = drizzleNeon({ client: pool as NeonPool, schema, logger: true });
} else {
  // ローカル開発環境 or 本番環境: 標準の pg driver を使用
  console.log("Running in local/production environment, using pg driver.");
  const sslConfig = process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false } // 本番環境ではSSLを有効にする
    : undefined; // ローカル開発環境ではSSLを無効にする

  pool = new PgPool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslConfig,
  });
  db = drizzlePg(pool as PgPool, { schema });
}

export { pool, db };
