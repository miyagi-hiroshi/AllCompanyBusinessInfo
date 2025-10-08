import { useEffect, useState } from "react";

// import { useRegisterSW } from "virtual:pwa-register/react";
import { showInfoToast, showSuccessToast } from "@/lib/errorHandler";

/**
 * PWA関連の状態
 */
export interface PWAState {
  isOnline: boolean;
  isInstalled: boolean;
  isUpdateAvailable: boolean;
  isUpdateReady: boolean;
  isOffline: boolean;
  installPrompt: any;
}

/**
 * PWA管理フック
 */
export function usePWA() {
  const [pwaState, setPwaState] = useState<PWAState>({
    isOnline: navigator.onLine,
    isInstalled: false,
    isUpdateAvailable: false,
    isUpdateReady: false,
    isOffline: !navigator.onLine,
    installPrompt: null,
  });

  // Service Worker登録と更新管理（一時的に無効化）
  // const {
  //   needRefresh: [needRefresh, setNeedRefresh],
  //   updateServiceWorker,
  // } = useRegisterSW({
  //   onRegistered(r: any) {
  //     console.log("SW Registered: " + r);
  //   },
  //   onRegisterError(error: any) {
  //     console.log("SW registration error", error);
  //   },
  // });
  
  // 一時的な代替実装
  const [needRefresh, _setNeedRefresh] = useState(false);
  const updateServiceWorker = () => {
    // Service Worker update not available (PWA機能は一時的に無効化)
  };

  // オンライン/オフライン状態の監視
  useEffect(() => {
    const handleOnline = () => {
      setPwaState(prev => ({
        ...prev,
        isOnline: true,
        isOffline: false,
      }));
      showInfoToast("オンライン", "ネットワーク接続が復旧しました");
    };

    const handleOffline = () => {
      setPwaState(prev => ({
        ...prev,
        isOnline: false,
        isOffline: true,
      }));
      showInfoToast("オフライン", "ネットワーク接続が切断されました。オフライン機能をご利用ください");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // PWAインストールプロンプトの処理
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // デフォルトのインストールプロンプトを防止
      e.preventDefault();
      // インストールプロンプトを保存
      setPwaState(prev => ({
        ...prev,
        installPrompt: e,
      }));
    };

    const handleAppInstalled = () => {
      setPwaState(prev => ({
        ...prev,
        isInstalled: true,
        installPrompt: null,
      }));
      showSuccessToast("インストール完了", "アプリが正常にインストールされました");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // 既にインストール済みかチェック
    if (window.matchMedia("(display-mode: standalone)").matches || 
        (window.navigator as any).standalone === true) {
      setPwaState(prev => ({
        ...prev,
        isInstalled: true,
      }));
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // 更新の監視
  useEffect(() => {
    setPwaState(prev => ({
      ...prev,
      isUpdateAvailable: needRefresh,
      isUpdateReady: needRefresh,
    }));
  }, [needRefresh]);

  // PWAインストール
  const installPWA = async () => {
    if (!pwaState.installPrompt) {
      showInfoToast("インストール不可", "このブラウザではインストールできません");
      return;
    }

    try {
      // インストールプロンプトを表示
      const result = await pwaState.installPrompt.prompt();
      
      if (result.outcome === "accepted") {
        // PWAインストールが承認されました
      } else {
        // PWAインストールが拒否されました
      }
    } catch (error) {
      console.error("PWAインストールエラー:", error);
      showInfoToast("インストールエラー", "インストール中にエラーが発生しました");
    }
  };

  // アプリ更新
  const updateApp = async () => {
    try {
      await updateServiceWorker();
      showSuccessToast("更新完了", "アプリが最新バージョンに更新されました");
    } catch (error) {
      console.error("アプリ更新エラー:", error);
      showInfoToast("更新エラー", "更新中にエラーが発生しました");
    }
  };

  // キャッシュクリア
  const clearCache = async () => {
    try {
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        showSuccessToast("キャッシュクリア完了", "すべてのキャッシュが削除されました");
      }
    } catch (error) {
      console.error("キャッシュクリアエラー:", error);
      showInfoToast("キャッシュクリアエラー", "キャッシュの削除中にエラーが発生しました");
    }
  };

  return {
    ...pwaState,
    installPWA,
    updateApp,
    clearCache,
  };
}
