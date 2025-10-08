import express, { type Request, Response } from 'express';
import { z } from 'zod';

import { isAuthenticated } from '../middleware/auth';
import { getExistingEmployeeByUserId,getExistingUserByEmail } from '../storage/existing';

const router = express.Router();

// ログインスキーマ
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * ログインAPI
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    // 既存システムからユーザー情報を取得
    const user = await getExistingUserByEmail(email);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'メールアドレスまたはパスワードが正しくありません'
      });
    }

    // 簡易的なパスワードチェック（実際の実装では既存システムの認証方式を使用）
    // ここでは既存システムの認証APIを呼び出すか、直接データベースをチェック
    if (password !== 'password') { // 実際の実装では適切な認証処理
      return res.status(401).json({
        success: false,
        message: 'メールアドレスまたはパスワードが正しくありません'
      });
    }

    // 既存システムから従業員情報を取得
    const employee = await getExistingEmployeeByUserId(user.id);
    
    // セッションIDとしてユーザーIDを使用（実際の実装では適切なセッション管理）
    const sessionId = user.id;

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isFirstLogin: user.isFirstLogin,
        },
        employee: employee ? {
          id: employee.id,
          employeeId: employee.employeeId,
          firstName: employee.firstName,
          lastName: employee.lastName,
          departmentId: employee.departmentId,
          status: employee.status,
        } : null,
        sessionId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力値が正しくありません',
        errors: error.errors,
      });
    }

    console.error('ログインエラー:', error);
    res.status(500).json({
      success: false,
      message: 'ログイン処理中にエラーが発生しました',
    });
  }
});

/**
 * ログアウトAPI
 * POST /api/auth/logout
 */
router.post('/logout', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // セッションの削除処理（実際の実装では既存システムのセッション管理を使用）
    res.json({
      success: true,
      message: 'ログアウトしました',
    });
  } catch (error) {
    console.error('ログアウトエラー:', error);
    res.status(500).json({
      success: false,
      message: 'ログアウト処理中にエラーが発生しました',
    });
  }
});

/**
 * ユーザー情報取得API
 * GET /api/auth/me
 */
router.get('/me', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isFirstLogin: user.isFirstLogin,
        },
        employee: user.employee,
      },
    });
  } catch (error) {
    console.error('ユーザー情報取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'ユーザー情報の取得中にエラーが発生しました',
    });
  }
});

/**
 * CSRFトークン取得API
 * GET /api/auth/csrf-token
 */
router.get('/csrf-token', async (req: Request, res: Response) => {
  try {
    // 簡易的なCSRFトークン生成（実際の実装では適切なCSRF保護を使用）
    const csrfToken = Math.random().toString(36).substring(2, 15);
    
    res.json({
      success: true,
      data: {
        csrfToken,
      },
    });
  } catch (error) {
    console.error('CSRFトークン生成エラー:', error);
    res.status(500).json({
      success: false,
      message: 'CSRFトークンの生成中にエラーが発生しました',
    });
  }
});

export default router;

