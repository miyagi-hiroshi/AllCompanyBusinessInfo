import { neonConfig,Pool as NeonPool } from "@neondatabase/serverless";
import * as schema from "@shared/schema";
import dotenv from "dotenv";
import { drizzle as drizzleNeon, NeonDatabase } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg, NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import ws from "ws";

const { Pool: PgPool } = pg;
type PgPoolType = InstanceType<typeof PgPool>;

// 環境変数を読み込み
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

let pool: NeonPool | PgPoolType;
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
  
  // SSL設定: 開発環境ではSSL無効、本番環境ではSSL有効
  const sslConfig = process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false } // 本番環境ではSSLを有効にする
    : false; // 開発環境ではSSLを完全に無効にする

  pool = new PgPool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslConfig,
  });
  db = drizzlePg(pool, { schema });
}

export { db,pool };
