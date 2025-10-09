import { sessions } from '@shared/schema/existing';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';

import { db } from '../../db';

/**
 * セッションリポジトリ
 * 
 * 責務:
 * - 既存システムのセッションテーブルへのアクセス
 * - セッションの作成・更新・削除
 * - セッションの有効期限チェック
 */
export class SessionRepository {
  /**
   * セッションを作成
   * 
   * @param userId - ユーザーID
   * @param expiresAt - セッション有効期限
   * @returns 作成されたセッション
   */
  async create(userId: string, expiresAt: Date): Promise<{ id: string; userId: string; expiresAt: Date }> {
    // セッションIDを生成
    const sessionId = crypto.randomBytes(32).toString('hex');
    
    const result = await db.insert(sessions).values({
      id: sessionId,
      userId,
      expiresAt,
    }).returning();
    
    return result[0];
  }

  /**
   * セッションIDで検索
   * 
   * @param sessionId - セッションID
   * @returns セッション情報（存在しない場合はnull）
   */
  async findById(sessionId: string): Promise<{ id: string; userId: string; expiresAt: Date } | null> {
    const result = await db.select({
      id: sessions.id,
      userId: sessions.userId,
      expiresAt: sessions.expiresAt,
    }).from(sessions).where(eq(sessions.id, sessionId));
    
    return result[0] || null;
  }

  /**
   * セッションを削除
   * 
   * @param sessionId - セッションID
   */
  async delete(sessionId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  /**
   * 期限切れセッションを削除
   */
  async deleteExpired(): Promise<void> {
    const now = new Date();
    await db.delete(sessions).where(eq(sessions.expiresAt, now));
  }

  /**
   * セッションを更新（有効期限延長）
   * 
   * @param sessionId - セッションID
   * @param expiresAt - 新しい有効期限
   */
  async updateExpiry(sessionId: string, expiresAt: Date): Promise<void> {
    await db.update(sessions)
      .set({ expiresAt })
      .where(eq(sessions.id, sessionId));
  }
}

export const sessionRepository = new SessionRepository();

