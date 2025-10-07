import express, { type Request, Response } from 'express';
import { z } from 'zod';

const router = express.Router();

// ダミーユーザーデータ（メモリ実装）
const users = [
  {
    id: '1',
    employeeId: 'EMP001',
    name: '管理者',
    email: 'admin@example.com',
    password: 'password123', // 実際の実装ではハッシュ化が必要
    role: 'admin',
    permissions: ['read', 'write', 'delete', 'admin']
  },
  {
    id: '2',
    employeeId: 'EMP002',
    name: '一般ユーザー',
    email: 'user@example.com',
    password: 'password123',
    role: 'user',
    permissions: ['read', 'write']
  }
];

// セッション管理（メモリ実装）
const sessions = new Map<string, { userId: string; expiresAt: Date }>();

// ログインスキーマ
const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください')
});

/**
 * ログインAPI
 * POST /api/auth/login
 */
router.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    // ユーザー検索
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'メールアドレスまたはパスワードが正しくありません'
      });
    }
    
    // セッション作成
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2時間
    
    sessions.set(sessionId, { userId: user.id, expiresAt });
    
    // レスポンス
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          employeeId: user.employeeId,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions
        },
        sessionId
      }
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力値が正しくありません',
        errors: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * ログアウトAPI
 * POST /api/auth/logout
 */
router.post('/logout', (req: Request, res: Response) => {
  try {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    
    if (sessionId && sessions.has(sessionId)) {
      sessions.delete(sessionId);
    }
    
    res.json({
      success: true,
      message: 'ログアウトしました'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * 認証状態確認API
 * GET /api/auth/me
 */
router.get('/me', (req: Request, res: Response) => {
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
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          employeeId: user.employeeId,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions
        }
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

/**
 * CSRFトークン取得API
 * GET /api/auth/csrf-token
 */
router.get('/csrf-token', (req: Request, res: Response) => {
  try {
    const token = `csrf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    res.json({
      success: true,
      data: { token }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました'
    });
  }
});

export default router;
