import type { AngleBForecast, AngleBForecastFilter, NewAngleBForecast } from "@shared/schema";
import { angleBForecasts } from "@shared/schema";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "../../db";

export class AngleBForecastRepository {
  /**
   * 角度B案件テーブル（angle_b_forecasts）を操作するリポジトリ
   */

  async findAll(options: {
    filter?: AngleBForecastFilter;
    limit?: number;
    offset?: number;
    sortBy?: "accountingPeriod" | "amount" | "probability" | "createdAt";
    sortOrder?: "asc" | "desc";
  }): Promise<AngleBForecast[]> {
    const { filter, limit = 100, offset = 0, sortBy = "createdAt", sortOrder = "desc" } = options;

    const conditions = this.buildWhereConditions(filter);

    const orderByColumn = {
      accountingPeriod: angleBForecasts.accountingPeriod,
      amount: angleBForecasts.amount,
      probability: angleBForecasts.probability,
      createdAt: angleBForecasts.createdAt,
    }[sortBy];

    const query = db
      .select()
      .from(angleBForecasts)
      .where(conditions)
      .limit(limit)
      .offset(offset);

    if (sortOrder === "asc") {
      return await query.orderBy(orderByColumn);
    }
    return await query.orderBy(desc(orderByColumn));
  }

  async count(filter?: AngleBForecastFilter): Promise<number> {
    const conditions = this.buildWhereConditions(filter);

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(angleBForecasts)
      .where(conditions);

    return result[0]?.count || 0;
  }

  async findById(id: string): Promise<AngleBForecast | null> {
    const result = await db
      .select()
      .from(angleBForecasts)
      .where(eq(angleBForecasts.id, id))
      .limit(1);

    return result[0] || null;
  }

  async findByPeriod(period: string): Promise<AngleBForecast[]> {
    return await db
      .select()
      .from(angleBForecasts)
      .where(eq(angleBForecasts.period, period))
      .orderBy(desc(angleBForecasts.createdAt));
  }

  async create(data: NewAngleBForecast): Promise<AngleBForecast> {
    const result = await db.insert(angleBForecasts).values(data).returning();
    return result[0];
  }

  async update(id: string, data: Partial<NewAngleBForecast>): Promise<AngleBForecast | null> {
    const result = await db
      .update(angleBForecasts)
      .set(data)
      .where(eq(angleBForecasts.id, id))
      .returning();

    return result[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(angleBForecasts)
      .where(eq(angleBForecasts.id, id))
      .returning();

    return result.length > 0;
  }

  private buildWhereConditions(filter?: AngleBForecastFilter) {
    if (!filter) {
      return undefined;
    }

    const conditions = [];

    if (filter.search) {
      conditions.push(
        or(
          ilike(angleBForecasts.description, `%${filter.search}%`),
          ilike(angleBForecasts.projectCode, `%${filter.search}%`),
          ilike(angleBForecasts.projectName, `%${filter.search}%`),
          ilike(angleBForecasts.customerName, `%${filter.search}%`)
        )
      );
    }

    if (filter.projectId) {
      conditions.push(eq(angleBForecasts.projectId, filter.projectId));
    }

    if (filter.projectCode) {
      conditions.push(eq(angleBForecasts.projectCode, filter.projectCode));
    }

    if (filter.customerId) {
      conditions.push(eq(angleBForecasts.customerId, filter.customerId));
    }

    if (filter.customerCode) {
      conditions.push(eq(angleBForecasts.customerCode, filter.customerCode));
    }

    if (filter.accountingPeriod) {
      conditions.push(eq(angleBForecasts.accountingPeriod, filter.accountingPeriod));
    }

    if (filter.accountingItem) {
      conditions.push(eq(angleBForecasts.accountingItem, filter.accountingItem));
    }

    if (filter.period) {
      conditions.push(eq(angleBForecasts.period, filter.period));
    }

    if (filter.probability !== undefined) {
      conditions.push(eq(angleBForecasts.probability, filter.probability));
    }

    if (filter.createdByUserId) {
      conditions.push(eq(angleBForecasts.createdByUserId, filter.createdByUserId));
    }

    if (filter.createdByEmployeeId) {
      conditions.push(eq(angleBForecasts.createdByEmployeeId, filter.createdByEmployeeId));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}

