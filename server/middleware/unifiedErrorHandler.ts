import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

/**
 * 統一エラーハンドリングミドルウェア
 * 
 * @description 全APIで統一されたエラーレスポンスを提供
 */
export function unifiedErrorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // AppErrorの場合は適切なステータスコードとメッセージを返す
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.code && { code: error.code }),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  }

  // Zodバリデーションエラーの場合
  if (error.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      message: '入力値が正しくありません',
      errors: (error as any).errors,
    });
  }

  // その他のエラーの場合は500エラーとして処理
  console.error('Unhandled error:', error);
  
  res.status(500).json({
    success: false,
    message: 'サーバー内部エラーが発生しました',
    ...(process.env.NODE_ENV === 'development' && { 
      error: error.message,
      stack: error.stack 
    }),
  });
}

/**
 * 404エラーハンドリングミドルウェア
 * 
 * @description 存在しないエンドポイントへのアクセス時の処理
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `エンドポイント ${req.method} ${req.path} が見つかりません`,
  });
}
