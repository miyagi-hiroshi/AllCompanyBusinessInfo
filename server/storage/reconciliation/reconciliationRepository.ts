import { type ReconciliationLog } from "@shared/schema";
import { randomUUID } from "crypto";

/**
 * 突合ログリポジトリ
 * 
 * 操作対象テーブル: reconciliation_logs
 * 責務: 突合ログのCRUD操作
 */
export class ReconciliationRepository {
  private reconciliationLogs: Map<string, ReconciliationLog>;

  constructor() {
    this.reconciliationLogs = new Map();
  }

  /**
   * 突合ログを取得（期間フィルタ可能）
   */
  async getReconciliationLogs(period?: string): Promise<ReconciliationLog[]> {
    const logs = Array.from(this.reconciliationLogs.values());
    if (period) {
      return logs.filter(l => l.period === period);
    }
    return logs;
  }

  /**
   * 突合ログを作成
   */
  async createReconciliationLog(data: Omit<ReconciliationLog, "id">): Promise<ReconciliationLog> {
    const id = randomUUID();
    const log: ReconciliationLog = {
      ...data,
      id,
    };
    this.reconciliationLogs.set(id, log);
    return log;
  }
}
