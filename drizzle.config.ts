import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema/app-schema.ts", // appスキーマのテーブルのみを含む
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // publicスキーマのテーブルを明示的に除外
  // appスキーマのテーブルはapp-schema.tsに定義されているため、自動的に管理対象となる
  tablesFilter: ["!public.*"],
});
