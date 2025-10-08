import { sql } from "drizzle-orm";
import { integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { appSchema } from "../app-schema";

// 突合ログ (Reconciliation Log)
export const reconciliationLogs = appSchema.table("reconciliation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  period: text("period").notNull(),
  executedAt: timestamp("executed_at").defaultNow().notNull(),
  matchedCount: integer("matched_count").notNull().default(0),
  fuzzyMatchedCount: integer("fuzzy_matched_count").notNull().default(0),
  unmatchedOrderCount: integer("unmatched_order_count").notNull().default(0),
  unmatchedGlCount: integer("unmatched_gl_count").notNull().default(0),
  totalOrderCount: integer("total_order_count").notNull().default(0),
  totalGlCount: integer("total_gl_count").notNull().default(0),
});
