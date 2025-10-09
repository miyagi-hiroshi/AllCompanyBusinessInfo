import { NextFunction,Request, Response } from 'express';

import { getExistingEmployeeByUserId,getExistingUser } from '../storage/existing';
import { sessionRepository } from '../storage/session';

/**
 * 認証ミドルウェア
 * 
 * @description 既存システムのユーザー情報を使用した認証チェック
 */
export async function isAuthenticated(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Cookieまたはauthorizationヘッダーからセッションを取得
    const sessionId = req.cookies?.sessionId || req.headers.authorization?.replace('Bearer ', '');
    
    // デバッグログ（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 認証チェック:', {
        path: req.path,
        hasCookie: !!req.cookies?.sessionId,
        hasAuth: !!req.headers.authorization,
        sessionId: sessionId ? `${sessionId.substring(0, 8)}...` : 'なし',
        cookies: req.cookies
      });
    }
    
    if (!sessionId) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ セッションIDなし');
      }
      res.status(401).json({ 
        success: false,
        message: "認証が必要です" 
      });
      return;
    }

    // セッションをDBから取得
    const session = await sessionRepository.findById(sessionId);
    
    if (!session) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ セッションが見つかりません:', sessionId?.substring(0, 8));
      }
      res.status(401).json({ 
        success: false,
        message: "セッションが無効です" 
      });
      return;
    }
    
    // セッションの有効期限をチェック
    if (session.expiresAt < new Date()) {
      // 期限切れセッションを削除
      await sessionRepository.delete(sessionId);
      if (process.env.NODE_ENV === 'development') {
        console.log('⏰ セッション期限切れ:', sessionId.substring(0, 8));
      }
      res.status(401).json({ 
        success: false,
        message: "セッションの有効期限が切れています" 
      });
      return;
    }

    // 既存システムからユーザー情報を取得
    const user = await getExistingUser(session.userId);
    
    if (!user || user.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ ユーザーが見つかりません:', session.userId);
      }
      res.status(401).json({ 
        success: false,
        message: "認証情報が無効です" 
      });
      return;
    }

    const userData = user[0];
    
    // 既存システムから従業員情報を取得
    const employee = await getExistingEmployeeByUserId(userData.id);
    
    // リクエストオブジェクトにユーザー情報を設定
    (req as any).user = {
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      isFirstLogin: userData.isFirstLogin,
      employeeId: employee?.id || null,
      employee: employee ? {
        id: employee.id,
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        departmentId: employee.departmentId,
        status: employee.status,
      } : null,
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ 認証成功:', userData.email);
    }

    next();
  } catch (error) {
    console.error('認証エラー:', error);
    res.status(500).json({ 
      success: false,
      message: "認証処理中にエラーが発生しました" 
    });
  }
}

/**
 * グローバル認証ミドルウェア
 * 
 * @description 全APIエンドポイントで使用可能な認証ミドルウェア
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  await isAuthenticated(req, res, next);
};

/**
 * 操作権限チェックミドルウェア
 * 
 * @param operation - チェックする操作権限
 * @description 簡易的な権限チェック（実際の権限システムは既存システムで管理）
 */
export const requireOperationPermission = (operation: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!(req as any).user) {
        res.status(401).json({ 
          success: false,
          message: "認証が必要です" 
        });
        return;
      }

      const user = (req as any).user;
      
      // 簡易的な権限チェック（実際の権限システムは既存システムで管理）
      // ここでは基本的なチェックのみ実装
      if (operation === 'admin' && user.email !== 'admin@example.com') {
        res.status(403).json({ 
          success: false,
          message: "管理者権限が必要です" 
        });
        return;
      }

      next();
    } catch (error) {
      console.error('権限チェックエラー:', error);
      res.status(500).json({ 
        success: false,
        message: "権限チェック中にエラーが発生しました" 
      });
    }
  };
};

