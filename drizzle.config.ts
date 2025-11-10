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
  // schemaFilterとtablesFilterを削除
  // app-schema.tsに定義されたテーブルのみが管理対象となり、
  // publicスキーマのテーブルは削除対象として認識されない
});
