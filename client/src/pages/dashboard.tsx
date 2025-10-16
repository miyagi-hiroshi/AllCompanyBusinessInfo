import { BarChart3, DollarSign, TrendingUp, Users } from "lucide-react";
import React, { useState } from "react";

import { DashboardChart } from "@/components/dashboard-chart";
import { DashboardSummaryCard } from "@/components/dashboard-summary-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/hooks/useDashboard";

const FISCAL_YEARS = [2023, 2024, 2025, 2026];

export default function DashboardPage() {
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  
  // ダッシュボードデータ取得
  const { data: dashboardData, isLoading } = useDashboard(selectedYear);

  // 数値フォーマット関数
  const formatCurrency = (value: number) => {
    return `¥${value.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="h-full p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6" />
            <h1 className="text-2xl font-bold">ダッシュボード</h1>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!dashboardData?.success || !dashboardData.data) {
    return (
      <div className="h-full p-6">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">ダッシュボード</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-500">データの取得に失敗しました</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = dashboardData.data;

  // グラフ用データ
  const chartData = [
    {
      name: "売上",
      予算: data.revenueBudget,
      実績: data.revenueActual,
    },
    {
      name: "原価・販管費",
      予算: data.expenseBudget,
      実績: data.expenseActual,
    },
    {
      name: "利益",
      予算: data.profitBudget,
      実績: data.profitActual,
    },
  ];

  return (
    <div className="h-full p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">ダッシュボード</h1>
        </div>
        <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number(value))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FISCAL_YEARS.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}年度
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardSummaryCard
          title="売上"
          budgetAmount={data.revenueBudget}
          actualAmount={data.revenueActual}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
        <DashboardSummaryCard
          title="原価・販管費"
          budgetAmount={data.expenseBudget}
          actualAmount={data.expenseActual}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <DashboardSummaryCard
          title="利益（予算）"
          budgetAmount={0}
          actualAmount={data.profitBudget}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
        <DashboardSummaryCard
          title="利益（実績）"
          budgetAmount={0}
          actualAmount={data.profitActual}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* KPI指標とグラフ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KPI指標 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">KPI指標</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">売上達成率</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatPercentage(data.revenueAchievementRate)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">利益率（予算）</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatPercentage(data.profitMarginBudget)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">利益率（実績）</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatPercentage(data.profitMarginActual)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">差異金額</p>
                <p className={`text-2xl font-bold ${data.varianceAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(data.varianceAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* グラフ */}
        <DashboardChart
          data={chartData}
          title={`${selectedYear}年度 予算vs実績比較`}
        />
      </div>
    </div>
  );
}
