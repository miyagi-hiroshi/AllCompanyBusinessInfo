import { TrendingDown, TrendingUp } from "lucide-react";
import React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardSummaryCardProps {
  title: string;
  budgetAmount: number;
  actualAmount: number;
  icon?: React.ReactNode;
  className?: string;
}

export function DashboardSummaryCard({
  title,
  budgetAmount,
  actualAmount,
  icon,
  className = ""
}: DashboardSummaryCardProps) {
  // 数値フォーマット関数
  const formatCurrency = (value: number) => {
    return `¥${value.toLocaleString()}`;
  };

  // 達成率計算
  const achievementRate = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0;
  
  // トレンド判定
  const isPositive = actualAmount >= budgetAmount;
  const trendIcon = isPositive ? TrendingUp : TrendingDown;
  const trendColor = isPositive ? "text-green-600" : "text-red-600";

  return (
    <Card className={`${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">
              {formatCurrency(actualAmount)}
            </div>
            <div className={`flex items-center space-x-1 ${trendColor}`}>
              {React.createElement(trendIcon, { className: "h-4 w-4" })}
              <span className="text-sm font-medium">
                {achievementRate.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            予算: {formatCurrency(budgetAmount)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
