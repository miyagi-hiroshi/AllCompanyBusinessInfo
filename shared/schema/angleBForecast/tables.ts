import { sql } from "drizzle-orm";
import { decimal, integer, pgSchema, text, timestamp, varchar } from "drizzle-orm/pg-core";

// appスキーマを定義
const appSchema = pgSchema("app");

// 角度B案件データ (Angle B Forecast Data)
export const angleBForecasts = appSchema.table("angle_b_forecasts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  projectCode: text("project_code").notNull(),
  projectName: text("project_name").notNull(),
  customerId: varchar("customer_id").notNull(),
  customerCode: text("customer_code").notNull(),
  customerName: text("customer_name").notNull(),
  accountingPeriod: text("accounting_period").notNull(), // 計上年月 (YYYY-MM形式)
  accountingItem: text("accounting_item").notNull(), // 計上科目
  description: text("description").notNull(), // 摘要文
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(), // 金額
  probability: integer("probability").notNull().default(50), // 確度（%）
  remarks: text("remarks"), // 備考
  period: text("period").notNull(), // 期間 (YYYY-MM形式)
  
  // 既存システムとの関連（参照専用、外部キー制約なし）
  createdByUserId: varchar("created_by_user_id"), // 作成者ユーザーID（参照専用）
  createdByEmployeeId: varchar("created_by_employee_id"), // 作成者従業員ID（参照専用）
  
  version: integer("version").notNull().default(1), // 楽観ロック用
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

