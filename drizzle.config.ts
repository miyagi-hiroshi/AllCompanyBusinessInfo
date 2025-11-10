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
  // tablesFilterを削除し、app-schema.tsに定義されたテーブルのみを管理対象とする
  // app-schema.tsにはappスキーマのテーブルのみが定義されているため、
  // publicスキーマのテーブルは削除対象として認識されない
});
