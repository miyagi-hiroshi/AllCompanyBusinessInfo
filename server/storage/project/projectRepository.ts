/**
 * プロジェクト管理リポジトリ
 * 
 * 責務:
 * - プロジェクトマスタテーブル（projects）のCRUD操作
 * - プロジェクトデータの検索・フィルタリング
 * - プロジェクトデータのバリデーション
 */

import type { NewProject,Project } from '@shared/schema/integrated';
import { projects } from '@shared/schema/project';
import { and, asc, count,desc, eq, like, ne, or, sql } from 'drizzle-orm';

import { db } from '../../db';

export interface ProjectFilter {
  search?: string;
  code?: string;
  name?: string;
  fiscalYear?: number;
  customerId?: string;
  customerName?: string;
  salesPerson?: string;
  serviceType?: string;
  analysisType?: string;
}

export interface ProjectSearchOptions {
  filter?: ProjectFilter;
  limit?: number;
  offset?: number;
  sortBy?: 'code' | 'name' | 'fiscalYear' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export class ProjectRepository {
  /**
   * 全てのプロジェクトを取得
   */
  async findAll(options: ProjectSearchOptions = {}): Promise<Project[]> {
    const { filter, limit = 100, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    
    let query = db.select().from(projects);
    
    // フィルタリング
    if (filter) {
      const conditions = [];
      
      if (filter.search) {
        conditions.push(
          or(
            like(projects.code, `%${filter.search}%`),
            like(projects.name, `%${filter.search}%`),
            like(projects.customerName, `%${filter.search}%`),
            like(projects.salesPerson, `%${filter.search}%`)
          )
        );
      }
      
      if (filter.code) {
        conditions.push(like(projects.code, `%${filter.code}%`));
      }
      
      if (filter.name) {
        conditions.push(like(projects.name, `%${filter.name}%`));
      }
      
      if (filter.fiscalYear) {
        conditions.push(eq(projects.fiscalYear, filter.fiscalYear));
      }
      
      if (filter.customerId) {
        conditions.push(eq(projects.customerId, filter.customerId));
      }
      
      if (filter.customerName) {
        conditions.push(like(projects.customerName, `%${filter.customerName}%`));
      }
      
      if (filter.salesPerson) {
        conditions.push(like(projects.salesPerson, `%${filter.salesPerson}%`));
      }
      
      if (filter.serviceType) {
        conditions.push(eq(projects.serviceType, filter.serviceType));
      }
      
      if (filter.analysisType) {
        conditions.push(eq(projects.analysisType, filter.analysisType));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
    }
    
    // ソート
    const sortColumn = projects[sortBy];
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
   * IDでプロジェクトを取得
   */
  async findById(id: string): Promise<Project | null> {
    const result = await db.select().from(projects).where(eq(projects.id, id));
    return result[0] || null;
  }
  
  /**
   * プロジェクトコードでプロジェクトを取得
   */
  async findByCode(code: string): Promise<Project | null> {
    const result = await db.select().from(projects).where(eq(projects.code, code));
    return result[0] || null;
  }
  
  /**
   * 年度でプロジェクトを取得
   */
  async findByFiscalYear(fiscalYear: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.fiscalYear, fiscalYear));
  }
  
  /**
   * 顧客IDでプロジェクトを取得
   */
  async findByCustomerId(customerId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.customerId, customerId));
  }
  
  /**
   * プロジェクトを作成
   */
  async create(data: NewProject): Promise<Project> {
    const result = await db.insert(projects).values(data).returning();
    return result[0];
  }
  
  /**
   * プロジェクトを更新
   */
  async update(id: string, data: Partial<NewProject>): Promise<Project | null> {
    const result = await db
      .update(projects)
      .set({ ...data })
      .where(eq(projects.id, id))
      .returning();
    
    return result[0] || null;
  }
  
  /**
   * プロジェクトを削除
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  
  /**
   * プロジェクトコードの重複チェック
   */
  async isCodeExists(code: string, excludeId?: string): Promise<boolean> {
    if (excludeId) {
      const result = await db.select().from(projects).where(and(eq(projects.code, code), ne(projects.id, excludeId)));
      return result.length > 0;
    }
    
    const result = await db.select().from(projects).where(eq(projects.code, code));
    return result.length > 0;
  }
  
  /**
   * プロジェクト総数を取得
   */
  async count(filter?: ProjectFilter): Promise<number> {
    if (filter) {
      const conditions = [];
      
      if (filter.search) {
        conditions.push(
          or(
            like(projects.code, `%${filter.search}%`),
            like(projects.name, `%${filter.search}%`),
            like(projects.customerName, `%${filter.search}%`),
            like(projects.salesPerson, `%${filter.search}%`)
          )
        );
      }
      
      if (filter.code) {
        conditions.push(like(projects.code, `%${filter.code}%`));
      }
      
      if (filter.name) {
        conditions.push(like(projects.name, `%${filter.name}%`));
      }
      
      if (filter.fiscalYear) {
        conditions.push(eq(projects.fiscalYear, filter.fiscalYear));
      }
      
      if (filter.customerId) {
        conditions.push(eq(projects.customerId, filter.customerId));
      }
      
      if (filter.customerName) {
        conditions.push(like(projects.customerName, `%${filter.customerName}%`));
      }
      
      if (filter.salesPerson) {
        conditions.push(like(projects.salesPerson, `%${filter.salesPerson}%`));
      }
      
      if (filter.serviceType) {
        conditions.push(eq(projects.serviceType, filter.serviceType));
      }
      
      if (filter.analysisType) {
        conditions.push(eq(projects.analysisType, filter.analysisType));
      }
      
      if (conditions.length > 0) {
        const result = await db.select({ count: count() }).from(projects).where(and(...conditions));
        return result[0]?.count ?? 0;
      }
    }
    
    const result = await db.select({ count: count() }).from(projects);
    return result[0]?.count ?? 0;
  }

  /**
   * 営業担当者一覧取得
   * 
   * @returns 重複なしの営業担当者リスト
   */
  async getSalesPersons(): Promise<string[]> {
    const result = await db
      .selectDistinct({ salesPerson: projects.salesPerson })
      .from(projects)
      .where(and(
        sql`${projects.salesPerson} IS NOT NULL`,
        sql`${projects.salesPerson} != ''`
      ))
      .orderBy(projects.salesPerson);

    return result.map(row => row.salesPerson).filter(Boolean);
  }
}