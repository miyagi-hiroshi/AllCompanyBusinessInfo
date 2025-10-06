import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { GLEntry, InsertGLEntry } from "@shared/schema";

export function useGLEntries(period: string) {
  return useQuery<GLEntry[]>({
    queryKey: ["/api/gl-entries", period],
    enabled: !!period,
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
