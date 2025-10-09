import type { BudgetExpense, NewBudgetExpense } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";

import { apiRequest, queryClient } from "@/lib/queryClient";

export interface BudgetExpenseFilter {
  fiscalYear?: number;
  accountingItem?: string;
}

export function useBudgetsExpense(filter?: BudgetExpenseFilter) {
  const params = new URLSearchParams();
  if (filter?.fiscalYear) {
    params.append("fiscalYear", filter.fiscalYear.toString());
  }
  if (filter?.accountingItem) {
    params.append("accountingItem", filter.accountingItem);
  }
  
  const queryString = params.toString();
  
  return useQuery<BudgetExpense[]>({
    queryKey: ["/api/budgets/expense", filter?.fiscalYear ?? null, filter?.accountingItem ?? null],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/budgets/expense${queryString ? `?${queryString}` : ""}`, undefined);
      const result = await res.json();
      return result.data?.items || [];
    },
  });
}

export function useCreateBudgetExpense() {
  return useMutation({
    mutationFn: async (data: NewBudgetExpense) => {
      const res = await apiRequest("POST", "/api/budgets/expense", data);
      return await res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ 
        queryKey: ["/api/budgets/expense"] 
      });
    },
  });
}

export function useUpdateBudgetExpense() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NewBudgetExpense> }) => {
      const res = await apiRequest("PUT", `/api/budgets/expense/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ 
        queryKey: ["/api/budgets/expense"] 
      });
    },
  });
}

export function useDeleteBudgetExpense() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/budgets/expense/${id}`, undefined);
      return res.ok;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ 
        queryKey: ["/api/budgets/expense"] 
      });
    },
  });
}

