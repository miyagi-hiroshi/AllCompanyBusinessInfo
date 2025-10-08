import { sql } from "drizzle-orm";
import { pgSchema, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

// appスキーマを定義
const appSchema = pgSchema("app");

// 取引先マスタ (Customer Master)
export const customers = appSchema.table("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
