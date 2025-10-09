import crypto from 'crypto';
import type { NextFunction,Request, Response } from 'express';

/**
 * CSRF保護ミドルウェア
 * 
 * 責務:
 * - CSRFトークンの生成
 * - CSRFトークンの検証
 * - トークン取得エンドポイントの提供
 */

// CSRFトークンのストレージ（メモリ実装）
const csrfTokens = new Map<string, { token: string; expiresAt: Date }>();

/**
 * CSRF保護クラス
 * トークンの生成と検証を管理する
 */
export class CSRFProtection {
  /**
   * CSRFトークンを生成する
   * 
   * @param req - リクエストオブジェクト
   * @returns 生成されたトークン
   */
  generateToken(req: Request): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1時間有効
    
    // CookieまたはAuthorizationヘッダーからセッションIDを取得
    const sessionId = req.cookies?.sessionId || req.headers.authorization?.replace('Bearer ', '');
    if (sessionId) {
      csrfTokens.set(sessionId, { token, expiresAt });
    }
    
    return token;
  }

  /**
   * CSRFトークンを検証する
   * 
   * @param req - リクエストオブジェクト
   * @param token - 検証するトークン
   * @returns 検証結果
   */
  verifyToken(req: Request, token: string): boolean {
    const sessionId = req.cookies?.sessionId || req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionId || !token) {
      return false;
    }
    
    const storedToken = csrfTokens.get(sessionId);
    
    if (!storedToken) {
      return false;
    }
    
    // 有効期限チェック
    if (storedToken.expiresAt < new Date()) {
      csrfTokens.delete(sessionId);
      return false;
    }
    
    // トークンの一致チェック
    return storedToken.token === token;
  }

  /**
   * CSRF検証ミドルウェア
   * リクエストのCSRFトークンを検証する
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // GET、HEAD、OPTIONSリクエストは除外
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }
      
      // 認証が不要なエンドポイントは除外
      if (req.path === '/api/auth/login' || req.path === '/api/auth/csrf-token') {
        return next();
      }
      
      const token = req.headers['x-csrf-token'] as string;
      
      if (!this.verifyToken(req, token)) {
        res.status(403).json({
          success: false,
          message: 'CSRFトークンが無効または期限切れです'
        });
        return;
      }
      
      next();
    };
  }

  /**
   * CSRFトークン取得エンドポイント
   * クライアントがトークンを取得するためのハンドラー
   */
  tokenEndpoint() {
    return (req: Request, res: Response): void => {
      try {
        const token = this.generateToken(req);
        
        res.json({
          success: true,
          data: { token }
        });
      } catch (_error) {
        res.status(500).json({
          success: false,
          message: 'CSRFトークンの生成に失敗しました'
        });
      }
    };
  }
}

/**
 * デフォルトのCSRF保護インスタンス
 */
export const csrfProtection = new CSRFProtection();
