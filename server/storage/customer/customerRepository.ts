/**
 * 顧客管理リポジトリ
 * 
 * 責務:
 * - 顧客マスタテーブル（customers）のCRUD操作
 * - 顧客データの検索・フィルタリング
 * - 顧客データのバリデーション
 */

import { db } from '../../db';
import { customers } from '@shared/schema/customer';
import { eq, like, desc, asc, and, or } from 'drizzle-orm';
import type { Customer, NewCustomer } from '@shared/schema/integrated';

export interface CustomerFilter {
  search?: string;
  code?: string;
  name?: string;
}

export interface CustomerSearchOptions {
  filter?: CustomerFilter;
  limit?: number;
  offset?: number;
  sortBy?: 'code' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export class CustomerRepository {
  /**
   * 全ての顧客を取得
   */
  async findAll(options: CustomerSearchOptions = {}): Promise<Customer[]> {
    const { filter, limit = 100, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    
    let query = db.select().from(customers);
    
    // フィルタリング
    if (filter) {
      const conditions = [];
      
      if (filter.search) {
        conditions.push(
          or(
            like(customers.code, `%${filter.search}%`),
            like(customers.name, `%${filter.search}%`)
          )
        );
      }
      
      if (filter.code) {
        conditions.push(like(customers.code, `%${filter.code}%`));
      }
      
      if (filter.name) {
        conditions.push(like(customers.name, `%${filter.name}%`));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    // ソート
    const sortColumn = customers[sortBy];
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
   * IDで顧客を取得
   */
  async findById(id: string): Promise<Customer | null> {
    const result = await db.select().from(customers).where(eq(customers.id, id));
    return result[0] || null;
  }
  
  /**
   * 顧客コードで顧客を取得
   */
  async findByCode(code: string): Promise<Customer | null> {
    const result = await db.select().from(customers).where(eq(customers.code, code));
    return result[0] || null;
  }
  
  /**
   * 顧客を作成
   */
  async create(data: NewCustomer): Promise<Customer> {
    const result = await db.insert(customers).values(data).returning();
    return result[0];
  }
  
  /**
   * 顧客を更新
   */
  async update(id: string, data: Partial<NewCustomer>): Promise<Customer | null> {
    const result = await db
      .update(customers)
      .set({ ...data })
      .where(eq(customers.id, id))
      .returning();
    
    return result[0] || null;
  }
  
  /**
   * 顧客を削除
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(customers).where(eq(customers.id, id));
    return result.rowCount > 0;
  }
  
  /**
   * 顧客コードの重複チェック
   */
  async isCodeExists(code: string, excludeId?: string): Promise<boolean> {
    let query = db.select().from(customers).where(eq(customers.code, code));
    
    if (excludeId) {
      query = query.where(and(eq(customers.code, code), eq(customers.id, excludeId)));
    }
    
    const result = await query;
    return result.length > 0;
  }
  
  /**
   * 顧客総数を取得
   */
  async count(filter?: CustomerFilter): Promise<number> {
    let query = db.select({ count: customers.id }).from(customers);
    
    if (filter) {
      const conditions = [];
      
      if (filter.search) {
        conditions.push(
          or(
            like(customers.code, `%${filter.search}%`),
            like(customers.name, `%${filter.search}%`)
          )
        );
      }
      
      if (filter.code) {
        conditions.push(like(customers.code, `%${filter.code}%`));
      }
      
      if (filter.name) {
        conditions.push(like(customers.name, `%${filter.name}%`));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    const result = await query;
    return result.length;
  }
}