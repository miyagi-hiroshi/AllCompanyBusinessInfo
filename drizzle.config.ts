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
  // appスキーマのテーブルのみを明示的に管理対象とする
  // publicスキーマのテーブルは除外される
  tablesFilter: [
    "app.customers",
    "app.items",
    "app.projects",
    "app.accounting_items",
    "app.order_forecasts",
    "app.gl_entries",
    "app.reconciliation_logs",
    "app.angle_b_forecasts",
    "app.budgets_revenue",
    "app.budgets_expense",
    "app.budgets_target",
    "app.staffing",
    "app.sessions",
  ],
});
