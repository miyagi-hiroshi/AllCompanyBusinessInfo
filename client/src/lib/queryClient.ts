import { QueryClient, QueryFunction } from "@tanstack/react-query";

import { authErrorHandler } from "./authErrorHandler";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // 401エラーの場合は認証エラーハンドラーで処理
    if (res.status === 401) {
      authErrorHandler.handleResponseError(res);
      // 401エラーの場合は、エラーをthrowせずにreturnする
      // authErrorHandlerがログアウト処理とリダイレクトを行う
      return;
    }

    let errorMessage = res.statusText;
    try {
      const errorData = await res.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // JSON解析に失敗した場合はテキストとして読み取り
      try {
        const text = await res.text();
        if (text) {
          errorMessage = text;
        }
      } catch {
        // テキスト読み取りにも失敗した場合はstatusTextを使用
      }
    }
    
    const error = new Error(errorMessage) as Error & { status?: number; response?: Response };
    error.status = res.status;
    error.response = res;
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown  ,
): Promise<Response> {
  // ヘッダーを構築（Cookieは自動送信される）
  const headers: Record<string, string> = {};
  
  // FormDataの場合はContent-Typeを設定しない（ブラウザが自動設定）
  if (data && !(data instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? (data instanceof FormData ? data : JSON.stringify(data)) : undefined,
    credentials: "include", // Cookieを送信
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Cookieは自動送信される
    const res = await fetch(queryKey.join("/"), {
      credentials: "include", // Cookieを送信
    });

    if (res.status === 401) {
      // 401エラーの場合は認証エラーハンドラーで処理
      authErrorHandler.handleResponseError(res);
      
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      // throwしない - authErrorHandlerがログアウト処理を行う
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
