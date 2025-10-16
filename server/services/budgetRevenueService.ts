import type { BudgetRevenue, BudgetRevenueFilter, NewBudgetRevenue } from "@shared/schema";

import { BudgetRevenueRepository } from "../storage/budgetRevenue";

export class BudgetRevenueService {
  constructor(private budgetRevenueRepository: BudgetRevenueRepository) {}

  async getBudgetsRevenue(
    filter?: BudgetRevenueFilter,
    limit?: number,
    offset?: number,
    sortBy?: "fiscalYear" | "serviceType" | "budgetAmount" | "createdAt",
    sortOrder?: "asc" | "desc"
  ): Promise<{ budgetsRevenue: BudgetRevenue[]; totalCount: number }> {
    const [budgetsRevenue, totalCount] = await Promise.all([
      this.budgetRevenueRepository.findAll({
        filter,
        limit,
        offset,
        sortBy,
        sortOrder,
      }),
      this.budgetRevenueRepository.count(filter),
    ]);

    return { budgetsRevenue, totalCount };
  }

  async getBudgetRevenueById(id: string): Promise<BudgetRevenue> {
    const budgetRevenue = await this.budgetRevenueRepository.findById(id);
    if (!budgetRevenue) {
      throw new Error(`売上予算が見つかりません: ${id}`);
    }
    return budgetRevenue;
  }

  async createBudgetRevenue(data: NewBudgetRevenue): Promise<BudgetRevenue> {
    return await this.budgetRevenueRepository.create(data);
  }

  async updateBudgetRevenue(id: string, data: Partial<NewBudgetRevenue>): Promise<BudgetRevenue> {
    const updated = await this.budgetRevenueRepository.update(id, data);
    if (!updated) {
      throw new Error(`売上予算が見つかりません: ${id}`);
    }
    return updated;
  }

  async deleteBudgetRevenue(id: string): Promise<void> {
    const deleted = await this.budgetRevenueRepository.delete(id);
    if (!deleted) {
      throw new Error(`売上予算が見つかりません: ${id}`);
    }
  }

  async getAnnualBudgetByFiscalYear(fiscalYear: number): Promise<number> {
    return await this.budgetRevenueRepository.getAnnualTotal(fiscalYear);
  }
}

