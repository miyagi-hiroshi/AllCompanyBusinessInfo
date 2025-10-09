import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect,useState } from "react";

import { useToast } from "@/hooks/useToast";
import { handleError,showErrorToast, showSuccessToast } from "@/lib/errorHandler";
import { apiRequest } from "@/lib/queryClient";

// ユーザー情報の型定義
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isFirstLogin: boolean;
}

interface Employee {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  departmentId: number;
  status: string;
}

interface AuthState {
  user: User | null;
  employee: Employee | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// 認証API
const authApi = {
  // ログイン
  async login(email: string, password: string): Promise<{
    user: User;
    employee: Employee | null;
  }> {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      credentials: "include", // Cookieを受信
    });

    if (!response.ok) {
      throw handleError(response, false);
    }

    const data = await response.json() as {
      success: boolean;
      data?: { user: User; employee: Employee | null };
      message?: string;
    };

    if (data.success && data.data) {
      // セッションはHTTPOnly Cookieで管理（localStorageは使用しない）
      return data.data;
    } else {
      throw new Error(data.message || "ログインに失敗しました");
    }
  },

  // ログアウト
  async logout(): Promise<void> {
    const response = await apiRequest("POST", "/api/auth/logout", undefined);
    
    if (!response.ok) {
      throw handleError(response, false);
    }
    // Cookieはサーバー側で削除される
  },

  // 認証状態確認
  async getCurrentUser(): Promise<{
    user: User;
    employee: Employee | null;
  }> {
    // Cookieからセッション情報を取得（HTTPOnly Cookieは自動送信される）
    const response = await apiRequest("GET", "/api/auth/me", undefined);

    if (!response.ok) {
      throw handleError(response, false);
    }

    const data = await response.json() as {
      success: boolean;
      data?: { user: User; employee: Employee | null };
      message?: string;
    };

    if (data.success && data.data) {
      return data.data;
    } else {
      throw new Error(data.message || "認証状態の確認に失敗しました");
    }
  },
};

// 認証フック
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    employee: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const { toast: _toast } = useToast(); // 未使用のためプレフィックス追加
  const queryClient = useQueryClient();

  // 認証状態確認クエリ
  const { data: currentUser, isLoading: isCheckingAuth } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: authApi.getCurrentUser,
    retry: false,
    enabled: false, // 初回は認証チェックを実行しない
  });

  // ログインMutation
  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: (data) => {
      // ログイン成功、レスポンスから直接ユーザー情報を取得
      setAuthState({
        user: data.user,
        employee: data.employee,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      showSuccessToast("ログイン成功", "認証が完了しました");
    },
    onError: (error) => {
      const appError = handleError(error, false);
      setAuthState({
        user: null,
        employee: null,
        isAuthenticated: false,
        isLoading: false,
        error: appError.message,
      });
      showErrorToast(appError);
    },
  });

  // ログアウトMutation
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      setAuthState({
        user: null,
        employee: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      showSuccessToast("ログアウト完了", "正常にログアウトしました");
      void queryClient.clear();
    },
    onError: (error) => {
      const appError = handleError(error, false);
      showErrorToast(appError);
    },
  });

  // 初回アクセス時の処理
  useEffect(() => {
    // Cookieベースの認証: サーバーに認証状態を確認
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include", // Cookieを送信
        });
        
        if (response.ok) {
          const result = await response.json() as {
            success: boolean;
            data?: { user: User; employee: Employee | null };
          };
          
          if (result.success && result.data) {
            setAuthState({
              user: result.data.user,
              employee: result.data.employee,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return;
          }
        }
        
        // 認証エラーまたはCookieなしの場合はログイン画面を表示
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
        }));
      } catch {
        // エラー時はログイン画面を表示
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
        }));
      }
    };
    
    void checkAuth();
  }, []);

  // 認証状態の更新
  useEffect(() => {
    if (currentUser) {
      setAuthState({
        user: currentUser.user,
        employee: currentUser.employee,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } else if (!isCheckingAuth) {
      setAuthState({
        user: null,
        employee: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, [currentUser, isCheckingAuth]);

  // ログイン
  const login = (email: string, password: string) => {
    loginMutation.mutate({ email, password });
  };

  // ログアウト
  const logout = () => {
    logoutMutation.mutate();
  };

  return {
    ...authState,
    login,
    logout,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}
