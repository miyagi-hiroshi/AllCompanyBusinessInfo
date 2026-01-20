import { useMutation } from "@tanstack/react-query";

import { apiRequest, queryClient } from "@/lib/queryClient";

export interface ImportCSVResult {
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errors: Array<{ row: number; message: string }>;
}

export interface ImportCSVParams {
  file: File;
  fiscalYear: number;
  type: 'order-forecasts' | 'angle-b-forecasts';
}

export function useImportForecastCSV() {
  return useMutation({
    mutationFn: async ({ file, fiscalYear, type }: ImportCSVParams) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fiscalYear", fiscalYear.toString());
      
      const endpoint = type === 'order-forecasts' 
        ? '/api/forecast-import/order-forecasts'
        : '/api/forecast-import/angle-b-forecasts';
      
      const res = await apiRequest("POST", endpoint, formData);
      const result = await res.json();
      return result.data as ImportCSVResult;
    },
    onSuccess: (_data, variables) => {
      // 取込成功時に該当データを再取得
      if (variables.type === 'order-forecasts') {
        void queryClient.invalidateQueries({ queryKey: ["/api/order-forecasts"] });
      } else {
        void queryClient.invalidateQueries({ queryKey: ["/api/angle-b-forecasts"] });
      }
    },
  });
}

