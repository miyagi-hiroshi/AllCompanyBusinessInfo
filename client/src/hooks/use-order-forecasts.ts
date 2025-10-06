import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { OrderForecast, InsertOrderForecast } from "@shared/schema";

export function useOrderForecasts(period: string) {
  return useQuery<OrderForecast[]>({
    queryKey: ["/api/order-forecasts", period],
    enabled: !!period,
  });
}

export function useCreateOrderForecast() {
  return useMutation({
    mutationFn: async (data: InsertOrderForecast) => {
      const res = await apiRequest("POST", "/api/order-forecasts", data);
      return await res.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific period query
      queryClient.invalidateQueries({ 
        queryKey: ["/api/order-forecasts", variables.period] 
      });
    },
  });
}

export function useUpdateOrderForecast() {
  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: string; 
      data: Partial<OrderForecast> & { period: string } // Require period for cache invalidation
    }) => {
      const res = await apiRequest("PUT", `/api/order-forecasts/${id}`, data);
      return await res.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific period query
      queryClient.invalidateQueries({ 
        queryKey: ["/api/order-forecasts", variables.data.period] 
      });
    },
  });
}

export function useDeleteOrderForecast() {
  return useMutation({
    mutationFn: async ({ id, period }: { id: string; period: string }) => {
      const res = await apiRequest("DELETE", `/api/order-forecasts/${id}`, undefined);
      // DELETE returns 204 No Content, so no JSON to parse
      return res.ok;
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific period query
      queryClient.invalidateQueries({ 
        queryKey: ["/api/order-forecasts", variables.period] 
      });
    },
  });
}
