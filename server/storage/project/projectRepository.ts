/**
 * プロジェクト管理リポジトリ
 * 
 * 責務:
 * - プロジェクトマスタテーブル（projects）のCRUD操作
 * - プロジェクトデータの検索・フィルタリング
 * - プロジェクトデータのバリデーション
 */

import { db } from '../../db';
import { projects } from '@shared/schema/project';
import { eq, like, desc, asc, and, or } from 'drizzle-orm';
import type { Project, NewProject } from '@shared/schema/integrated';

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
        query = query.where(and(...conditions));
      }
    }
    
    // ソート
    const sortColumn = projects[sortBy];
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
    return result.rowCount > 0;
  }
  
  /**
   * プロジェクトコードの重複チェック
   */
  async isCodeExists(code: string, excludeId?: string): Promise<boolean> {
    let query = db.select().from(projects).where(eq(projects.code, code));
    
    if (excludeId) {
      query = query.where(and(eq(projects.code, code), eq(projects.id, excludeId)));
    }
    
    const result = await query;
    return result.length > 0;
  }
  
  /**
   * プロジェクト総数を取得
   */
  async count(filter?: ProjectFilter): Promise<number> {
    let query = db.select({ count: projects.id }).from(projects);
    
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
        query = query.where(and(...conditions));
      }
    }
    
    const result = await query;
    return result.length;
  }
}