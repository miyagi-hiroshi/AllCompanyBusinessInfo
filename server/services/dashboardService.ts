import type { DashboardData, ServiceRevenueComparison } from '@shared/schema/budgetTarget/types';

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
  private budgetRevenueRepository: BudgetRevenueRepository;
  private orderForecastRepository: OrderForecastRepository;

  constructor() {
    const budgetRevenueRepository = new BudgetRevenueRepository();
    const budgetExpenseRepository = new BudgetExpenseRepository();
    const orderForecastRepository = new OrderForecastRepository();
    const projectRepository = new ProjectRepository();
    const glEntryRepository = new GLEntryRepository();
    const accountingItemRepository = new AccountingItemRepository();
    const angleBForecastRepository = new AngleBForecastRepository();

    this.budgetRevenueRepository = budgetRevenueRepository;
    this.orderForecastRepository = orderForecastRepository;
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
      const profitMarginBudget = revenueBudget > 0 ? (profitBudget / revenueBudget) * 100 : 0;
      const profitMarginActual = revenueActual > 0 ? (profitActual / revenueActual) * 100 : 0;
      const costRateBudget = revenueBudget > 0 ? (expenseBudget / revenueBudget) * 100 : 0;
      const costRateActual = revenueActual > 0 ? (expenseActual / revenueActual) * 100 : 0;

      return {
        fiscalYear,
        revenueBudget,
        revenueActual,
        expenseBudget,
        expenseActual,
        profitBudget,
        profitActual,
        profitMarginBudget,
        profitMarginActual,
        costRateBudget,
        costRateActual
      };
    } catch (error) {
      console.error('ダッシュボードデータ取得エラー:', error);
      throw new Error('ダッシュボードデータの取得中にエラーが発生しました');
    }
  }

  /**
   * サービス毎の売上予実比較データ取得
   * 
   * @param fiscalYear - 年度
   * @returns サービス毎の売上予実比較データ
   */
  async getServiceRevenueComparison(fiscalYear: number): Promise<ServiceRevenueComparison[]> {
    try {
      // 予算と実績を並列で取得
      const [budgetMap, revenueMap] = await Promise.all([
        this.budgetRevenueRepository.getBudgetByServiceType(fiscalYear),
        this.orderForecastRepository.getRevenueByServiceType(fiscalYear)
      ]);

      // サービス区分の順序定義
      const serviceOrder = ['インテグレーション', 'エンジニアリング', 'ソフトウェアマネージド', 'リセール'];
      
      // 全てのサービス区分を収集（予算と実績の両方から）
      const allServiceTypes = new Set<string>();
      budgetMap.forEach((_, serviceType) => allServiceTypes.add(serviceType));
      revenueMap.forEach((_, serviceType) => allServiceTypes.add(serviceType));

      // サービス区分ごとにデータを構築
      const comparisons: ServiceRevenueComparison[] = [];
      
      for (const serviceType of serviceOrder) {
        if (allServiceTypes.has(serviceType)) {
          const revenueBudget = budgetMap.get(serviceType) || 0;
          const revenueActual = revenueMap.get(serviceType) || 0;
          const difference = revenueActual - revenueBudget;
          const achievementRate = revenueBudget > 0 ? (revenueActual / revenueBudget) * 100 : 0;

          comparisons.push({
            serviceType,
            revenueBudget,
            revenueActual,
            difference,
            achievementRate
          });
        }
      }

      // 順序定義にないサービス区分も追加（念のため）
      for (const serviceType of allServiceTypes) {
        if (!serviceOrder.includes(serviceType)) {
          const revenueBudget = budgetMap.get(serviceType) || 0;
          const revenueActual = revenueMap.get(serviceType) || 0;
          const difference = revenueActual - revenueBudget;
          const achievementRate = revenueBudget > 0 ? (revenueActual / revenueBudget) * 100 : 0;

          comparisons.push({
            serviceType,
            revenueBudget,
            revenueActual,
            difference,
            achievementRate
          });
        }
      }

      return comparisons;
    } catch (error) {
      console.error('サービス毎の売上予実比較データ取得エラー:', error);
      throw new Error('サービス毎の売上予実比較データの取得中にエラーが発生しました');
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
