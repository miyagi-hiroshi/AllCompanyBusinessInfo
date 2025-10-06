import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { OrderForecast, InsertOrderForecast } from "@shared/schema";

export interface OrderForecastFilter {
  fiscalYear: number;
  month?: number;
  projectId?: string;
}

export function useOrderForecasts(filter: OrderForecastFilter) {
  const params = new URLSearchParams({
    fiscalYear: filter.fiscalYear.toString(),
  });
  if (filter.month) params.append('month', filter.month.toString());
  if (filter.projectId) params.append('projectId', filter.projectId);
  
  return useQuery<OrderForecast[]>({
    // Use scalar segments for stable cache keys
    queryKey: ["/api/order-forecasts", filter.fiscalYear, filter.month ?? null, filter.projectId ?? null],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/order-forecasts?${params}`, undefined);
      return res.json();
    },
    enabled: !!filter.fiscalYear,
  });
}

export function useCreateOrderForecast() {
  return useMutation({
    mutationFn: async (data: InsertOrderForecast & { filter: OrderForecastFilter }) => {
      const { filter, ...orderData } = data;
      const res = await apiRequest("POST", "/api/order-forecasts", orderData);
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate all order forecast queries (prefix matching)
      queryClient.invalidateQueries({ 
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
      filter
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
      queryClient.invalidateQueries({ 
        queryKey: ["/api/order-forecasts"] 
      });
    },
  });
}

export function useDeleteOrderForecast() {
  return useMutation({
    mutationFn: async ({ id, filter }: { id: string; filter: OrderForecastFilter }) => {
      const res = await apiRequest("DELETE", `/api/order-forecasts/${id}`, undefined);
      // DELETE returns 204 No Content, so no JSON to parse
      return res.ok;
    },
    onSuccess: () => {
      // Invalidate all order forecast queries (prefix matching)
      queryClient.invalidateQueries({ 
        queryKey: ["/api/order-forecasts"] 
      });
    },
  });
}
