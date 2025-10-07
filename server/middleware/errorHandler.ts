import type { Request, Response, NextFunction } from 'express';
import { sanitizeLogData } from './security';

/**
 * カスタムエラークラス
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 統一エラーレスポンス形式
 */
export interface ErrorResponse {
  success: false;
  message: string;
  code?: string;
  details?: any;
}

/**
 * エラーハンドリングミドルウェア
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let statusCode = 500;
  let message = 'サーバーエラーが発生しました';
  let code = 'INTERNAL_ERROR';

  // AppErrorの場合は設定された値を使用
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.name;
  }
  // バリデーションエラーの場合
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = '入力値が正しくありません';
    code = 'VALIDATION_ERROR';
  }
  // 認証エラーの場合
  else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = '認証が必要です';
    code = 'UNAUTHORIZED';
  }
  // 権限エラーの場合
  else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'アクセス権限がありません';
    code = 'FORBIDDEN';
  }
  // リソースが見つからない場合
  else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'リソースが見つかりません';
    code = 'NOT_FOUND';
  }
  // 競合エラーの場合
  else if (err.name === 'ConflictError') {
    statusCode = 409;
    message = 'リソースの競合が発生しました';
    code = 'CONFLICT';
  }

  // エラーログの出力
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    statusCode,
    message: err.message,
    stack: err.stack,
    user: req.user?.id || 'anonymous',
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  };

  // 本番環境ではスタックトレースを除外
  if (process.env.NODE_ENV === 'production') {
    delete errorLog.stack;
  }

  console.error('Error occurred:', sanitizeLogData(errorLog));

  // エラーレスポンスの送信
  const errorResponse: ErrorResponse = {
    success: false,
    message,
    code,
  };

  // 開発環境では詳細情報を追加
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = {
      originalMessage: err.message,
      stack: err.stack,
    };
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * 404エラーハンドラー
 */
export function notFoundHandler(req: Request, res: Response): void {
  const errorResponse: ErrorResponse = {
    success: false,
    message: `エンドポイント ${req.method} ${req.path} が見つかりません`,
    code: 'NOT_FOUND',
  };

  res.status(404).json(errorResponse);
}

/**
 * 非同期エラーハンドラー
 * 非同期関数をラップしてエラーをキャッチする
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * エラーメッセージの定数
 */
export const ERROR_MESSAGES = {
  VALIDATION_ERROR: '入力値が正しくありません',
  UNAUTHORIZED: '認証が必要です',
  FORBIDDEN: 'アクセス権限がありません',
  NOT_FOUND: 'リソースが見つかりません',
  CONFLICT: 'リソースの競合が発生しました',
  INTERNAL_ERROR: 'サーバーエラーが発生しました',
  RATE_LIMIT_EXCEEDED: 'リクエスト制限に達しました',
  CSRF_TOKEN_INVALID: 'CSRFトークンが無効です',
  FILE_UPLOAD_ERROR: 'ファイルアップロードに失敗しました',
  DATABASE_ERROR: 'データベースエラーが発生しました',
} as const;
