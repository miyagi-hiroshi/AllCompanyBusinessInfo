import crypto from 'crypto';
import express, { type Request, Response } from 'express';
import { promisify } from 'util';
import { z } from 'zod';

import { isAuthenticated } from '../middleware/auth';
import { CSRFProtection } from '../middleware/csrf';
import { getExistingEmployeeByUserId,getExistingUserByEmail } from '../storage/existing';
import { sessionRepository } from '../storage/session';

const csrfProtection = new CSRFProtection();

// scryptの非同期版
const scryptAsync = promisify(crypto.scrypt);

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
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'メールアドレスまたはパスワードが正しくありません'
      });
    }
    
    const isPasswordValid = await verifyPassword(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'メールアドレスまたはパスワードが正しくありません'
      });
    }

    // 既存システムから従業員情報を取得
    const employee = await getExistingEmployeeByUserId(user.id);
    
    // セッションをDBに保存（2時間有効）
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2時間後
    const session = await sessionRepository.create(user.id, expiresAt);
    
    // HTTPOnly Cookieでセッション保存
    res.cookie('sessionId', session.id, {
      httpOnly: true, // XSS攻撃対策
      secure: process.env.NODE_ENV === 'production', // HTTPS通信時のみ送信（本番環境）
      sameSite: 'strict', // CSRF攻撃対策
      maxAge: 2 * 60 * 60 * 1000, // 2時間
    });

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
    // CookieからセッションIDを取得
    const sessionId = req.cookies?.sessionId;
    
    if (sessionId) {
      // セッションをDBから削除
      await sessionRepository.delete(sessionId);
    }
    
    // HTTPOnly Cookieを削除
    res.clearCookie('sessionId', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    
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
router.get('/csrf-token', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const token = csrfProtection.generateToken(req);
    
    res.json({
      success: true,
      data: { token },
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

