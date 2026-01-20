import { sql } from "drizzle-orm";
import { integer, jsonb, pgSchema, text, timestamp, varchar } from "drizzle-orm/pg-core";

// appスキーマを定義
const appSchema = pgSchema("app");

// プロジェクト分析スナップショット
export const projectAnalysisSnapshots = appSchema.table("project_analysis_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fiscalYear: integer("fiscal_year").notNull(), // 年度
  name: text("name").notNull(), // スナップショット名（ユーザー指定可能）
  snapshotData: jsonb("snapshot_data").notNull(), // 分析結果データ（JSON形式、フラット化済みデータ）
  createdByEmployeeId: varchar("created_by_employee_id").notNull(), // 作成者従業員ID
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

