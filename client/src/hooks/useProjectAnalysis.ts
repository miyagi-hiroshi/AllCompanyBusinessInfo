import { useQuery } from "@tanstack/react-query";

import { authErrorHandler } from "@/lib/authErrorHandler";
import { apiRequest } from "@/lib/queryClient";

export interface ProjectAnalysisSummary {
  id: string;
  code: string;
  name: string;
  serviceType: string;
  analysisType: string;
  revenue: number; // 売上（510-519）
  costOfSales: number; // 売上原価（期首製品棚卸高 + 期首商品棚卸高 + 仕入高 - 期末製品棚卸高 - 期末商品棚卸高）
  sgaExpenses: number; // 販管費（727,737,740,745,9999）
  workHours: number; // 山積み工数
  productivity?: number; // 生産性（分析区分=生産性の場合）
  grossProfit?: number; // 粗利（分析区分=粗利の場合）
  targetValue?: number; // 目標値
}

export interface ProjectAnalysisResponse {
  success: boolean;
  data: {
    projects: ProjectAnalysisSummary[];
  };
}

/**
 * プロジェクト分析サマリー取得フック
 *
 * @param fiscalYear - 年度
 * @returns プロジェクト分析サマリーのクエリ結果
 */
export function useProjectAnalysis(fiscalYear: number) {
  return useQuery<ProjectAnalysisResponse>({
    queryKey: ["/api/projects/analysis-summary", fiscalYear],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/projects/analysis-summary?fiscalYear=${fiscalYear}`,
        undefined
      );
      return await res.json();
    },
    enabled: !!fiscalYear,
  });
}

export interface ProjectAnalysisDetailLine {
  accountingItem: string;
  accountingPeriod: string;
  description: string;
  amount: string;
}

export interface ProjectAnalysisDetailLinesResponse {
  success: boolean;
  data: {
    lines: ProjectAnalysisDetailLine[];
  };
}

/**
 * プロジェクト分析の集計元明細取得フック
 *
 * @param projectId - プロジェクトID（null の場合は取得しない）
 * @param fiscalYear - 年度
 * @param category - カテゴリ（revenue / costOfSales / sgaExpenses）
 */
export function useProjectAnalysisDetailLines(
  projectId: string | null,
  fiscalYear: number,
  category: "revenue" | "costOfSales" | "sgaExpenses" | null
) {
  return useQuery<ProjectAnalysisDetailLinesResponse>({
    queryKey: ["/api/projects/analysis-summary/detail-lines", projectId, fiscalYear, category],
    queryFn: async () => {
      const params = new URLSearchParams({
        fiscalYear: String(fiscalYear),
        projectId: projectId!,
        category: category!,
      });
      const res = await fetch(
        `/api/projects/analysis-summary/detail-lines?${params}`,
        { credentials: "include", cache: "no-store" }
      );
      if (res.status === 401) {
        authErrorHandler.handleResponseError(res);
        throw new Error("認証が必要です");
      }
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? res.statusText);
      }
      return await res.json();
    },
    enabled: !!projectId && !!fiscalYear && !!category,
  });
}
