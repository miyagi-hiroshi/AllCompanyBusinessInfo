import { useMutation } from "@tanstack/react-query";
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
      const response = await apiRequest(
        "POST",
        `/api/reconciliation/${period}`,
        { type }
      );
      return await response.json() as ReconciliationResponse;
    },
    onSuccess: (_, variables) => {
      // Invalidate both order forecasts and GL entries for the specific period
      queryClient.invalidateQueries({ 
        queryKey: ["/api/order-forecasts", variables.period] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/gl-entries", variables.period] 
      });
    },
  });
}
