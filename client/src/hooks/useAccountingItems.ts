import type { AccountingItem } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "@/lib/queryClient";

export interface AccountingItemFilter {
  search?: string;
  code?: string;
  name?: string;
  excludeRevenueCodes?: boolean; // 510-519の売上系コードを除外するかどうか
}

export function useAccountingItems(filter?: AccountingItemFilter) {
  const params = new URLSearchParams();
  if (filter?.search) {
    params.append("search", filter.search);
  }
  if (filter?.code) {
    params.append("code", filter.code);
  }
  if (filter?.name) {
    params.append("name", filter.name);
  }
  
  const queryString = params.toString();
  
  return useQuery<{ items: AccountingItem[]; total: number }>({
    queryKey: ["/api/accounting-items", filter?.search ?? null, filter?.code ?? null, filter?.name ?? null, filter?.excludeRevenueCodes ?? false],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounting-items${queryString ? `?${queryString}` : ""}`, undefined);
      const result = await res.json();
      
      let items = result.data?.items || [];
      
      // 売上系コード（510-519）を除外する場合
      if (filter?.excludeRevenueCodes) {
        items = items.filter((item: AccountingItem) => {
          const code = parseInt(item.code);
          return !(code >= 510 && code <= 519);
        });
      }
      
      return {
        items,
        total: result.data?.total || 0,
      };
    },
  });
}
