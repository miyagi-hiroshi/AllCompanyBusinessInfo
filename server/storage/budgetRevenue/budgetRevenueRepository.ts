import type { BudgetRevenue, BudgetRevenueFilter, NewBudgetRevenue } from "@shared/schema";
import { budgetsRevenue } from "@shared/schema";
import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "../../db";

export class BudgetRevenueRepository {
  /**
   * 売上予算テーブル（budgets_revenue）を操作するリポジトリ
   */

  async findAll(options: {
    filter?: BudgetRevenueFilter;
    limit?: number;
    offset?: number;
    sortBy?: "fiscalYear" | "serviceType" | "budgetAmount" | "createdAt";
    sortOrder?: "asc" | "desc";
  }): Promise<BudgetRevenue[]> {
    const { filter, limit = 100, offset = 0, sortBy = "fiscalYear", sortOrder = "desc" } = options;

    const conditions = this.buildWhereConditions(filter);

    const orderByColumn = {
      fiscalYear: budgetsRevenue.fiscalYear,
      serviceType: budgetsRevenue.serviceType,
      budgetAmount: budgetsRevenue.budgetAmount,
      createdAt: budgetsRevenue.createdAt,
    }[sortBy];

    const query = db
      .select()
      .from(budgetsRevenue)
      .where(conditions)
      .limit(limit)
      .offset(offset);

    if (sortOrder === "asc") {
      return await query.orderBy(orderByColumn);
    }
    return await query.orderBy(desc(orderByColumn));
  }

  async count(filter?: BudgetRevenueFilter): Promise<number> {
    const conditions = this.buildWhereConditions(filter);

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(budgetsRevenue)
      .where(conditions);

    return result[0]?.count || 0;
  }

  async findById(id: string): Promise<BudgetRevenue | null> {
    const result = await db
      .select()
      .from(budgetsRevenue)
      .where(eq(budgetsRevenue.id, id))
      .limit(1);

    return result[0] || null;
  }

  async findByFiscalYear(fiscalYear: number): Promise<BudgetRevenue[]> {
    return await db
      .select()
      .from(budgetsRevenue)
      .where(eq(budgetsRevenue.fiscalYear, fiscalYear))
      .orderBy(budgetsRevenue.serviceType);
  }

  async create(data: NewBudgetRevenue): Promise<BudgetRevenue> {
    const result = await db.insert(budgetsRevenue).values(data).returning();
    return result[0];
  }

  async update(id: string, data: Partial<NewBudgetRevenue>): Promise<BudgetRevenue | null> {
    const result = await db
      .update(budgetsRevenue)
      .set(data)
      .where(eq(budgetsRevenue.id, id))
      .returning();

    return result[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(budgetsRevenue)
      .where(eq(budgetsRevenue.id, id))
      .returning();

    return result.length > 0;
  }

  private buildWhereConditions(filter?: BudgetRevenueFilter) {
    if (!filter) {
      return undefined;
    }

    const conditions = [];

    if (filter.fiscalYear !== undefined) {
      conditions.push(eq(budgetsRevenue.fiscalYear, filter.fiscalYear));
    }

    if (filter.serviceType) {
      conditions.push(eq(budgetsRevenue.serviceType, filter.serviceType));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}

