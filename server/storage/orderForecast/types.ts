/**
 * 受発注見込みデータに関する型定義
 */

export interface OrderForecastFilter {
  fiscalYear: number;
  month?: number;
  projectId?: string;
}
