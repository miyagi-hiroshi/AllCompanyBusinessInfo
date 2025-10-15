import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState } from "react";

import { AccountSummaryCards } from "@/components/account-summary-cards";
import { ReconciliationStatusBadge } from "@/components/reconciliation-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGLEntries } from "@/hooks/useGLEntries";
import { useOrderForecasts } from "@/hooks/useOrderForecasts";
import { useAccountSummary, useReconciliation } from "@/hooks/useReconciliation";
import { useToast } from "@/hooks/useToast";

export default function GLReconciliationPage() {
  const [fiscalYear, setFiscalYear] = useState<number>(() => new Date().getFullYear());
  const [month, setMonth] = useState<number | undefined>(() => new Date().getMonth() + 1);
  const { toast } = useToast();

  // Fetch data
  const { data: orderForecasts = [], isLoading: ordersLoading, refetch: refetchOrders } = useOrderForecasts({
    fiscalYear,
    month,
  });
  const { data: glEntries = [], isLoading: glLoading, refetch: refetchGL } = useGLEntries({
    fiscalYear,
    month,
  });
  const reconcileMutation = useReconciliation();
  
  // 科目別サマリー
  const period = month ? `${fiscalYear}-${String(month).padStart(2, '0')}` : undefined;
  const { data: accountSummary, isLoading: summaryLoading } = useAccountSummary(period);

  const isLoading = ordersLoading || glLoading;


  // Calculate stats
  const matched = orderForecasts.filter((o) => o.reconciliationStatus === "matched");
  const fuzzy = orderForecasts.filter((o) => o.reconciliationStatus === "fuzzy");
  const unmatched = orderForecasts.filter((o) => o.reconciliationStatus === "unmatched");
  const unmatchedGL = glEntries.filter((g) => g.reconciliationStatus === "unmatched");

  const matchRate = orderForecasts.length > 0 
    ? Math.round((matched.length / orderForecasts.length) * 100) 
    : 0;

  const handleReconcile = () => {
    if (!month) {
      toast({
        variant: "destructive",
        title: "月が選択されていません",
        description: "GL突合を実行するには月を選択してください",
      });
      return;
    }

    const period = `${fiscalYear}-${String(month).padStart(2, "0")}`;
    reconcileMutation.mutate(
      {
        period,
        type: "exact",
      },
      {
        onSuccess: (data) => {
          const { results } = data;
          const matchedCount = results.matched.length;
          const alreadyMatchedOrders = results.alreadyMatchedOrders;
          const alreadyMatchedGl = results.alreadyMatchedGl;
          toast({
            title: "厳格突合完了",
            description: `新規突合: ${matchedCount}件、既存突合済み: 受発注${alreadyMatchedOrders}件/GL${alreadyMatchedGl}件`,
          });
          void refetchOrders();
          void refetchGL();
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "突合エラー",
            description: "GL突合処理でエラーが発生しました",
          });
        },
      }
    );
  };


  // Generate year and month options
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  const formatCurrency = (value: string | number) => {
    return `¥${Number(value).toLocaleString()}`;
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">GL突合</h1>
          <p className="text-muted-foreground mt-1">受発注データとGLデータの突合を管理します</p>
        </div>

        {/* Filter and Action Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Filter Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">期間選択</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-sm font-medium">年度</label>
                  <Select
                    value={fiscalYear.toString()}
                    onValueChange={(value) => setFiscalYear(parseInt(value))}
                  >
                    <SelectTrigger className="w-[140px]" data-testid="select-fiscal-year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}年度
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">月</label>
                  <Select
                    value={month?.toString() || "all"}
                    onValueChange={(value) => setMonth(value === "all" ? undefined : parseInt(value))}
                  >
                    <SelectTrigger className="w-[120px]" data-testid="select-month">
                      <SelectValue placeholder="全て" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全て</SelectItem>
                      {monthOptions.map((m) => (
                        <SelectItem key={m} value={m.toString()}>
                          {m}月
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">突合実行</CardTitle>
              <CardDescription>受発注データとGLデータを自動突合します</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <Button
                  onClick={handleReconcile}
                  disabled={reconcileMutation.isPending || !month}
                  data-testid="button-exact-match"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  厳格突合実行
                  <span className="ml-2 text-xs opacity-80">（月度 + 計上科目 + 摘要文 + 金額）</span>
                </Button>
              </div>
              
              {/* 既に突合済みのデータ情報 */}
              <div className="text-sm text-muted-foreground">
                <p>※ 既に突合済みのデータは再突合されません</p>
                <p>※ 突合の重複や上書きを防ぐため、安全に実行されます</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-20" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">突合率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{matchRate}%</div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div
                    className="bg-success h-2 rounded-full transition-all"
                    style={{ width: `${matchRate}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <CheckCircle2 className="inline h-4 w-4 mr-1" />
                  突合済
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{matched.length}</div>
                <p className="text-xs text-muted-foreground mt-1">/ {orderForecasts.length}件</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <AlertTriangle className="inline h-4 w-4 mr-1" />
                  曖昧一致
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-warning">{fuzzy.length}</div>
                <p className="text-xs text-muted-foreground mt-1">要確認</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <AlertCircle className="inline h-4 w-4 mr-1" />
                  未突合
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">{unmatched.length}</div>
                <p className="text-xs text-muted-foreground mt-1">受発注: {unmatched.length} / GL: {unmatchedGL.length}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 科目別サマリー */}
        <AccountSummaryCards summary={accountSummary} isLoading={summaryLoading} />


        {/* Results Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">全て ({orderForecasts.length})</TabsTrigger>
            <TabsTrigger value="matched" data-testid="tab-matched">突合済 ({matched.length})</TabsTrigger>
            <TabsTrigger value="fuzzy" data-testid="tab-fuzzy">曖昧一致 ({fuzzy.length})</TabsTrigger>
            <TabsTrigger value="unmatched" data-testid="tab-unmatched">未突合 ({unmatched.length})</TabsTrigger>
            <TabsTrigger value="gl" data-testid="tab-gl">未突合GL ({unmatchedGL.length})</TabsTrigger>
          </TabsList>

          {/* All Orders */}
          <TabsContent value="all" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">全受発注データ</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : orderForecasts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">データがありません</div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ステータス</TableHead>
                          <TableHead>プロジェクト</TableHead>
                          <TableHead>営業担当者</TableHead>
                          <TableHead>取引先</TableHead>
                          <TableHead>計上年月</TableHead>
                          <TableHead>計上科目</TableHead>
                          <TableHead>摘要文</TableHead>
                          <TableHead className="text-right">金額</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderForecasts.map((order) => (
                          <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                            <TableCell>
                              <ReconciliationStatusBadge status={order.reconciliationStatus as "matched" | "fuzzy" | "unmatched"} />
                            </TableCell>
                            <TableCell className="font-medium">{order.projectName}</TableCell>
                            <TableCell>{order.salesPerson || "-"}</TableCell>
                            <TableCell>{order.customerName}</TableCell>
                            <TableCell>{order.accountingPeriod}</TableCell>
                            <TableCell>{order.accountingItem}</TableCell>
                            <TableCell>{order.description}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(order.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Matched */}
          <TabsContent value="matched" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  突合済データ
                </CardTitle>
              </CardHeader>
              <CardContent>
                {matched.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">突合済のデータがありません</div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>プロジェクト</TableHead>
                          <TableHead>営業担当者</TableHead>
                          <TableHead>取引先</TableHead>
                          <TableHead>計上年月</TableHead>
                          <TableHead>計上科目</TableHead>
                          <TableHead>摘要文</TableHead>
                          <TableHead className="text-right">金額</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {matched.map((order) => (
                          <TableRow key={order.id} className="bg-success/5" data-testid={`matched-row-${order.id}`}>
                            <TableCell className="font-medium">{order.projectName}</TableCell>
                            <TableCell>{order.salesPerson || "-"}</TableCell>
                            <TableCell>{order.customerName}</TableCell>
                            <TableCell>{order.accountingPeriod}</TableCell>
                            <TableCell>{order.accountingItem}</TableCell>
                            <TableCell>{order.description}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(order.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fuzzy */}
          <TabsContent value="fuzzy" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  曖昧一致データ
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fuzzy.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">曖昧一致のデータがありません</div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>プロジェクト</TableHead>
                          <TableHead>営業担当者</TableHead>
                          <TableHead>取引先</TableHead>
                          <TableHead>計上年月</TableHead>
                          <TableHead>計上科目</TableHead>
                          <TableHead>摘要文</TableHead>
                          <TableHead className="text-right">金額</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fuzzy.map((order) => (
                          <TableRow key={order.id} className="bg-warning/5" data-testid={`fuzzy-row-${order.id}`}>
                            <TableCell className="font-medium">{order.projectName}</TableCell>
                            <TableCell>{order.salesPerson || "-"}</TableCell>
                            <TableCell>{order.customerName}</TableCell>
                            <TableCell>{order.accountingPeriod}</TableCell>
                            <TableCell>{order.accountingItem}</TableCell>
                            <TableCell>{order.description}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(order.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Unmatched Orders */}
          <TabsContent value="unmatched" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  未突合受発注データ
                </CardTitle>
              </CardHeader>
              <CardContent>
                {unmatched.length === 0 ? (
                  <div className="text-center py-8 text-success">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
                    全てのデータが突合されました
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>プロジェクト</TableHead>
                          <TableHead>営業担当者</TableHead>
                          <TableHead>取引先</TableHead>
                          <TableHead>計上年月</TableHead>
                          <TableHead>計上科目</TableHead>
                          <TableHead>摘要文</TableHead>
                          <TableHead className="text-right">金額</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unmatched.map((order) => (
                          <TableRow key={order.id} className="bg-destructive/5" data-testid={`unmatched-row-${order.id}`}>
                            <TableCell className="font-medium">{order.projectName}</TableCell>
                            <TableCell>{order.salesPerson || "-"}</TableCell>
                            <TableCell>{order.customerName}</TableCell>
                            <TableCell>{order.accountingPeriod}</TableCell>
                            <TableCell>{order.accountingItem}</TableCell>
                            <TableCell>{order.description}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(order.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Unmatched GL */}
          <TabsContent value="gl" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  未突合GLデータ
                </CardTitle>
              </CardHeader>
              <CardContent>
                {unmatchedGL.length === 0 ? (
                  <div className="text-center py-8 text-success">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
                    全てのGLデータが突合されました
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>伝票No</TableHead>
                          <TableHead>日付</TableHead>
                          <TableHead>勘定科目</TableHead>
                          <TableHead>借/貸</TableHead>
                          <TableHead className="text-right">金額</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unmatchedGL.map((gl) => (
                          <TableRow key={gl.id} className="bg-destructive/5" data-testid={`unmatched-gl-row-${gl.id}`}>
                            <TableCell className="font-medium">{gl.voucherNo}</TableCell>
                            <TableCell>{gl.transactionDate}</TableCell>
                            <TableCell>{gl.accountName}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {gl.debitCredit}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(gl.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
