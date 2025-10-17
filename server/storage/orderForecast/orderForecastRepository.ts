/**
 * 受発注データリポジトリ
 * 
 * 責務:
 * - 受発注データテーブル（order_forecasts）のCRUD操作
 * - 受発注データの検索・フィルタリング
 * - 突合処理のためのデータ操作
 */

import type { NewOrderForecast,OrderForecast } from '@shared/schema/integrated';
import { orderForecasts } from '@shared/schema/orderForecast';
import { projects } from '@shared/schema/project';
import { and, asc, count,desc, eq, inArray, like, or, sql } from 'drizzle-orm';

import { db } from '../../db';

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
  reconciliationStatus?: 'matched' | 'fuzzy' | 'unmatched' | 'excluded';
  createdByUserId?: string;
  createdByEmployeeId?: string;
  salesPerson?: string;
  searchText?: string;
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
    const { filter, limit, offset, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    
    // 常にprojectsテーブルとJOINして営業担当者情報を取得
    const query: any = db.select({
      id: orderForecasts.id,
      projectId: orderForecasts.projectId,
      projectCode: orderForecasts.projectCode,
      projectName: orderForecasts.projectName,
      customerId: orderForecasts.customerId,
      customerCode: orderForecasts.customerCode,
      customerName: orderForecasts.customerName,
      accountingPeriod: orderForecasts.accountingPeriod,
      accountingItem: orderForecasts.accountingItem,
      description: orderForecasts.description,
      amount: orderForecasts.amount,
      remarks: orderForecasts.remarks,
      period: orderForecasts.period,
      reconciliationStatus: orderForecasts.reconciliationStatus,
      glMatchId: orderForecasts.glMatchId,
      isExcluded: orderForecasts.isExcluded,
      exclusionReason: orderForecasts.exclusionReason,
      createdByUserId: orderForecasts.createdByUserId,
      createdByEmployeeId: orderForecasts.createdByEmployeeId,
      version: orderForecasts.version,
      createdAt: orderForecasts.createdAt,
      updatedAt: orderForecasts.updatedAt,
      salesPerson: projects.salesPerson,
    }).from(orderForecasts).leftJoin(projects, eq(orderForecasts.projectId, projects.id))
    
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
      
      // searchText: 摘要文・備考のあいまい検索
      if (filter.searchText) {
        conditions.push(
          or(
            like(orderForecasts.description, `%${filter.searchText}%`),
            like(orderForecasts.remarks, `%${filter.searchText}%`)
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
      
      // salesPerson: プロジェクトテーブルとJOINして営業担当者でフィルタ
      if (filter.salesPerson) {
        conditions.push(eq(projects.salesPerson, filter.salesPerson));
      }
      
      if (conditions.length > 0) {
        query.where(and(...conditions));
      }
    }
    
    // ソート
    const sortColumn = orderForecasts[sortBy];
    if (sortOrder === 'asc') {
      query.orderBy(asc(sortColumn));
    } else {
      query.orderBy(desc(sortColumn));
    }
    
    // ページネーション（limit指定時のみ、未指定時は10000件まで取得）
    const effectiveLimit = limit ?? 10000;
    query.limit(effectiveLimit);
    if (offset !== undefined) {
      query.offset(offset);
    }
    
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
    return await db.select().from(orderForecasts).where(eq(orderForecasts.accountingPeriod, period));
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
    if (period) {
      return await db.select().from(orderForecasts).where(and(
        eq(orderForecasts.reconciliationStatus, 'unmatched'),
        eq(orderForecasts.period, period)
      ));
    }
    
    return await db.select().from(orderForecasts).where(eq(orderForecasts.reconciliationStatus, 'unmatched'));
  }
  
  /**
   * 突合済み受発注データを取得
   */
  async findMatched(period?: string): Promise<OrderForecast[]> {
    if (period) {
      return await db.select().from(orderForecasts).where(and(
        eq(orderForecasts.reconciliationStatus, 'matched'),
        eq(orderForecasts.period, period)
      ));
    }
    
    return await db.select().from(orderForecasts).where(eq(orderForecasts.reconciliationStatus, 'matched'));
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
  async update(id: string, data: Partial<OrderForecast>): Promise<OrderForecast | null> {
    const result = await db
      .update(orderForecasts)
      .set({ 
        ...data,
        updatedAt: new Date(),
        version: sql`version + 1` // 楽観ロック
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
    return (result.rowCount ?? 0) > 0;
  }
  
  /**
   * 突合ステータスを更新
   */
  async updateReconciliationStatus(
    id: string, 
    status: 'matched' | 'fuzzy' | 'unmatched' | 'excluded',
    glMatchId?: string
  ): Promise<OrderForecast | null> {
    const updateData: any = {
      reconciliationStatus: status,
      updatedAt: new Date(),
      version: sql`version + 1`
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
      
      // searchText: 摘要文・備考のあいまい検索
      if (filter.searchText) {
        conditions.push(
          or(
            like(orderForecasts.description, `%${filter.searchText}%`),
            like(orderForecasts.remarks, `%${filter.searchText}%`)
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
      
      if (filter.accountingItem) {
        conditions.push(like(orderForecasts.accountingItem, `%${filter.accountingItem}%`));
      }
      
      if (filter.period) {
        conditions.push(eq(orderForecasts.period, filter.period));
      }
      
      if (filter.reconciliationStatus) {
        conditions.push(eq(orderForecasts.reconciliationStatus, filter.reconciliationStatus));
      }
      
      // salesPerson: プロジェクトテーブルとJOINして営業担当者でフィルタ
      if (filter.salesPerson) {
        conditions.push(eq(projects.salesPerson, filter.salesPerson));
      }
      
      if (conditions.length > 0) {
        // 常にJOINする（salesPersonフィルタの有無に関わらず）
        const query = db.select({ count: count() })
          .from(orderForecasts)
          .leftJoin(projects, eq(orderForecasts.projectId, projects.id))
          .where(and(...conditions));
        const result = await query;
        return result[0]?.count ?? 0;
      }
    }
    
    const result = await db.select({ count: count() }).from(orderForecasts);
    return result[0]?.count ?? 0;
  }

  /**
   * 月次サマリデータを取得
   * 
   * @param fiscalYear - 年度
   * @param salesPerson - 営業担当者（オプション）
   * @returns 月次サマリデータ
   */
  async getMonthlySummary(fiscalYear: number, salesPerson?: string): Promise<Array<{
    accounting_period: string;
    accounting_item: string;
    total_amount: string;
  }>> {
    const startPeriod = `${fiscalYear}-04`;
    const endPeriod = `${fiscalYear + 1}-03`;
    
    // WHERE条件を構築
    const whereConditions = [
      sql`${orderForecasts.accountingPeriod} >= ${startPeriod}`,
      sql`${orderForecasts.accountingPeriod} <= ${endPeriod}`
    ];
    
    if (salesPerson) {
      whereConditions.push(eq(projects.salesPerson, salesPerson));
    }
    
    const result = await db
      .select({
        accounting_period: orderForecasts.accountingPeriod,
        accounting_item: orderForecasts.accountingItem,
        total_amount: sql<string>`SUM(${orderForecasts.amount})`
      })
      .from(orderForecasts)
      .leftJoin(projects, eq(orderForecasts.projectId, projects.id))
      .where(and(...whereConditions))
      .groupBy(orderForecasts.accountingPeriod, orderForecasts.accountingItem)
      .orderBy(orderForecasts.accountingPeriod, orderForecasts.accountingItem);
    
    return result;
  }

  /**
   * プロジェクト分析サマリー用の受発注データ一括集計
   * 
   * @param fiscalYear - 年度
   * @param projectIds - プロジェクトIDリスト
   * @returns プロジェクトID別の集計データMap
   */
  async getProjectAnalysisSummary(fiscalYear: number, projectIds: string[]): Promise<Map<string, {
    revenue: number;
    costOfSales: number;
    sgaExpenses: number;
  }>> {
    if (projectIds.length === 0) {
      return new Map();
    }

    const startPeriod = `${fiscalYear}-04`;
    const endPeriod = `${fiscalYear + 1}-03`;
    
    // 年度内の全プロジェクトの受発注データを一括取得・集計
    const result = await db
      .select({
        projectId: orderForecasts.projectId,
        accountingItem: orderForecasts.accountingItem,
        totalAmount: sql<string>`COALESCE(SUM(${orderForecasts.amount}::numeric), 0)`
      })
      .from(orderForecasts)
      .where(
        and(
          inArray(orderForecasts.projectId, projectIds),
          sql`${orderForecasts.accountingPeriod} >= ${startPeriod}`,
          sql`${orderForecasts.accountingPeriod} <= ${endPeriod}`
        )
      )
      .groupBy(orderForecasts.projectId, orderForecasts.accountingItem);

    // プロジェクトID別に集計
    const summaryMap = new Map<string, { revenue: number; costOfSales: number; sgaExpenses: number }>();
    
    for (const row of result) {
      if (!row.projectId) continue;
      
      if (!summaryMap.has(row.projectId)) {
        summaryMap.set(row.projectId, {
          revenue: 0,
          costOfSales: 0,
          sgaExpenses: 0
        });
      }
      
      const summary = summaryMap.get(row.projectId)!;
      const amount = parseFloat(row.totalAmount);
      const accountingItem = row.accountingItem;
      
      // 売上系（保守売上、ソフト売上、商品売上、消耗品売上、その他売上）
      if (accountingItem === '保守売上' || accountingItem === 'ソフト売上' || 
          accountingItem === '商品売上' || accountingItem === '消耗品売上' || 
          accountingItem === 'その他売上') {
        summary.revenue += amount;
      }
      // 仕入高
      else if (accountingItem === '仕入高') {
        summary.costOfSales += amount;
      }
      // 販管費（通信費、消耗品費、支払保守料、外注加工費、その他調整経費）
      else if (accountingItem === '通信費' || accountingItem === '消耗品費' || 
               accountingItem === '支払保守料' || accountingItem === '外注加工費' || 
               accountingItem === 'その他調整経費') {
        summary.sgaExpenses += amount;
      }
    }
    
    return summaryMap;
  }
}