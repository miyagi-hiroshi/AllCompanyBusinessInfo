import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "@/lib/queryClient";

export interface SalesPersonSummaryResponse {
  success: boolean;
  data: {
    fiscalYear: number;
    salesPersons: string[];
    summaries: Array<{
      salesPerson: string;
      serviceType: string;
      analysisType: string;
      revenueWithAngleB: number;
      costOfSalesWithAngleB: number;
      grossProfitWithAngleB: number;
      revenueWithoutAngleB: number;
      costOfSalesWithoutAngleB: number;
      grossProfitWithoutAngleB: number;
    }>;
  };
}

export function useSalesPersonSummary(
  fiscalYear: number,
  includeAngleB: boolean = false,
  salesPersons?: string[]
) {
  return useQuery<SalesPersonSummaryResponse>({
    queryKey: ['/api/order-forecasts/sales-person-summary', fiscalYear, includeAngleB, salesPersons],
    queryFn: async () => {
      const params = new URLSearchParams({
        fiscalYear: fiscalYear.toString(),
        includeAngleB: includeAngleB.toString()
      });
      
      if (salesPersons && salesPersons.length > 0) {
        params.append('salesPersons', salesPersons.join(','));
      }
      
      const res = await apiRequest(
        "GET",
        `/api/order-forecasts/sales-person-summary?${params}`,
        undefined
      );
      return await res.json();
    },
    enabled: !!fiscalYear
  });
}

