import type { DashboardResponse, DashboardServiceComparisonResponse } from "@shared/schema/budgetTarget/types";
import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "@/lib/queryClient";

export function useDashboard(fiscalYear: number) {
  return useQuery<DashboardResponse>({
    queryKey: ['/api/dashboard', fiscalYear],
    queryFn: async () => {
      const params = new URLSearchParams({
        fiscalYear: fiscalYear.toString()
      });
      
      const res = await apiRequest(
        "GET",
        `/api/dashboard?${params}`,
        undefined
      );
      return await res.json();
    },
    enabled: !!fiscalYear
  });
}

export function useServiceRevenueComparison(fiscalYear: number) {
  return useQuery<DashboardServiceComparisonResponse>({
    queryKey: ['/api/dashboard/service-comparison', fiscalYear],
    queryFn: async () => {
      const params = new URLSearchParams({
        fiscalYear: fiscalYear.toString()
      });
      
      const res = await apiRequest(
        "GET",
        `/api/dashboard/service-comparison?${params}`,
        undefined
      );
      return await res.json();
    },
    enabled: !!fiscalYear
  });
}
