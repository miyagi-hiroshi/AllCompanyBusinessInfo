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


