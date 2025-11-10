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
  // appスキーマのテーブルのみを管理対象とする
  // publicスキーマのテーブルは明示的に除外し、削除対象として認識されない
  tablesFilter: ["app.*", "!public.*"],
});
