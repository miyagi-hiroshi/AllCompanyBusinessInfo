import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { appSchema } from "../app-schema";

// 品目マスタ (Item Master)
export const items = appSchema.table("items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category"), // 品目カテゴリ（任意）
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
