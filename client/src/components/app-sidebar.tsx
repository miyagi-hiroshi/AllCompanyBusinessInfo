import { Home, BarChart3, FileText, Users, Calendar, Building2, DollarSign, TrendingUp, FolderKanban, GitMerge, LogOut, User } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const menuItems = {
  analysis: [
    {
      title: "ダッシュボード",
      url: "/",
      icon: Home,
    },
    {
      title: "プロジェクト分析",
      url: "/project-analysis",
      icon: BarChart3,
    },
    {
      title: "GL突合",
      url: "/gl-reconciliation",
      icon: GitMerge,
    },
  ],
  input: [
    {
      title: "受発注見込み入力",
      url: "/order-forecast",
      icon: FileText,
    },
    {
      title: "要員山積み登録",
      url: "/staffing",
      icon: Users,
    },
    {
      title: "角度B案件登録",
      url: "/angle-b",
      icon: TrendingUp,
    },
    {
      title: "予算登録",
      url: "/budget",
      icon: DollarSign,
    },
  ],
  master: [
    {
      title: "年度別プロジェクトマスタ",
      url: "/projects",
      icon: FolderKanban,
    },
    {
      title: "取引先マスタ",
      url: "/customers",
      icon: Building2,
    },
  ],
};

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout, isLoggingOut } = useAuth();

  return (
    <Sidebar>
      <SidebarContent>
        {/* 分析系 */}
        <SidebarGroup>
          <SidebarGroupLabel>分析系</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.analysis.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={location === item.url}
                    data-testid={`menu-${item.url.replace('/', '') || 'dashboard'}`}
                  >
                    <a href={item.url} onClick={(e) => {
                      e.preventDefault();
                      setLocation(item.url);
                    }}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 入力系 */}
        <SidebarGroup>
          <SidebarGroupLabel>入力系</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.input.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={location === item.url}
                    data-testid={`menu-${item.url.replace('/', '')}`}
                  >
                    <a href={item.url} onClick={(e) => {
                      e.preventDefault();
                      setLocation(item.url);
                    }}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* マスタ系 */}
        <SidebarGroup>
          <SidebarGroupLabel>マスタ系</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.master.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={location === item.url}
                    data-testid={`menu-${item.url.replace('/', '')}`}
                  >
                    <a href={item.url} onClick={(e) => {
                      e.preventDefault();
                      setLocation(item.url);
                    }}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ユーザー情報とログアウト */}
        <SidebarFooter>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <div className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span className="truncate">{user?.name}</span>
                  </div>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={logout}
                    disabled={isLoggingOut}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{isLoggingOut ? 'ログアウト中...' : 'ログアウト'}</span>
                  </Button>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}
