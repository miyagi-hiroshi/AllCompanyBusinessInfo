import type { BudgetExpense, BudgetExpenseFilter, NewBudgetExpense } from "@shared/schema";

import { BudgetExpenseRepository } from "../storage/budgetExpense";

export class BudgetExpenseService {
  constructor(private budgetExpenseRepository: BudgetExpenseRepository) {}

  async getBudgetsExpense(
    filter?: BudgetExpenseFilter,
    limit?: number,
    offset?: number,
    sortBy?: "fiscalYear" | "accountingItem" | "budgetAmount" | "createdAt",
    sortOrder?: "asc" | "desc"
  ): Promise<{ budgetsExpense: BudgetExpense[]; totalCount: number }> {
    const [budgetsExpense, totalCount] = await Promise.all([
      this.budgetExpenseRepository.findAll({
        filter,
        limit,
        offset,
        sortBy,
        sortOrder,
      }),
      this.budgetExpenseRepository.count(filter),
    ]);

    return { budgetsExpense, totalCount };
  }

  async getBudgetExpenseById(id: string): Promise<BudgetExpense> {
    const budgetExpense = await this.budgetExpenseRepository.findById(id);
    if (!budgetExpense) {
      throw new Error(`販管費予算が見つかりません: ${id}`);
    }
    return budgetExpense;
  }

  async createBudgetExpense(data: NewBudgetExpense): Promise<BudgetExpense> {
    return await this.budgetExpenseRepository.create(data);
  }

  async updateBudgetExpense(id: string, data: Partial<NewBudgetExpense>): Promise<BudgetExpense> {
    const updated = await this.budgetExpenseRepository.update(id, data);
    if (!updated) {
      throw new Error(`販管費予算が見つかりません: ${id}`);
    }
    return updated;
  }

  async deleteBudgetExpense(id: string): Promise<void> {
    const deleted = await this.budgetExpenseRepository.delete(id);
    if (!deleted) {
      throw new Error(`販管費予算が見つかりません: ${id}`);
    }
  }

  async getAnnualBudgetByFiscalYear(fiscalYear: number): Promise<number> {
    return await this.budgetExpenseRepository.getAnnualTotal(fiscalYear);
  }
}

