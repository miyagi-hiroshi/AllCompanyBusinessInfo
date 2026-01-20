import type { ProjectAnalysisSnapshot, SnapshotData } from "@shared/schema/projectAnalysisSnapshot/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/lib/queryClient";

export interface CreateSnapshotRequest {
  fiscalYear: number;
  name: string;
  snapshotData: SnapshotData;
}

export interface SnapshotResponse {
  success: boolean;
  data: ProjectAnalysisSnapshot;
}

export interface SnapshotsResponse {
  success: boolean;
  data: ProjectAnalysisSnapshot[];
}

export interface CompareResponse {
  success: boolean;
  data: {
    snapshot1: ProjectAnalysisSnapshot;
    snapshot2: ProjectAnalysisSnapshot;
  };
}

/**
 * プロジェクト分析スナップショット一覧取得フック
 * 
 * @param fiscalYear - 年度（オプション）
 * @returns スナップショット一覧のクエリ結果
 */
export function useProjectAnalysisSnapshots(fiscalYear?: number) {
  return useQuery<SnapshotsResponse>({
    queryKey: ['/api/projects/analysis-snapshots', fiscalYear],
    queryFn: async () => {
      const params = fiscalYear 
        ? `?fiscalYear=${fiscalYear}` 
        : '';
      const res = await apiRequest(
        "GET",
        `/api/projects/analysis-snapshots${params}`,
        undefined
      );
      return await res.json();
    },
  });
}

/**
 * プロジェクト分析スナップショット詳細取得フック
 * 
 * @param id - スナップショットID
 * @returns スナップショット詳細のクエリ結果
 */
export function useProjectAnalysisSnapshot(id: string) {
  return useQuery<SnapshotResponse>({
    queryKey: ['/api/projects/analysis-snapshots', id],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/projects/analysis-snapshots/${id}`,
        undefined
      );
      return await res.json();
    },
    enabled: !!id,
  });
}

/**
 * プロジェクト分析スナップショット作成フック
 * 
 * @returns スナップショット作成のMutation
 */
export function useCreateProjectAnalysisSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSnapshotRequest) => {
      const res = await apiRequest(
        "POST",
        "/api/projects/analysis-snapshots",
        data
      );
      return await res.json();
    },
    onSuccess: (_, variables) => {
      // スナップショット一覧を更新
      queryClient.invalidateQueries({ 
        queryKey: ['/api/projects/analysis-snapshots', variables.fiscalYear] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/projects/analysis-snapshots'] 
      });
    },
  });
}

/**
 * プロジェクト分析スナップショット比較取得フック
 * 
 * @param id1 - スナップショットID1
 * @param id2 - スナップショットID2
 * @returns スナップショット比較のクエリ結果
 */
export function useCompareProjectAnalysisSnapshots(
  id1: string,
  id2: string,
  options?: { enabled?: boolean }
) {
  return useQuery<CompareResponse>({
    queryKey: ['/api/projects/analysis-snapshots/compare', id1, id2],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/projects/analysis-snapshots/compare/${id1}/${id2}`,
        undefined
      );
      return await res.json();
    },
    enabled: (options?.enabled ?? true) && !!id1 && !!id2,
  });
}

