/**
 * プロジェクト分析の集計元明細1行
 */
export interface ProjectAnalysisDetailLine {
  accountingItem: string;
  accountingPeriod: string;
  description: string;
  amount: string;
}

export interface AccountingItemMonthlySummary {
  code: string;
  name: string;
  category: "revenue" | "costOfSales" | "sgaExpenses";
  monthlyAmounts: Record<string, number>;
}

export interface MonthlySummaryResponse {
  fiscalYear: number;
  months: string[];
  accountingItems: AccountingItemMonthlySummary[];
  summaries: {
    revenue: { monthlyTotals: Record<string, number> };
    costOfSales: { monthlyTotals: Record<string, number> };
    sgaExpenses: { monthlyTotals: Record<string, number> };
  };
}
