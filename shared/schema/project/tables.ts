import { sql } from "drizzle-orm";
import { integer, pgSchema, text, timestamp, varchar } from "drizzle-orm/pg-core";

// appスキーマを定義
const appSchema = pgSchema("app");

// プロジェクトマスタ (Project Master)
export const projects = appSchema.table("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  fiscalYear: integer("fiscal_year").notNull(), // 年度 (例: 2024, 2025)
  customerId: varchar("customer_id").notNull(), // 取引先ID
  customerName: text("customer_name").notNull(), // 取引先名
  salesPerson: text("sales_person").notNull(), // 営業担当者
  serviceType: text("service_type").notNull(), // サービス区分
  analysisType: text("analysis_type").notNull(), // 分析区分
  status: text("status").notNull().default("active"), // プロジェクトステータス (active, completed, cancelled)
  budget: text("budget"), // 予算
  actualCost: text("actual_cost"), // 実績コスト
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
