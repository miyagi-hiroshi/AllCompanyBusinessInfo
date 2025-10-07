/**
 * 突合ログリポジトリ
 * 
 * 責務:
 * - 突合ログテーブル（reconciliation_logs）のCRUD操作
 * - 突合処理の実行履歴管理
 * - 突合結果の統計情報管理
 */

import { db } from '../../db';
import { reconciliationLogs } from '@shared/schema/reconciliationLog';
import { eq, desc, asc, and, gte, lte } from 'drizzle-orm';
import type { ReconciliationLog, NewReconciliationLog } from '@shared/schema/integrated';

export interface ReconciliationLogFilter {
  period?: string;
  periodFrom?: string;
  periodTo?: string;
}

export interface ReconciliationLogSearchOptions {
  filter?: ReconciliationLogFilter;
  limit?: number;
  offset?: number;
  sortBy?: 'period' | 'executedAt';
  sortOrder?: 'asc' | 'desc';
}

export class ReconciliationLogRepository {
  /**
   * 全ての突合ログを取得
   */
  async findAll(options: ReconciliationLogSearchOptions = {}): Promise<ReconciliationLog[]> {
    const { filter, limit = 100, offset = 0, sortBy = 'executedAt', sortOrder = 'desc' } = options;
    
    let query = db.select().from(reconciliationLogs);
    
    // フィルタリング
    if (filter) {
      const conditions = [];
      
      if (filter.period) {
        conditions.push(eq(reconciliationLogs.period, filter.period));
      }
      
      if (filter.periodFrom) {
        conditions.push(gte(reconciliationLogs.period, filter.periodFrom));
      }
      
      if (filter.periodTo) {
        conditions.push(lte(reconciliationLogs.period, filter.periodTo));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    // ソート
    const sortColumn = reconciliationLogs[sortBy];
    if (sortOrder === 'asc') {
      query = query.orderBy(asc(sortColumn));
    } else {
      query = query.orderBy(desc(sortColumn));
    }
    
    // ページネーション
    query = query.limit(limit).offset(offset);
    
    return await query;
  }
  
  /**
   * IDで突合ログを取得
   */
  async findById(id: string): Promise<ReconciliationLog | null> {
    const result = await db.select().from(reconciliationLogs).where(eq(reconciliationLogs.id, id));
    return result[0] || null;
  }
  
  /**
   * 期間で突合ログを取得
   */
  async findByPeriod(period: string): Promise<ReconciliationLog[]> {
    return await db.select().from(reconciliationLogs).where(eq(reconciliationLogs.period, period));
  }
  
  /**
   * 最新の突合ログを取得
   */
  async findLatest(): Promise<ReconciliationLog | null> {
    const result = await db
      .select()
      .from(reconciliationLogs)
      .orderBy(desc(reconciliationLogs.executedAt))
      .limit(1);
    
    return result[0] || null;
  }
  
  /**
   * 期間の最新突合ログを取得
   */
  async findLatestByPeriod(period: string): Promise<ReconciliationLog | null> {
    const result = await db
      .select()
      .from(reconciliationLogs)
      .where(eq(reconciliationLogs.period, period))
      .orderBy(desc(reconciliationLogs.executedAt))
      .limit(1);
    
    return result[0] || null;
  }
  
  /**
   * 突合ログを作成
   */
  async create(data: NewReconciliationLog): Promise<ReconciliationLog> {
    const result = await db.insert(reconciliationLogs).values(data).returning();
    return result[0];
  }
  
  /**
   * 突合ログを更新
   */
  async update(id: string, data: Partial<NewReconciliationLog>): Promise<ReconciliationLog | null> {
    const result = await db
      .update(reconciliationLogs)
      .set({ ...data })
      .where(eq(reconciliationLogs.id, id))
      .returning();
    
    return result[0] || null;
  }
  
  /**
   * 突合ログを削除
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(reconciliationLogs).where(eq(reconciliationLogs.id, id));
    return result.rowCount > 0;
  }
  
  /**
   * 突合ログ総数を取得
   */
  async count(filter?: ReconciliationLogFilter): Promise<number> {
    let query = db.select({ count: reconciliationLogs.id }).from(reconciliationLogs);
    
    if (filter) {
      const conditions = [];
      
      if (filter.period) {
        conditions.push(eq(reconciliationLogs.period, filter.period));
      }
      
      if (filter.periodFrom) {
        conditions.push(gte(reconciliationLogs.period, filter.periodFrom));
      }
      
      if (filter.periodTo) {
        conditions.push(lte(reconciliationLogs.period, filter.periodTo));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    const result = await query;
    return result.length;
  }
  
  /**
   * 突合統計情報を取得
   */
  async getStatistics(): Promise<{
    totalLogs: number;
    totalMatched: number;
    totalFuzzyMatched: number;
    totalUnmatched: number;
    averageMatchRate: number;
  }> {
    const logs = await db.select().from(reconciliationLogs);
    
    const totalLogs = logs.length;
    const totalMatched = logs.reduce((sum, log) => sum + log.matchedCount, 0);
    const totalFuzzyMatched = logs.reduce((sum, log) => sum + log.fuzzyMatchedCount, 0);
    const totalUnmatched = logs.reduce((sum, log) => sum + log.unmatchedOrderCount + log.unmatchedGlCount, 0);
    
    const totalProcessed = totalMatched + totalFuzzyMatched + totalUnmatched;
    const averageMatchRate = totalProcessed > 0 ? (totalMatched + totalFuzzyMatched) / totalProcessed * 100 : 0;
    
    return {
      totalLogs,
      totalMatched,
      totalFuzzyMatched,
      totalUnmatched,
      averageMatchRate,
    };
  }
}
