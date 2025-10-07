import { Request, Response, NextFunction } from 'express';
import { getExistingUser, getExistingEmployeeByUserId } from '../storage/existing';

// 既存システムとの統合認証ミドルウェア
export async function isAuthenticatedIntegrated(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionId) {
      return res.status(401).json({ 
        success: false,
        message: "認証が必要です" 
      });
    }

    // 既存システムからユーザー情報を取得
    const user = await getExistingUser(sessionId);
    
    if (!user || user.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: "認証情報が無効です" 
      });
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

    next();
  } catch (error) {
    console.error('認証エラー:', error);
    res.status(500).json({ 
      success: false,
      message: "認証処理中にエラーが発生しました" 
    });
  }
}

// グローバル認証ミドルウェア（統合版）
export const requireAuthIntegrated = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  await isAuthenticatedIntegrated(req, res, next);
};

// 操作権限チェックミドルウェア（簡易版）
export const requireOperationPermissionIntegrated = (operation: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!(req as any).user) {
        return res.status(401).json({ 
          success: false,
          message: "認証が必要です" 
        });
      }

      const user = (req as any).user;
      
      // 簡易的な権限チェック（実際の権限システムは既存システムで管理）
      // ここでは基本的なチェックのみ実装
      if (operation === 'admin' && user.email !== 'admin@example.com') {
        return res.status(403).json({ 
          success: false,
          message: "管理者権限が必要です" 
        });
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
