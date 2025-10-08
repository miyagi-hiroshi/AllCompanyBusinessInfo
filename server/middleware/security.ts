import type { Express,NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

/**
 * セキュリティミドルウェア
 * 
 * 責務:
 * - 入力検証とバリデーション
 * - サニタイゼーション
 * - ファイルセキュリティ
 * - レート制限
 * - Helmet、CSRF保護の統合
 */

/**
 * セキュリティミドルウェアの統合設定
 * Helmet、レート制限、CSRF保護を一括で設定する
 * 
 * @param app - Expressアプリケーションインスタンス
 */
export function setupSecurityMiddleware(app: Express): void {
  // 開発環境ではCSPを緩和、本番環境では厳密に設定
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  app.use(helmet({
    contentSecurityPolicy: isDevelopment ? {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    } : {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // レート制限設定（開発環境では緩和）
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分
    max: 1000, // 最大1000リクエスト（開発環境では緩和）
    message: {
      success: false,
      message: 'リクエストが多すぎます。しばらく時間をおいてから再試行してください。'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分
    max: 5, // 最大5リクエスト
    message: {
      success: false,
      message: 'ログイン試行回数が上限に達しました。しばらく時間をおいてから再試行してください。'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分
    max: 10, // 最大10リクエスト
    message: {
      success: false,
      message: 'ファイルアップロードの制限に達しました。しばらく時間をおいてから再試行してください。'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // 全般のレート制限
  app.use('/api', generalLimiter);
  
  // 認証関連のレート制限
  app.use('/api/auth/login', authLimiter);
  
  // ファイルアップロードのレート制限
  app.use('/api/upload', uploadLimiter);
  app.use('/api/customers/import', uploadLimiter);

  // サニタイゼーションミドルウェア
  app.use(sanitizeMiddleware);
}

/**
 * 入力値サニタイゼーション
 * ユーザー入力から危険な文字列を除去・エスケープする
 * 
 * @param input - サニタイズする入力値
 * @returns サニタイズされた値
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input
      .replace(/[<>]/g, '') // HTMLタグの除去
      .replace(/javascript:/gi, '') // JavaScript URLの除去
      .replace(/on\w+=/gi, '') // イベントハンドラーの除去
      .trim();
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
}

/**
 * HTMLサニタイゼーション
 * HTMLコンテンツから危険なタグやスクリプトを除去する
 * 
 * @param html - サニタイズするHTML文字列
 * @returns サニタイズされたHTML
 */
export function sanitizeHTML(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // scriptタグの除去
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // iframeタグの除去
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // objectタグの除去
    .replace(/<embed\b[^<]*>/gi, '') // embedタグの除去
    .replace(/<link\b[^>]*>/gi, '') // linkタグの除去
    .replace(/<meta\b[^>]*>/gi, '') // metaタグの除去
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // イベントハンドラーの除去
    .replace(/javascript:/gi, '') // JavaScript URLの除去
    .replace(/vbscript:/gi, '') // VBScript URLの除去
    .replace(/data:text\/html/gi, ''); // data URLの除去
}

/**
 * ファイル名サニタイゼーション
 * ファイル名から危険な文字やパストラバーサルを除去する
 * 
 * @param filename - サニタイズするファイル名
 * @returns サニタイズされたファイル名
 */
export function sanitizeFileName(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '') // 危険な文字の除去
    .replace(/\.\./g, '') // パストラバーサル攻撃の防止
    .replace(/^\.+/, '') // 先頭のドットの除去
    .replace(/\.+$/, '') // 末尾のドットの除去
    .replace(/\s+/g, '_') // スペースをアンダースコアに変換
    .substring(0, 255) // ファイル名長制限
    .trim();
}

/**
 * ログデータサニタイゼーション
 * ログ出力から機密情報を除去する
 * 
 * @param data - サニタイズするログデータ
 * @returns サニタイズされたログデータ
 */
export function sanitizeLogData(data: any): any {
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'session'];
  
  if (typeof data === 'string') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeLogData(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeLogData(value);
      }
    }
    return sanitized;
  }
  
  return data;
}

/**
 * サニタイゼーションミドルウェア
 * リクエストボディを自動的にサニタイズする
 */
export function sanitizeMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeInput(req.body);
  }
  
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeInput(req.query);
  }
  
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeInput(req.params);
  }
  
  next();
}
