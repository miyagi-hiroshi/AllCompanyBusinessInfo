import { AlertCircle, CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AccountSummaryCardsProps {
  summary: {
    glSummary: Array<{ accountCode: string; accountName: string; totalAmount: number; count: number }>;
    orderSummary: Array<{ accountCode: string; accountName: string; totalAmount: number; count: number }>;
    differences: Array<{ accountCode: string; accountName: string; difference: number; glAmount: number; orderAmount: number }>;
    matchedAmount?: number;
    totalGlAmount?: number;
    totalOrderAmount?: number;
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

  const totalGlAmount = summary.totalGlAmount ?? summary.glSummary.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalOrderAmount = summary.totalOrderAmount ?? summary.orderSummary.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalDifference = totalGlAmount - totalOrderAmount;
  // 金額突合率: 突合済み金額 / GL金額合計 * 100
  // 突合済み金額が未定義の場合は、後方互換性のため従来の計算式を使用
  const matchedAmount = summary.matchedAmount ?? 0;
  const matchRate = totalGlAmount > 0 
    ? Math.round((matchedAmount / totalGlAmount) * 100) 
    : 0;

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
            <div className={`text-2xl font-bold ${
              totalDifference === 0 
                ? 'text-success' 
                : totalDifference > 0 
                  ? 'text-blue-600' 
                  : 'text-red-600'
            }`}>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">金額突合率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{matchRate}%</div>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full transition-all ${matchRate === 100 ? 'bg-success' : 'bg-warning'}`}
                style={{ width: `${matchRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              突合済み金額の割合
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 科目別差異 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            科目別差異
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>科目名</TableHead>
                  <TableHead className="text-right">GL金額</TableHead>
                  <TableHead className="text-right">受発注金額</TableHead>
                  <TableHead className="text-right">差異</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.differences
                  .sort((a, b) => a.accountCode.localeCompare(b.accountCode))
                  .map((diff) => (
                      <TableRow key={diff.accountCode}>
                        <TableCell className="font-medium">{diff.accountName}</TableCell>
                        <TableCell className="text-right font-mono">¥{diff.glAmount.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono">¥{diff.orderAmount.toLocaleString()}</TableCell>
                        <TableCell className={`text-right font-mono font-bold ${diff.difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {diff.difference > 0 ? '+' : ''}¥{diff.difference.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}

