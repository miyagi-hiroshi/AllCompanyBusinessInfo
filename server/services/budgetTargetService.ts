import type { BudgetTarget, BudgetTargetFilter,NewBudgetTarget } from "@shared/schema";

import { BudgetTargetRepository } from "../storage/budgetTarget";

export class BudgetTargetService {
  constructor(private budgetTargetRepository: BudgetTargetRepository) {}

  async getBudgetTargets(filter: BudgetTargetFilter = {}): Promise<BudgetTarget[]> {
    return await this.budgetTargetRepository.findAll({ filter });
  }

  async getBudgetTargetById(id: string): Promise<BudgetTarget> {
    const budgetTarget = await this.budgetTargetRepository.findById(id);
    if (!budgetTarget) {
      throw new Error("目標値予算が見つかりません");
    }
    return budgetTarget;
  }

  async createBudgetTarget(data: NewBudgetTarget): Promise<BudgetTarget> {
    // 重複チェック
    const existing = await this.budgetTargetRepository.findByFiscalYearAndServiceType(
      data.fiscalYear,
      data.serviceType,
      data.analysisType
    );

    if (existing) {
      throw new Error(
        `${data.fiscalYear}年度の${data.serviceType}（${data.analysisType}）の目標値は既に登録されています`
      );
    }

    // バリデーション
    this.validateBudgetTargetData(data);

    return await this.budgetTargetRepository.create(data);
  }

  async updateBudgetTarget(id: string, data: Partial<NewBudgetTarget>): Promise<BudgetTarget> {
    // 存在チェック
    const existing = await this.budgetTargetRepository.findById(id);
    if (!existing) {
      throw new Error("目標値予算が見つかりません");
    }

    // 重複チェック（年度、サービス区分、分析区分が変更される場合）
    if (data.fiscalYear || data.serviceType || data.analysisType) {
      const fiscalYear = data.fiscalYear || existing.fiscalYear;
      const serviceType = data.serviceType || existing.serviceType;
      const analysisType = data.analysisType || existing.analysisType;

      const duplicate = await this.budgetTargetRepository.findByFiscalYearAndServiceType(
        fiscalYear,
        serviceType,
        analysisType
      );

      if (duplicate && duplicate.id !== id) {
        throw new Error(
          `${fiscalYear}年度の${serviceType}（${analysisType}）の目標値は既に登録されています`
        );
      }
    }

    // バリデーション
    this.validateBudgetTargetData({ ...existing, ...data });

    return await this.budgetTargetRepository.update(id, data);
  }

  async deleteBudgetTarget(id: string): Promise<void> {
    // 存在チェック
    const existing = await this.budgetTargetRepository.findById(id);
    if (!existing) {
      throw new Error("目標値予算が見つかりません");
    }

    await this.budgetTargetRepository.delete(id);
  }

  async getBudgetTargetCount(filter: BudgetTargetFilter = {}): Promise<number> {
    return await this.budgetTargetRepository.count(filter);
  }

  private validateBudgetTargetData(data: Partial<NewBudgetTarget>): void {
    if (data.fiscalYear && (data.fiscalYear < 2000 || data.fiscalYear > 2100)) {
      throw new Error("年度は2000年から2100年の間で入力してください");
    }

    if (data.serviceType && !data.serviceType.trim()) {
      throw new Error("サービス区分を入力してください");
    }

    if (data.analysisType && !["生産性", "粗利"].includes(data.analysisType)) {
      throw new Error("分析区分は「生産性」または「粗利」を選択してください");
    }

    if (data.targetValue) {
      const targetValue = parseFloat(data.targetValue);
      if (isNaN(targetValue) || targetValue < 0) {
        throw new Error("目標値は0以上の数値を入力してください");
      }

      // 生産性の場合は小数点2桁まで、粗利の場合は整数のみ
      if (data.analysisType === "生産性") {
        if (targetValue > 999.99) {
          throw new Error("生産性の目標値は999.99以下で入力してください");
        }
      } else if (data.analysisType === "粗利") {
        if (!Number.isInteger(targetValue)) {
          throw new Error("粗利の目標値は整数で入力してください");
        }
        if (targetValue > 999999999999) {
          throw new Error("粗利の目標値は999,999,999,999以下で入力してください");
        }
      }
    }
  }
}

