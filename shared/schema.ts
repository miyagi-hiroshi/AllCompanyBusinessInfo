import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, date, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// 取引先マスタ (Customer Master)
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// 品目マスタ (Item Master)
export const items = pgTable("items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertItemSchema = createInsertSchema(items).omit({ id: true, createdAt: true });
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof items.$inferSelect;

// プロジェクトマスタ (Project Master)
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// 計上科目マスタ (Accounting Item Master)
export const accountingItems = pgTable("accounting_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAccountingItemSchema = createInsertSchema(accountingItems).omit({ id: true, createdAt: true });
export type InsertAccountingItem = z.infer<typeof insertAccountingItemSchema>;
export type AccountingItem = typeof accountingItems.$inferSelect;

// 受発注データ (Order/Sales Forecast Data)
export const orderForecasts = pgTable("order_forecasts", {
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
  remarks: text("remarks"),
  period: text("period").notNull(), // 期間 (YYYY-MM形式)
  reconciliationStatus: text("reconciliation_status").notNull().default("unmatched"), // matched, fuzzy, unmatched
  glMatchId: varchar("gl_match_id"), // 突合されたGL IDへの参照
  version: integer("version").notNull().default(1), // 楽観ロック用
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrderForecastSchema = createInsertSchema(orderForecasts).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  version: true,
  reconciliationStatus: true,
  glMatchId: true,
}).extend({
  accountingPeriod: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.string().or(z.number()),
  period: z.string().regex(/^\d{4}-\d{2}$/),
});

export type InsertOrderForecast = z.infer<typeof insertOrderForecastSchema>;
export type OrderForecast = typeof orderForecasts.$inferSelect;

// GLデータ (General Ledger Data)
export const glEntries = pgTable("gl_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  voucherNo: text("voucher_no").notNull(), // 伝票番号
  transactionDate: date("transaction_date").notNull(), // 取引日
  accountCode: text("account_code").notNull(), // 勘定科目コード
  accountName: text("account_name").notNull(), // 勘定科目名
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(), // 金額
  debitCredit: text("debit_credit").notNull(), // 借方/貸方 (debit/credit)
  description: text("description"),
  period: text("period").notNull(), // 期間 (YYYY-MM形式)
  reconciliationStatus: text("reconciliation_status").notNull().default("unmatched"), // matched, fuzzy, unmatched
  orderMatchId: varchar("order_match_id"), // 突合された受発注IDへの参照
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGLEntrySchema = createInsertSchema(glEntries).omit({ 
  id: true, 
  createdAt: true,
  reconciliationStatus: true,
  orderMatchId: true,
}).extend({
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.string().or(z.number()),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  debitCredit: z.enum(["debit", "credit"]),
});

export type InsertGLEntry = z.infer<typeof insertGLEntrySchema>;
export type GLEntry = typeof glEntries.$inferSelect;

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

export type ReconciliationLog = typeof reconciliationLogs.$inferSelect;

// フロントエンド用の型定義
export type ReconciliationResult = {
  orderForecastId: string;
  glEntryId: string;
  matchType: "exact" | "fuzzy";
  confidence: number; // 0-100
  dateDiff?: number; // 日付差分（日数）
  amountDiff?: number; // 金額差分
};

export type ReconciliationSummary = {
  period: string;
  totalOrders: number;
  totalGLEntries: number;
  matchedCount: number;
  fuzzyMatchedCount: number;
  unmatchedOrderCount: number;
  unmatchedGLCount: number;
  executedAt: Date;
};
