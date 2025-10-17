import type { AccountingItem,Customer, Item, Project } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "@/lib/queryClient";

// 従業員型定義
export interface Employee {
  id: number;
  employeeId: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  departmentId: number | null;
  status: string | null;
}

export function useCustomers() {
  return useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/customers", undefined);
      const result = await res.json();
      return result.data?.items || [];
    },
  });
}

export function useItems() {
  return useQuery<Item[]>({
    queryKey: ["/api/items"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/items", undefined);
      const result = await res.json();
      return result.data?.items || [];
    },
  });
}

export function useProjects(fiscalYear?: number) {
  return useQuery<Project[]>({
    queryKey: ["/api/projects", fiscalYear],
    queryFn: async () => {
      // 件数制限を1000に設定して全件取得
      const url = fiscalYear ? `/api/projects?fiscalYear=${fiscalYear}&limit=1000` : "/api/projects?limit=1000";
      const res = await apiRequest("GET", url, undefined);
      const result = await res.json();
      return result.data?.items || [];
    },
  });
}

export function useAccountingItems() {
  return useQuery<AccountingItem[]>({
    queryKey: ["/api/accounting-items"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/accounting-items", undefined);
      const result = await res.json();
      return result.data?.items || [];
    },
  });
}

export function useEmployees() {
  return useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/employees", undefined);
      const result = await res.json();
      return result.data?.items || [];
    },
  });
}
