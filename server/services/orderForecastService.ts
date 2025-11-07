import { CreateOrderForecastData, OrderForecast, OrderForecastFilter,UpdateOrderForecastData } from '@shared/schema/integrated';
import type { AccountingItemMonthlySummary, MonthlySummaryResponse } from '@shared/schema/orderForecast';

import { db } from '../db';
import { AppError } from '../middleware/errorHandler';
import { AccountingItemRepository } from '../storage/accountingItem';
import { AngleBForecastRepository } from '../storage/angleBForecast';
import { GLEntryRepository } from '../storage/glEntry';
import { OrderForecastRepository } from '../storage/orderForecast';
import { ProjectRepository } from '../storage/project';

/**
 * 受発注データ管理サービスクラス
 * 
 * @description 受発注データに関するビジネスロジックを担当
 * @responsibility 受発注データの作成・更新・削除・突合処理時のビジネスルール適用
 */
export class OrderForecastService {
  constructor(
    private orderForecastRepository: OrderForecastRepository,
    private projectRepository: ProjectRepository,
    private glEntryRepository: GLEntryRepository,
    private accountingItemRepository: AccountingItemRepository,
    private angleBForecastRepository: AngleBForecastRepository
  ) {}

  /**
   * 受発注データ一覧取得
   * 
   * @param filter - 検索フィルター
   * @param limit - 取得件数制限
   * @param offset - オフセット
   * @param sortBy - ソート項目
   * @param sortOrder - ソート順序
   * @returns 受発注データ一覧と総件数
   */
  async getOrderForecasts(
    filter: OrderForecastFilter = {},
    limit: number = 20,
    offset: number = 0,
    sortBy: 'projectCode' | 'customerName' | 'accountingPeriod' | 'amount' | 'createdAt' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ orderForecasts: OrderForecast[]; totalCount: number }> {
    try {
      const [orderForecasts, totalCount] = await Promise.all([
        this.orderForecastRepository.findAll({
          filter,
          limit,
          offset,
          sortBy,
          sortOrder,
        }),
        this.orderForecastRepository.count(filter),
      ]);

      return { orderForecasts, totalCount };
    } catch (error) {
      console.error('受発注データ一覧取得エラー:', error);
      throw new AppError('受発注データ一覧の取得中にエラーが発生しました', 500);
    }
  }

  /**
   * 受発注データ詳細取得
   * 
   * @param id - 受発注データID
   * @returns 受発注データ詳細情報
   * @throws AppError - 受発注データが見つからない場合
   */
  async getOrderForecastById(id: string): Promise<OrderForecast> {
    try {
      const orderForecast = await this.orderForecastRepository.findById(id);
      
      if (!orderForecast) {
        throw new AppError('受発注データが見つかりません', 404);
      }

      return orderForecast;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('受発注データ詳細取得エラー:', error);
      throw new AppError('受発注データ詳細の取得中にエラーが発生しました', 500);
    }
  }

  /**
   * 期間別受発注データ取得
   * 
   * @param period - 期間
   * @returns 期間別受発注データ一覧
   */
  async getOrderForecastsByPeriod(period: string): Promise<OrderForecast[]> {
    try {
      return await this.orderForecastRepository.findByPeriod(period);
    } catch (error) {
      console.error('期間別受発注データ取得エラー:', error);
      throw new AppError('期間別受発注データの取得中にエラーが発生しました', 500);
    }
  }

  /**
   * 未突合受発注データ取得
   * 
   * @param period - 期間（オプション）
   * @returns 未突合受発注データ一覧
   */
  async getUnmatchedOrderForecasts(period?: string): Promise<OrderForecast[]> {
    try {
      return await this.orderForecastRepository.findUnmatched(period);
    } catch (error) {
      console.error('未突合受発注データ取得エラー:', error);
      throw new AppError('未突合受発注データの取得中にエラーが発生しました', 500);
    }
  }

  /**
   * 突合済み受発注データ取得
   * 
   * @param period - 期間（オプション）
   * @returns 突合済み受発注データ一覧
   */
  async getMatchedOrderForecasts(period?: string): Promise<OrderForecast[]> {
    try {
      return await this.orderForecastRepository.findMatched(period);
    } catch (error) {
      console.error('突合済み受発注データ取得エラー:', error);
      throw new AppError('突合済み受発注データの取得中にエラーが発生しました', 500);
    }
  }

  /**
   * 受発注データ作成
   * 
   * @param data - 受発注データ作成データ
   * @param user - 作成者ユーザー情報
   * @returns 作成された受発注データ情報
   * @throws AppError - プロジェクト不存在時
   */
  async createOrderForecast(
    data: CreateOrderForecastData, 
    user: { id: string; employee?: { id: number } }
  ): Promise<OrderForecast> {
    try {
      // プロジェクトの存在チェック
      const project = await this.projectRepository.findById(data.projectId);
      if (!project) {
        throw new AppError('指定されたプロジェクトが見つかりません', 404);
      }

      // 受発注データの作成
      const orderForecastData = {
        ...data,
        createdByUserId: user.id,
        createdByEmployeeId: user.employee?.id?.toString(),
      };

      const orderForecast = await this.orderForecastRepository.create(orderForecastData);
      
      return orderForecast;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('受発注データ作成エラー:', error);
      throw new AppError('受発注データの作成中にエラーが発生しました', 500);
    }
  }

  /**
   * 受発注データ更新
   * 
   * @param id - 受発注データID
   * @param data - 受発注データ更新データ
   * @returns 更新された受発注データ情報
   * @throws AppError - 受発注データが見つからない場合
   */
  async updateOrderForecast(id: string, data: UpdateOrderForecastData): Promise<OrderForecast> {
    try {
      // 受発注データの存在チェック
      const existingOrderForecast = await this.orderForecastRepository.findById(id);
      if (!existingOrderForecast) {
        throw new AppError('受発注データが見つかりません', 404);
      }

      // プロジェクトの存在チェック（プロジェクトID変更時）
      if (data.projectId && data.projectId !== existingOrderForecast.projectId) {
        const project = await this.projectRepository.findById(data.projectId);
        if (!project) {
          throw new AppError('指定されたプロジェクトが見つかりません', 404);
        }
      }

      const orderForecast = await this.orderForecastRepository.update(id, data);
      
      if (!orderForecast) {
        throw new AppError('受発注データの更新に失敗しました', 500);
      }

      return orderForecast;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('受発注データ更新エラー:', error);
      throw new AppError('受発注データの更新中にエラーが発生しました', 500);
    }
  }

  /**
   * 受発注データ削除
   * 
   * @param id - 受発注データID
   * @returns 削除成功フラグ
   * @throws AppError - 受発注データが見つからない場合
   */
  async deleteOrderForecast(id: string): Promise<boolean> {
    try {
      // 受発注データの存在チェック
      const existingOrderForecast = await this.orderForecastRepository.findById(id);
      if (!existingOrderForecast) {
        throw new AppError('受発注データが見つかりません', 404);
      }

      const deleted = await this.orderForecastRepository.delete(id);
      
      if (!deleted) {
        throw new AppError('受発注データの削除に失敗しました', 500);
      }

      return true;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('受発注データ削除エラー:', error);
      throw new AppError('受発注データの削除中にエラーが発生しました', 500);
    }
  }

  /**
   * 突合ステータス更新
   * 
   * @param id - 受発注データID
   * @param status - 突合ステータス
   * @param glMatchId - 突合GLエントリID
   * @returns 更新された受発注データ情報
   * @throws AppError - 受発注データが見つからない場合、不正なステータス時
   */
  async updateReconciliationStatus(
    id: string, 
    status: 'matched' | 'fuzzy' | 'unmatched' | 'excluded', 
    glMatchId?: string
  ): Promise<OrderForecast> {
    try {
      // 受発注データの存在チェック
      const existingOrderForecast = await this.orderForecastRepository.findById(id);
      if (!existingOrderForecast) {
        throw new AppError('受発注データが見つかりません', 404);
      }

      // ステータスの妥当性チェック
      if (!['matched', 'fuzzy', 'unmatched', 'excluded'].includes(status)) {
        throw new AppError('突合ステータスが正しくありません', 400);
      }

      // GLエントリの存在チェック（マッチ時）
      if ((status === 'matched' || status === 'fuzzy') && glMatchId) {
        const glEntry = await this.glEntryRepository.findById(glMatchId);
        if (!glEntry) {
          throw new AppError('指定されたGLエントリが見つかりません', 404);
        }
      }

      const orderForecast = await this.orderForecastRepository.updateReconciliationStatus(
        id,
        status,
        glMatchId
      );
      
      if (!orderForecast) {
        throw new AppError('突合ステータスの更新に失敗しました', 500);
      }

      return orderForecast;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('突合ステータス更新エラー:', error);
      throw new AppError('突合ステータスの更新中にエラーが発生しました', 500);
    }
  }

  /**
   * 受発注データ統計情報取得
   * 
   * @param period - 期間（オプション）
   * @returns 受発注データ統計情報
   */
  async getOrderForecastStatistics(period?: string): Promise<{
    totalCount: number;
    matchedCount: number;
    fuzzyMatchedCount: number;
    unmatchedCount: number;
    totalAmount: number;
    matchedAmount: number;
  }> {
    try {
      const filter = period ? { period } : {};
      const orderForecasts = await this.orderForecastRepository.findAll({ filter });

      const statistics = orderForecasts.reduce(
        (acc, orderForecast) => {
          acc.totalCount++;
          acc.totalAmount += parseFloat(orderForecast.amount || '0');
          
          if (orderForecast.reconciliationStatus === 'matched') {
            acc.matchedCount++;
            acc.matchedAmount += parseFloat(orderForecast.amount || '0');
          } else if (orderForecast.reconciliationStatus === 'fuzzy') {
            acc.fuzzyMatchedCount++;
          } else {
            acc.unmatchedCount++;
          }
          
          return acc;
        },
        {
          totalCount: 0,
          matchedCount: 0,
          fuzzyMatchedCount: 0,
          unmatchedCount: 0,
          totalAmount: 0,
          matchedAmount: 0,
        }
      );

      return statistics;
    } catch (error) {
      console.error('受発注データ統計情報取得エラー:', error);
      throw new AppError('受発注データ統計情報の取得中にエラーが発生しました', 500);
    }
  }

  /**
   * 受発注見込み明細の除外設定
   * 
   * @param ids - 受発注見込み明細IDリスト
   * @param isExcluded - 除外フラグ
   * @param exclusionReason - 除外理由
   * @returns 更新件数
   */
  async setExclusion(ids: string[], isExcluded: boolean, exclusionReason?: string): Promise<number> {
    try {
      let updatedCount = 0;
      
      await db.transaction(async (_tx) => {
        for (const id of ids) {
          const updated = await this.orderForecastRepository.update(id, {
            reconciliationStatus: isExcluded ? 'excluded' : 'unmatched',
            glMatchId: isExcluded ? null : undefined, // 除外時は突合情報をクリア
            isExcluded: isExcluded ? 'true' : 'false',
            exclusionReason: isExcluded ? exclusionReason : null,
          });
          if (updated) {
            updatedCount++;
          }
        }
      });

      return updatedCount;
    } catch (error) {
      console.error('除外設定エラー:', error);
      throw new AppError('除外設定の更新中にエラーが発生しました', 500);
    }
  }

  /**
   * 計上区分別月次サマリ取得
   * 
   * @param fiscalYear - 年度
   * @param includeAngleB - 角度B案件を含めるかどうか
   * @param salesPerson - 営業担当者（オプション）
   * @returns 月次サマリレスポンス
   */
  async getMonthlySummaryByAccountingItem(fiscalYear: number, includeAngleB: boolean = false, salesPerson?: string): Promise<MonthlySummaryResponse> {
    try {
      // 計上区分マスタから全15種類を取得（コード昇順）
      const accountingItems = await this.accountingItemRepository.findAll({
        sortBy: 'code',
        sortOrder: 'asc'
      });

      // 年度の全12ヶ月（4月〜3月）を生成
      const months: string[] = [];
      for (let month = 4; month <= 12; month++) {
        months.push(`${fiscalYear}-${month.toString().padStart(2, '0')}`);
      }
      for (let month = 1; month <= 3; month++) {
        months.push(`${fiscalYear + 1}-${month.toString().padStart(2, '0')}`);
      }

      // order_forecastsから年度のデータを集計
      const monthlyData = await this.orderForecastRepository.getMonthlySummary(fiscalYear, salesPerson);

      // 角度B案件データを取得（includeAngleBがtrueの場合）
      let angleBData: Array<{
        accounting_period: string;
        accounting_item: string;
        total_amount: string;
      }> = [];
      
      if (includeAngleB) {
        angleBData = await this.angleBForecastRepository.getMonthlySummary(fiscalYear, salesPerson);
      }

      // 計上区分のマッピング定義
      const revenueCodes = ['511', '512', '513', '514', '515']; // 純売上
      const costOfSalesCodes = ['541', '1100', '1200', '1300', '1400']; // 売上原価
      const sgaExpensesCodes = ['727', '737', '740', '745', '9999']; // 販管費

      // コード→名称のマッピング作成
      const codeToNameMap = new Map<string, string>();
      accountingItems.forEach(item => {
        codeToNameMap.set(item.code, item.name);
      });

      // データを月次・計上区分別に整理
      const dataMap = new Map<string, Map<string, number>>();
      
      // 受発注見込みデータを処理
      monthlyData.forEach(row => {
        const period = row.accounting_period;
        const item = row.accounting_item;
        const amount = parseFloat(row.total_amount);

        // 計上区分がコードの場合は名称に変換、既に名称の場合はそのまま使用
        const itemName = codeToNameMap.get(item) || item;

        if (!dataMap.has(period)) {
          dataMap.set(period, new Map());
        }
        const existingAmount = dataMap.get(period)!.get(itemName) || 0;
        dataMap.get(period)!.set(itemName, existingAmount + amount);
      });

      // 角度B案件データを処理（includeAngleBがtrueの場合）
      if (includeAngleB) {
        angleBData.forEach(row => {
          const period = row.accounting_period;
          const item = row.accounting_item;
          const amount = parseFloat(row.total_amount);

          // 角度B案件の計上科目は既に名称で格納されているため、そのまま使用
          const itemName = item;

          if (!dataMap.has(period)) {
            dataMap.set(period, new Map());
          }
          const existingAmount = dataMap.get(period)!.get(itemName) || 0;
          dataMap.get(period)!.set(itemName, existingAmount + amount);
        });
      }

      // AccountingItemMonthlySummary配列を作成
      const accountingItemSummaries: AccountingItemMonthlySummary[] = [];
      const summaries = {
        revenue: { monthlyTotals: {} as Record<string, number> },
        costOfSales: { monthlyTotals: {} as Record<string, number> },
        sgaExpenses: { monthlyTotals: {} as Record<string, number> }
      };

      // 各月のサマリを初期化
      months.forEach(month => {
        summaries.revenue.monthlyTotals[month] = 0;
        summaries.costOfSales.monthlyTotals[month] = 0;
        summaries.sgaExpenses.monthlyTotals[month] = 0;
      });

      // 各計上区分のデータを処理
      accountingItems.forEach(item => {
        const monthlyAmounts: Record<string, number> = {};
        let category: 'revenue' | 'costOfSales' | 'sgaExpenses';

        // カテゴリを決定
        if (revenueCodes.includes(item.code)) {
          category = 'revenue';
        } else if (costOfSalesCodes.includes(item.code)) {
          category = 'costOfSales';
        } else if (sgaExpensesCodes.includes(item.code)) {
          category = 'sgaExpenses';
        } else {
          return; // 該当しない計上区分はスキップ
        }

        // 各月の金額を取得
        months.forEach(month => {
          const amount = dataMap.get(month)?.get(item.name) || 0;
          monthlyAmounts[month] = amount;
          summaries[category].monthlyTotals[month] += amount;
        });

        accountingItemSummaries.push({
          code: item.code,
          name: item.name,
          category,
          monthlyAmounts
        });
      });

      return {
        fiscalYear,
        months,
        accountingItems: accountingItemSummaries,
        summaries
      };
    } catch (error) {
      console.error('月次サマリ取得エラー:', error);
      throw new AppError('月次サマリの取得中にエラーが発生しました', 500);
    }
  }

  /**
   * 営業担当者別サマリ取得
   * 
   * @param fiscalYear - 年度
   * @param includeAngleB - 角度B案件を含むかどうか
   * @param salesPersons - 営業担当者リスト（オプション）
   * @returns 営業担当者別・サービス区分別の集計データ
   */
  async getSalesPersonSummary(fiscalYear: number, includeAngleB: boolean = false, salesPersons?: string[]): Promise<{
    fiscalYear: number;
    salesPersons: string[];
    summaries: Array<{
      salesPerson: string;
      serviceType: string;
      analysisType: string;
      revenueWithAngleB: number;
      costOfSalesWithAngleB: number;
      grossProfitWithAngleB: number;
      revenueWithoutAngleB: number;
      costOfSalesWithoutAngleB: number;
      grossProfitWithoutAngleB: number;
    }>;
  }> {
    try {
      // 計上区分のマッピング定義（名称ベース）
      const revenueNames = ['保守売上', 'ソフト売上', '商品売上', '消耗品売上', 'その他売上']; // 純売上
      const costOfSalesNames = ['仕入高', '外注加工費', '支払保守料', '期首商品棚卸高', '期首製品棚卸高']; // 売上原価

      // 並列でデータを取得（パフォーマンス最適化）
      const [orderForecastData, angleBData] = await Promise.all([
        this.orderForecastRepository.getSalesPersonSummary(fiscalYear, salesPersons),
        includeAngleB ? this.angleBForecastRepository.getSalesPersonSummary(fiscalYear, salesPersons) : Promise.resolve([])
      ]);

      console.log('営業担当者別サマリ - データ取得結果:', {
        fiscalYear,
        salesPersons,
        orderForecastDataCount: orderForecastData.length,
        angleBDataCount: angleBData.length,
        firstOrderForecastRow: orderForecastData[0],
        firstAngleBRow: angleBData[0]
      });

      // 営業担当者・サービス区分・分析区分別の集計データを構築
      const summaryMap = new Map<string, {
        salesPerson: string;
        serviceType: string;
        analysisType: string;
        revenueWithAngleB: number;
        costOfSalesWithAngleB: number;
        revenueWithoutAngleB: number;
        costOfSalesWithoutAngleB: number;
      }>();

      // 受発注見込みデータを処理（角度B含まない）
      let processedCount = 0;
      let skippedCount = 0;
      for (const row of orderForecastData) {
        if (!row.sales_person || !row.service_type || !row.analysis_type) {
          skippedCount++;
          continue;
        }
        
        const key = `${row.sales_person}_${row.service_type}_${row.analysis_type}`;
        const amount = parseFloat(row.total_amount);
        
        if (!summaryMap.has(key)) {
          summaryMap.set(key, {
            salesPerson: row.sales_person,
            serviceType: row.service_type,
            analysisType: row.analysis_type,
            revenueWithAngleB: 0,
            costOfSalesWithAngleB: 0,
            revenueWithoutAngleB: 0,
            costOfSalesWithoutAngleB: 0,
          });
        }
        
        const summary = summaryMap.get(key)!;
        
        // 計上科目名称で分類
        if (revenueNames.includes(row.accounting_item)) {
          summary.revenueWithoutAngleB += amount;
          summary.revenueWithAngleB += amount;
          processedCount++;
        } else if (costOfSalesNames.includes(row.accounting_item)) {
          summary.costOfSalesWithoutAngleB += amount;
          summary.costOfSalesWithAngleB += amount;
          processedCount++;
        } else {
          console.log('営業担当者別サマリ - 未分類の計上科目:', {
            sales_person: row.sales_person,
            service_type: row.service_type,
            analysis_type: row.analysis_type,
            accounting_item: row.accounting_item,
            amount: row.total_amount
          });
        }
      }
      
      console.log('営業担当者別サマリ - 受発注見込みデータ処理結果:', {
        totalRows: orderForecastData.length,
        processedCount,
        skippedCount,
        summaryMapSize: summaryMap.size
      });

      // 角度B案件データを処理（includeAngleBがtrueの場合）
      if (includeAngleB) {
        for (const row of angleBData) {
          if (!row.sales_person || !row.service_type || !row.analysis_type) continue;
          
          const key = `${row.sales_person}_${row.service_type}_${row.analysis_type}`;
          const amount = parseFloat(row.total_amount);
          
          if (!summaryMap.has(key)) {
            summaryMap.set(key, {
              salesPerson: row.sales_person,
              serviceType: row.service_type,
              analysisType: row.analysis_type,
              revenueWithAngleB: 0,
              costOfSalesWithAngleB: 0,
              revenueWithoutAngleB: 0,
              costOfSalesWithoutAngleB: 0,
            });
          }
          
          const summary = summaryMap.get(key)!;
          
          // 角度B案件の計上科目は名称で格納されているため、名称で判定
          const accountingItemName = row.accounting_item;
          
          // 売上系（保守売上、ソフト売上、商品売上、消耗品売上、その他売上）
          if (accountingItemName === '保守売上' || accountingItemName === 'ソフト売上' || 
              accountingItemName === '商品売上' || accountingItemName === '消耗品売上' || 
              accountingItemName === 'その他売上') {
            summary.revenueWithAngleB += amount;
          }
          // 仕入高
          else if (accountingItemName === '仕入高') {
            summary.costOfSalesWithAngleB += amount;
          }
        }
      }

      // 結果を配列に変換し、粗利を計算
      const summaries = Array.from(summaryMap.values()).map(summary => ({
        salesPerson: summary.salesPerson,
        serviceType: summary.serviceType,
        analysisType: summary.analysisType,
        revenueWithAngleB: summary.revenueWithAngleB,
        costOfSalesWithAngleB: summary.costOfSalesWithAngleB,
        grossProfitWithAngleB: summary.revenueWithAngleB - summary.costOfSalesWithAngleB,
        revenueWithoutAngleB: summary.revenueWithoutAngleB,
        costOfSalesWithoutAngleB: summary.costOfSalesWithoutAngleB,
        grossProfitWithoutAngleB: summary.revenueWithoutAngleB - summary.costOfSalesWithoutAngleB,
      }));

      // 営業担当者リストを取得（選択されていない場合は全営業担当者）
      const allSalesPersons = Array.from(new Set(summaries.map(s => s.salesPerson))).sort();
      const selectedSalesPersons = salesPersons && salesPersons.length > 0 ? salesPersons : allSalesPersons;

      console.log('営業担当者別サマリ取得結果:', {
        fiscalYear,
        orderForecastDataCount: orderForecastData.length,
        angleBDataCount: angleBData.length,
        summariesCount: summaries.length,
        allSalesPersonsCount: allSalesPersons.length,
        firstSummary: summaries[0]
      });

      return {
        fiscalYear,
        salesPersons: selectedSalesPersons,
        summaries
      };
    } catch (error) {
      console.error('営業担当者別サマリ取得エラー:', error);
      throw new AppError('営業担当者別サマリの取得中にエラーが発生しました', 500);
    }
  }
}
