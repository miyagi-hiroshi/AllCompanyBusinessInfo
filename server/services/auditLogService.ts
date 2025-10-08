import { AppError } from '../middleware/errorHandler';
import { type AuditLogFilter,AuditLogRepository } from '../storage/auditLog';
import type { AuditLog } from '../storage/auditLog/auditLogRepository';

/**
 * 監査ログサービス
 * 
 * @description 監査ログに関するビジネスロジックを担当
 * @responsibility 監査ログの検索、統計情報の提供、クリーンアップ処理
 */
export class AuditLogService {
  constructor(
    private auditLogRepository: AuditLogRepository
  ) {}

  /**
   * 監査ログ検索
   * 
   * @param filter - 検索フィルタ
   * @param limit - 取得件数（最大1000件）
   * @param offset - オフセット
   * @returns 監査ログ一覧と総件数
   */
  async searchAuditLogs(
    filter: AuditLogFilter,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ logs: AuditLog[]; totalCount: number }> {
    try {
      // 取得件数の上限チェック（ビジネスルール）
      const safeLimit = Math.min(limit, 1000);
      
      const [logs, totalCount] = await Promise.all([
        this.auditLogRepository.search(filter, safeLimit, offset),
        this.auditLogRepository.count(filter),
      ]);

      return { logs, totalCount };
    } catch (error) {
      console.error('監査ログ検索エラー:', error);
      throw new AppError('監査ログの検索中にエラーが発生しました', 500);
    }
  }

  /**
   * 監査ログ詳細取得
   * 
   * @param id - 監査ログID
   * @returns 監査ログ詳細
   */
  async getAuditLogById(id: string): Promise<AuditLog> {
    try {
      const log = await this.auditLogRepository.findById(id);
      
      if (!log) {
        throw new AppError('監査ログが見つかりません', 404, true, 'NOT_FOUND');
      }

      return log;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('監査ログ詳細取得エラー:', error);
      throw new AppError('監査ログ詳細の取得中にエラーが発生しました', 500);
    }
  }

  /**
   * リソース変更履歴取得
   * 
   * @param resource - リソース名
   * @param resourceId - リソースID
   * @returns リソースの変更履歴
   */
  async getResourceHistory(resource: string, resourceId: string): Promise<AuditLog[]> {
    try {
      return await this.auditLogRepository.getResourceHistory(resource, resourceId);
    } catch (error) {
      console.error('リソース履歴取得エラー:', error);
      throw new AppError('リソース履歴の取得中にエラーが発生しました', 500);
    }
  }

  /**
   * ユーザー操作履歴取得
   * 
   * @param userId - ユーザーID
   * @param limit - 取得件数（最大200件）
   * @returns ユーザーの操作履歴
   */
  async getUserHistory(userId: string, limit: number = 50): Promise<AuditLog[]> {
    try {
      // 取得件数の上限チェック（ビジネスルール）
      const safeLimit = Math.min(limit, 200);
      
      return await this.auditLogRepository.getUserHistory(userId, safeLimit);
    } catch (error) {
      console.error('ユーザー履歴取得エラー:', error);
      throw new AppError('ユーザー履歴の取得中にエラーが発生しました', 500);
    }
  }

  /**
   * 監査ログクリーンアップ
   * 
   * @param daysToKeep - 保持日数（最低30日）
   * @returns 削除された件数
   */
  async cleanupOldLogs(daysToKeep: number = 365): Promise<number> {
    try {
      // 保持日数の下限チェック（ビジネスルール）
      const safeDaysToKeep = Math.max(daysToKeep, 30);
      
      const deletedCount = await this.auditLogRepository.cleanupOldLogs(safeDaysToKeep);
      
      console.info(`監査ログクリーンアップ完了: ${deletedCount}件削除（${safeDaysToKeep}日以前）`);
      
      return deletedCount;
    } catch (error) {
      console.error('監査ログクリーンアップエラー:', error);
      throw new AppError('監査ログのクリーンアップ中にエラーが発生しました', 500);
    }
  }

  /**
   * 監査ログ統計情報取得
   * 
   * @param filter - 検索フィルタ（期間指定）
   * @returns 統計情報
   */
  async getAuditLogStatistics(filter: AuditLogFilter = {}): Promise<{
    totalLogs: number;
    recentLogsCount: number;
    actionStats: Record<string, number>;
    resourceStats: Record<string, number>;
    userStats: Record<string, number>;
  }> {
    try {
      const [totalLogs, recentLogs] = await Promise.all([
        this.auditLogRepository.count(filter),
        this.auditLogRepository.search(filter, 100, 0), // 最新100件を取得
      ]);

      // アクション別統計（ビジネスロジック）
      const actionStats = recentLogs.reduce((acc: Record<string, number>, log: AuditLog) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // リソース別統計（ビジネスロジック）
      const resourceStats = recentLogs.reduce((acc: Record<string, number>, log: AuditLog) => {
        acc[log.resource] = (acc[log.resource] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // ユーザー別統計（ビジネスロジック）
      const userStats = recentLogs.reduce((acc: Record<string, number>, log: AuditLog) => {
        acc[log.userId] = (acc[log.userId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalLogs,
        recentLogsCount: recentLogs.length,
        actionStats,
        resourceStats,
        userStats,
      };
    } catch (error) {
      console.error('監査ログ統計取得エラー:', error);
      throw new AppError('監査ログ統計の取得中にエラーが発生しました', 500);
    }
  }
}

