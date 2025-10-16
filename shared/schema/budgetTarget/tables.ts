import { sql } from "drizzle-orm";
import { decimal, integer, pgSchema, text, timestamp, varchar } from "drizzle-orm/pg-core";

// appスキーマを定義
const appSchema = pgSchema("app");

// 目標値予算データ (Target Budget Data)
export const budgetsTarget = appSchema.table("budgets_target", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fiscalYear: integer("fiscal_year").notNull(), // 年度 (例: 2024, 2025)
  serviceType: text("service_type").notNull(), // サービス区分
  analysisType: text("analysis_type").notNull(), // 分析区分（生産性/粗利）
  targetValue: decimal("target_value", { precision: 14, scale: 2 }).notNull(), // 目標値
  remarks: text("remarks"), // 備考
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


