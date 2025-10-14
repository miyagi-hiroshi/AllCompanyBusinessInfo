import { useMutation, useQuery } from "@tanstack/react-query";

import { apiRequest, queryClient } from "@/lib/queryClient";

interface ReconciliationRequest {
  period: string;
  type: "exact";
}

interface ReconciliationResponse {
  reconciliationLog: any;
  results: {
    matched: Array<{ order: any; gl: any; score: number }>;
    unmatchedOrders: any[];
    unmatchedGl: any[];
    alreadyMatchedOrders: number;
    alreadyMatchedGl: number;
  };
}

export function useReconciliation() {
  return useMutation<ReconciliationResponse, Error, ReconciliationRequest>({
    mutationFn: async ({ period, type }: ReconciliationRequest) => {
      const response = await apiRequest(
        "POST",
        `/api/reconciliation/execute`,
        { period, type }
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
    mutationFn: async ({ glId, orderId }: { glId: string; orderId: string }) => {
      const res = await apiRequest("POST", "/api/reconciliation/unmatch", { glId, orderId });
      return await res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/gl-entries"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/order-forecasts"] });
    },
  });
}
