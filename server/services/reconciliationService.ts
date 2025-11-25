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
   * @returns 突合処理結果
   */
  async executeReconciliation(
    period: string
  ): Promise<{
    reconciliationLog: ReconciliationLog;
    results: {
      matched: Array<{ order: OrderForecast; gl: GLEntry; score: number }>;
      unmatchedOrders: OrderForecast[];
      unmatchedGl: GLEntry[];
      alreadyMatchedOrders: number;
      alreadyMatchedGl: number;
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
        glEntries
      );

      // 既に突合済みのデータ数を計算（除外データは除く）
      const alreadyMatchedOrders = orderForecasts.filter(order => 
        order.reconciliationStatus === 'matched'
      ).length;
      const alreadyMatchedGl = glEntries.filter(gl => 
        gl.reconciliationStatus === 'matched'
      ).length;

      // トランザクション内で突合結果を保存
      const reconciliationLog = await db.transaction(async (_tx) => {
        // 突合ログの作成
        const log = await this.reconciliationLogRepository.create({
          period,
          executedAt: new Date(),
          matchedCount: reconciliationResults.matched.length,
          fuzzyMatchedCount: 0, // ファジー突合は削除
          unmatchedOrderCount: reconciliationResults.unmatchedOrders.length,
          unmatchedGlCount: reconciliationResults.unmatchedGl.length,
          totalOrderCount: orderForecasts.length,
          totalGlCount: glEntries.length,
        });

        return log;
      });

      return {
        reconciliationLog,
        results: {
          ...reconciliationResults,
          alreadyMatchedOrders,
          alreadyMatchedGl,
        },
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
    matchedAmount: number;
    totalGlAmount: number;
    totalOrderAmount: number;
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
      
      // 突合済み金額の計算（GLエントリの突合済み金額を集計）
      let matchedAmount = 0;
      for (const gl of glEntries) {
        if (gl.isExcluded === 'true') continue; // 除外データをスキップ
        if (gl.reconciliationStatus === 'matched') {
          matchedAmount += parseFloat(gl.amount);
        }
      }
      
      // 合計金額の計算
      const totalGlAmount = glSummary.reduce((sum, item) => sum + item.totalAmount, 0);
      const totalOrderAmount = orderSummary.reduce((sum, item) => sum + item.totalAmount, 0);
      
      return { glSummary, orderSummary, differences, matchedAmount, totalGlAmount, totalOrderAmount };
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
    glEntries: GLEntry[]
  ): Promise<{
    matched: Array<{ order: OrderForecast; gl: GLEntry; score: number }>;
    unmatchedOrders: OrderForecast[];
    unmatchedGl: GLEntry[];
  }> {
    const matched: Array<{ order: OrderForecast; gl: GLEntry; score: number }> = [];
    const unmatchedOrders: OrderForecast[] = [];
    const unmatchedGl: GLEntry[] = [...glEntries].filter(gl => 
      gl.reconciliationStatus !== 'excluded' && gl.reconciliationStatus !== 'matched'
    ); // 除外データと既に突合済みのデータを除く

      // 受発注データごとに突合処理を実行（除外データと既に突合済みのデータをスキップ）
        for (const order of orderForecasts) {
        if (order.reconciliationStatus === 'excluded') {
          continue; // 除外データはスキップ
        }

        if (order.reconciliationStatus === 'matched') {
          continue; // 既に突合済みのデータはスキップ
        }

      
      let bestMatch: GLEntry | null = null;
      let bestScore = 0;

      // GLデータとの突合チェック
        for (let i = unmatchedGl.length - 1; i >= 0; i--) {
          const gl = unmatchedGl[i];


          // 月度の一致チェック（受発注のaccountingPeriodとGLのtransactionDateの月が一致）
          const orderMonth = order.accountingPeriod; // 例: "2025-08"
          const glMonth = gl.transactionDate.substring(0, 7); // 例: "2025-08"
          
          if (orderMonth !== glMonth) {
            continue;
          }

          // 計上科目の一致チェック（半角・全角の違いを吸収）
          const isAccountMatch = this.isAccountMatch(order.accountingItem, gl.accountName);
          if (!isAccountMatch) {
            continue;
          }

          // 摘要文の一致チェック（半角・全角の違いを吸収）
          const isDescriptionMatch = this.isDescriptionMatch(order.description || '', gl.description || '');
          if (!isDescriptionMatch) {
            continue;
          }

          // 金額の完全一致チェック
          const orderAmount = parseFloat(order.amount);
          const glAmount = parseFloat(gl.amount);

          if (orderAmount !== glAmount) {
            continue;
          }

        // 厳格突合の条件を満たす場合
        const score = 100; // 厳格突合なので常に100点
        
        if (score > bestScore) {
          bestMatch = gl;
          bestScore = score;
        }
      }

      // マッチが見つかった場合
      if (bestMatch && bestScore > 0) {
        // トランザクション内で突合ステータスを更新
        await db.transaction(async (_tx) => {
          await Promise.all([
            this.orderForecastRepository.updateReconciliationStatus(
              order.id,
              'matched',
              bestMatch.id
            ),
            this.glEntryRepository.updateReconciliationStatus(
              bestMatch.id,
              'matched',
              order.id
            ),
          ]);
        });

        // 結果に追加
        matched.push({ order, gl: bestMatch, score: bestScore });

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
      unmatchedOrders,
      unmatchedGl,
    };
  }

  /**
   * テキスト正規化（デバッグ用）
   *
   * @param text 正規化する文字列
   * @returns 正規化された文字列
   */
  private normalizeText(text: string): string {
    if (!text) return '';

    return text
      // 全角英数字を半角に変換
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
      // 半角カナを全角カナに変換
      .replace(/[\uFF65-\uFF9F]/g, (s) => {
        const code = s.charCodeAt(0);
        // 半角カナの変換テーブル
        const hankanaMap: { [key: number]: string } = {
          0xFF65: '・', 0xFF66: '・', 0xFF67: 'ァ', 0xFF68: 'ィ', 0xFF69: 'ゥ', 0xFF6A: 'ェ', 0xFF6B: 'ォ',
          0xFF6C: 'ャ', 0xFF6D: 'ュ', 0xFF6E: 'ョ', 0xFF6F: 'ッ', 0xFF70: 'ー', 0xFF71: 'ア', 0xFF72: 'イ',
          0xFF73: 'ウ', 0xFF74: 'エ', 0xFF75: 'オ', 0xFF76: 'カ', 0xFF77: 'キ', 0xFF78: 'ク', 0xFF79: 'ケ',
          0xFF7A: 'コ', 0xFF7B: 'サ', 0xFF7C: 'シ', 0xFF7D: 'ス', 0xFF7E: 'セ', 0xFF7F: 'ソ', 0xFF80: 'タ',
          0xFF81: 'チ', 0xFF82: 'ツ', 0xFF83: 'テ', 0xFF84: 'ト', 0xFF85: 'ナ', 0xFF86: 'ニ', 0xFF87: 'ヌ',
          0xFF88: 'ネ', 0xFF89: 'ノ', 0xFF8A: 'ハ', 0xFF8B: 'ヒ', 0xFF8C: 'フ', 0xFF8D: 'ヘ', 0xFF8E: 'ホ',
          0xFF8F: 'マ', 0xFF90: 'ミ', 0xFF91: 'ム', 0xFF92: 'メ', 0xFF93: 'モ', 0xFF94: 'ヤ', 0xFF95: 'ユ',
          0xFF96: 'ヨ', 0xFF97: 'ラ', 0xFF98: 'リ', 0xFF99: 'ル', 0xFF9A: 'レ', 0xFF9B: 'ロ', 0xFF9C: 'ワ',
          0xFF9D: 'ヲ', 0xFF9E: 'ン', 0xFF9F: 'ヴ'
        };
        return hankanaMap[code] || s;
      })
      // 全角スペースを半角スペースに変換
      .replace(/\u3000/g, ' ')
      // ハイフン・ダッシュを除去
      .replace(/[-－ー]/g, '')
      // 連続する空白を単一のスペースに変換
      .replace(/\s+/g, ' ')
      // 前後の空白を除去
      .trim()
      // 大文字小文字を統一（小文字に）
      .toLowerCase();
  }

  /**
   * 計上科目の一致チェック（半角・全角の違いを吸収）
   *
   * @param account1 比較する計上科目1
   * @param account2 比較する計上科目2
   * @returns 正規化後に一致する場合true
   */
  private isAccountMatch(account1: string, account2: string): boolean {
    if (!account1 || !account2) {
      return false;
    }

    // 半角・全角を正規化して比較
    const normalize = (text: string): string => {
      return text
        // 全角英数字を半角に変換
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
        // 半角カナを全角カナに変換
        .replace(/[\uFF65-\uFF9F]/g, (s) => {
          const code = s.charCodeAt(0);
          // 半角カナの変換テーブル
          const hankanaMap: { [key: number]: string } = {
            0xFF65: '・', 0xFF66: '・', 0xFF67: 'ァ', 0xFF68: 'ィ', 0xFF69: 'ゥ', 0xFF6A: 'ェ', 0xFF6B: 'ォ',
            0xFF6C: 'ャ', 0xFF6D: 'ュ', 0xFF6E: 'ョ', 0xFF6F: 'ッ', 0xFF70: 'ー', 0xFF71: 'ア', 0xFF72: 'イ',
            0xFF73: 'ウ', 0xFF74: 'エ', 0xFF75: 'オ', 0xFF76: 'カ', 0xFF77: 'キ', 0xFF78: 'ク', 0xFF79: 'ケ',
            0xFF7A: 'コ', 0xFF7B: 'サ', 0xFF7C: 'シ', 0xFF7D: 'ス', 0xFF7E: 'セ', 0xFF7F: 'ソ', 0xFF80: 'タ',
            0xFF81: 'チ', 0xFF82: 'ツ', 0xFF83: 'テ', 0xFF84: 'ト', 0xFF85: 'ナ', 0xFF86: 'ニ', 0xFF87: 'ヌ',
            0xFF88: 'ネ', 0xFF89: 'ノ', 0xFF8A: 'ハ', 0xFF8B: 'ヒ', 0xFF8C: 'フ', 0xFF8D: 'ヘ', 0xFF8E: 'ホ',
            0xFF8F: 'マ', 0xFF90: 'ミ', 0xFF91: 'ム', 0xFF92: 'メ', 0xFF93: 'モ', 0xFF94: 'ヤ', 0xFF95: 'ユ',
            0xFF96: 'ヨ', 0xFF97: 'ラ', 0xFF98: 'リ', 0xFF99: 'ル', 0xFF9A: 'レ', 0xFF9B: 'ロ', 0xFF9C: 'ワ',
            0xFF9D: 'ヲ', 0xFF9E: 'ン', 0xFF9F: 'ヴ'
          };
          return hankanaMap[code] || s;
        })
        // 全角スペースを半角スペースに変換
        .replace(/\u3000/g, ' ')
        // 連続する空白を単一のスペースに変換
        .replace(/\s+/g, ' ')
        // 前後の空白を除去
        .trim();
    };

    return normalize(account1) === normalize(account2);
  }

  /**
   * 摘要文の一致チェック（半角・全角の違いを吸収）
   *
   * @param description1 比較する摘要文1
   * @param description2 比較する摘要文2
   * @returns 正規化後に一致する場合true
   */
  private isDescriptionMatch(description1: string, description2: string): boolean {
      if (!description1 || !description2) {
        return false;
      }

      // 半角・全角を正規化して比較
      const normalize = (text: string): string => {
        return text
          // 全角英数字を半角に変換
          .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
          // 半角カナを全角カナに変換
          .replace(/[\uFF65-\uFF9F]/g, (s) => {
            const code = s.charCodeAt(0);
            // 半角カナの変換テーブル
            const hankanaMap: { [key: number]: string } = {
              0xFF65: '・', 0xFF66: '・', 0xFF67: 'ァ', 0xFF68: 'ィ', 0xFF69: 'ゥ', 0xFF6A: 'ェ', 0xFF6B: 'ォ',
              0xFF6C: 'ャ', 0xFF6D: 'ュ', 0xFF6E: 'ョ', 0xFF6F: 'ッ', 0xFF70: 'ー', 0xFF71: 'ア', 0xFF72: 'イ',
              0xFF73: 'ウ', 0xFF74: 'エ', 0xFF75: 'オ', 0xFF76: 'カ', 0xFF77: 'キ', 0xFF78: 'ク', 0xFF79: 'ケ',
              0xFF7A: 'コ', 0xFF7B: 'サ', 0xFF7C: 'シ', 0xFF7D: 'ス', 0xFF7E: 'セ', 0xFF7F: 'ソ', 0xFF80: 'タ',
              0xFF81: 'チ', 0xFF82: 'ツ', 0xFF83: 'テ', 0xFF84: 'ト', 0xFF85: 'ナ', 0xFF86: 'ニ', 0xFF87: 'ヌ',
              0xFF88: 'ネ', 0xFF89: 'ノ', 0xFF8A: 'ハ', 0xFF8B: 'ヒ', 0xFF8C: 'フ', 0xFF8D: 'ヘ', 0xFF8E: 'ホ',
              0xFF8F: 'マ', 0xFF90: 'ミ', 0xFF91: 'ム', 0xFF92: 'メ', 0xFF93: 'モ', 0xFF94: 'ヤ', 0xFF95: 'ユ',
              0xFF96: 'ヨ', 0xFF97: 'ラ', 0xFF98: 'リ', 0xFF99: 'ル', 0xFF9A: 'レ', 0xFF9B: 'ロ', 0xFF9C: 'ワ',
              0xFF9D: 'ヲ', 0xFF9E: 'ン', 0xFF9F: 'ヴ'
            };
            return hankanaMap[code] || s;
          })
          // 全角スペースを半角スペースに変換
          .replace(/\u3000/g, ' ')
          // ハイフン・ダッシュを除去
          .replace(/[-－ー]/g, '')
          // 連続する空白を単一のスペースに変換
          .replace(/\s+/g, ' ')
          // 前後の空白を除去
          .trim()
          // 大文字小文字を統一（小文字に）
          .toLowerCase();
      };

      return normalize(description1) === normalize(description2);
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
