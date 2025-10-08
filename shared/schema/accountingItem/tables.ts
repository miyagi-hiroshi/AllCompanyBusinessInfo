import { sql } from "drizzle-orm";
import { pgSchema, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

// appスキーマを定義
const appSchema = pgSchema("app");

// 計上科目マスタ (Accounting Item Master)
export const accountingItems = appSchema.table("accounting_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
