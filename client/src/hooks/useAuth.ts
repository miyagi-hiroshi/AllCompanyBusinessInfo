import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './useToast';
import { handleError, showSuccessToast, showErrorToast, parseErrorResponse, ErrorType } from '@/lib/errorHandler';

// 認証関連の型定義
export interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// 認証関連のAPI呼び出し関数
const authApi = {
  // ログイン
  async login(credentials: LoginCredentials) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    const data = await response.json();

    if (data.success) {
      // セッションIDをローカルストレージに保存
      localStorage.setItem('sessionId', data.data.sessionId);
      return data.data;
    } else {
      throw new Error(data.message || 'ログインに失敗しました');
    }
  },

  // ログアウト
  async logout() {
    const sessionId = localStorage.getItem('sessionId');
    
    if (sessionId) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionId}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Logout API call failed:', error);
      }
    }

    // ローカルストレージからセッションIDを削除
    localStorage.removeItem('sessionId');
  },

  // 認証状態確認
  async getCurrentUser(): Promise<User> {
    const sessionId = localStorage.getItem('sessionId');
    
    if (!sessionId) {
      throw new Error('セッションが見つかりません');
    }

    const response = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${sessionId}`,
      },
    });

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    const data = await response.json();

    if (data.success) {
      return data.data.user;
    } else {
      throw new Error(data.message || '認証状態の確認に失敗しました');
    }
  },
};

// 認証フック
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 認証状態確認クエリ
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5分
    enabled: !!localStorage.getItem('sessionId'),
  });

  // ログインミューテーション
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuthState({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      
      // 認証状態クエリを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      
      showSuccessToast("ログイン成功", `${data.user.name}としてログインしました`);
    },
    onError: (error: unknown) => {
      const appError = handleError(error, false);
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: appError.message,
      });
      
      showErrorToast(appError);
    },
  });

  // ログアウトミューテーション
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      
      // 全てのクエリを無効化
      queryClient.clear();
      
      showSuccessToast("ログアウト完了", "正常にログアウトしました");
    },
    onError: (error: unknown) => {
      const appError = handleError(error, false);
      console.error('Logout error:', appError);
      
      // エラーが発生してもローカル状態はクリア
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      
      queryClient.clear();
    },
  });

  // 認証状態の更新
  useEffect(() => {
    if (user) {
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } else if (error) {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error.message,
      });
    } else if (!isLoading) {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, [user, error, isLoading]);

  // ログイン関数
  const login = useCallback((credentials: LoginCredentials) => {
    loginMutation.mutate(credentials);
  }, [loginMutation]);

  // ログアウト関数
  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  // 権限チェック関数
  const hasPermission = useCallback((permission: string): boolean => {
    return authState.user?.permissions.includes(permission) ?? false;
  }, [authState.user]);

  // ロールチェック関数
  const hasRole = useCallback((role: string): boolean => {
    return authState.user?.role === role;
  }, [authState.user]);

  return {
    ...authState,
    login,
    logout,
    hasPermission,
    hasRole,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}
