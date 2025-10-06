import { 
  type GLEntry, 
  type InsertGLEntry,
} from "@shared/schema";
import { randomUUID } from "crypto";
import type { GLEntryFilter } from "./types";

/**
 * GLエントリデータリポジトリ
 * 
 * 操作対象テーブル: gl_entries
 * 責務: 総勘定元帳データのCRUD操作
 */
export class GLEntryRepository {
  private glEntries: Map<string, GLEntry>;

  constructor() {
    this.glEntries = new Map();
  }

  /**
   * フィルタ条件に基づいてGLエントリを取得
   */
  async getGLEntries(filter: GLEntryFilter): Promise<GLEntry[]> {
    return Array.from(this.glEntries.values()).filter(g => {
      const [year, month] = g.period.split('-').map(Number);
      
      if (year !== filter.fiscalYear) return false;
      if (filter.month !== undefined && month !== filter.month) return false;
      
      return true;
    });
  }

  /**
   * IDでGLエントリを取得
   */
  async getGLEntry(id: string): Promise<GLEntry | undefined> {
    return this.glEntries.get(id);
  }

  /**
   * GLエントリを作成
   */
  async createGLEntry(data: InsertGLEntry): Promise<GLEntry> {
    const id = randomUUID();
    const glEntry: GLEntry = {
      ...data,
      id,
      amount: String(data.amount),
      description: data.description ?? null,
      reconciliationStatus: "unmatched",
      orderMatchId: null,
      createdAt: new Date(),
    };
    this.glEntries.set(id, glEntry);
    return glEntry;
  }

  /**
   * GLエントリを更新
   */
  async updateGLEntry(id: string, data: Partial<GLEntry>): Promise<GLEntry | undefined> {
    const existing = this.glEntries.get(id);
    if (!existing) return undefined;

    const updated: GLEntry = {
      ...existing,
      ...data,
    };
    this.glEntries.set(id, updated);
    return updated;
  }

  /**
   * GLエントリを削除
   */
  async deleteGLEntry(id: string): Promise<boolean> {
    return this.glEntries.delete(id);
  }
}
