import type { Request, Response, NextFunction } from 'express';

/**
 * 認証・認可ミドルウェア
 * 
 * 責務:
 * - ユーザー認証
 * - セッション管理
 * - 従業員ID設定
 * - 操作権限チェック
 * - リソースアクセス制御
 * - スコープ別権限管理
 */

// ダミーユーザーデータ（メモリ実装）
const users = [
  {
    id: '1',
    employeeId: 'EMP001',
    name: '管理者',
    email: 'admin@example.com',
    role: 'admin',
    permissions: ['read', 'write', 'delete', 'admin']
  },
  {
    id: '2',
    employeeId: 'EMP002',
    name: '一般ユーザー',
    email: 'user@example.com',
    role: 'user',
    permissions: ['read', 'write']
  }
];

// セッション管理（メモリ実装）
const sessions = new Map<string, { userId: string; expiresAt: Date }>();

// リクエストにユーザー情報を追加する型拡張
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        employeeId: string;
        name: string;
        email: string;
        role: string;
        permissions: string[];
      };
    }
  }
}

/**
 * 基本的な認証チェック
 * セッションの有効性を確認する
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  try {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionId || !sessions.has(sessionId)) {
      return res.status(401).json({
        success: false,
        message: '認証されていません'
      });
    }
    
    const session = sessions.get(sessionId)!;
    
    // セッション期限チェック
    if (session.expiresAt < new Date()) {
      sessions.delete(sessionId);
      return res.status(401).json({
        success: false,
        message: 'セッションの有効期限が切れています'
      });
    }
    
    // ユーザー情報取得
    const user = users.find(u => u.id === session.userId);
    
    if (!user) {
      sessions.delete(sessionId);
      return res.status(401).json({
        success: false,
        message: 'ユーザーが見つかりません'
      });
    }
    
    // リクエストにユーザー情報を設定
    req.user = user;
    next();
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '認証チェック中にエラーが発生しました'
    });
  }
}

/**
 * グローバル認証（従業員ID設定含む）
 * 認証されていない場合はリダイレクトまたはエラーを返す
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionId || !sessions.has(sessionId)) {
      return res.status(401).json({
        success: false,
        message: '認証が必要です'
      });
    }
    
    const session = sessions.get(sessionId)!;
    
    // セッション期限チェック
    if (session.expiresAt < new Date()) {
      sessions.delete(sessionId);
      return res.status(401).json({
        success: false,
        message: 'セッションの有効期限が切れています'
      });
    }
    
    // ユーザー情報取得
    const user = users.find(u => u.id === session.userId);
    
    if (!user) {
      sessions.delete(sessionId);
      return res.status(401).json({
        success: false,
        message: 'ユーザーが見つかりません'
      });
    }
    
    // リクエストにユーザー情報を設定
    req.user = user;
    next();
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '認証中にエラーが発生しました'
    });
  }
}

/**
 * 操作権限チェック
 * 指定された操作に対する権限を検証する
 * 
 * @param operation - チェックする操作種別
 */
export function requireOperationPermission(operation: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '認証が必要です'
        });
      }
      
      // 権限チェック
      if (!req.user.permissions.includes(operation)) {
        return res.status(403).json({
          success: false,
          message: `${operation}権限がありません`
        });
      }
      
      next();
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '権限チェック中にエラーが発生しました'
      });
    }
  };
}

/**
 * リソース別参照権限チェック
 * 指定されたリソースへのアクセス権限を検証する
 * 
 * @param resource - チェックするリソース種別
 */
export function requireResourcePermission(resource: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '認証が必要です'
        });
      }
      
      // リソースアクセス権限チェック
      const hasPermission = req.user.permissions.includes('read') || 
                           req.user.permissions.includes('admin') ||
                           req.user.permissions.includes(`${resource}:read`);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `${resource}へのアクセス権限がありません`
        });
      }
      
      next();
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'リソース権限チェック中にエラーが発生しました'
      });
    }
  };
}

// セッション管理用のヘルパー関数
export function createSession(userId: string): string {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2時間
  
  sessions.set(sessionId, { userId, expiresAt });
  return sessionId;
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function getSession(sessionId: string): { userId: string; expiresAt: Date } | undefined {
  return sessions.get(sessionId);
}
