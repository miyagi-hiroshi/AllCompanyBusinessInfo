/**
 * プロジェクト分析スナップショットリポジトリ
 * 
 * 責務:
 * - プロジェクト分析スナップショットテーブル（project_analysis_snapshots）のCRUD操作
 * - スナップショットデータの検索・フィルタリング
 */

import { projectAnalysisSnapshots } from '@shared/schema/projectAnalysisSnapshot/tables';
import type { ProjectAnalysisSnapshot, SnapshotData } from '@shared/schema/projectAnalysisSnapshot/types';
import { desc, eq, inArray } from 'drizzle-orm';

import { db } from '../../db';

export interface CreateSnapshotData {
  fiscalYear: number;
  name: string;
  snapshotData: SnapshotData;
  createdByEmployeeId: string;
}

export class ProjectAnalysisSnapshotRepository {
  /**
   * スナップショットを作成
   */
  async create(data: CreateSnapshotData): Promise<ProjectAnalysisSnapshot> {
    const [result] = await db
      .insert(projectAnalysisSnapshots)
      .values({
        fiscalYear: data.fiscalYear,
        name: data.name,
        snapshotData: data.snapshotData as any, // jsonb型のためanyにキャスト
        createdByEmployeeId: data.createdByEmployeeId,
      })
      .returning();
    
    return {
      id: result.id,
      fiscalYear: result.fiscalYear,
      name: result.name,
      snapshotData: result.snapshotData as SnapshotData,
      createdByEmployeeId: result.createdByEmployeeId,
      createdAt: result.createdAt ?? new Date(),
    };
  }

  /**
   * スナップショット一覧を取得
   * 
   * @param fiscalYear - 年度でフィルタリング（オプション）
   */
  async findAll(fiscalYear?: number): Promise<ProjectAnalysisSnapshot[]> {
    let query = db.select().from(projectAnalysisSnapshots);
    
    if (fiscalYear !== undefined) {
      query = query.where(eq(projectAnalysisSnapshots.fiscalYear, fiscalYear)) as any;
    }
    
    const results = await query.orderBy(desc(projectAnalysisSnapshots.createdAt));
    
    return results.map(result => ({
      id: result.id,
      fiscalYear: result.fiscalYear,
      name: result.name,
      snapshotData: result.snapshotData as SnapshotData,
      createdByEmployeeId: result.createdByEmployeeId,
      createdAt: result.createdAt ?? new Date(),
    }));
  }

  /**
   * IDでスナップショットを取得
   */
  async findById(id: string): Promise<ProjectAnalysisSnapshot | null> {
    const [result] = await db
      .select()
      .from(projectAnalysisSnapshots)
      .where(eq(projectAnalysisSnapshots.id, id));
    
    if (!result) {
      return null;
    }
    
    return {
      id: result.id,
      fiscalYear: result.fiscalYear,
      name: result.name,
      snapshotData: result.snapshotData as SnapshotData,
      createdByEmployeeId: result.createdByEmployeeId,
      createdAt: result.createdAt ?? new Date(),
    };
  }

  /**
   * 複数のIDでスナップショットを一括取得
   */
  async findByIds(ids: string[]): Promise<ProjectAnalysisSnapshot[]> {
    if (ids.length === 0) {
      return [];
    }
    
    const results = await db
      .select()
      .from(projectAnalysisSnapshots)
      .where(inArray(projectAnalysisSnapshots.id, ids));
    
    return results.map(result => ({
      id: result.id,
      fiscalYear: result.fiscalYear,
      name: result.name,
      snapshotData: result.snapshotData as SnapshotData,
      createdByEmployeeId: result.createdByEmployeeId,
      createdAt: result.createdAt ?? new Date(),
    }));
  }
}

