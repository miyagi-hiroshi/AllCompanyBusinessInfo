import type { AngleBForecast, NewAngleBForecast } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";

import { apiRequest, queryClient } from "@/lib/queryClient";

export interface AngleBForecastFilter {
  fiscalYear: number;
  month?: number;
  projectId?: string;
}

export function useAngleBForecasts(filter: AngleBForecastFilter) {
  const params = new URLSearchParams({
    fiscalYear: filter.fiscalYear.toString(),
  });
  if (filter.month) {
    params.append("month", filter.month.toString());
  }
  if (filter.projectId) {
    params.append("projectId", filter.projectId);
  }
  
  return useQuery<AngleBForecast[]>({
    queryKey: ["/api/angle-b-forecasts", filter.fiscalYear, filter.month ?? null, filter.projectId ?? null],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/angle-b-forecasts?${params}`, undefined);
      const result = await res.json();
      return result.data?.items || [];
    },
    enabled: !!filter.fiscalYear,
  });
}

export function useCreateAngleBForecast() {
  return useMutation({
    mutationFn: async (data: NewAngleBForecast & { filter: AngleBForecastFilter }) => {
      const { filter: _filter, ...angleBData } = data;
      const res = await apiRequest("POST", "/api/angle-b-forecasts", angleBData);
      return await res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ 
        queryKey: ["/api/angle-b-forecasts"] 
      });
    },
  });
}

export function useUpdateAngleBForecast() {
  return useMutation({
    mutationFn: async ({ 
      id, 
      data,
      filter: _filter
    }: { 
      id: string; 
      data: Partial<AngleBForecast>;
      filter: AngleBForecastFilter;
    }) => {
      const res = await apiRequest("PUT", `/api/angle-b-forecasts/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ 
        queryKey: ["/api/angle-b-forecasts"] 
      });
    },
  });
}

export function useDeleteAngleBForecast() {
  return useMutation({
    mutationFn: async ({ id, filter: _filter }: { id: string; filter: AngleBForecastFilter }) => {
      const res = await apiRequest("DELETE", `/api/angle-b-forecasts/${id}`, undefined);
      return res.ok;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ 
        queryKey: ["/api/angle-b-forecasts"] 
      });
    },
  });
}

export function usePromoteAngleBForecast() {
  return useMutation({
    mutationFn: async ({ id, filter: _filter }: { id: string; filter: AngleBForecastFilter }) => {
      const res = await apiRequest("POST", `/api/angle-b-forecasts/${id}/promote`, undefined);
      return await res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ 
        queryKey: ["/api/angle-b-forecasts"] 
      });
      void queryClient.invalidateQueries({ 
        queryKey: ["/api/order-forecasts"] 
      });
    },
  });
}

