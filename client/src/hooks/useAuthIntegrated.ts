import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { showSuccessToast, showErrorToast, handleError } from '@/lib/errorHandler';

// 既存システム統合認証の型定義
interface IntegratedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isFirstLogin: boolean;
}

interface IntegratedEmployee {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  departmentId: number;
  status: string;
}

interface IntegratedAuthState {
  user: IntegratedUser | null;
  employee: IntegratedEmployee | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// 統合認証API
const integratedAuthApi = {
  // ログイン
  async login(email: string, password: string): Promise<{
    user: IntegratedUser;
    employee: IntegratedEmployee | null;
    sessionId: string;
  }> {
    const response = await fetch('/api/auth-integrated/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw await handleError(response, false);
    }

    const data = await response.json();

    if (data.success) {
      // セッションIDをローカルストレージに保存
      localStorage.setItem('integratedSessionId', data.data.sessionId);
      return data.data;
    } else {
      throw new Error(data.message || 'ログインに失敗しました');
    }
  },

  // ログアウト
  async logout(): Promise<void> {
    const sessionId = localStorage.getItem('integratedSessionId');
    
    if (sessionId) {
      const response = await fetch('/api/auth-integrated/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionId}`,
        },
      });

      if (!response.ok) {
        throw await handleError(response, false);
      }
    }

    // ローカルストレージからセッションIDを削除
    localStorage.removeItem('integratedSessionId');
  },

  // 認証状態確認
  async getCurrentUser(): Promise<{
    user: IntegratedUser;
    employee: IntegratedEmployee | null;
  }> {
    const sessionId = localStorage.getItem('integratedSessionId');
    
    if (!sessionId) {
      throw new Error('セッションが見つかりません');
    }

    const response = await fetch('/api/auth-integrated/me', {
      headers: {
        'Authorization': `Bearer ${sessionId}`,
      },
    });

    if (!response.ok) {
      throw await handleError(response, false);
    }

    const data = await response.json();

    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.message || '認証状態の確認に失敗しました');
    }
  },
};

// 統合認証フック
export function useAuthIntegrated() {
  const [authState, setAuthState] = useState<IntegratedAuthState>({
    user: null,
    employee: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 認証状態確認クエリ
  const { data: currentUser, isLoading: isCheckingAuth } = useQuery({
    queryKey: ['/api/auth-integrated/me'],
    queryFn: integratedAuthApi.getCurrentUser,
    retry: false,
    enabled: !!localStorage.getItem('integratedSessionId'),
  });

  // ログインMutation
  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      integratedAuthApi.login(email, password),
    onSuccess: (data) => {
      setAuthState({
        user: data.user,
        employee: data.employee,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      showSuccessToast('ログイン成功', '既存システムとの統合認証が完了しました');
      queryClient.invalidateQueries({ queryKey: ['/api/auth-integrated/me'] });
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
    mutationFn: integratedAuthApi.logout,
    onSuccess: () => {
      setAuthState({
        user: null,
        employee: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      showSuccessToast('ログアウト完了', '正常にログアウトしました');
      queryClient.clear();
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
