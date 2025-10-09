import { sql } from "drizzle-orm";
import { decimal, integer, pgSchema, text, timestamp, varchar } from "drizzle-orm/pg-core";

// appスキーマを定義
const appSchema = pgSchema("app");

// 販管費予算データ (Expense Budget Data)
export const budgetsExpense = appSchema.table("budgets_expense", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fiscalYear: integer("fiscal_year").notNull(), // 年度 (例: 2024, 2025)
  accountingItem: text("accounting_item").notNull(), // 科目
  budgetAmount: decimal("budget_amount", { precision: 14, scale: 2 }).notNull(), // 予算額
  remarks: text("remarks"), // 備考
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

