import type { GLEntry, OrderForecast } from "@shared/schema";
import { AlertCircle, CheckCircle2, Filter, GitMerge, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useAccountingItems } from "@/hooks/useMasters";
import { useManualReconcile, useUnmatchReconciliation } from "@/hooks/useReconciliation";
import { useToast } from "@/hooks/useToast";

import { AutocompleteSelect } from "./autocomplete-select";
import { ReconciliationStatusBadge } from "./reconciliation-status-badge";

interface GLReconciliationPanelProps {
  period: string;
  orderForecasts: OrderForecast[];
  glEntries: GLEntry[];
  onReconcile: () => void;
  onManualMatch: (orderId: string, glId: string) => void;
  selectedOrderId?: string | null;
  onSelectOrder?: (orderId: string | null) => void;
}

export function GLReconciliationPanel({
  period,
  orderForecasts,
  glEntries,
  onReconcile,
  onManualMatch: _onManualMatch,
  selectedOrderId: externalSelectedOrderId,
  onSelectOrder,
}: GLReconciliationPanelProps) {
  const [open, setOpen] = useState(false);
  const [internalSelectedOrderId, setInternalSelectedOrderId] = useState<string | null>(null);

  // Use external selected order ID if provided, otherwise use internal state
  const selectedOrderId =
    externalSelectedOrderId !== undefined ? externalSelectedOrderId : internalSelectedOrderId;
  const setSelectedOrderId = onSelectOrder || setInternalSelectedOrderId;
  const [accountCodeFilter, setAccountCodeFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [unmatchedOnly, setUnmatchedOnly] = useState(true);
  const { toast } = useToast();

  // 会計項目マスタデータを取得
  const { data: accountingItems = [] } = useAccountingItems();

  // 会計項目の選択肢を生成
  const accountingItemOptions = [
    { value: "", label: "すべて", code: "" },
    ...accountingItems.map((item) => ({
      value: item.code,
      label: item.name,
      code: item.code,
    })),
  ];

  const selectedOrder = selectedOrderId
    ? orderForecasts.find((o) => o.id === selectedOrderId)
    : null;

  // Auto-open panel when order is selected
  useEffect(() => {
    if (externalSelectedOrderId) {
      setOpen(true);
    }
  }, [externalSelectedOrderId]);

  // Auto-set account code filter when order is selected
  useEffect(() => {
    if (selectedOrder && selectedOrder.reconciliationStatus === "unmatched") {
      // 受発注の計上科目名から対応する科目コードを取得
      const matchingItem = accountingItems.find(
        (item) => item.name === selectedOrder.accountingItem
      );

      // 該当する科目コードがあればセット、なければ""（すべて）
      setAccountCodeFilter(matchingItem?.code || "");
    } else if (!selectedOrder) {
      // 選択解除時はフィルタをリセット
      setAccountCodeFilter("");
    }
  }, [selectedOrder, accountingItems]);

  // Mutations
  const manualReconcile = useManualReconcile();
  const unmatchReconciliation = useUnmatchReconciliation();

  const matched = orderForecasts.filter((o) => o.reconciliationStatus === "matched");
  const unmatchedGL = glEntries.filter((g) => g.reconciliationStatus === "unmatched");

  const matchRate =
    orderForecasts.length > 0 ? Math.round((matched.length / orderForecasts.length) * 100) : 0;

  // Filter GL entries based on filters
  const filteredGLEntries = useMemo(() => {
    return glEntries.filter((gl) => {
      // 突合除外指定されたGLデータは常に非表示
      if (gl.isExcluded === "true") return false;

      // 突合済み受発注選択時: glMatchIdに一致するGLデータのみ表示
      if (
        selectedOrder &&
        selectedOrder.reconciliationStatus === "matched" &&
        selectedOrder.glMatchId
      ) {
        return gl.id === selectedOrder.glMatchId;
      }

      // 未突合受発注または選択なしの場合: 既存のフィルタリング処理
      if (unmatchedOnly && gl.reconciliationStatus !== "unmatched") return false;
      if (accountCodeFilter && gl.accountCode !== accountCodeFilter) return false;
      if (searchText) {
        const text = searchText.toLowerCase();
        return (
          gl.description?.toLowerCase().includes(text) || gl.voucherNo?.toLowerCase().includes(text)
        );
      }
      return true;
    });
  }, [glEntries, accountCodeFilter, searchText, unmatchedOnly, selectedOrder]);

  const handleManualMatch = async (glId: string) => {
    if (!selectedOrderId || !selectedOrder) return;

    try {
      // 既に突合済みの場合は警告を表示
      if (
        selectedOrder.reconciliationStatus === "matched" ||
        selectedOrder.reconciliationStatus === "fuzzy"
      ) {
        toast({
          variant: "destructive",
          title: "突合済みの明細です",
          description: "突合済みの明細は、まず突合を解除してから新しいGLと突合してください",
        });
        return;
      }

      await manualReconcile.mutateAsync({
        orderId: selectedOrderId,
        glId,
      });

      toast({
        title: "手動突合成功",
        description: "受発注見込みとGLデータを突合しました",
      });

      setSelectedOrderId(null);
      setOpen(false);
    } catch (_error) {
      toast({
        variant: "destructive",
        title: "突合エラー",
        description: "手動突合処理でエラーが発生しました",
      });
    }
  };

  const handleUnmatch = async () => {
    if (!selectedOrderId || !selectedOrder) return;

    // glMatchIdが必要
    if (!selectedOrder.glMatchId) {
      toast({
        variant: "destructive",
        title: "解除エラー",
        description: "突合されていない明細です",
      });
      return;
    }

    try {
      await unmatchReconciliation.mutateAsync({
        orderId: selectedOrderId,
        glId: selectedOrder.glMatchId,
      });

      toast({
        title: "突合解除成功",
        description: "突合を解除しました",
      });

      setSelectedOrderId(null);
    } catch (_error) {
      toast({
        variant: "destructive",
        title: "解除エラー",
        description: "突合解除処理でエラーが発生しました",
      });
    }
  };

  const formatCurrency = (value: string | number) => {
    return `¥${Number(value).toLocaleString()}`;
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          data-testid="button-open-reconciliation"
          onClick={() => {
            setOpen(true);
            setSelectedOrderId(null);
          }}
        >
          <GitMerge className="h-4 w-4 mr-2" />
          GL突合
          {matched.length > 0 && (
            <Badge variant="outline" className="ml-2 bg-success/20 text-success border-success/30">
              {matchRate}%
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            GL突合パネル
          </SheetTitle>
          <SheetDescription>
            {selectedOrder
              ? "GLデータを選択して手動突合を実行します"
              : `${period}の受発注データとGLデータを突合します`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {!selectedOrder ? (
            <>
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
                  onClick={() => onReconcile()}
                  data-testid="button-exact-match"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  厳格突合実行
                  <span className="ml-2 text-xs opacity-80">
                    （月度 + 計上科目 + 摘要文 + 金額）
                  </span>
                </Button>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  💡 <strong>手動突合の方法:</strong>
                  <br />
                  受発注見込み入力画面のグリッドで明細を選択すると、このパネルでGLデータを選択して手動突合できます。
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Selected Order Info */}
              <div className="border rounded-md p-4 space-y-2 bg-primary/5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">選択された受発注見込み</span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedOrderId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1 text-sm">
                  <div>
                    <strong>プロジェクト:</strong> {selectedOrder.projectName}
                  </div>
                  <div>
                    <strong>摘要:</strong> {selectedOrder.description}
                  </div>
                  <div>
                    <strong>計上年月:</strong> {selectedOrder.accountingPeriod}
                  </div>
                  <div>
                    <strong>金額:</strong>{" "}
                    <span className="font-mono">{formatCurrency(selectedOrder.amount)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <strong>状態:</strong>
                    <ReconciliationStatusBadge
                      status={
                        selectedOrder.reconciliationStatus as "matched" | "fuzzy" | "unmatched"
                      }
                    />
                  </div>
                </div>
                {selectedOrder.reconciliationStatus === "matched" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full mt-2"
                    onClick={handleUnmatch}
                  >
                    突合を解除
                  </Button>
                )}
              </div>

              {/* GL Filter */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  GLデータをフィルタ
                </Label>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="摘要、伝票番号で検索..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="flex-1"
                    />
                  </div>

                  <AutocompleteSelect
                    value={accountCodeFilter}
                    onChange={(value) => setAccountCodeFilter(value)}
                    options={accountingItemOptions}
                    placeholder="科目を選択..."
                    searchPlaceholder="科目コードまたは名称で検索..."
                    emptyText="該当する科目がありません"
                  />

                  <div className="flex items-center gap-2">
                    <Switch checked={unmatchedOnly} onCheckedChange={setUnmatchedOnly} />
                    <Label className="text-sm">未突合のみ表示</Label>
                  </div>
                </div>
              </div>

              {/* GL List */}
              <div className="space-y-2">
                <div className="text-sm font-medium">GLデータ ({filteredGLEntries.length}件)</div>
                {filteredGLEntries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    条件に一致するGLデータがありません
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {filteredGLEntries.map((gl) => (
                      <button
                        key={gl.id}
                        className="w-full border rounded-md p-3 text-left hover:bg-muted/50 transition-colors"
                        onClick={() => handleManualMatch(gl.id)}
                        disabled={manualReconcile.isPending}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{gl.voucherNo}</span>
                            <ReconciliationStatusBadge
                              status={gl.reconciliationStatus as "matched" | "fuzzy" | "unmatched"}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {gl.transactionDate} | {gl.accountCode} {gl.accountName}
                          </div>
                          <div className="text-sm">{gl.description}</div>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              {gl.debitCredit}
                            </Badge>
                            <span className="font-mono font-medium">
                              {formatCurrency(gl.amount)}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
