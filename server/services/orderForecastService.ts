import { CreateOrderForecastData, OrderForecast, OrderForecastFilter,UpdateOrderForecastData } from '@shared/schema/integrated';

import { db } from '../db';
import { AppError } from '../middleware/errorHandler';
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
    private glEntryRepository: GLEntryRepository
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
    status: 'matched' | 'fuzzy' | 'unmatched', 
    glMatchId?: string
  ): Promise<OrderForecast> {
    try {
      // 受発注データの存在チェック
      const existingOrderForecast = await this.orderForecastRepository.findById(id);
      if (!existingOrderForecast) {
        throw new AppError('受発注データが見つかりません', 404);
      }

      // ステータスの妥当性チェック
      if (!['matched', 'fuzzy', 'unmatched'].includes(status)) {
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
}
