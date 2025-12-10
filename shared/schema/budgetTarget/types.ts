import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { budgetsTarget } from "./tables";

// Select型（データベースから取得する型）
export const selectBudgetTargetSchema = createSelectSchema(budgetsTarget);
export type BudgetTarget = z.infer<typeof selectBudgetTargetSchema>;

// Insert型（データベースに挿入する型）
export const insertBudgetTargetSchema = createInsertSchema(budgetsTarget, {
  fiscalYear: z.number().int().min(2000).max(2100),
  serviceType: z.string().min(1, "サービス区分を入力してください"),
  analysisType: z.enum(["生産性", "粗利"], {
    errorMap: () => ({ message: "分析区分は「生産性」または「粗利」を選択してください" }),
  }),
  targetValue: z.string().min(1, "目標値を入力してください"),
  remarks: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type NewBudgetTarget = z.infer<typeof insertBudgetTargetSchema>;

// 更新用型
export type UpdateBudgetTarget = Partial<NewBudgetTarget>;

// ダッシュボード用型定義
export interface DashboardData {
  fiscalYear: number;
  revenueBudget: number;      // 売上予算合計
  revenueActual: number;       // 売上実績合計
  expenseBudget: number;       // 原価・販管費予算合計
  expenseActual: number;       // 原価・販管費実績合計
  profitBudget: number;        // 利益（予算）
  profitActual: number;        // 利益（実績）
  profitMarginBudget: number;  // 利益率（予算）
  profitMarginActual: number;  // 利益率（実績）
  costRateBudget: number;     // 原価率（予算）
  costRateActual: number;     // 原価率（実績）
}

export interface DashboardResponse {
  success: boolean;
  data: DashboardData;
}

// サービス毎の売上予実比較用型定義
export interface ServiceRevenueComparison {
  serviceType: string;
  revenueBudget: number;
  revenueActual: number;
  difference: number;
  achievementRate: number;
}

export interface DashboardServiceComparisonResponse {
  success: boolean;
  data: ServiceRevenueComparison[];
}

