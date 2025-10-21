import { AppError,ErrorType } from "./errorHandler";
import { showErrorToast } from "./errorHandler";

/**
 * 認証エラーハンドリング用のグローバル関数
 */
export class AuthErrorHandler {
  private static instance: AuthErrorHandler;
  private logoutCallback: (() => void) | null = null;

  private constructor() {}

  static getInstance(): AuthErrorHandler {
    if (!AuthErrorHandler.instance) {
      AuthErrorHandler.instance = new AuthErrorHandler();
    }
    return AuthErrorHandler.instance;
  }

  /**
   * ログアウトコールバックを設定
   */
  setLogoutCallback(callback: () => void): void {
    this.logoutCallback = callback;
  }

  /**
   * 401エラーをチェックしてログアウト処理を実行
   */
  handleAuthError(error: unknown): boolean {
    // エラーの型をチェック
    const isUnauthorized = this.checkUnauthorizedError(error);
    
    if (isUnauthorized) {
      // 認証エラーの通知を表示
      showErrorToast(new AppError("認証が必要です", ErrorType.UNAUTHORIZED, undefined, "セッションが期限切れです。再ログインしてください。"));
      this.performLogout();
      return true; // 認証エラーを処理した
    }
    
    return false; // 認証エラーではない
  }

  /**
   * 401エラーかどうかをチェック
   */
  private checkUnauthorizedError(error: unknown): boolean {
    // AppErrorの場合
    if (error && typeof error === 'object' && 'type' in error) {
      const appError = error as { type: ErrorType; status?: number };
      return appError.type === ErrorType.UNAUTHORIZED || appError.status === 401;
    }

    // 標準的なErrorでstatusプロパティがある場合
    if (error && typeof error === 'object' && 'status' in error) {
      const errorWithStatus = error as { status: number };
      return errorWithStatus.status === 401;
    }

    // Responseオブジェクトの場合
    if (error && typeof error === 'object' && 'ok' in error) {
      const response = error as Response;
      return response.status === 401;
    }

    return false;
  }

  /**
   * ログアウト処理を実行
   */
  private performLogout(): void {
    if (this.logoutCallback) {
      this.logoutCallback();
    } else {
      // フォールバック: ページをリロードしてログイン画面に戻す
      window.location.href = '/';
    }
  }

  /**
   * レスポンスから401エラーをチェック
   */
  handleResponseError(response: Response): boolean {
    if (response.status === 401) {
      // 認証エラーの通知を表示
      showErrorToast(new AppError("認証が必要です", ErrorType.UNAUTHORIZED, undefined, "セッションが期限切れです。再ログインしてください。"));
      
      this.performLogout();
      return true;
    }
    return false;
  }
}

// グローバルインスタンスをエクスポート
export const authErrorHandler = AuthErrorHandler.getInstance();
