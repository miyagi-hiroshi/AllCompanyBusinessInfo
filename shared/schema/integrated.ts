import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import * as accountingItems from "./accountingItem";
import * as angleBForecasts from "./angleBForecast";
import * as budgetsExpense from "./budgetExpense";
import * as budgetsRevenue from "./budgetRevenue";
// import * as businessRelations from "./business/relations"; // 未使用のためコメントアウト
// 新規業務データスキーマ
import * as customers from "./customer";
// 既存システムのテーブル（参照専用）
import * as existing from "./existing";
// リレーション定義
// import * as existingRelations from "./existing/relations"; // 未使用のためコメントアウト
import * as glEntries from "./glEntry";
import * as items from "./item";
import * as orderForecasts from "./orderForecast";
import * as projects from "./project";
import * as reconciliationLogs from "./reconciliationLog";
import * as staffing from "./staffing";

// 統合スキーマ
export const schema = {
  // 既存システムのテーブル（参照専用）
  ...existing,
  
  // 新規業務データスキーマ
  ...customers,
  ...items,
  ...projects,
  ...accountingItems,
  ...orderForecasts,
  ...glEntries,
  ...reconciliationLogs,
  ...angleBForecasts,
  ...budgetsRevenue,
  ...budgetsExpense,
  ...staffing,
};

// 既存システムのテーブル（参照専用）
export * from "./existing";

// 新規業務データスキーマ
export * from "./accountingItem";
export * from "./angleBForecast";
export * from "./budgetExpense";
export * from "./budgetRevenue";
export * from "./customer";
export * from "./glEntry";
export * from "./item";
export * from "./orderForecast";
export * from "./project";
export * from "./reconciliationLog";
export * from "./staffing";

// リレーション定義
export * from "./business/relations";
export * from "./existing/relations";

// #region Zod Schemas for Tables
// 既存システムのスキーマ（参照専用）
export const selectUserSchema = createSelectSchema(existing.users);
export const selectEmployeeSchema = createSelectSchema(existing.employees);
export const selectDepartmentSchema = createSelectSchema(existing.departments);
export const selectSessionSchema = createSelectSchema(existing.sessions);

// 新規業務データスキーマ
export const insertCustomerSchema = createInsertSchema(customers.customers);
export const selectCustomerSchema = createSelectSchema(customers.customers);

export const insertItemSchema = createInsertSchema(items.items);
export const selectItemSchema = createSelectSchema(items.items);

export const insertProjectSchema = createInsertSchema(projects.projects);
export const selectProjectSchema = createSelectSchema(projects.projects);

export const insertAccountingItemSchema = createInsertSchema(accountingItems.accountingItems);
export const selectAccountingItemSchema = createSelectSchema(accountingItems.accountingItems);

export const insertOrderForecastSchema = createInsertSchema(orderForecasts.orderForecasts);
export const selectOrderForecastSchema = createSelectSchema(orderForecasts.orderForecasts);

export const insertGLEntrySchema = createInsertSchema(glEntries.glEntries);
export const selectGLEntrySchema = createSelectSchema(glEntries.glEntries);

export const insertReconciliationLogSchema = createInsertSchema(reconciliationLogs.reconciliationLogs);
export const selectReconciliationLogSchema = createSelectSchema(reconciliationLogs.reconciliationLogs);

export const insertAngleBForecastSchema = createInsertSchema(angleBForecasts.angleBForecasts);
export const selectAngleBForecastSchema = createSelectSchema(angleBForecasts.angleBForecasts);

export const insertBudgetRevenueSchema = createInsertSchema(budgetsRevenue.budgetsRevenue);
export const selectBudgetRevenueSchema = createSelectSchema(budgetsRevenue.budgetsRevenue);

export const insertBudgetExpenseSchema = createInsertSchema(budgetsExpense.budgetsExpense);
export const selectBudgetExpenseSchema = createSelectSchema(budgetsExpense.budgetsExpense);

export const insertStaffingSchema = createInsertSchema(staffing.staffing).extend({
  workHours: z.union([z.string(), z.number().transform(String)]),
  employeeId: z.union([z.string(), z.number().transform(String)]).optional().nullable(),
});
export const selectStaffingSchema = createSelectSchema(staffing.staffing);

// #endregion

// #region Inferred TypeScript Types
// 既存システムの型（参照専用）
export type User = z.infer<typeof selectUserSchema>;
export type Employee = z.infer<typeof selectEmployeeSchema>;
export type Department = z.infer<typeof selectDepartmentSchema>;
export type Session = z.infer<typeof selectSessionSchema>;

// 新規業務データの型
export type Customer = z.infer<typeof selectCustomerSchema>;
export type NewCustomer = z.infer<typeof insertCustomerSchema>;
export type CreateCustomerData = z.infer<typeof insertCustomerSchema>;
export type UpdateCustomerData = Partial<CreateCustomerData>;

export type Item = z.infer<typeof selectItemSchema>;
export type NewItem = z.infer<typeof insertItemSchema>;

export type Project = z.infer<typeof selectProjectSchema>;
export type NewProject = z.infer<typeof insertProjectSchema>;
export type CreateProjectData = z.infer<typeof insertProjectSchema>;
export type UpdateProjectData = Partial<CreateProjectData>;

export type AccountingItem = z.infer<typeof selectAccountingItemSchema>;
export type NewAccountingItem = z.infer<typeof insertAccountingItemSchema>;

export type OrderForecast = z.infer<typeof selectOrderForecastSchema>;
export type NewOrderForecast = z.infer<typeof insertOrderForecastSchema>;
export type CreateOrderForecastData = z.infer<typeof insertOrderForecastSchema>;
export type UpdateOrderForecastData = Partial<CreateOrderForecastData>;

export type GLEntry = z.infer<typeof selectGLEntrySchema>;
export type NewGLEntry = z.infer<typeof insertGLEntrySchema>;
export type CreateGLEntryData = z.infer<typeof insertGLEntrySchema>;
export type UpdateGLEntryData = Partial<CreateGLEntryData>;

export type ReconciliationLog = z.infer<typeof selectReconciliationLogSchema>;
export type NewReconciliationLog = z.infer<typeof insertReconciliationLogSchema>;

export type AngleBForecast = z.infer<typeof selectAngleBForecastSchema>;
export type NewAngleBForecast = z.infer<typeof insertAngleBForecastSchema>;
export type CreateAngleBForecastData = z.infer<typeof insertAngleBForecastSchema>;
export type UpdateAngleBForecastData = Partial<CreateAngleBForecastData>;

export type BudgetRevenue = z.infer<typeof selectBudgetRevenueSchema>;
export type NewBudgetRevenue = z.infer<typeof insertBudgetRevenueSchema>;
export type CreateBudgetRevenueData = z.infer<typeof insertBudgetRevenueSchema>;
export type UpdateBudgetRevenueData = Partial<CreateBudgetRevenueData>;

export type BudgetExpense = z.infer<typeof selectBudgetExpenseSchema>;
export type NewBudgetExpense = z.infer<typeof insertBudgetExpenseSchema>;
export type CreateBudgetExpenseData = z.infer<typeof insertBudgetExpenseSchema>;
export type UpdateBudgetExpenseData = Partial<CreateBudgetExpenseData>;

export type Staffing = z.infer<typeof selectStaffingSchema>;
export type NewStaffing = z.infer<typeof insertStaffingSchema>;
export type CreateStaffingData = z.infer<typeof insertStaffingSchema>;
export type UpdateStaffingData = Partial<CreateStaffingData>;

// #endregion

// #region フィルター型定義
export type CustomerFilter = {
  search?: string;
  code?: string;
  name?: string;
  status?: string;
};

export type ProjectFilter = {
  search?: string;
  code?: string;
  name?: string;
  fiscalYear?: number;
  customerId?: string;
  customerName?: string;
  salesPerson?: string;
  serviceType?: string;
  analysisType?: string;
};

export type OrderForecastFilter = {
  search?: string;
  projectId?: string;
  projectCode?: string;
  customerId?: string;
  customerCode?: string;
  accountingPeriod?: string;
  accountingItem?: string;
  period?: string;
  reconciliationStatus?: "matched" | "fuzzy" | "unmatched";
  createdByUserId?: string;
  createdByEmployeeId?: string;
};

export type GLEntryFilter = {
  search?: string;
  voucherNo?: string;
  transactionDateFrom?: string;
  transactionDateTo?: string;
  accountCode?: string;
  accountName?: string;
  debitCredit?: "debit" | "credit";
  period?: string;
  reconciliationStatus?: "matched" | "fuzzy" | "unmatched";
};

export type AngleBForecastFilter = {
  search?: string;
  projectId?: string;
  projectCode?: string;
  customerId?: string;
  customerCode?: string;
  accountingPeriod?: string;
  accountingItem?: string;
  period?: string;
  probability?: number;
  createdByUserId?: string;
  createdByEmployeeId?: string;
  salesPerson?: string;
  searchText?: string;
};

export type BudgetRevenueFilter = {
  fiscalYear?: number;
  serviceType?: string;
};

export type BudgetExpenseFilter = {
  fiscalYear?: number;
  accountingItem?: string;
};

export type StaffingFilter = {
  projectId?: string | string[];
  fiscalYear?: number;
  month?: number;
  employeeId?: string;
  employeeName?: string;
};

// #endregion

// #region フロントエンド用の型定義
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

// 既存システムとの関連を持つ業務データの型
export type OrderForecastWithUser = OrderForecast & {
  createdByUser?: User | null;
  createdByEmployee?: Employee | null;
};

export type ProjectWithCustomer = Project & {
  customer?: Customer | null;
};
// #endregion
