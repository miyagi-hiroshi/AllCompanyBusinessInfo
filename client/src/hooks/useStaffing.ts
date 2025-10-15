import type { NewStaffing, Staffing } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";

import { apiRequest, queryClient } from "@/lib/queryClient";

export interface StaffingFilter {
  projectId?: string | string[];
  fiscalYear?: number;
  month?: number;
}

export function useStaffing(filter?: StaffingFilter) {
  const params = new URLSearchParams();
  if (filter?.projectId) {
    // 配列の場合はカンマ区切りで結合
    const projectIds = Array.isArray(filter.projectId) 
      ? filter.projectId.join(",") 
      : filter.projectId;
    if (projectIds) {
      params.append("projectId", projectIds);
    }
  }
  if (filter?.fiscalYear) {
    params.append("fiscalYear", filter.fiscalYear.toString());
  }
  if (filter?.month) {
    params.append("month", filter.month.toString());
  }
  
  const queryString = params.toString();
  
  // queryKeyも配列対応
  const projectIdKey = Array.isArray(filter?.projectId) 
    ? filter.projectId.sort().join(",") 
    : filter?.projectId ?? null;
  
  return useQuery<Staffing[]>({
    queryKey: ["/api/staffing", projectIdKey, filter?.fiscalYear ?? null, filter?.month ?? null],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/staffing${queryString ? `?${queryString}` : ""}`, undefined);
      const result = await res.json();
      return result.data?.items || [];
    },
  });
}

export function useCreateStaffing() {
  return useMutation({
    mutationFn: async (data: NewStaffing) => {
      const res = await apiRequest("POST", "/api/staffing", data);
      return await res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ 
        queryKey: ["/api/staffing"] 
      });
    },
  });
}

export function useUpdateStaffing() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NewStaffing> }) => {
      const res = await apiRequest("PUT", `/api/staffing/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ 
        queryKey: ["/api/staffing"] 
      });
    },
  });
}

export function useDeleteStaffing() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/staffing/${id}`, undefined);
      return res.ok;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ 
        queryKey: ["/api/staffing"] 
      });
    },
  });
}

export function useBulkCreateStaffing() {
  return useMutation({
    mutationFn: async (data: NewStaffing[]) => {
      const promises = data.map(item => 
        apiRequest("POST", "/api/staffing", item).then(res => res.json())
      );
      const results = await Promise.all(promises);
      return results;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ 
        queryKey: ["/api/staffing"] 
      });
    },
  });
}

export function useBulkUpdateStaffing() {
  return useMutation({
    mutationFn: async (data: Array<{ id: string; data: Partial<NewStaffing> }>) => {
      const promises = data.map(({ id, data: updateData }) => 
        apiRequest("PUT", `/api/staffing/${id}`, updateData).then(res => res.json())
      );
      const results = await Promise.all(promises);
      return results;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ 
        queryKey: ["/api/staffing"] 
      });
    },
  });
}

export function useBulkDeleteStaffing() {
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const promises = ids.map(id => 
        apiRequest("DELETE", `/api/staffing/${id}`, undefined)
      );
      const results = await Promise.all(promises);
      return results;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ 
        queryKey: ["/api/staffing"] 
      });
    },
  });
}

