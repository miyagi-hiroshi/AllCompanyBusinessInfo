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

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/projects", undefined);
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
      console.log('🔍 useEmployees - APIレスポンス:', result);
      console.log('🔍 useEmployees - items:', result.data?.items);
      return result.data?.items || [];
    },
  });
}
