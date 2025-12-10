import { BarChart3, DollarSign, TrendingUp, Users } from "lucide-react";
import React, { useState } from "react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDashboard, useServiceRevenueComparison } from "@/hooks/useDashboard";

const FISCAL_YEARS = [2023, 2024, 2025, 2026];

export default function DashboardPage() {
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  
  // ダッシュボードデータ取得
  const { data: dashboardData, isLoading } = useDashboard(selectedYear);
  
  // サービス毎の売上予実比較データ取得
  const { data: comparisonData, isLoading: isComparisonLoading } = useServiceRevenueComparison(selectedYear);

  // 数値フォーマット関数
  const formatPercentage = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) {
      return '0.0%';
    }
    return `${value.toFixed(1)}%`;
  };

  // 通貨フォーマット関数
  const formatCurrency = (value: number) => {
    return `¥${value.toLocaleString()}`;
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
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

  // サービス毎の予実比較データ
  const serviceComparisons = comparisonData?.success ? comparisonData.data : [];
  
  // 合計行の計算
  const totalBudget = serviceComparisons.reduce((sum, item) => sum + item.revenueBudget, 0);
  const totalActual = serviceComparisons.reduce((sum, item) => sum + item.revenueActual, 0);
  const totalDifference = totalActual - totalBudget;
  const totalAchievementRate = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

  return (
    <div className="h-full p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">ダッシュボード</h1>
        </div>
        <div className="flex items-center gap-4">
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
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          title="利益"
          budgetAmount={data.profitBudget}
          actualAmount={data.profitActual}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* KPI指標（2列レイアウト） */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 利益率カード */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">利益率</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">予算</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatPercentage(data.profitMarginBudget)}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">実績</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatPercentage(data.profitMarginActual)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 原価率カード */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">原価率</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">予算</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatPercentage(data.costRateBudget)}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">実績</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatPercentage(data.costRateActual)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* サービス毎の売上予実比較テーブル */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">サービス毎の売上予実比較</CardTitle>
        </CardHeader>
        <CardContent>
          {isComparisonLoading ? (
            <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
          ) : serviceComparisons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">データがありません</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>サービス区分</TableHead>
                    <TableHead className="text-right">売上予算</TableHead>
                    <TableHead className="text-right">売上実績</TableHead>
                    <TableHead className="text-right">差異</TableHead>
                    <TableHead className="text-right">達成率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceComparisons.map((item) => (
                    <TableRow key={item.serviceType}>
                      <TableCell className="font-medium">{item.serviceType}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.revenueBudget)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.revenueActual)}</TableCell>
                      <TableCell className={`text-right ${item.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.difference >= 0 ? '+' : ''}{formatCurrency(item.difference)}
                      </TableCell>
                      <TableCell className="text-right">{formatPercentage(item.achievementRate)}</TableCell>
                    </TableRow>
                  ))}
                  {/* 合計行 */}
                  <TableRow className="font-semibold bg-muted/50">
                    <TableCell>合計</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalBudget)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalActual)}</TableCell>
                    <TableCell className={`text-right ${totalDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {totalDifference >= 0 ? '+' : ''}{formatCurrency(totalDifference)}
                    </TableCell>
                    <TableCell className="text-right">{formatPercentage(totalAchievementRate)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

