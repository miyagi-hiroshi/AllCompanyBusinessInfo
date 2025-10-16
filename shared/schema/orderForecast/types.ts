export interface AccountingItemMonthlySummary {
  code: string;
  name: string;
  category: 'revenue' | 'costOfSales' | 'sgaExpenses';
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
