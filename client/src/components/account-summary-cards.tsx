import { AlertCircle, CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AccountSummaryCardsProps {
  summary: {
    glSummary: Array<{ accountCode: string; accountName: string; totalAmount: number; count: number }>;
    orderSummary: Array<{ accountCode: string; accountName: string; totalAmount: number; count: number }>;
    differences: Array<{ accountCode: string; accountName: string; difference: number; glAmount: number; orderAmount: number }>;
  } | null;
  isLoading: boolean;
}

export function AccountSummaryCards({ summary, isLoading }: AccountSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const totalGlAmount = summary.glSummary.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalOrderAmount = summary.orderSummary.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalDifference = totalGlAmount - totalOrderAmount;
  const matchRate = totalGlAmount > 0 ? Math.round((totalOrderAmount / totalGlAmount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* 全体サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">GL合計金額</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{totalGlAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.glSummary.length}科目 / {summary.glSummary.reduce((sum, s) => sum + s.count, 0)}明細
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">受発注見込み合計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{totalOrderAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.orderSummary.length}科目 / {summary.orderSummary.reduce((sum, s) => sum + s.count, 0)}明細
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">差異金額</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalDifference === 0 ? 'text-success' : 'text-destructive'}`}>
              {totalDifference === 0 ? (
                <CheckCircle2 className="inline h-6 w-6 mr-2" />
              ) : totalDifference > 0 ? (
                <TrendingUp className="inline h-6 w-6 mr-2" />
              ) : (
                <TrendingDown className="inline h-6 w-6 mr-2" />
              )}
              ¥{Math.abs(totalDifference).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalDifference === 0 ? '完全一致' : totalDifference > 0 ? 'GL超過' : '受発注超過'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">突合率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{matchRate}%</div>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full transition-all ${matchRate === 100 ? 'bg-success' : 'bg-warning'}`}
                style={{ width: `${matchRate}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 科目別差異 */}
      {summary.differences.some(d => d.difference !== 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              科目別差異
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.differences
                .filter(d => d.difference !== 0)
                .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
                .map((diff) => (
                  <div key={diff.accountCode} className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <div>
                      <p className="font-medium">{diff.accountCode} {diff.accountName}</p>
                      <p className="text-xs text-muted-foreground">
                        GL: ¥{diff.glAmount.toLocaleString()} / 受発注: ¥{diff.orderAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className={`text-sm font-bold ${diff.difference > 0 ? 'text-destructive' : 'text-warning'}`}>
                      {diff.difference > 0 ? '+' : ''}¥{diff.difference.toLocaleString()}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

