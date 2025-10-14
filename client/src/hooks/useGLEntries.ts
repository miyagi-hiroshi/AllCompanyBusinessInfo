import type { GLEntry, NewGLEntry } from "@shared/schema";
import { useMutation,useQuery } from "@tanstack/react-query";

import { apiRequest, queryClient } from "@/lib/queryClient";

export interface GLEntryFilter {
  fiscalYear: number;
  month?: number;
}

export function useGLEntries(filter: GLEntryFilter) {
  const params = new URLSearchParams({
    fiscalYear: filter.fiscalYear.toString(),
    limit: "1000", // 全データを取得するため大きな値を設定
  });
  if (filter.month) {
    params.append("month", filter.month.toString());
  }
  
  return useQuery<GLEntry[]>({
    // Use scalar segments for stable cache keys
    queryKey: ["/api/gl-entries", filter.fiscalYear, filter.month ?? null],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/gl-entries?${params}`, undefined);
      const result = await res.json();
      return result.data?.items || [];
    },
    enabled: !!filter.fiscalYear,
  });
}

export function useCreateGLEntry() {
  return useMutation({
    mutationFn: async (data: NewGLEntry) => {
      const res = await apiRequest("POST", "/api/gl-entries", data);
      return await res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/gl-entries"] });
    },
  });
}

export function useUpdateGLEntry() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GLEntry> }) => {
      const res = await apiRequest("PUT", `/api/gl-entries/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/gl-entries"] });
    },
  });
}

export function useDeleteGLEntry() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/gl-entries/${id}`, undefined);
      return res.ok;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/gl-entries"] });
    },
  });
}

export function useImportGLEntriesCSV() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await apiRequest("POST", "/api/gl-entries/import-csv", formData);
      return await res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/gl-entries"] });
    },
  });
}

export function useSetGLEntriesExclusion() {
  return useMutation({
    mutationFn: async ({ ids, isExcluded, exclusionReason }: { ids: string[]; isExcluded: boolean; exclusionReason?: string }) => {
      const res = await apiRequest("POST", "/api/gl-entries/set-exclusion", { ids, isExcluded, exclusionReason });
      return await res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/gl-entries"] });
    },
  });
}
