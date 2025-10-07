import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";

// 突合ログ (Reconciliation Log)
export const reconciliationLogs = pgTable("reconciliation_logs", {
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
