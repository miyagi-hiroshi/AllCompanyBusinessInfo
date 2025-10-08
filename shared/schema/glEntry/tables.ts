import { sql } from "drizzle-orm";
import { date, decimal, pgTable, text, timestamp,varchar } from "drizzle-orm/pg-core";

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
