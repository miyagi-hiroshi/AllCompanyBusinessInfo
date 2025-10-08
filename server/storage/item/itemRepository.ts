import type { Item, NewItem } from '@shared/schema/integrated';
import { items } from '@shared/schema/item';
import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';

import { db } from '../../db';
import type { ItemFilter, ItemSearchOptions } from './types';

/**
 * アイテムテーブル（items）を操作するリポジトリ
 * 
 * @description アイテムマスタのCRUD操作を提供
 * @table items - アイテムマスタテーブル
 */
export class ItemRepository {
  /**
   * 全てのアイテムを取得
   * 
   * @param options - 検索オプション（フィルタ、ページネーション、ソート）
   * @returns アイテムの配列
   */
  async findAll(options: ItemSearchOptions = {}): Promise<Item[]> {
    const { filter = {}, limit, offset, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    
    let query = db.select().from(items);
    
    // フィルタリング
    const conditions = [];
    if (filter.search) {
      conditions.push(
        or(
          like(items.code, `%${filter.search}%`),
          like(items.name, `%${filter.search}%`)
        )
      );
    }
    if (filter.code) {
      conditions.push(like(items.code, `%${filter.code}%`));
    }
    if (filter.name) {
      conditions.push(like(items.name, `%${filter.name}%`));
    }
    if (filter.category) {
      conditions.push(like(items.category, `%${filter.category}%`));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    // ソート
    const orderColumn = items[sortBy];
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
   * アイテムの総数を取得
   * 
   * @param filter - フィルタ条件
   * @returns アイテムの総数
   */
  async count(filter: ItemFilter = {}): Promise<number> {
    const conditions = [];
    if (filter.search) {
      conditions.push(
        or(
          like(items.code, `%${filter.search}%`),
          like(items.name, `%${filter.search}%`)
        )
      );
    }
    if (filter.code) {
      conditions.push(like(items.code, `%${filter.code}%`));
    }
    if (filter.name) {
      conditions.push(like(items.name, `%${filter.name}%`));
    }
    if (filter.category) {
      conditions.push(like(items.category, `%${filter.category}%`));
    }
    
    let query = db.select({ count: sql<number>`count(*)` }).from(items);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const result = await query;
    return Number(result[0].count);
  }

  /**
   * IDでアイテムを取得
   * 
   * @param id - アイテムID
   * @returns アイテム（存在しない場合はnull）
   */
  async findById(id: string): Promise<Item | null> {
    const result = await db.select().from(items).where(eq(items.id, id));
    return result[0] || null;
  }

  /**
   * コードでアイテムを取得
   * 
   * @param code - アイテムコード
   * @returns アイテム（存在しない場合はnull）
   */
  async findByCode(code: string): Promise<Item | null> {
    const result = await db.select().from(items).where(eq(items.code, code));
    return result[0] || null;
  }

  /**
   * アイテムを作成
   * 
   * @param data - 作成するアイテムデータ
   * @returns 作成されたアイテム
   */
  async create(data: NewItem): Promise<Item> {
    const result = await db.insert(items).values(data).returning();
    return result[0];
  }

  /**
   * アイテムを更新
   * 
   * @param id - アイテムID
   * @param data - 更新データ
   * @returns 更新されたアイテム（存在しない場合はnull）
   */
  async update(id: string, data: Partial<NewItem>): Promise<Item | null> {
    const result = await db.update(items)
      .set(data)
      .where(eq(items.id, id))
      .returning();
    return result[0] || null;
  }

  /**
   * アイテムを削除
   * 
   * @param id - アイテムID
   * @returns 削除成功の可否
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(items).where(eq(items.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * コードの重複チェック
   * 
   * @param code - チェックするコード
   * @param excludeId - 除外するアイテムID（更新時）
   * @returns コードが存在するかどうか
   */
  async isCodeExists(code: string, excludeId?: string): Promise<boolean> {
    const conditions = [eq(items.code, code)];
    
    if (excludeId) {
      conditions.push(sql`${items.id} != ${excludeId}`);
    }
    
    const result = await db.select({ id: items.id })
      .from(items)
      .where(and(...conditions));
    
    return result.length > 0;
  }
}
