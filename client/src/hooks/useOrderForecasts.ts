import type { NewOrderForecast,OrderForecast } from "@shared/schema";
import { useMutation,useQuery } from "@tanstack/react-query";

import { apiRequest, queryClient } from "@/lib/queryClient";

export interface OrderForecastFilter {
  fiscalYear: number;
  month?: number;
  projectId?: string;
  salesPerson?: string;
  accountingItem?: string;
  customerId?: string;
  searchText?: string;
  reconciliationStatus?: 'matched' | 'fuzzy' | 'unmatched';
}

export function useOrderForecasts(filter: OrderForecastFilter) {
  const params = new URLSearchParams();
  
  // 会計年度と月から計上年月を生成してフィルタリング
  if (filter.month) {
    // 月が指定されている場合は、その月の計上年月で絞り込み
    // 会計年度: 4月～翌年3月
    const year = filter.month >= 4 ? filter.fiscalYear : filter.fiscalYear + 1;
    const accountingPeriod = `${year}-${String(filter.month).padStart(2, "0")}`;
    params.append("accountingPeriod", accountingPeriod);
  }
  
  if (filter.projectId) {params.append("projectId", filter.projectId);}
  if (filter.salesPerson) {params.append("salesPerson", filter.salesPerson);}
  if (filter.accountingItem) {params.append("accountingItem", filter.accountingItem);}
  if (filter.customerId) {params.append("customerId", filter.customerId);}
  if (filter.searchText) {params.append("searchText", filter.searchText);}
  if (filter.reconciliationStatus) {params.append("reconciliationStatus", filter.reconciliationStatus);}
  
  return useQuery<OrderForecast[]>({
    // Use scalar segments for stable cache keys
    queryKey: [
      "/api/order-forecasts", 
      filter.fiscalYear, 
      filter.month ?? null, 
      filter.projectId ?? null,
      filter.salesPerson ?? null,
      filter.accountingItem ?? null,
      filter.customerId ?? null,
      filter.searchText ?? null,
      filter.reconciliationStatus ?? null,
    ],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/order-forecasts?${params}`, undefined);
      const result = await res.json();
      return result.data?.items || [];
    },
    enabled: !!filter.fiscalYear,
  });
}

export function useCreateOrderForecast() {
  return useMutation({
    mutationFn: async (data: NewOrderForecast & { filter: OrderForecastFilter }) => {
      const { filter: _filter, ...orderData } = data;
      const res = await apiRequest("POST", "/api/order-forecasts", orderData);
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate all order forecast queries (prefix matching)
      void queryClient.invalidateQueries({ 
        queryKey: ["/api/order-forecasts"] 
      });
    },
  });
}

export function useUpdateOrderForecast() {
  return useMutation({
    mutationFn: async ({ 
      id, 
      data,
      filter: _filter
    }: { 
      id: string; 
      data: Partial<OrderForecast>;
      filter: OrderForecastFilter;
    }) => {
      const res = await apiRequest("PUT", `/api/order-forecasts/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate all order forecast queries (prefix matching)
      void queryClient.invalidateQueries({ 
        queryKey: ["/api/order-forecasts"] 
      });
    },
  });
}

export function useDeleteOrderForecast() {
  return useMutation({
    mutationFn: async ({ id, filter: _filter }: { id: string; filter: OrderForecastFilter }) => {
      const res = await apiRequest("DELETE", `/api/order-forecasts/${id}`, undefined);
      // DELETE returns 204 No Content, so no JSON to parse
      return res.ok;
    },
    onSuccess: () => {
      // Invalidate all order forecast queries (prefix matching)
      void queryClient.invalidateQueries({ 
        queryKey: ["/api/order-forecasts"] 
      });
    },
  });
}
