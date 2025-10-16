import type { BudgetTarget, BudgetTargetFilter,NewBudgetTarget } from "@shared/schema";
import { budgetsTarget } from "@shared/schema/budgetTarget/tables";
import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "../../db";

export interface BudgetTargetSearchOptions {
  filter?: BudgetTargetFilter;
  limit?: number;
  offset?: number;
  sortBy?: "fiscalYear" | "serviceType" | "analysisType" | "targetValue" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export class BudgetTargetRepository {
  /**
   * 目標値予算テーブル（budgets_target）を操作するリポジトリ
   */

  async findAll(options: BudgetTargetSearchOptions = {}): Promise<BudgetTarget[]> {
    const {
      filter = {},
      limit = 20,
      offset = 0,
      sortBy = "fiscalYear",
      sortOrder = "desc",
    } = options;

    // フィルター条件を追加
    const conditions = [];

    if (filter.fiscalYear) {
      conditions.push(eq(budgetsTarget.fiscalYear, filter.fiscalYear));
    }

    if (filter.serviceType) {
      conditions.push(eq(budgetsTarget.serviceType, filter.serviceType));
    }

    if (filter.analysisType) {
      conditions.push(eq(budgetsTarget.analysisType, filter.analysisType));
    }

    // ソート条件を追加
    const sortColumn = budgetsTarget[sortBy];
    const orderByClause = sortColumn ? (sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn)) : undefined;

    // クエリを構築
    if (conditions.length > 0) {
      if (orderByClause) {
        return await db
          .select()
          .from(budgetsTarget)
          .where(and(...conditions))
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset);
      } else {
        return await db
          .select()
          .from(budgetsTarget)
          .where(and(...conditions))
          .limit(limit)
          .offset(offset);
      }
    } else {
      if (orderByClause) {
        return await db
          .select()
          .from(budgetsTarget)
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset);
      } else {
        return await db
          .select()
          .from(budgetsTarget)
          .limit(limit)
          .offset(offset);
      }
    }
  }

  async findById(id: string): Promise<BudgetTarget | null> {
    const result = await db
      .select()
      .from(budgetsTarget)
      .where(eq(budgetsTarget.id, id))
      .limit(1);

    return result[0] || null;
  }

  async create(data: NewBudgetTarget): Promise<BudgetTarget> {
    const result = await db
      .insert(budgetsTarget)
      .values({
        ...data,
        targetValue: data.targetValue,
      })
      .returning();

    return result[0];
  }

  async update(id: string, data: Partial<NewBudgetTarget>): Promise<BudgetTarget> {
    const result = await db
      .update(budgetsTarget)
      .set({
        ...data,
        targetValue: data.targetValue,
      })
      .where(eq(budgetsTarget.id, id))
      .returning();

    if (result.length === 0) {
      throw new Error("目標値予算が見つかりません");
    }

    return result[0];
  }

  async delete(id: string): Promise<void> {
    const result = await db
      .delete(budgetsTarget)
      .where(eq(budgetsTarget.id, id))
      .returning();

    if (result.length === 0) {
      throw new Error("目標値予算が見つかりません");
    }
  }

  async count(filter: BudgetTargetFilter = {}): Promise<number> {
    // フィルター条件を追加
    const conditions = [];

    if (filter.fiscalYear) {
      conditions.push(eq(budgetsTarget.fiscalYear, filter.fiscalYear));
    }

    if (filter.serviceType) {
      conditions.push(eq(budgetsTarget.serviceType, filter.serviceType));
    }

    if (filter.analysisType) {
      conditions.push(eq(budgetsTarget.analysisType, filter.analysisType));
    }

    // クエリを構築
    if (conditions.length > 0) {
      const result = await db
        .select({ count: budgetsTarget.id })
        .from(budgetsTarget)
        .where(and(...conditions));
      return result.length;
    } else {
      const result = await db
        .select({ count: budgetsTarget.id })
        .from(budgetsTarget);
      return result.length;
    }
  }

  async findByFiscalYearAndServiceType(
    fiscalYear: number,
    serviceType: string,
    analysisType: string
  ): Promise<BudgetTarget | null> {
    const result = await db
      .select()
      .from(budgetsTarget)
      .where(
        and(
          eq(budgetsTarget.fiscalYear, fiscalYear),
          eq(budgetsTarget.serviceType, serviceType),
          eq(budgetsTarget.analysisType, analysisType)
        )
      )
      .limit(1);

    return result[0] || null;
  }
}

