import type { NextFunction,Request, Response } from 'express';

import { sanitizeLogData } from './security';

/**
 * ログ記録ミドルウェア
 * 
 * 責務:
 * - 操作ログの記録
 * - ログインログの記録
 * - セキュリティ監視
 * - WebSocketリアルタイム通知
 */

// ログの種類
export enum LogType {
  OPERATION = 'operation',
  LOGIN = 'login',
  SECURITY = 'security',
  ERROR = 'error',
  API = 'api',
}

// ログレベル
export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug',
}

/**
 * ログエントリの型定義
 */
export interface LogEntry {
  timestamp: Date;
  userId?: number;
  employeeId?: string;
  action: string;
  resource?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
}

// ログデータのインターフェース
export interface LogData {
  timestamp: string;
  type: LogType;
  level: LogLevel;
  message: string;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  details?: any;
}

/**
 * ログ出力関数
 */
function writeLog(logData: LogData): void {
  const sanitizedLog = sanitizeLogData(logData);
  
  // コンソール出力
  const logMessage = `[${logData.timestamp}] ${logData.level.toUpperCase()} ${logData.type}: ${logData.message}`;
  
  switch (logData.level) {
    case LogLevel.ERROR:
      console.error(logMessage, sanitizedLog);
      break;
    case LogLevel.WARN:
      console.warn(logMessage, sanitizedLog);
      break;
    case LogLevel.DEBUG:
      if (process.env.NODE_ENV === 'development') {
        console.debug(logMessage, sanitizedLog);
      }
      break;
    default:
      console.info(logMessage, sanitizedLog);
  }
}

/**
 * ログ記録ミドルウェア
 * リクエストの操作ログを記録する
 */
export function logMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const originalJson = res.json;
  
  // レスポンスをキャプチャ
  res.json = function(body: any) {
    const duration = Date.now() - startTime;
    
    // 操作ログの記録
    if (req.method !== 'GET' && req.path.startsWith('/api')) {
      const logData: LogData = {
        timestamp: new Date().toISOString(),
        type: LogType.OPERATION,
        level: LogLevel.INFO,
        message: `${req.method} ${req.path} - ${res.statusCode}`,
        userId: req.user?.id,
        sessionId: req.headers.authorization?.replace('Bearer ', ''),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        details: {
          body: req.body,
          query: req.query,
          params: req.params,
        },
      };
      
      writeLog(logData);
    }
    
    return originalJson.call(this, body);
  };
  
  next();
}

/**
 * ログイン試行を記録する
 * 
 * @param req - リクエストオブジェクト
 * @param success - ログイン成功/失敗
 * @param userId - ユーザーID
 */
export function logLoginAttempt(req: Request, success: boolean, userId?: string): void {
  const logData: LogData = {
    timestamp: new Date().toISOString(),
    type: LogType.LOGIN,
    level: success ? LogLevel.INFO : LogLevel.WARN,
    message: `ログイン${success ? '成功' : '失敗'}`,
    userId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    details: {
      success,
      email: req.body?.email,
    },
  };
  
  writeLog(logData);
}

/**
 * ログイン失敗検知
 * 連続したログイン失敗を監視してアラートを発報
 * 
 * @param ipAddress - IPアドレス
 * @param userId - ユーザーID
 */
export function detectLoginFailures(_ipAddress: string, _userId?: number): void {
  // TODO: 実装予定 - ログイン失敗検知
}

/**
 * 異常IP検知
 * 通常と異なるIPアドレスからのアクセスを検知
 * 
 * @param userId - ユーザーID
 * @param ipAddress - IPアドレス
 */
export function detectAbnormalIP(_userId: number, _ipAddress: string): void {
  // TODO: 実装予定 - 異常IP検知
}

/**
 * 大量エクスポート検知
 * 短時間での大量データエクスポートを検知
 * 
 * @param userId - ユーザーID
 * @param recordCount - エクスポート件数
 */
export function detectMassExport(_userId: number, _recordCount: number): void {
  // TODO: 実装予定 - 大量エクスポート検知
}

/**
 * WebSocketでリアルタイム通知を送信
 * 
 * @param event - イベント名
 * @param data - 送信データ
 */
export function sendWebSocketNotification(_event: string, _data: any): void {
  // TODO: 実装予定 - WebSocket通知送信
}

/**
 * セキュリティアラートを発報
 * 
 * @param alertType - アラート種別
 * @param details - 詳細情報
 */
export function sendSecurityAlert(_alertType: string, _details: any): void {
  // TODO: 実装予定 - セキュリティアラート発報
}
