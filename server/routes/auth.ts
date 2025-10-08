import express, { type Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { promisify } from 'util';

import { isAuthenticated } from '../middleware/auth';
import { getExistingEmployeeByUserId,getExistingUserByEmail } from '../storage/existing';

// scryptの非同期版
const scryptAsync = promisify(crypto.scrypt);

// 既存システムと同じパスワードハッシュ化関数
async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// 既存システムと同じパスワード検証関数
async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    const [hash, salt] = hashedPassword.split('.');
    if (!hash || !salt) return false;
    
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    const computedHash = buf.toString("hex");
    
    return computedHash === hash;
  } catch (error) {
    return false;
  }
}

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

    // 既存システムのパスワード検証
    console.log('🔐 パスワード検証開始:');
    console.log(`  - 入力パスワード: ${password}`);
    console.log(`  - データベースハッシュ: ${user.password}`);
    
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'メールアドレスまたはパスワードが正しくありません'
      });
    }
    
    const isPasswordValid = await verifyPassword(password, user.password);
    console.log(`  - 検証結果: ${isPasswordValid}`);
    
    if (!isPasswordValid) {
      console.log('❌ パスワード検証失敗');
      return res.status(401).json({
        success: false,
        message: 'メールアドレスまたはパスワードが正しくありません'
      });
    }
    
    console.log('✅ パスワード検証成功');

    // 既存システムから従業員情報を取得
    const employee = await getExistingEmployeeByUserId(user.id);
    
    // セッションIDとしてユーザーIDを使用
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

