/**
 * 監査ログリポジトリ
 * 
 * 責務:
 * - 操作ログの記録
 * - データ変更履歴の追跡
 * - 監査ログの検索・取得
 */

// 監査ログの型定義
export interface AuditLog {
  id: string;
  userId: string;
  employeeId: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress: string;
  userAgent?: string;
  timestamp: Date;
  sessionId?: string;
  details?: Record<string, any>;
}

export interface CreateAuditLogData {
  userId: string;
  employeeId: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress: string;
  userAgent?: string;
  sessionId?: string;
  details?: Record<string, any>;
}

export interface AuditLogFilter {
  userId?: string;
  employeeId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
}

// メモリ実装（本格実装時はデータベースに移行）
class AuditLogRepository {
  private auditLogs: AuditLog[] = [];
  private nextId = 1;

  /**
   * 監査ログを作成
   */
  async create(data: CreateAuditLogData): Promise<AuditLog> {
    const auditLog: AuditLog = {
      id: `audit_${this.nextId++}`,
      timestamp: new Date(),
      ...data,
    };

    this.auditLogs.push(auditLog);
    return auditLog;
  }

  /**
   * 監査ログを取得
   */
  async findById(id: string): Promise<AuditLog | null> {
    return this.auditLogs.find(log => log.id === id) || null;
  }

  /**
   * 監査ログを検索
   */
  async search(filter: AuditLogFilter, limit: number = 100, offset: number = 0): Promise<AuditLog[]> {
    let filteredLogs = this.auditLogs;

    // フィルタリング
    if (filter.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filter.userId);
    }
    if (filter.employeeId) {
      filteredLogs = filteredLogs.filter(log => log.employeeId === filter.employeeId);
    }
    if (filter.action) {
      filteredLogs = filteredLogs.filter(log => log.action === filter.action);
    }
    if (filter.resource) {
      filteredLogs = filteredLogs.filter(log => log.resource === filter.resource);
    }
    if (filter.resourceId) {
      filteredLogs = filteredLogs.filter(log => log.resourceId === filter.resourceId);
    }
    if (filter.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startDate!);
    }
    if (filter.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endDate!);
    }
    if (filter.ipAddress) {
      filteredLogs = filteredLogs.filter(log => log.ipAddress === filter.ipAddress);
    }

    // ソート（新しい順）
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // ページネーション
    return filteredLogs.slice(offset, offset + limit);
  }

  /**
   * 監査ログの総数を取得
   */
  async count(filter: AuditLogFilter): Promise<number> {
    const logs = await this.search(filter, Number.MAX_SAFE_INTEGER);
    return logs.length;
  }

  /**
   * リソースの変更履歴を取得
   */
  async getResourceHistory(resource: string, resourceId: string): Promise<AuditLog[]> {
    return this.auditLogs
      .filter(log => log.resource === resource && log.resourceId === resourceId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * ユーザーの操作履歴を取得
   */
  async getUserHistory(userId: string, limit: number = 50): Promise<AuditLog[]> {
    return this.auditLogs
      .filter(log => log.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * データ変更ログを作成
   */
  async logDataChange(
    userId: string,
    employeeId: string,
    action: string,
    resource: string,
    resourceId: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    ipAddress: string,
    userAgent?: string,
    sessionId?: string
  ): Promise<AuditLog> {
    return this.create({
      userId,
      employeeId,
      action,
      resource,
      resourceId,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
      sessionId,
    });
  }

  /**
   * ログインログを作成
   */
  async logLogin(
    userId: string,
    employeeId: string,
    success: boolean,
    ipAddress: string,
    userAgent?: string,
    sessionId?: string
  ): Promise<AuditLog> {
    return this.create({
      userId,
      employeeId,
      action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
      resource: 'AUTH',
      ipAddress,
      userAgent,
      sessionId,
      details: { success },
    });
  }

  /**
   * ログアウトログを作成
   */
  async logLogout(
    userId: string,
    employeeId: string,
    ipAddress: string,
    userAgent?: string,
    sessionId?: string
  ): Promise<AuditLog> {
    return this.create({
      userId,
      employeeId,
      action: 'LOGOUT',
      resource: 'AUTH',
      ipAddress,
      userAgent,
      sessionId,
    });
  }

  /**
   * ファイルアップロードログを作成
   */
  async logFileUpload(
    userId: string,
    employeeId: string,
    filename: string,
    fileSize: number,
    ipAddress: string,
    userAgent?: string,
    sessionId?: string
  ): Promise<AuditLog> {
    return this.create({
      userId,
      employeeId,
      action: 'FILE_UPLOAD',
      resource: 'FILE',
      ipAddress,
      userAgent,
      sessionId,
      details: {
        filename,
        fileSize,
      },
    });
  }

  /**
   * データエクスポートログを作成
   */
  async logDataExport(
    userId: string,
    employeeId: string,
    resource: string,
    recordCount: number,
    exportFormat: string,
    ipAddress: string,
    userAgent?: string,
    sessionId?: string
  ): Promise<AuditLog> {
    return this.create({
      userId,
      employeeId,
      action: 'DATA_EXPORT',
      resource,
      ipAddress,
      userAgent,
      sessionId,
      details: {
        recordCount,
        exportFormat,
      },
    });
  }

  /**
   * 古いログを削除（クリーンアップ）
   */
  async cleanupOldLogs(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const initialCount = this.auditLogs.length;
    this.auditLogs = this.auditLogs.filter(log => log.timestamp >= cutoffDate);
    
    return initialCount - this.auditLogs.length;
  }
}

export const auditLogRepository = new AuditLogRepository();
