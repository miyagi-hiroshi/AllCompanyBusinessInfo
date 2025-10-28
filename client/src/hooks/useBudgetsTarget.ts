import type { BudgetTarget, BudgetTargetFilter,NewBudgetTarget } from "@shared/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/lib/queryClient";

// 目標値予算一覧取得
export function useBudgetsTarget(filter: BudgetTargetFilter = {}) {
  return useQuery<BudgetTarget[]>({
    queryKey: ["/api/budgets/target", filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter.fiscalYear) params.append("fiscalYear", filter.fiscalYear.toString());
      if (filter.serviceType) params.append("serviceType", filter.serviceType);
      if (filter.analysisType) params.append("analysisType", filter.analysisType);

      const response = await apiRequest("GET", `/api/budgets/target?${params}`, undefined);
      const result = await response.json();
      return result.data?.items || [];
    },
  });
}

// 目標値予算詳細取得
export function useBudgetTarget(id: string) {
  return useQuery<BudgetTarget>({
    queryKey: ["/api/budgets/target", id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/budgets/target/${id}`, undefined);
      const result = await response.json();
      return result.data;
    },
    enabled: !!id,
  });
}

// 目標値予算作成
export function useCreateBudgetTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: NewBudgetTarget) => {
      const response = await apiRequest("POST", "/api/budgets/target", data);
      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/budgets/target"] });
    },
  });
}

// 目標値予算更新
export function useUpdateBudgetTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NewBudgetTarget> }) => {
      const response = await apiRequest("PUT", `/api/budgets/target/${id}`, data);
      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/budgets/target"] });
    },
  });
}

// 目標値予算削除
export function useDeleteBudgetTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/budgets/target/${id}`, undefined);
      return response.ok;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/budgets/target"] });
    },
  });
}



