import { accountingItems } from '@shared/schema/accountingItem';
import { GLEntry,OrderForecast, ReconciliationLog } from '@shared/schema/integrated';

import { db } from '../db';
import { AppError } from '../middleware/errorHandler';
import { GLEntryRepository } from '../storage/glEntry';
import { OrderForecastRepository } from '../storage/orderForecast';
import { ReconciliationLogRepository } from '../storage/reconciliationLog';

/**
 * 突合処理管理サービスクラス
 * 
 * @description 突合処理に関するビジネスロジックを担当
 * @responsibility 突合処理の実行、統計情報の管理、複数テーブル更新時のトランザクション管理
 */
export class ReconciliationService {
  constructor(
    private reconciliationLogRepository: ReconciliationLogRepository,
    private orderForecastRepository: OrderForecastRepository,
    private glEntryRepository: GLEntryRepository
  ) {}

  /**
   * 突合処理実行
   * 
   * @param period - 期間
   * @param fuzzyThreshold - ファジーマッチの閾値（%）
   * @param dateTolerance - 日付許容範囲（日）
   * @param amountTolerance - 金額許容範囲（円）
   * @returns 突合処理結果
   */
  async executeReconciliation(
    period: string,
    fuzzyThreshold: number = 80,
    dateTolerance: number = 7,
    amountTolerance: number = 1000
  ): Promise<{
    reconciliationLog: ReconciliationLog;
    results: {
      matched: Array<{ order: OrderForecast; gl: GLEntry; score: number }>;
      fuzzyMatched: Array<{ order: OrderForecast; gl: GLEntry; score: number }>;
      unmatchedOrders: OrderForecast[];
      unmatchedGl: GLEntry[];
    };
  }> {
    try {
      // 期間のデータを取得
      const [orderForecasts, glEntries] = await Promise.all([
        this.orderForecastRepository.findByPeriod(period),
        this.glEntryRepository.findByPeriod(period),
      ]);

      // 突合処理の実行
      const reconciliationResults = await this.performReconciliation(
        orderForecasts,
        glEntries,
        fuzzyThreshold,
        dateTolerance,
        amountTolerance
      );

      // トランザクション内で突合結果を保存
      const reconciliationLog = await db.transaction(async (_tx) => {
        // 突合ログの作成
        const log = await this.reconciliationLogRepository.create({
          period,
          executedAt: new Date(),
          matchedCount: reconciliationResults.matched.length,
          fuzzyMatchedCount: reconciliationResults.fuzzyMatched.length,
          unmatchedOrderCount: reconciliationResults.unmatchedOrders.length,
          unmatchedGlCount: reconciliationResults.unmatchedGl.length,
          totalOrderCount: orderForecasts.length,
          totalGlCount: glEntries.length,
        });

        return log;
      });

      return {
        reconciliationLog,
        results: reconciliationResults,
      };
    } catch (error) {
      console.error('突合処理実行エラー:', error);
      throw new AppError('突合処理の実行中にエラーが発生しました', 500);
    }
  }

  /**
   * 突合ログ一覧取得
   * 
   * @param filter - 検索フィルター
   * @param limit - 取得件数制限
   * @param offset - オフセット
   * @param sortBy - ソート項目
   * @param sortOrder - ソート順序
   * @returns 突合ログ一覧と総件数
   */
  async getReconciliationLogs(
    filter: {
      period?: string;
      periodFrom?: string;
      periodTo?: string;
    } = {},
    limit: number = 20,
    offset: number = 0,
    sortBy: 'period' | 'executedAt' = 'executedAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ logs: ReconciliationLog[]; totalCount: number }> {
    try {
      const [logs, totalCount] = await Promise.all([
        this.reconciliationLogRepository.findAll({
          filter,
          limit,
          offset,
          sortBy,
          sortOrder,
        }),
        this.reconciliationLogRepository.count(filter),
      ]);

      return { logs, totalCount };
    } catch (error) {
      console.error('突合ログ一覧取得エラー:', error);
      throw new AppError('突合ログ一覧の取得中にエラーが発生しました', 500);
    }
  }

  /**
   * 突合ログ詳細取得
   * 
   * @param id - 突合ログID
   * @returns 突合ログ詳細情報
   * @throws AppError - 突合ログが見つからない場合
   */
  async getReconciliationLogById(id: string): Promise<ReconciliationLog> {
    try {
      const log = await this.reconciliationLogRepository.findById(id);
      
      if (!log) {
        throw new AppError('突合ログが見つかりません', 404);
      }

      return log;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('突合ログ詳細取得エラー:', error);
      throw new AppError('突合ログ詳細の取得中にエラーが発生しました', 500);
    }
  }

  /**
   * 最新突合ログ取得
   * 
   * @param period - 期間（オプション）
   * @returns 最新突合ログ情報
   * @throws AppError - 突合ログが見つからない場合
   */
  async getLatestReconciliationLog(period?: string): Promise<ReconciliationLog> {
    try {
      let log: ReconciliationLog | null;
      
      if (period) {
        log = await this.reconciliationLogRepository.findLatestByPeriod(period);
      } else {
        log = await this.reconciliationLogRepository.findLatest();
      }

      if (!log) {
        throw new AppError('突合ログが見つかりません', 404);
      }

      return log;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('最新突合ログ取得エラー:', error);
      throw new AppError('最新突合ログの取得中にエラーが発生しました', 500);
    }
  }

  /**
   * 突合統計情報取得
   * 
   * @returns 突合統計情報
   */
  async getReconciliationStatistics(): Promise<{
    totalExecutions: number;
    totalMatched: number;
    totalFuzzyMatched: number;
    totalUnmatched: number;
    averageMatchRate: number;
    lastExecutionDate: Date | null;
  }> {
    try {
      const statistics = await this.reconciliationLogRepository.getStatistics();
      
      // 最新の実行日時を取得
      const latestLog = await this.getLatestReconciliationLog();

      return {
        totalExecutions: statistics.totalLogs,
        totalMatched: statistics.totalMatched,
        totalFuzzyMatched: statistics.totalFuzzyMatched,
        totalUnmatched: statistics.totalUnmatched,
        averageMatchRate: statistics.averageMatchRate,
        lastExecutionDate: latestLog ? latestLog.executedAt : null,
      };
    } catch (error) {
      console.error('突合統計情報取得エラー:', error);
      throw new AppError('突合統計情報の取得中にエラーが発生しました', 500);
    }
  }

  /**
   * 科目別サマリー取得
   * 
   * @param period - 期間
   * @returns 科目別サマリー情報
   */
  async getAccountSummary(period: string): Promise<{
    glSummary: Array<{ accountCode: string; accountName: string; totalAmount: number; count: number }>;
    orderSummary: Array<{ accountCode: string; accountName: string; totalAmount: number; count: number }>;
    differences: Array<{ accountCode: string; accountName: string; difference: number; glAmount: number; orderAmount: number }>;
  }> {
    try {
      // 計上科目マスタを取得して科目名→科目コードのマッピングを作成
      const accountingItemsData = await db.select().from(accountingItems);
      const nameToCodeMap = new Map<string, string>();
      const codeToNameMap = new Map<string, string>();
      
      for (const item of accountingItemsData) {
        nameToCodeMap.set(item.name, item.code);
        codeToNameMap.set(item.code, item.name);
      }
      
      // GL科目別集計（科目コードで集計）
      const glEntries = await this.glEntryRepository.findByPeriod(period);
      const glMap = new Map<string, { accountName: string; totalAmount: number; count: number }>();
      
      for (const gl of glEntries) {
        if (gl.isExcluded === 'true') continue; // 除外データをスキップ
        
        // 科目名から科目コードを取得、なければ科目名をそのまま使用
        const accountCode = nameToCodeMap.get(gl.accountName) || gl.accountName;
        const amount = parseFloat(gl.amount);
        
        if (!glMap.has(accountCode)) {
          // 科目名は計上科目マスタから取得して統一
          const accountName = codeToNameMap.get(accountCode) || gl.accountName;
          glMap.set(accountCode, { accountName, totalAmount: 0, count: 0 });
        }
        
        const entry = glMap.get(accountCode)!;
        entry.totalAmount += amount;
        entry.count++;
      }
      
      // 受発注見込み科目別集計（科目コードで集計）
      const orderForecasts = await this.orderForecastRepository.findByPeriod(period);
      const orderMap = new Map<string, { accountName: string; totalAmount: number; count: number }>();
      
      for (const order of orderForecasts) {
        if (order.isExcluded === 'true') continue; // 除外データをスキップ
        
        // 科目名から科目コードを取得、なければ科目名をそのまま使用
        const accountCode = nameToCodeMap.get(order.accountingItem) || order.accountingItem;
        const amount = parseFloat(order.amount);
        
        if (!orderMap.has(accountCode)) {
          // 科目名は計上科目マスタから取得して統一
          const accountName = codeToNameMap.get(accountCode) || order.accountingItem;
          orderMap.set(accountCode, { accountName, totalAmount: 0, count: 0 });
        }
        
        const entry = orderMap.get(accountCode)!;
        entry.totalAmount += amount;
        entry.count++;
      }
      
      // サマリー配列作成
      const glSummary = Array.from(glMap.entries()).map(([accountCode, data]) => ({
        accountCode,
        accountName: data.accountName,
        totalAmount: data.totalAmount,
        count: data.count,
      }));
      
      const orderSummary = Array.from(orderMap.entries()).map(([accountCode, data]) => ({
        accountCode,
        accountName: data.accountName,
        totalAmount: data.totalAmount,
        count: data.count,
      }));
      
      // 差異計算
      const allAccountCodes = new Set([...glMap.keys(), ...orderMap.keys()]);
      const differences = Array.from(allAccountCodes).map(accountCode => {
        const glData = glMap.get(accountCode) || { accountName: '', totalAmount: 0, count: 0 };
        const orderData = orderMap.get(accountCode) || { accountName: '', totalAmount: 0, count: 0 };
        const accountName = glData.accountName || orderData.accountName;
        
        return {
          accountCode,
          accountName,
          difference: glData.totalAmount - orderData.totalAmount,
          glAmount: glData.totalAmount,
          orderAmount: orderData.totalAmount,
        };
      });
      
      return { glSummary, orderSummary, differences };
    } catch (error) {
      console.error('科目別サマリー取得エラー:', error);
      throw new AppError('科目別サマリーの取得中にエラーが発生しました', 500);
    }
  }

  /**
   * 手動突合
   * 
   * @param glId - GL明細ID
   * @param orderId - 受発注見込み明細ID
   * @returns 突合結果
   */
  async manualReconcile(glId: string, orderId: string): Promise<{ gl: GLEntry; order: OrderForecast }> {
    try {
      await db.transaction(async (_tx) => {
        await Promise.all([
          this.glEntryRepository.updateReconciliationStatus(glId, 'matched', orderId),
          this.orderForecastRepository.updateReconciliationStatus(orderId, 'matched', glId),
        ]);
      });
      
      const [gl, order] = await Promise.all([
        this.glEntryRepository.findById(glId),
        this.orderForecastRepository.findById(orderId),
      ]);
      
      if (!gl || !order) {
        throw new AppError('突合データが見つかりません', 404);
      }
      
      return { gl, order };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('手動突合エラー:', error);
      throw new AppError('手動突合処理中にエラーが発生しました', 500);
    }
  }

  /**
   * 突合解除
   * 
   * @param glId - GL明細ID
   * @param orderId - 受発注見込み明細ID
   * @returns 解除結果
   */
  async unmatchReconciliation(glId: string, orderId: string): Promise<{ gl: GLEntry; order: OrderForecast }> {
    try {
      await db.transaction(async (_tx) => {
        await Promise.all([
          this.glEntryRepository.updateReconciliationStatus(glId, 'unmatched', undefined),
          this.orderForecastRepository.updateReconciliationStatus(orderId, 'unmatched', undefined),
        ]);
      });
      
      const [gl, order] = await Promise.all([
        this.glEntryRepository.findById(glId),
        this.orderForecastRepository.findById(orderId),
      ]);
      
      if (!gl || !order) {
        throw new AppError('突合データが見つかりません', 404);
      }
      
      return { gl, order };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('突合解除エラー:', error);
      throw new AppError('突合解除処理中にエラーが発生しました', 500);
    }
  }

  /**
   * 突合処理の実装（プライベートメソッド）
   */
  private async performReconciliation(
    orderForecasts: OrderForecast[],
    glEntries: GLEntry[],
    fuzzyThreshold: number,
    dateTolerance: number,
    amountTolerance: number
  ): Promise<{
    matched: Array<{ order: OrderForecast; gl: GLEntry; score: number }>;
    fuzzyMatched: Array<{ order: OrderForecast; gl: GLEntry; score: number }>;
    unmatchedOrders: OrderForecast[];
    unmatchedGl: GLEntry[];
  }> {
    const matched: Array<{ order: OrderForecast; gl: GLEntry; score: number }> = [];
    const fuzzyMatched: Array<{ order: OrderForecast; gl: GLEntry; score: number }> = [];
    const unmatchedOrders: OrderForecast[] = [];
    const unmatchedGl: GLEntry[] = [...glEntries].filter(gl => gl.isExcluded !== 'true'); // 除外データを除く

    // 受発注データごとに突合処理を実行（除外データをスキップ）
    for (const order of orderForecasts) {
      if (order.isExcluded === 'true') {
        continue; // 除外データはスキップ
      }
      
      let bestMatch: GLEntry | null = null;
      let bestScore = 0;
      let matchType: 'exact' | 'fuzzy' = 'exact';

      // GLデータとの突合チェック
      for (let i = unmatchedGl.length - 1; i >= 0; i--) {
        const gl = unmatchedGl[i];
        
        // 勘定科目コードの一致チェック
        if (order.accountingItem !== gl.accountCode) {
          continue;
        }

        // 金額の一致チェック
        const amountDiff = Math.abs(parseFloat(order.amount) - parseFloat(gl.amount));
        if (amountDiff > amountTolerance) {
          continue;
        }

        // 日付の一致チェック
        const orderDate = new Date(order.accountingPeriod + '-01');
        const glDate = new Date(gl.transactionDate);
        const dateDiff = Math.abs(orderDate.getTime() - glDate.getTime()) / (1000 * 60 * 60 * 24);

        if (dateDiff <= dateTolerance) {
          const score = this.calculateMatchScore(order, gl, amountDiff, dateDiff);
          
          if (score > bestScore) {
            bestMatch = gl;
            bestScore = score;
            matchType = score >= fuzzyThreshold ? 'fuzzy' : 'exact';
          }
        }
      }

      // マッチが見つかった場合
      if (bestMatch && bestScore >= fuzzyThreshold) {
        // トランザクション内で突合ステータスを更新
        await db.transaction(async (_tx) => {
          await Promise.all([
            this.orderForecastRepository.updateReconciliationStatus(
              order.id,
              matchType === 'exact' ? 'matched' : 'fuzzy',
              bestMatch.id
            ),
            this.glEntryRepository.updateReconciliationStatus(
              bestMatch.id,
              matchType === 'exact' ? 'matched' : 'fuzzy',
              order.id
            ),
          ]);
        });

        // 結果に追加
        if (matchType === 'exact') {
          matched.push({ order, gl: bestMatch, score: bestScore });
        } else {
          fuzzyMatched.push({ order, gl: bestMatch, score: bestScore });
        }

        // マッチしたGLデータを未突合リストから削除
        const index = unmatchedGl.findIndex(gl => gl.id === bestMatch.id);
        if (index !== -1) {
          unmatchedGl.splice(index, 1);
        }
      } else {
        // マッチしない受発注データ
        unmatchedOrders.push(order);
      }
    }

    return {
      matched,
      fuzzyMatched,
      unmatchedOrders,
      unmatchedGl,
    };
  }

  /**
   * マッチスコアの計算（プライベートメソッド）
   */
  private calculateMatchScore(
    order: OrderForecast, 
    gl: GLEntry, 
    amountDiff: number, 
    dateDiff: number
  ): number {
    let score = 100;

    // 金額差による減点
    score -= (amountDiff / Math.max(parseFloat(order.amount), parseFloat(gl.amount))) * 50;

    // 日付差による減点
    score -= dateDiff * 2;

    return Math.max(0, score);
  }
}
