/**
 * GL総勘定元帳リポジトリ
 * 
 * 責務:
 * - GL総勘定元帳テーブル（gl_entries）のCRUD操作
 * - GLデータの検索・フィルタリング
 * - 突合処理のためのデータ操作
 */

import { glEntries } from '@shared/schema/glEntry';
import type { GLEntry, NewGLEntry } from '@shared/schema/integrated';
import { and, asc, desc, eq, gte, like, lte,or } from 'drizzle-orm';

import { db } from '../../db';

export interface GLEntryFilter {
  search?: string;
  voucherNo?: string;
  transactionDateFrom?: string;
  transactionDateTo?: string;
  accountCode?: string;
  accountName?: string;
  debitCredit?: 'debit' | 'credit';
  period?: string;
  reconciliationStatus?: 'matched' | 'fuzzy' | 'unmatched';
}

export interface GLEntrySearchOptions {
  filter?: GLEntryFilter;
  limit?: number;
  offset?: number;
  sortBy?: 'voucherNo' | 'transactionDate' | 'accountCode' | 'amount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export class GLEntryRepository {
  /**
   * 全てのGLデータを取得
   */
  async findAll(options: GLEntrySearchOptions = {}): Promise<GLEntry[]> {
    const { filter, limit = 100, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    
    let query = db.select().from(glEntries);
    
    // フィルタリング
    if (filter) {
      const conditions = [];
      
      if (filter.search) {
        conditions.push(
          or(
            like(glEntries.voucherNo, `%${filter.search}%`),
            like(glEntries.accountCode, `%${filter.search}%`),
            like(glEntries.accountName, `%${filter.search}%`),
            like(glEntries.description, `%${filter.search}%`)
          )
        );
      }
      
      if (filter.voucherNo) {
        conditions.push(like(glEntries.voucherNo, `%${filter.voucherNo}%`));
      }
      
      if (filter.transactionDateFrom) {
        conditions.push(gte(glEntries.transactionDate, filter.transactionDateFrom));
      }
      
      if (filter.transactionDateTo) {
        conditions.push(lte(glEntries.transactionDate, filter.transactionDateTo));
      }
      
      if (filter.accountCode) {
        conditions.push(like(glEntries.accountCode, `%${filter.accountCode}%`));
      }
      
      if (filter.accountName) {
        conditions.push(like(glEntries.accountName, `%${filter.accountName}%`));
      }
      
      if (filter.debitCredit) {
        conditions.push(eq(glEntries.debitCredit, filter.debitCredit));
      }
      
      if (filter.period) {
        conditions.push(eq(glEntries.period, filter.period));
      }
      
      if (filter.reconciliationStatus) {
        conditions.push(eq(glEntries.reconciliationStatus, filter.reconciliationStatus));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
    }
    
    // ソート
    const sortColumn = glEntries[sortBy];
    if (sortOrder === 'asc') {
      query = query.orderBy(asc(sortColumn)) as any;
    } else {
      query = query.orderBy(desc(sortColumn)) as any;
    }
    
    // ページネーション
    query = query.limit(limit).offset(offset) as any;
    
    return await query;
  }
  
  /**
   * IDでGLデータを取得
   */
  async findById(id: string): Promise<GLEntry | null> {
    const result = await db.select().from(glEntries).where(eq(glEntries.id, id));
    return result[0] || null;
  }
  
  /**
   * 伝票番号でGLデータを取得
   */
  async findByVoucherNo(voucherNo: string): Promise<GLEntry[]> {
    return await db.select().from(glEntries).where(eq(glEntries.voucherNo, voucherNo));
  }
  
  /**
   * 期間でGLデータを取得
   */
  async findByPeriod(period: string): Promise<GLEntry[]> {
    return await db.select().from(glEntries).where(eq(glEntries.period, period));
  }
  
  /**
   * 突合されていないGLデータを取得
   */
  async findUnmatched(period?: string): Promise<GLEntry[]> {
    if (period) {
      return await db.select().from(glEntries).where(and(
        eq(glEntries.reconciliationStatus, 'unmatched'),
        eq(glEntries.period, period)
      ));
    }
    
    return await db.select().from(glEntries).where(eq(glEntries.reconciliationStatus, 'unmatched'));
  }
  
  /**
   * 突合済みGLデータを取得
   */
  async findMatched(period?: string): Promise<GLEntry[]> {
    if (period) {
      return await db.select().from(glEntries).where(and(
        eq(glEntries.reconciliationStatus, 'matched'),
        eq(glEntries.period, period)
      ));
    }
    
    return await db.select().from(glEntries).where(eq(glEntries.reconciliationStatus, 'matched'));
  }
  
  /**
   * GLデータを作成
   */
  async create(data: NewGLEntry): Promise<GLEntry> {
    const result = await db.insert(glEntries).values(data).returning();
    return result[0];
  }
  
  /**
   * GLデータを更新
   */
  async update(id: string, data: Partial<NewGLEntry>): Promise<GLEntry | null> {
    const result = await db
      .update(glEntries)
      .set({ ...data })
      .where(eq(glEntries.id, id))
      .returning();
    
    return result[0] || null;
  }
  
  /**
   * GLデータを削除
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(glEntries).where(eq(glEntries.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  
  /**
   * 突合ステータスを更新
   */
  async updateReconciliationStatus(
    id: string, 
    status: 'matched' | 'fuzzy' | 'unmatched',
    orderMatchId?: string
  ): Promise<GLEntry | null> {
    const updateData: any = {
      reconciliationStatus: status
    };
    
    if (orderMatchId) {
      updateData.orderMatchId = orderMatchId;
    } else if (status === 'unmatched') {
      updateData.orderMatchId = null;
    }
    
    const result = await db
      .update(glEntries)
      .set(updateData)
      .where(eq(glEntries.id, id))
      .returning();
    
    return result[0] || null;
  }
  
  /**
   * GLデータ総数を取得
   */
  async count(filter?: GLEntryFilter): Promise<number> {
    const query = db.select({ count: glEntries.id }).from(glEntries);
    
    if (filter) {
      const conditions = [];
      
      if (filter.search) {
        conditions.push(
          or(
            like(glEntries.voucherNo, `%${filter.search}%`),
            like(glEntries.accountCode, `%${filter.search}%`),
            like(glEntries.accountName, `%${filter.search}%`),
            like(glEntries.description, `%${filter.search}%`)
          )
        );
      }
      
      if (filter.voucherNo) {
        conditions.push(like(glEntries.voucherNo, `%${filter.voucherNo}%`));
      }
      
      if (filter.transactionDateFrom) {
        conditions.push(gte(glEntries.transactionDate, filter.transactionDateFrom));
      }
      
      if (filter.transactionDateTo) {
        conditions.push(lte(glEntries.transactionDate, filter.transactionDateTo));
      }
      
      if (filter.accountCode) {
        conditions.push(like(glEntries.accountCode, `%${filter.accountCode}%`));
      }
      
      if (filter.period) {
        conditions.push(eq(glEntries.period, filter.period));
      }
      
      if (filter.reconciliationStatus) {
        conditions.push(eq(glEntries.reconciliationStatus, filter.reconciliationStatus));
      }
      
      if (conditions.length > 0) {
        const result = await db.select({ count: glEntries.id }).from(glEntries).where(and(...conditions));
        return result.length;
      }
    }
    
    const result = await query;
    return result.length;
  }
}