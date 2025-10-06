import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { GLEntry, InsertGLEntry } from "@shared/schema";

export interface GLEntryFilter {
  fiscalYear: number;
  month?: number;
}

export function useGLEntries(filter: GLEntryFilter) {
  const params = new URLSearchParams({
    fiscalYear: filter.fiscalYear.toString(),
  });
  if (filter.month) params.append('month', filter.month.toString());
  
  return useQuery<GLEntry[]>({
    // Use scalar segments for stable cache keys
    queryKey: ["/api/gl-entries", filter.fiscalYear, filter.month ?? null],
    queryFn: async () => {
      const res = await fetch(`/api/gl-entries?${params}`);
      if (!res.ok) throw new Error('Failed to fetch GL entries');
      return res.json();
    },
    enabled: !!filter.fiscalYear,
  });
}

export function useCreateGLEntry() {
  return useMutation({
    mutationFn: async (data: InsertGLEntry) => {
      const res = await apiRequest("POST", "/api/gl-entries", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gl-entries"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/gl-entries"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/gl-entries"] });
    },
  });
}
