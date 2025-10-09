import type { BudgetRevenue, NewBudgetRevenue } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";

import { apiRequest, queryClient } from "@/lib/queryClient";

export interface BudgetRevenueFilter {
  fiscalYear?: number;
  serviceType?: string;
}

export function useBudgetsRevenue(filter?: BudgetRevenueFilter) {
  const params = new URLSearchParams();
  if (filter?.fiscalYear) {
    params.append("fiscalYear", filter.fiscalYear.toString());
  }
  if (filter?.serviceType) {
    params.append("serviceType", filter.serviceType);
  }
  
  const queryString = params.toString();
  
  return useQuery<BudgetRevenue[]>({
    queryKey: ["/api/budgets/revenue", filter?.fiscalYear ?? null, filter?.serviceType ?? null],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/budgets/revenue${queryString ? `?${queryString}` : ""}`, undefined);
      const result = await res.json();
      return result.data?.items || [];
    },
  });
}

export function useCreateBudgetRevenue() {
  return useMutation({
    mutationFn: async (data: NewBudgetRevenue) => {
      const res = await apiRequest("POST", "/api/budgets/revenue", data);
      return await res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ 
        queryKey: ["/api/budgets/revenue"] 
      });
    },
  });
}

export function useUpdateBudgetRevenue() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NewBudgetRevenue> }) => {
      const res = await apiRequest("PUT", `/api/budgets/revenue/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ 
        queryKey: ["/api/budgets/revenue"] 
      });
    },
  });
}

export function useDeleteBudgetRevenue() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/budgets/revenue/${id}`, undefined);
      return res.ok;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ 
        queryKey: ["/api/budgets/revenue"] 
      });
    },
  });
}

