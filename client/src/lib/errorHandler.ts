import { toast } from "@/hooks/useToast";

/**
 * エラータイプの定義
 */
export enum ErrorType {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  CSRF_TOKEN_INVALID = "CSRF_TOKEN_INVALID",
  FILE_UPLOAD_ERROR = "FILE_UPLOAD_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
}

/**
 * エラーレスポンスのインターフェース
 */
export interface ErrorResponse {
  success: false;
  message: string;
  code?: string;
  details?: any;
}

/**
 * カスタムエラークラス
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly code?: string;
  public readonly details?: any;

  constructor(message: string, type: ErrorType, code?: string, details?: any) {
    super(message);
    this.name = "AppError";
    this.type = type;
    this.code = code;
    this.details = details;
  }
}

/**
 * ErrorをAppErrorに変換するヘルパー関数
 */
export function toAppError(error: Error, type: ErrorType = ErrorType.INTERNAL_ERROR): AppError {
  return new AppError(error.message, type);
}

/**
 * エラーメッセージの定数
 */
export const ERROR_MESSAGES = {
  [ErrorType.VALIDATION_ERROR]: "入力値が正しくありません",
  [ErrorType.UNAUTHORIZED]: "認証が必要です",
  [ErrorType.FORBIDDEN]: "アクセス権限がありません",
  [ErrorType.NOT_FOUND]: "リソースが見つかりません",
  [ErrorType.CONFLICT]: "リソースの競合が発生しました",
  [ErrorType.INTERNAL_ERROR]: "サーバーエラーが発生しました",
  [ErrorType.RATE_LIMIT_EXCEEDED]: "リクエスト制限に達しました",
  [ErrorType.CSRF_TOKEN_INVALID]: "CSRFトークンが無効です",
  [ErrorType.FILE_UPLOAD_ERROR]: "ファイルアップロードに失敗しました",
  [ErrorType.DATABASE_ERROR]: "データベースエラーが発生しました",
  [ErrorType.NETWORK_ERROR]: "ネットワークエラーが発生しました",
  [ErrorType.TIMEOUT_ERROR]: "リクエストがタイムアウトしました",
} as const;

/**
 * エラーレスポンスをパースしてAppErrorに変換
 */
export function parseErrorResponse(response: Response): Promise<AppError> {
  return response.json().then((data: ErrorResponse) => {
    const errorType = (data.code as ErrorType) || ErrorType.INTERNAL_ERROR;
    return new AppError(data.message, errorType, data.code, data.details);
  }).catch(() => {
    // JSONパースに失敗した場合
    return new AppError(
      `HTTP ${response.status}: ${response.statusText}`,
      ErrorType.INTERNAL_ERROR,
      response.status.toString()
    );
  });
}

/**
 * エラーをAppErrorに変換
 */
export function convertToAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    // ネットワークエラーの場合
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      return new AppError(
        ERROR_MESSAGES[ErrorType.NETWORK_ERROR],
        ErrorType.NETWORK_ERROR,
        "NETWORK_ERROR"
      );
    }

    // タイムアウトエラーの場合
    if (error.name === "AbortError") {
      return new AppError(
        ERROR_MESSAGES[ErrorType.TIMEOUT_ERROR],
        ErrorType.TIMEOUT_ERROR,
        "TIMEOUT_ERROR"
      );
    }

    // その他のエラー
    return new AppError(
      error.message,
      ErrorType.INTERNAL_ERROR,
      "UNKNOWN_ERROR"
    );
  }

  // 不明なエラー
  return new AppError(
    ERROR_MESSAGES[ErrorType.INTERNAL_ERROR],
    ErrorType.INTERNAL_ERROR,
    "UNKNOWN_ERROR"
  );
}

/**
 * エラーハンドリング関数（Responseオブジェクト対応）
 */
export async function handleError(error: unknown, showToast: boolean = true): Promise<AppError> {
  let appError: AppError;

  // Responseオブジェクトの場合
  if (error instanceof Response) {
    // 429エラー（レート制限）の場合
    if (error.status === 429) {
      appError = new AppError(
        ERROR_MESSAGES[ErrorType.RATE_LIMIT_EXCEEDED],
        ErrorType.RATE_LIMIT_EXCEEDED,
        "RATE_LIMIT_EXCEEDED",
        "ログイン試行回数が上限に達しました。しばらく時間をおいてから再試行してください。"
      );
    } else {
      // その他のHTTPエラー
      appError = await parseErrorResponse(error);
    }
  } else {
    // その他のエラー
    appError = convertToAppError(error);
  }

  if (showToast) {
    showErrorToast(appError);
  }

  return appError;
}

/**
 * エラートーストを表示
 */
export function showErrorToast(error: AppError): void {
  const title = getErrorTitle(error.type);
  const description = error.details || error.message;

  toast({
    variant: "destructive",
    title,
    description,
  });
}

/**
 * 成功トーストを表示
 */
export function showSuccessToast(message: string, description?: string): void {
  toast({
    title: message,
    description,
  });
}

/**
 * 警告トーストを表示
 */
export function showWarningToast(message: string, description?: string): void {
  toast({
    variant: "destructive",
    title: message,
    description,
  });
}

/**
 * 情報トーストを表示
 */
export function showInfoToast(message: string, description?: string): void {
  toast({
    title: message,
    description,
  });
}

/**
 * エラータイプに基づいてタイトルを取得
 */
function getErrorTitle(type: ErrorType): string {
  switch (type) {
    case ErrorType.VALIDATION_ERROR:
      return "入力エラー";
    case ErrorType.UNAUTHORIZED:
      return "認証エラー";
    case ErrorType.FORBIDDEN:
      return "権限エラー";
    case ErrorType.NOT_FOUND:
      return "リソースが見つかりません";
    case ErrorType.CONFLICT:
      return "競合エラー";
    case ErrorType.RATE_LIMIT_EXCEEDED:
      return "リクエスト制限";
    case ErrorType.CSRF_TOKEN_INVALID:
      return "セキュリティエラー";
    case ErrorType.FILE_UPLOAD_ERROR:
      return "ファイルアップロードエラー";
    case ErrorType.DATABASE_ERROR:
      return "データベースエラー";
    case ErrorType.NETWORK_ERROR:
      return "ネットワークエラー";
    case ErrorType.TIMEOUT_ERROR:
      return "タイムアウトエラー";
    default:
      return "エラー";
  }
}

/**
 * エラータイプに基づいてリトライ可能かどうかを判定
 */
export function isRetryableError(error: AppError): boolean {
  switch (error.type) {
    case ErrorType.NETWORK_ERROR:
    case ErrorType.TIMEOUT_ERROR:
    case ErrorType.INTERNAL_ERROR:
    case ErrorType.DATABASE_ERROR:
      return true;
    default:
      return false;
  }
}

/**
 * エラータイプに基づいてユーザーアクションを取得
 */
export function getErrorAction(error: AppError): string {
  switch (error.type) {
    case ErrorType.UNAUTHORIZED:
      return "ログインしてください";
    case ErrorType.FORBIDDEN:
      return "管理者に問い合わせてください";
    case ErrorType.VALIDATION_ERROR:
      return "入力内容を確認してください";
    case ErrorType.RATE_LIMIT_EXCEEDED:
      return "しばらく時間をおいてから再試行してください";
    case ErrorType.NETWORK_ERROR:
      return "ネットワーク接続を確認してください";
    case ErrorType.TIMEOUT_ERROR:
      return "再試行してください";
    default:
      return "管理者に問い合わせてください";
  }
}
