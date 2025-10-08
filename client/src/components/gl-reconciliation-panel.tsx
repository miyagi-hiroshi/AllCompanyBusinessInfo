import type { GLEntry,OrderForecast } from "@shared/schema";
import { AlertCircle, CheckCircle2, GitMerge, Sparkles } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ReconciliationStatusBadge } from "./reconciliation-status-badge";

interface GLReconciliationPanelProps {
  period: string;
  orderForecasts: OrderForecast[];
  glEntries: GLEntry[];
  onReconcile: (type: "exact" | "fuzzy") => void;
  onManualMatch: (orderId: string, glId: string) => void;
}

export function GLReconciliationPanel({
  period,
  orderForecasts,
  glEntries,
  onReconcile,
  onManualMatch: _onManualMatch,
}: GLReconciliationPanelProps) {
  const [open, setOpen] = useState(false);

  const matched = orderForecasts.filter((o) => o.reconciliationStatus === "matched");
  const fuzzy = orderForecasts.filter((o) => o.reconciliationStatus === "fuzzy");
  const unmatched = orderForecasts.filter((o) => o.reconciliationStatus === "unmatched");
  const unmatchedGL = glEntries.filter((g) => g.reconciliationStatus === "unmatched");

  const matchRate = orderForecasts.length > 0 
    ? Math.round((matched.length / orderForecasts.length) * 100) 
    : 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" data-testid="button-open-reconciliation">
          <GitMerge className="h-4 w-4 mr-2" />
          GL突合
          {matched.length > 0 && (
            <Badge variant="outline" className="ml-2 bg-success/20 text-success border-success/30">
              {matchRate}%
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            GL突合パネル
          </SheetTitle>
          <SheetDescription>
            {period}の受発注データとGLデータを突合します
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-md p-4 space-y-2">
              <div className="text-sm text-muted-foreground">総受発注件数</div>
              <div className="text-2xl font-bold">{orderForecasts.length}</div>
              <div className="flex items-center gap-2 text-xs">
                <ReconciliationStatusBadge status="matched" />
                <span className="text-muted-foreground">{matched.length}件</span>
              </div>
            </div>
            
            <div className="border rounded-md p-4 space-y-2">
              <div className="text-sm text-muted-foreground">総GL件数</div>
              <div className="text-2xl font-bold">{glEntries.length}</div>
              <div className="flex items-center gap-2 text-xs">
                <ReconciliationStatusBadge status="unmatched" />
                <span className="text-muted-foreground">{unmatchedGL.length}件</span>
              </div>
            </div>
          </div>

          {/* Match Rate */}
          <div className="border rounded-md p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">突合率</span>
              <span className="text-2xl font-bold">{matchRate}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-success h-2 rounded-full transition-all"
                style={{ width: `${matchRate}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={() => onReconcile("exact")}
              data-testid="button-exact-match"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              厳格突合実行
              <span className="ml-2 text-xs opacity-80">（伝票No + 日付 + 金額）</span>
            </Button>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onReconcile("fuzzy")}
              data-testid="button-fuzzy-match"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              ファジー突合実行
              <span className="ml-2 text-xs opacity-80">（日付±3日 + 金額）</span>
            </Button>
          </div>

          {/* Results Tabs */}
          <Tabs defaultValue="unmatched" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="matched" data-testid="tab-matched">
                突合済 ({matched.length})
              </TabsTrigger>
              <TabsTrigger value="fuzzy" data-testid="tab-fuzzy">
                曖昧 ({fuzzy.length})
              </TabsTrigger>
              <TabsTrigger value="unmatched" data-testid="tab-unmatched">
                未突合 ({unmatched.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="matched" className="space-y-2 mt-4 max-h-[400px] overflow-y-auto">
              {matched.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  突合済みのデータがありません
                </div>
              ) : (
                matched.map((order) => (
                  <div
                    key={order.id}
                    className="border rounded-md p-3 space-y-1 bg-success/5"
                    data-testid={`matched-item-${order.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{order.description}</span>
                      <ReconciliationStatusBadge status="matched" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {order.accountingPeriod} | {order.customerName} | ¥{Number(order.amount).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="fuzzy" className="space-y-2 mt-4 max-h-[400px] overflow-y-auto">
              {fuzzy.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  曖昧一致のデータがありません
                </div>
              ) : (
                fuzzy.map((order) => (
                  <div
                    key={order.id}
                    className="border rounded-md p-3 space-y-1 bg-warning/5"
                    data-testid={`fuzzy-item-${order.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{order.description}</span>
                      <ReconciliationStatusBadge status="fuzzy" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {order.accountingPeriod} | {order.customerName} | ¥{Number(order.amount).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="unmatched" className="space-y-2 mt-4 max-h-[400px] overflow-y-auto">
              {unmatched.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
                  全てのデータが突合されました
                </div>
              ) : (
                unmatched.map((order) => (
                  <div
                    key={order.id}
                    className="border rounded-md p-3 space-y-1 bg-destructive/5"
                    data-testid={`unmatched-item-${order.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{order.description}</span>
                      <ReconciliationStatusBadge status="unmatched" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {order.accountingPeriod} | {order.customerName} | ¥{Number(order.amount).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>

          {/* Unmatched GL Entries */}
          {unmatchedGL.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">未突合GL: {unmatchedGL.length}件</span>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {unmatchedGL.slice(0, 5).map((gl) => (
                  <div
                    key={gl.id}
                    className="border rounded-md p-2 text-xs bg-muted/30"
                    data-testid={`unmatched-gl-${gl.id}`}
                  >
                    <div className="font-medium">{gl.voucherNo}</div>
                    <div className="text-muted-foreground">
                      {gl.transactionDate} | {gl.accountName} | ¥{Number(gl.amount).toLocaleString()}
                    </div>
                  </div>
                ))}
                {unmatchedGL.length > 5 && (
                  <div className="text-xs text-muted-foreground text-center">
                    他 {unmatchedGL.length - 5} 件...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
