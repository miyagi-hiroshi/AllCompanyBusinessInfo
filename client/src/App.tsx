import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Route,Switch } from "wouter";

import { AppSidebar } from "@/components/app-sidebar";
import { LoginForm } from "@/components/login-form";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import AccountingSummaryPage from "@/pages/accounting-summary";
import AngleBPage from "@/pages/angle-b";
import BudgetPage from "@/pages/budget";
import CustomersPage from "@/pages/customers";
import DashboardPage from "@/pages/dashboard";
import GLImportPage from "@/pages/gl-import";
import GLReconciliationPage from "@/pages/gl-reconciliation";
import NotFound from "@/pages/not-found";
import OrderForecastPage from "@/pages/order-forecast";
import ProjectAnalysisPage from "@/pages/project-analysis";
import ProjectsPage from "@/pages/projects";
import StaffingPage from "@/pages/staffing";
import StaffingCheckPage from "@/pages/staffing-check";
import StaffingProjectPage from "@/pages/staffing-project";

import { queryClient } from "./lib/queryClient";

function Router() {
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/project-analysis" component={ProjectAnalysisPage} />
      <Route path="/accounting-summary" component={AccountingSummaryPage} />
      <Route path="/gl-import" component={GLImportPage} />
      <Route path="/gl-reconciliation" component={GLReconciliationPage} />
      <Route path="/order-forecast" component={OrderForecastPage} />
      <Route path="/staffing" component={StaffingPage} />
      <Route path="/staffing-project" component={StaffingProjectPage} />
      <Route path="/staffing-check" component={StaffingCheckPage} />
      <Route path="/angle-b" component={AngleBPage} />
      <Route path="/budget" component={BudgetPage} />
      <Route path="/projects" component={ProjectsPage} />
      <Route path="/customers" component={CustomersPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-2 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-hidden">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, login, isLoggingIn } = useAuth();
  const [forceRender, setForceRender] = useState(0);
  const [renderKey, setRenderKey] = useState(0);

  // isAuthenticatedの変化を監視
  useEffect(() => {
    setForceRender(prev => prev + 1);
    setRenderKey(prev => prev + 1);
    
    // 強制的に再レンダリングを発生させるためのタイマー
    if (!isAuthenticated) {
      // 複数回の再レンダリングを実行
      setTimeout(() => {
        setRenderKey(prev => prev + 1);
      }, 50);
      setTimeout(() => {
        setRenderKey(prev => prev + 1);
      }, 100);
      setTimeout(() => {
        setRenderKey(prev => prev + 1);
      }, 200);
    }
  }, [isAuthenticated]);

  // ローディング中は何も表示しない
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <AuthenticatedApp key={`authenticated-${renderKey}-${forceRender}`} />;
  } else {
    return <LoginForm key={`unauthenticated-${renderKey}-${forceRender}`} onLogin={login} isLoggingIn={isLoggingIn} />;
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
