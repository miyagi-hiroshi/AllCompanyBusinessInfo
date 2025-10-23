import type { NewStaffing, Staffing, StaffingFilter } from "@shared/schema";
import { staffing } from "@shared/schema";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { db } from "../../db";

export class StaffingRepository {
  /**
   * 配員計画テーブル（staffing）を操作するリポジトリ
   */

  async findAll(options: {
    filter?: StaffingFilter;
    limit?: number;
    offset?: number;
    sortBy?: "fiscalYear" | "month" | "employeeId" | "employeeName" | "workHours" | "createdAt";
    sortOrder?: "asc" | "desc";
  }): Promise<Staffing[]> {
    const { filter, limit = 100, offset = 0, sortBy = "createdAt", sortOrder = "desc" } = options;

    const conditions = this.buildWhereConditions(filter);

    const orderByColumn = {
      fiscalYear: staffing.fiscalYear,
      month: staffing.month,
      employeeId: staffing.employeeId,
      employeeName: staffing.employeeName,
      workHours: staffing.workHours,
      createdAt: staffing.createdAt,
    }[sortBy];

    const query = db
      .select()
      .from(staffing)
      .where(conditions)
      .limit(limit)
      .offset(offset);

    if (sortOrder === "asc") {
      return await query.orderBy(orderByColumn);
    }
    return await query.orderBy(desc(orderByColumn));
  }

  async count(filter?: StaffingFilter): Promise<number> {
    const conditions = this.buildWhereConditions(filter);

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(staffing)
      .where(conditions);

    return result[0]?.count || 0;
  }

  async findById(id: string): Promise<Staffing | null> {
    const result = await db.select().from(staffing).where(eq(staffing.id, id)).limit(1);

    return result[0] || null;
  }

  async create(data: NewStaffing): Promise<Staffing> {
    const result = await db.insert(staffing).values(data).returning();
    return result[0];
  }

  async update(id: string, data: Partial<NewStaffing>): Promise<Staffing | null> {
    const result = await db.update(staffing).set(data).where(eq(staffing.id, id)).returning();

    return result[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(staffing).where(eq(staffing.id, id)).returning();

    return result.length > 0;
  }

  /**
   * 指定年度の月別工数集計を取得
   * 
   * @param fiscalYear - 年度
   * @returns 従業員ID、月、工数の集計データ
   */
  async getMonthlyAggregation(fiscalYear: number): Promise<Array<{
    employeeId: string;
    employeeName: string;
    month: number;
    totalHours: number;
  }>> {
    const result = await db
      .select({
        employeeId: staffing.employeeId,
        employeeName: staffing.employeeName,
        month: staffing.month,
        totalHours: sql<number>`COALESCE(SUM(${staffing.workHours}::numeric), 0)`,
      })
      .from(staffing)
      .where(eq(staffing.fiscalYear, fiscalYear))
      .groupBy(staffing.employeeId, staffing.employeeName, staffing.month)
      .orderBy(staffing.employeeId, staffing.month);

    return result.map(row => ({
      employeeId: row.employeeId!,
      employeeName: row.employeeName,
      month: row.month,
      totalHours: parseFloat(row.totalHours.toString())
    }));
  }

  /**
   * プロジェクト分析サマリー用の配員計画データ一括集計
   * 
   * @param fiscalYear - 年度
   * @param projectIds - プロジェクトIDリスト
   * @returns プロジェクトID別の工数集計Map
   */
  async getProjectWorkHoursSummary(fiscalYear: number, projectIds: string[]): Promise<Map<string, number>> {
    if (projectIds.length === 0) {
      return new Map();
    }

    // 年度内の全プロジェクトの配員計画データを一括取得・集計
    const result = await db
      .select({
        projectId: staffing.projectId,
        totalWorkHours: sql<number>`COALESCE(SUM(${staffing.workHours}::numeric), 0)`
      })
      .from(staffing)
      .where(
        and(
          inArray(staffing.projectId, projectIds),
          eq(staffing.fiscalYear, fiscalYear)
        )
      )
      .groupBy(staffing.projectId);

    // プロジェクトID別の工数集計Mapを作成
    const workHoursMap = new Map<string, number>();
    
    for (const row of result) {
      if (row.projectId) {
        workHoursMap.set(row.projectId, parseFloat(row.totalWorkHours.toString()));
      }
    }
    
    return workHoursMap;
  }

  private buildWhereConditions(filter?: StaffingFilter) {
    if (!filter) {
      return undefined;
    }

    const conditions = [];

    if (filter.projectId) {
      // 配列の場合はinArray、単一の場合はeq
      if (Array.isArray(filter.projectId)) {
        conditions.push(inArray(staffing.projectId, filter.projectId));
      } else {
        conditions.push(eq(staffing.projectId, filter.projectId));
      }
    }

    if (filter.fiscalYear !== undefined) {
      conditions.push(eq(staffing.fiscalYear, filter.fiscalYear));
    }

    if (filter.month !== undefined) {
      conditions.push(eq(staffing.month, filter.month));
    }

    if (filter.employeeId) {
      conditions.push(eq(staffing.employeeId, filter.employeeId));
    }

    if (filter.employeeName) {
      conditions.push(
        or(ilike(staffing.employeeName, `%${filter.employeeName}%`))
      );
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}

