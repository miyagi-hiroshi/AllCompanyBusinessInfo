import type { DashboardResponse } from "@shared/schema/budgetTarget/types";
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
