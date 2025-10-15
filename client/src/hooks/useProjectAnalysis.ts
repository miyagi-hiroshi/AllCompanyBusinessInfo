import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "@/lib/queryClient";

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
    queryKey: ['/api/projects/analysis-summary', fiscalYear],
    queryFn: async () => {
      const res = await apiRequest(
        "GET", 
        `/api/projects/analysis-summary?fiscalYear=${fiscalYear}`, 
        undefined
      );
      return await res.json();
    },
    enabled: !!fiscalYear
  });
}
