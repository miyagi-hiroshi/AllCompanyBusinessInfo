import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import DashboardPage from "@/pages/dashboard";
import ProjectAnalysisPage from "@/pages/project-analysis";
import GLReconciliationPage from "@/pages/gl-reconciliation";
import OrderForecastPage from "@/pages/order-forecast";
import StaffingPage from "@/pages/staffing";
import AngleBPage from "@/pages/angle-b";
import BudgetPage from "@/pages/budget";
import ProjectsPage from "@/pages/projects";
import CustomersPage from "@/pages/customers";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/project-analysis" component={ProjectAnalysisPage} />
      <Route path="/gl-reconciliation" component={GLReconciliationPage} />
      <Route path="/order-forecast" component={OrderForecastPage} />
      <Route path="/staffing" component={StaffingPage} />
      <Route path="/angle-b" component={AngleBPage} />
      <Route path="/budget" component={BudgetPage} />
      <Route path="/projects" component={ProjectsPage} />
      <Route path="/customers" component={CustomersPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
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
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
