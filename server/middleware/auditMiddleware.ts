import type { NextFunction,Request, Response } from 'express';

import { auditLogRepository } from '../storage/auditLog';

/**
 * 監査ログミドルウェア
 * 
 * 責務:
 * - 自動的な操作ログ記録
 * - データ変更の追跡
 * - セキュリティイベントの記録
 */

/**
 * データ変更を監査ログに記録するミドルウェア
 */
export function auditDataChanges(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json;
  const startTime = Date.now();

  // レスポンスをキャプチャ
  res.json = function(body: any) {
    const duration = Date.now() - startTime;

    // データ変更操作をログ記録
    if (shouldLogOperation(req.method, req.path) && req.user) {
      void logDataOperation(req, res, body, duration);
    }

    return originalJson.call(this, body);
  };

  next();
}

/**
 * 操作をログに記録するかどうかを判定
 */
function shouldLogOperation(method: string, path: string): boolean {
  // GETリクエストは除外
  if (method === 'GET') {return false;}
  
  // APIエンドポイントのみ対象
  if (!path.startsWith('/api/')) {return false;}
  
  // 認証関連のエンドポイントは除外
  if (path.startsWith('/api/auth/')) {return false;}
  
  return true;
}

/**
 * データ操作をログ記録
 */
async function logDataOperation(req: Request, res: Response, responseBody: any, duration: number): Promise<void> {
  try {
    const user = req.user!;
    const action = getActionFromMethod(req.method);
    const resource = getResourceFromPath(req.path);
    const resourceId = getResourceIdFromPath(req.path);
    
    // 成功した場合のみログ記録
    if (res.statusCode >= 200 && res.statusCode < 300) {
      await auditLogRepository.create({
        userId: user.id,
        employeeId: String(user.employeeId),
        action,
        resource,
        resourceId,
        oldValues: getOldValues(req),
        newValues: getNewValues(req, responseBody),
        ipAddress: req.ip ?? 'unknown',
        userAgent: req.get('User-Agent') ?? 'unknown',
        sessionId: req.headers.authorization?.replace('Bearer ', ''),
        details: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          timestamp: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    console.error('監査ログ記録エラー:', error);
  }
}

/**
 * HTTPメソッドからアクションを取得
 */
function getActionFromMethod(method: string): string {
  switch (method) {
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    default:
      return 'UNKNOWN';
  }
}

/**
 * パスからリソース名を取得
 */
function getResourceFromPath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  
  if (segments.length >= 2) {
    return segments[1].toUpperCase(); // /api/customers -> CUSTOMERS
  }
  
  return 'UNKNOWN';
}

/**
 * パスからリソースIDを取得
 */
function getResourceIdFromPath(path: string): string | undefined {
  const segments = path.split('/').filter(Boolean);
  
  // /api/customers/123 -> 123
  if (segments.length >= 3 && !isNaN(Number(segments[2]))) {
    return segments[2];
  }
  
  return undefined;
}

/**
 * 変更前の値を取得
 */
function getOldValues(req: Request): Record<string, any> | undefined {
  // PUT/PATCH/DELETEの場合、既存データの情報を含める
  if (['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    // 実際の実装では、データベースから既存データを取得
    // ここでは簡易的な実装
    return {
      // 既存データの情報
    };
  }
  
  return undefined;
}

/**
 * 変更後の値を取得
 */
function getNewValues(req: Request, responseBody: any): Record<string, any> | undefined {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    // レスポンスからデータを取得
    if (responseBody && typeof responseBody === 'object') {
      if (responseBody.data) {
        return responseBody.data;
      }
      return responseBody;
    }
  }
  
  return undefined;
}

/**
 * ログイン試行をログ記録
 */
export async function logLoginAttempt(
  req: Request,
  success: boolean,
  userId?: string,
  employeeId?: string
): Promise<void> {
  try {
    if (userId && employeeId) {
      await auditLogRepository.logLogin(
        userId,
        employeeId,
        success,
        req.ip ?? 'unknown',
        req.get('User-Agent') ?? 'unknown',
        req.headers.authorization?.replace('Bearer ', '')
      );
    }
  } catch (error) {
    console.error('ログインログ記録エラー:', error);
  }
}

/**
 * ログアウトをログ記録
 */
export async function logLogout(req: Request, userId: string, employeeId: string): Promise<void> {
  try {
    await auditLogRepository.logLogout(
      userId,
      employeeId,
      req.ip ?? 'unknown',
      req.get('User-Agent') ?? 'unknown',
      req.headers.authorization?.replace('Bearer ', '')
    );
  } catch (error) {
    console.error('ログアウトログ記録エラー:', error);
  }
}

/**
 * ファイルアップロードをログ記録
 */
export async function logFileUpload(
  req: Request,
  filename: string,
  fileSize: number
): Promise<void> {
  try {
    if (req.user) {
      await auditLogRepository.logFileUpload(
        req.user.id,
        String(req.user.employeeId),
        filename,
        fileSize,
        req.ip ?? 'unknown',
        req.get('User-Agent') ?? 'unknown',
        req.headers.authorization?.replace('Bearer ', '')
      );
    }
  } catch (error) {
    console.error('ファイルアップロードログ記録エラー:', error);
  }
}

/**
 * データエクスポートをログ記録
 */
export async function logDataExport(
  req: Request,
  resource: string,
  recordCount: number,
  exportFormat: string
): Promise<void> {
  try {
    if (req.user) {
      await auditLogRepository.logDataExport(
        req.user.id,
        String(req.user.employeeId),
        resource,
        recordCount,
        exportFormat,
        req.ip ?? 'unknown',
        req.get('User-Agent') ?? 'unknown',
        req.headers.authorization?.replace('Bearer ', '')
      );
    }
  } catch (error) {
    console.error('データエクスポートログ記録エラー:', error);
  }
}
