import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect,useState } from "react";

import { useToast } from "@/hooks/useToast";
import { handleError,showErrorToast, showSuccessToast } from "@/lib/errorHandler";
// import { apiRequest } from "@/lib/queryClient"; // 未使用のためコメントアウト

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
    sessionId: string;
  }> {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw handleError(response, false);
    }

    const data = await response.json() as {
      success: boolean;
      data?: { sessionId: string };
      message?: string;
    };

    if (data.success && data.data) {
      // セッションIDをローカルストレージに保存
      localStorage.setItem("sessionId", data.data.sessionId);
      return data.data;
    } else {
      throw new Error(data.message || "ログインに失敗しました");
    }
  },

  // ログアウト
  async logout(): Promise<void> {
    const sessionId = localStorage.getItem("sessionId");
    
    if (sessionId) {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sessionId}`,
        },
      });

      if (!response.ok) {
        throw handleError(response, false);
      }
    }

    // ローカルストレージからセッションIDを削除
    localStorage.removeItem("sessionId");
  },

  // 認証状態確認
  async getCurrentUser(): Promise<{
    user: User;
    employee: Employee | null;
  }> {
    const sessionId = localStorage.getItem("sessionId");
    
    if (!sessionId) {
      throw new Error("セッションが見つかりません");
    }

    const response = await fetch("/api/auth/me", {
      headers: {
        "Authorization": `Bearer ${sessionId}`,
      },
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
    enabled: !!localStorage.getItem("sessionId"),
  });

  // ログインMutation
  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: () => {
      // ログイン成功後、認証状態を再取得
      void queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
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
