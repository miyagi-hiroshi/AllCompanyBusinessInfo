import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema/app-schema.ts", // 新規テーブルのみ
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // appスキーマのみを管理対象とする
  // publicスキーマのテーブルは管理対象外となり、削除対象として認識されない
  schemaFilter: ["app"],
  tablesFilter: ["app.*"],
});
