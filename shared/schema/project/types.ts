import { z } from "zod";

/**
 * プロジェクト分析サマリー型定義
 */
export interface ProjectAnalysisSummary {
  id: string;
  code: string;
  name: string;
  serviceType: string;
  analysisType: string;
  revenue: number;           // 売上（510-519）
  costOfSales: number;      // 仕入高（541）
  sgaExpenses: number;      // 販管費（727,737,740,745,9999）
  workHours: number;        // 山積み工数
  productivity?: number;    // 生産性（分析区分=生産性の場合）
  grossProfit?: number;     // 粗利（分析区分=粗利の場合）
}

/**
 * プロジェクト分析サマリー作成用スキーマ
 */
export const createProjectAnalysisSummarySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  serviceType: z.string(),
  analysisType: z.string(),
  revenue: z.number(),
  costOfSales: z.number(),
  sgaExpenses: z.number(),
  workHours: z.number(),
  productivity: z.number().optional(),
  grossProfit: z.number().optional(),
});

/**
 * プロジェクト分析サマリー型（Zodスキーマから生成）
 */
export type ProjectAnalysisSummaryType = z.infer<typeof createProjectAnalysisSummarySchema>;
