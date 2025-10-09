import { sql } from "drizzle-orm";
import { decimal, integer, pgSchema, text, timestamp, varchar } from "drizzle-orm/pg-core";

// appスキーマを定義
const appSchema = pgSchema("app");

// 配員計画データ (Staffing Plan Data)
export const staffing = appSchema.table("staffing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(), // プロジェクトID
  projectCode: text("project_code").notNull(), // プロジェクトコード
  projectName: text("project_name").notNull(), // プロジェクト名
  fiscalYear: integer("fiscal_year").notNull(), // 年度 (例: 2024, 2025)
  month: integer("month").notNull(), // 月 (1-12)
  employeeId: varchar("employee_id"), // 従業員ID（参照専用）
  employeeName: text("employee_name").notNull(), // 従業員名
  workHours: decimal("work_hours", { precision: 5, scale: 1 }).notNull(), // 工数（時間）
  remarks: text("remarks"), // 備考
  
  // 既存システムとの関連（参照専用、外部キー制約なし）
  createdByUserId: varchar("created_by_user_id"), // 作成者ユーザーID（参照専用）
  createdByEmployeeId: varchar("created_by_employee_id"), // 作成者従業員ID（参照専用）
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

