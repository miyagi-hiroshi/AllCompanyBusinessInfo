import { sql } from "drizzle-orm";
import { decimal, integer, pgSchema, text, timestamp, varchar } from "drizzle-orm/pg-core";

// appスキーマを定義
const appSchema = pgSchema("app");

// 売上予算データ (Revenue Budget Data)
export const budgetsRevenue = appSchema.table("budgets_revenue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fiscalYear: integer("fiscal_year").notNull(), // 年度 (例: 2024, 2025)
  serviceType: text("service_type").notNull(), // サービス区分
  budgetAmount: decimal("budget_amount", { precision: 14, scale: 2 }).notNull(), // 予算額
  remarks: text("remarks"), // 備考
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

