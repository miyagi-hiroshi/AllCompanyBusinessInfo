import { useMutation, useQuery } from "@tanstack/react-query";

import { apiRequest, queryClient } from "@/lib/queryClient";

interface ReconciliationRequest {
  period: string;
  type: "exact" | "fuzzy" | "both";
}

interface ReconciliationResponse {
  success: boolean;
  matchedCount: number;
  fuzzyMatchedCount: number;
  totalMatched: number;
  totalFuzzy: number;
  totalUnmatched: number;
  unmatchedGL: number;
}

export function useReconciliation() {
  return useMutation<ReconciliationResponse, Error, ReconciliationRequest>({
    mutationFn: async ({ period, type }: ReconciliationRequest) => {
      // Map type to appropriate parameters
      const params = type === "exact" 
        ? { period, fuzzyThreshold: 100, dateTolerance: 0, amountTolerance: 0 }
        : { period, fuzzyThreshold: 80, dateTolerance: 7, amountTolerance: 1000 };
      
      const response = await apiRequest(
        "POST",
        `/api/reconciliation/execute`,
        params
      );
      const result = await response.json();
      return result.data as ReconciliationResponse;
    },
    onSuccess: () => {
      // Invalidate both order forecasts and GL entries
      void queryClient.invalidateQueries({ 
        queryKey: ["/api/order-forecasts"] 
      });
      void queryClient.invalidateQueries({ 
        queryKey: ["/api/gl-entries"] 
      });
    },
  });
}

export function useAccountSummary(period: string | undefined) {
  return useQuery({
    queryKey: ["/api/reconciliation/account-summary", period],
    queryFn: async () => {
      if (!period) return null;
      const res = await apiRequest("GET", `/api/reconciliation/account-summary?period=${period}`, undefined);
      const result = await res.json();
      return result.data;
    },
    enabled: !!period,
  });
}

export function useManualReconcile() {
  return useMutation({
    mutationFn: async ({ glId, orderId }: { glId: string; orderId: string }) => {
      const res = await apiRequest("POST", "/api/reconciliation/manual-match", { glId, orderId });
      return await res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/gl-entries"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/order-forecasts"] });
    },
  });
}

export function useUnmatchReconciliation() {
  return useMutation({
    mutationFn: async ({ glId, orderId }: { glId?: string; orderId: string }) => {
      const res = await apiRequest("POST", "/api/reconciliation/unmatch", { glId, orderId });
      return await res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/gl-entries"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/order-forecasts"] });
    },
  });
}
