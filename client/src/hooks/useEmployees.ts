/**
 * 従業員マスタフック
 * 
 * 既存システムの従業員マスタからデータを取得
 */

import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "@/lib/queryClient";

export interface Employee {
  id: string;
  employeeId: string;
  userId: string;
  firstName: string;
  lastName: string;
  departmentId: number;
  status: string;
}

/**
 * アクティブな従業員一覧を取得
 */
export function useEmployees() {
  return useQuery({
    queryKey: ['/api/employees'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/employees", undefined);
      const result = await res.json();
      return result.data.items as Employee[];
    },
  });
}

