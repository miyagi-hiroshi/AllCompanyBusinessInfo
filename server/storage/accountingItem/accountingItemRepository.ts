import { accountingItems } from '@shared/schema/accountingItem';
import type { AccountingItem, NewAccountingItem } from '@shared/schema/integrated';
import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';

import { db } from '../../db';
import type { AccountingItemFilter, AccountingItemSearchOptions } from './types';

/**
 * 会計項目テーブル（accounting_items）を操作するリポジトリ
 * 
 * @description 会計項目マスタのCRUD操作を提供
 * @table accounting_items - 会計項目マスタテーブル
 */
export class AccountingItemRepository {
  /**
   * 全ての会計項目を取得
   * 
   * @param options - 検索オプション（フィルタ、ページネーション、ソート）
   * @returns 会計項目の配列
   */
  async findAll(options: AccountingItemSearchOptions = {}): Promise<AccountingItem[]> {
    const { filter = {}, limit, offset, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    
    let query = db.select().from(accountingItems);
    
    // フィルタリング
    const conditions = [];
    if (filter.search) {
      conditions.push(
        or(
          like(accountingItems.code, `%${filter.search}%`),
          like(accountingItems.name, `%${filter.search}%`)
        )
      );
    }
    if (filter.code) {
      conditions.push(like(accountingItems.code, `%${filter.code}%`));
    }
    if (filter.name) {
      conditions.push(like(accountingItems.name, `%${filter.name}%`));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    // ソート
    const orderColumn = accountingItems[sortBy];
    query = query.orderBy(sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn)) as any;
    
    // ページネーション
    if (limit !== undefined) {
      query = query.limit(limit) as any;
    }
    if (offset !== undefined) {
      query = query.offset(offset) as any;
    }
    
    return await query;
  }

  /**
   * 会計項目の総数を取得
   * 
   * @param filter - フィルタ条件
   * @returns 会計項目の総数
   */
  async count(filter: AccountingItemFilter = {}): Promise<number> {
    const conditions = [];
    if (filter.search) {
      conditions.push(
        or(
          like(accountingItems.code, `%${filter.search}%`),
          like(accountingItems.name, `%${filter.search}%`)
        )
      );
    }
    if (filter.code) {
      conditions.push(like(accountingItems.code, `%${filter.code}%`));
    }
    if (filter.name) {
      conditions.push(like(accountingItems.name, `%${filter.name}%`));
    }
    
    let query = db.select({ count: sql<number>`count(*)` }).from(accountingItems);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const result = await query;
    return Number(result[0].count);
  }

  /**
   * IDで会計項目を取得
   * 
   * @param id - 会計項目ID
   * @returns 会計項目（存在しない場合はnull）
   */
  async findById(id: string): Promise<AccountingItem | null> {
    const result = await db.select().from(accountingItems).where(eq(accountingItems.id, id));
    return result[0] || null;
  }

  /**
   * コードで会計項目を取得
   * 
   * @param code - 会計項目コード
   * @returns 会計項目（存在しない場合はnull）
   */
  async findByCode(code: string): Promise<AccountingItem | null> {
    const result = await db.select().from(accountingItems).where(eq(accountingItems.code, code));
    return result[0] || null;
  }

  /**
   * 会計項目を作成
   * 
   * @param data - 作成する会計項目データ
   * @returns 作成された会計項目
   */
  async create(data: NewAccountingItem): Promise<AccountingItem> {
    const result = await db.insert(accountingItems).values(data).returning();
    return result[0];
  }

  /**
   * 会計項目を更新
   * 
   * @param id - 会計項目ID
   * @param data - 更新データ
   * @returns 更新された会計項目（存在しない場合はnull）
   */
  async update(id: string, data: Partial<NewAccountingItem>): Promise<AccountingItem | null> {
    const result = await db.update(accountingItems)
      .set(data)
      .where(eq(accountingItems.id, id))
      .returning();
    return result[0] || null;
  }

  /**
   * 会計項目を削除
   * 
   * @param id - 会計項目ID
   * @returns 削除成功の可否
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(accountingItems).where(eq(accountingItems.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * コードの重複チェック
   * 
   * @param code - チェックするコード
   * @param excludeId - 除外する会計項目ID（更新時）
   * @returns コードが存在するかどうか
   */
  async isCodeExists(code: string, excludeId?: string): Promise<boolean> {
    const conditions = [eq(accountingItems.code, code)];
    
    if (excludeId) {
      conditions.push(sql`${accountingItems.id} != ${excludeId}`);
    }
    
    const result = await db.select({ id: accountingItems.id })
      .from(accountingItems)
      .where(and(...conditions));
    
    return result.length > 0;
  }
}
