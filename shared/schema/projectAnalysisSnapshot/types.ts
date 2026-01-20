import { z } from "zod";

/**
 * スナップショットデータ行の型定義（プロジェクト行と小計行の共用型）
 */
export interface SnapshotDataRow {
  type: 'project' | 'subtotal';
  serviceType: string;
  projectName?: string;      // type === 'project' の場合のみ
  projectCode?: string;      // type === 'project' の場合のみ
  analysisType: string;
  revenue: number;
  costOfSales: number;
  sgaExpenses: number;
  workHours: number;
  targetValue?: number;      // type === 'subtotal' の場合のみ
  actualValue?: number;
}

/**
 * スナップショットデータの型定義
 */
export interface SnapshotData {
  rows: SnapshotDataRow[];
}

/**
 * プロジェクト分析スナップショット型定義
 */
export interface ProjectAnalysisSnapshot {
  id: string;
  fiscalYear: number;
  name: string;
  snapshotData: SnapshotData;
  createdByEmployeeId: string;
  createdAt: Date;
}

/**
 * スナップショットデータ行のZodスキーマ
 */
export const snapshotDataRowSchema = z.object({
  type: z.enum(['project', 'subtotal']),
  serviceType: z.string(),
  projectName: z.string().optional(),
  projectCode: z.string().optional(),
  analysisType: z.string(),
  revenue: z.number(),
  costOfSales: z.number(),
  sgaExpenses: z.number(),
  workHours: z.number(),
  targetValue: z.number().optional(),
  actualValue: z.number().optional(),
});

/**
 * スナップショットデータのZodスキーマ
 */
export const snapshotDataSchema = z.object({
  rows: z.array(snapshotDataRowSchema),
});

/**
 * プロジェクト分析スナップショット作成用スキーマ
 */
export const createProjectAnalysisSnapshotSchema = z.object({
  fiscalYear: z.number().int().positive(),
  name: z.string().min(1).max(255),
  snapshotData: snapshotDataSchema,
});

