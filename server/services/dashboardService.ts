import type { DashboardData } from '@shared/schema/budgetTarget/types';

import { AccountingItemRepository } from '../storage/accountingItem';
import { AngleBForecastRepository } from '../storage/angleBForecast';
import { BudgetExpenseRepository } from '../storage/budgetExpense';
import { BudgetRevenueRepository } from '../storage/budgetRevenue';
import { GLEntryRepository } from '../storage/glEntry';
import { OrderForecastRepository } from '../storage/orderForecast';
import { ProjectRepository } from '../storage/project';
import { BudgetExpenseService } from './budgetExpenseService';
import { BudgetRevenueService } from './budgetRevenueService';
import { OrderForecastService } from './orderForecastService';

/**
 * ダッシュボード管理サービスクラス
 * 
 * @description ダッシュボードデータの集計・計算を担当
 * @responsibility 予算と実績データの比較、KPI指標の計算
 */
export class DashboardService {
  private budgetRevenueService: BudgetRevenueService;
  private budgetExpenseService: BudgetExpenseService;
  private orderForecastService: OrderForecastService;

  constructor() {
    const budgetRevenueRepository = new BudgetRevenueRepository();
    const budgetExpenseRepository = new BudgetExpenseRepository();
    const orderForecastRepository = new OrderForecastRepository();
    const projectRepository = new ProjectRepository();
    const glEntryRepository = new GLEntryRepository();
    const accountingItemRepository = new AccountingItemRepository();
    const angleBForecastRepository = new AngleBForecastRepository();

    this.budgetRevenueService = new BudgetRevenueService(budgetRevenueRepository);
    this.budgetExpenseService = new BudgetExpenseService(budgetExpenseRepository);
    this.orderForecastService = new OrderForecastService(
      orderForecastRepository,
      projectRepository,
      glEntryRepository,
      accountingItemRepository,
      angleBForecastRepository
    );
  }

  /**
   * ダッシュボードデータ取得
   * 
   * @param fiscalYear - 年度
   * @returns ダッシュボードデータ
   */
  async getDashboardData(fiscalYear: number): Promise<DashboardData> {
    try {
      // 予算データ取得
      const [revenueBudget, expenseBudget] = await Promise.all([
        this.budgetRevenueService.getAnnualBudgetByFiscalYear(fiscalYear),
        this.budgetExpenseService.getAnnualBudgetByFiscalYear(fiscalYear)
      ]);

      // 実績データ取得（受発注見込みから）
      const monthlySummary = await this.orderForecastService.getMonthlySummaryByAccountingItem(fiscalYear, false);

      // 実績データを集計
      const revenueActual = this.calculateActualAmount(monthlySummary, 'revenue');
      const expenseActual = this.calculateActualAmount(monthlySummary, 'expense');

      // 利益計算
      const profitBudget = revenueBudget - expenseBudget;
      const profitActual = revenueActual - expenseActual;

      // KPI指標計算
      const revenueAchievementRate = revenueBudget > 0 ? (revenueActual / revenueBudget) * 100 : 0;
      const profitMarginBudget = revenueBudget > 0 ? (profitBudget / revenueBudget) * 100 : 0;
      const profitMarginActual = revenueActual > 0 ? (profitActual / revenueActual) * 100 : 0;
      const varianceAmount = profitActual - profitBudget;

      return {
        fiscalYear,
        revenueBudget,
        revenueActual,
        expenseBudget,
        expenseActual,
        profitBudget,
        profitActual,
        revenueAchievementRate,
        profitMarginBudget,
        profitMarginActual,
        varianceAmount
      };
    } catch (error) {
      console.error('ダッシュボードデータ取得エラー:', error);
      throw new Error('ダッシュボードデータの取得中にエラーが発生しました');
    }
  }

  /**
   * 実績金額を計算
   * 
   * @param monthlySummary - 月次サマリデータ
   * @param type - 計算タイプ（revenue: 売上, expense: 費用）
   * @returns 実績金額
   */
  private calculateActualAmount(monthlySummary: any, type: 'revenue' | 'expense'): number {
    const summaries = monthlySummary.summaries;
    
    if (type === 'revenue') {
      // 売上実績（純売上）
      return Object.values(summaries.revenue.monthlyTotals).reduce((sum: number, amount: any) => sum + amount, 0);
    } else {
      // 費用実績（売上原価 + 販管費）
      const costOfSales = Object.values(summaries.costOfSales.monthlyTotals).reduce((sum: number, amount: any) => sum + amount, 0);
      const sgaExpenses = Object.values(summaries.sgaExpenses.monthlyTotals).reduce((sum: number, amount: any) => sum + amount, 0);
      return costOfSales + sgaExpenses;
    }
  }
}
