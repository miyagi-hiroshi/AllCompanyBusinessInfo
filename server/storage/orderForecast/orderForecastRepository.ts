/**
 * 受発注データリポジトリ
 * 
 * 責務:
 * - 受発注データテーブル（order_forecasts）のCRUD操作
 * - 受発注データの検索・フィルタリング
 * - 突合処理のためのデータ操作
 */

import { db } from '../../db';
import { orderForecasts } from '@shared/schema/orderForecast';
import { eq, like, desc, asc, and, or, isNull, isNotNull } from 'drizzle-orm';
import type { OrderForecast, NewOrderForecast } from '@shared/schema/integrated';

export interface OrderForecastFilter {
  search?: string;
  projectId?: string;
  projectCode?: string;
  projectName?: string;
  customerId?: string;
  customerCode?: string;
  customerName?: string;
  accountingPeriod?: string;
  accountingItem?: string;
  period?: string;
  reconciliationStatus?: 'matched' | 'fuzzy' | 'unmatched';
  createdByUserId?: string;
  createdByEmployeeId?: string;
}

export interface OrderForecastSearchOptions {
  filter?: OrderForecastFilter;
  limit?: number;
  offset?: number;
  sortBy?: 'projectCode' | 'customerName' | 'accountingPeriod' | 'amount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export class OrderForecastRepository {
  /**
   * 全ての受発注データを取得
   */
  async findAll(options: OrderForecastSearchOptions = {}): Promise<OrderForecast[]> {
    const { filter, limit = 100, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    
    let query = db.select().from(orderForecasts);
    
    // フィルタリング
    if (filter) {
      const conditions = [];
      
      if (filter.search) {
        conditions.push(
          or(
            like(orderForecasts.projectCode, `%${filter.search}%`),
            like(orderForecasts.projectName, `%${filter.search}%`),
            like(orderForecasts.customerCode, `%${filter.search}%`),
            like(orderForecasts.customerName, `%${filter.search}%`),
            like(orderForecasts.accountingItem, `%${filter.search}%`),
            like(orderForecasts.description, `%${filter.search}%`)
          )
        );
      }
      
      if (filter.projectId) {
        conditions.push(eq(orderForecasts.projectId, filter.projectId));
      }
      
      if (filter.projectCode) {
        conditions.push(like(orderForecasts.projectCode, `%${filter.projectCode}%`));
      }
      
      if (filter.projectName) {
        conditions.push(like(orderForecasts.projectName, `%${filter.projectName}%`));
      }
      
      if (filter.customerId) {
        conditions.push(eq(orderForecasts.customerId, filter.customerId));
      }
      
      if (filter.customerCode) {
        conditions.push(like(orderForecasts.customerCode, `%${filter.customerCode}%`));
      }
      
      if (filter.customerName) {
        conditions.push(like(orderForecasts.customerName, `%${filter.customerName}%`));
      }
      
      if (filter.accountingPeriod) {
        conditions.push(eq(orderForecasts.accountingPeriod, filter.accountingPeriod));
      }
      
      if (filter.accountingItem) {
        conditions.push(like(orderForecasts.accountingItem, `%${filter.accountingItem}%`));
      }
      
      if (filter.period) {
        conditions.push(eq(orderForecasts.period, filter.period));
      }
      
      if (filter.reconciliationStatus) {
        conditions.push(eq(orderForecasts.reconciliationStatus, filter.reconciliationStatus));
      }
      
      if (filter.createdByUserId) {
        conditions.push(eq(orderForecasts.createdByUserId, filter.createdByUserId));
      }
      
      if (filter.createdByEmployeeId) {
        conditions.push(eq(orderForecasts.createdByEmployeeId, filter.createdByEmployeeId));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    // ソート
    const sortColumn = orderForecasts[sortBy];
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
   * IDで受発注データを取得
   */
  async findById(id: string): Promise<OrderForecast | null> {
    const result = await db.select().from(orderForecasts).where(eq(orderForecasts.id, id));
    return result[0] || null;
  }
  
  /**
   * 期間で受発注データを取得
   */
  async findByPeriod(period: string): Promise<OrderForecast[]> {
    return await db.select().from(orderForecasts).where(eq(orderForecasts.period, period));
  }

  /**
   * プロジェクトID別受発注データ取得
   */
  async findByProjectId(projectId: string): Promise<OrderForecast[]> {
    return await db.select().from(orderForecasts).where(eq(orderForecasts.projectId, projectId));
  }
  
  /**
   * 突合されていない受発注データを取得
   */
  async findUnmatched(period?: string): Promise<OrderForecast[]> {
    let query = db.select().from(orderForecasts).where(eq(orderForecasts.reconciliationStatus, 'unmatched'));
    
    if (period) {
      query = query.where(and(
        eq(orderForecasts.reconciliationStatus, 'unmatched'),
        eq(orderForecasts.period, period)
      ));
    }
    
    return await query;
  }
  
  /**
   * 突合済み受発注データを取得
   */
  async findMatched(period?: string): Promise<OrderForecast[]> {
    let query = db.select().from(orderForecasts).where(eq(orderForecasts.reconciliationStatus, 'matched'));
    
    if (period) {
      query = query.where(and(
        eq(orderForecasts.reconciliationStatus, 'matched'),
        eq(orderForecasts.period, period)
      ));
    }
    
    return await query;
  }
  
  /**
   * 受発注データを作成
   */
  async create(data: NewOrderForecast): Promise<OrderForecast> {
    const result = await db.insert(orderForecasts).values(data).returning();
    return result[0];
  }
  
  /**
   * 受発注データを更新
   */
  async update(id: string, data: Partial<NewOrderForecast>): Promise<OrderForecast | null> {
    const result = await db
      .update(orderForecasts)
      .set({ 
        ...data,
        updatedAt: new Date(),
        version: db.raw('version + 1') // 楽観ロック
      })
      .where(eq(orderForecasts.id, id))
      .returning();
    
    return result[0] || null;
  }
  
  /**
   * 受発注データを削除
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(orderForecasts).where(eq(orderForecasts.id, id));
    return result.rowCount > 0;
  }
  
  /**
   * 突合ステータスを更新
   */
  async updateReconciliationStatus(
    id: string, 
    status: 'matched' | 'fuzzy' | 'unmatched',
    glMatchId?: string
  ): Promise<OrderForecast | null> {
    const updateData: any = {
      reconciliationStatus: status,
      updatedAt: new Date(),
      version: db.raw('version + 1')
    };
    
    if (glMatchId) {
      updateData.glMatchId = glMatchId;
    } else if (status === 'unmatched') {
      updateData.glMatchId = null;
    }
    
    const result = await db
      .update(orderForecasts)
      .set(updateData)
      .where(eq(orderForecasts.id, id))
      .returning();
    
    return result[0] || null;
  }
  
  /**
   * 受発注データ総数を取得
   */
  async count(filter?: OrderForecastFilter): Promise<number> {
    let query = db.select({ count: orderForecasts.id }).from(orderForecasts);
    
    if (filter) {
      const conditions = [];
      
      if (filter.search) {
        conditions.push(
          or(
            like(orderForecasts.projectCode, `%${filter.search}%`),
            like(orderForecasts.projectName, `%${filter.search}%`),
            like(orderForecasts.customerCode, `%${filter.search}%`),
            like(orderForecasts.customerName, `%${filter.search}%`),
            like(orderForecasts.accountingItem, `%${filter.search}%`),
            like(orderForecasts.description, `%${filter.search}%`)
          )
        );
      }
      
      if (filter.projectId) {
        conditions.push(eq(orderForecasts.projectId, filter.projectId));
      }
      
      if (filter.projectCode) {
        conditions.push(like(orderForecasts.projectCode, `%${filter.projectCode}%`));
      }
      
      if (filter.customerId) {
        conditions.push(eq(orderForecasts.customerId, filter.customerId));
      }
      
      if (filter.accountingPeriod) {
        conditions.push(eq(orderForecasts.accountingPeriod, filter.accountingPeriod));
      }
      
      if (filter.period) {
        conditions.push(eq(orderForecasts.period, filter.period));
      }
      
      if (filter.reconciliationStatus) {
        conditions.push(eq(orderForecasts.reconciliationStatus, filter.reconciliationStatus));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    const result = await query;
    return result.length;
  }
}