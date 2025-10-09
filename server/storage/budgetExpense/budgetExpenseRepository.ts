import type { BudgetExpense, BudgetExpenseFilter, NewBudgetExpense } from "@shared/schema";
import { budgetsExpense } from "@shared/schema";
import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "../../db";

export class BudgetExpenseRepository {
  /**
   * 販管費予算テーブル（budgets_expense）を操作するリポジトリ
   */

  async findAll(options: {
    filter?: BudgetExpenseFilter;
    limit?: number;
    offset?: number;
    sortBy?: "fiscalYear" | "accountingItem" | "budgetAmount" | "createdAt";
    sortOrder?: "asc" | "desc";
  }): Promise<BudgetExpense[]> {
    const { filter, limit = 100, offset = 0, sortBy = "fiscalYear", sortOrder = "desc" } = options;

    const conditions = this.buildWhereConditions(filter);

    const orderByColumn = {
      fiscalYear: budgetsExpense.fiscalYear,
      accountingItem: budgetsExpense.accountingItem,
      budgetAmount: budgetsExpense.budgetAmount,
      createdAt: budgetsExpense.createdAt,
    }[sortBy];

    const query = db
      .select()
      .from(budgetsExpense)
      .where(conditions)
      .limit(limit)
      .offset(offset);

    if (sortOrder === "asc") {
      return await query.orderBy(orderByColumn);
    }
    return await query.orderBy(desc(orderByColumn));
  }

  async count(filter?: BudgetExpenseFilter): Promise<number> {
    const conditions = this.buildWhereConditions(filter);

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(budgetsExpense)
      .where(conditions);

    return result[0]?.count || 0;
  }

  async findById(id: string): Promise<BudgetExpense | null> {
    const result = await db
      .select()
      .from(budgetsExpense)
      .where(eq(budgetsExpense.id, id))
      .limit(1);

    return result[0] || null;
  }

  async findByFiscalYear(fiscalYear: number): Promise<BudgetExpense[]> {
    return await db
      .select()
      .from(budgetsExpense)
      .where(eq(budgetsExpense.fiscalYear, fiscalYear))
      .orderBy(budgetsExpense.accountingItem);
  }

  async create(data: NewBudgetExpense): Promise<BudgetExpense> {
    const result = await db.insert(budgetsExpense).values(data).returning();
    return result[0];
  }

  async update(id: string, data: Partial<NewBudgetExpense>): Promise<BudgetExpense | null> {
    const result = await db
      .update(budgetsExpense)
      .set(data)
      .where(eq(budgetsExpense.id, id))
      .returning();

    return result[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(budgetsExpense)
      .where(eq(budgetsExpense.id, id))
      .returning();

    return result.length > 0;
  }

  private buildWhereConditions(filter?: BudgetExpenseFilter) {
    if (!filter) {
      return undefined;
    }

    const conditions = [];

    if (filter.fiscalYear !== undefined) {
      conditions.push(eq(budgetsExpense.fiscalYear, filter.fiscalYear));
    }

    if (filter.accountingItem) {
      conditions.push(eq(budgetsExpense.accountingItem, filter.accountingItem));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}

