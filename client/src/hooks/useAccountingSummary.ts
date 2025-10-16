import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "@/lib/queryClient";

export interface AccountingSummaryResponse {
  success: boolean;
  data: {
    fiscalYear: number;
    months: string[];
    accountingItems: Array<{
      code: string;
      name: string;
      category: 'revenue' | 'costOfSales' | 'sgaExpenses';
      monthlyAmounts: Record<string, number>;
    }>;
    summaries: {
      revenue: { monthlyTotals: Record<string, number> };
      costOfSales: { monthlyTotals: Record<string, number> };
      sgaExpenses: { monthlyTotals: Record<string, number> };
    };
  };
}

export function useAccountingSummary(fiscalYear: number) {
  return useQuery<AccountingSummaryResponse>({
    queryKey: ['/api/order-forecasts/monthly-summary', fiscalYear],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/order-forecasts/monthly-summary?fiscalYear=${fiscalYear}`,
        undefined
      );
      return await res.json();
    },
    enabled: !!fiscalYear
  });
}
