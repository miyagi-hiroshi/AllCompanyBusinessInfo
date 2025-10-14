import { FileUp, Upload, X } from "lucide-react";
import { useState } from "react";

import { ExclusionDialog } from "@/components/exclusion-dialog";
import { GLCSVImportDialog } from "@/components/gl-csv-import-dialog";
import { ReconciliationStatusBadge } from "@/components/reconciliation-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGLEntries, useSetGLEntriesExclusion } from "@/hooks/useGLEntries";
import { useToast } from "@/hooks/useToast";

export default function GLImportPage() {
  const [fiscalYear, setFiscalYear] = useState<number>(() => new Date().getFullYear());
  const [month, setMonth] = useState<number | undefined>(() => new Date().getMonth() + 1);
  const [selectedGLIds, setSelectedGLIds] = useState<Set<string>>(new Set());
  const [exclusionDialogOpen, setExclusionDialogOpen] = useState(false);
  const [isExcluding, setIsExcluding] = useState(true);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const { toast } = useToast();

  // Fetch GL entries
  const { data: glEntries = [], isLoading: glLoading, refetch: refetchGL } = useGLEntries({
    fiscalYear,
    month,
  });
  const setGLExclusion = useSetGLEntriesExclusion();

  // フィルタリング処理
  const filteredGLEntries = glEntries.filter((gl) => {
    if (!searchFilter) return true;
    
    const searchLower = searchFilter.toLowerCase();
    const accountName = gl.accountName?.toLowerCase() || "";
    const description = gl.description?.toLowerCase() || "";
    
    return accountName.includes(searchLower) || description.includes(searchLower);
  });

  const handleRefresh = () => {
    void refetchGL();
  };

  const handleExcludeGL = () => {
    if (selectedGLIds.size === 0) {
      toast({
        variant: "destructive",
        title: "選択エラー",
        description: "除外するGL明細を選択してください",
      });
      return;
    }
    setIsExcluding(true);
    setExclusionDialogOpen(true);
  };

  const handleIncludeGL = () => {
    if (selectedGLIds.size === 0) {
      toast({
        variant: "destructive",
        title: "選択エラー",
        description: "除外解除するGL明細を選択してください",
      });
      return;
    }
    setIsExcluding(false);
    setExclusionDialogOpen(true);
  };

  const handleConfirmExclusion = (reason: string) => {
    const ids = Array.from(selectedGLIds);

    setGLExclusion.mutate(
      { ids, isExcluded: isExcluding, exclusionReason: reason },
      {
        onSuccess: () => {
          toast({
            title: isExcluding ? "除外完了" : "除外解除完了",
            description: `${ids.length}件の明細を${isExcluding ? "除外" : "除外解除"}しました`,
          });
          setExclusionDialogOpen(false);
          setSelectedGLIds(new Set());
          handleRefresh();
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "除外エラー",
            description: "除外処理中にエラーが発生しました",
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

  // Calculate stats
  const excludedCount = glEntries.filter((g) => g.isExcluded === "true").length;
  const matchedCount = glEntries.filter((g) => g.reconciliationStatus === "matched").length;
  const unmatchedCount = glEntries.filter((g) => g.reconciliationStatus === "unmatched").length;

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileUp className="h-7 w-7" />
            GL取込
          </h1>
          <p className="text-muted-foreground mt-1">GLデータのCSV取込と除外管理を行います</p>
        </div>

        {/* Filter and Import Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">期間選択とデータ取込</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">年度</label>
                <Select
                  value={fiscalYear.toString()}
                  onValueChange={(value) => setFiscalYear(parseInt(value))}
                >
                  <SelectTrigger className="w-[140px]">
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
                  <SelectTrigger className="w-[120px]">
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
              
              <div className="ml-auto">
                <GLCSVImportDialog />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        {glLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">総GL件数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{glEntries.length}</div>
                <p className="text-xs text-muted-foreground mt-1">取込済みデータ</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <Upload className="inline h-4 w-4 mr-1" />
                  除外済み
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-warning">{excludedCount}</div>
                <p className="text-xs text-muted-foreground mt-1">突合対象外</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">突合済み</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">{matchedCount}</div>
                <p className="text-xs text-muted-foreground mt-1">未突合: {unmatchedCount}件</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* GL Exclusion Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              GL明細除外管理
            </CardTitle>
            <CardDescription>
              チェックボックスで選択したGL明細を除外/除外解除できます
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  onClick={handleExcludeGL}
                  disabled={selectedGLIds.size === 0}
                  variant="destructive"
                  size="sm"
                >
                  選択した明細を除外
                </Button>
                <Button
                  onClick={handleIncludeGL}
                  disabled={selectedGLIds.size === 0}
                  variant="outline"
                  size="sm"
                >
                  選択した明細の除外を解除
                </Button>
                {selectedGLIds.size > 0 && (
                  <span className="text-sm text-muted-foreground self-center">
                    {selectedGLIds.size}件選択中
                  </span>
                )}
              </div>
              
              {/* 検索フィールド */}
              <div className="mb-3">
                <div className="relative max-w-sm">
                  <Input
                    placeholder="勘定科目・摘要で検索..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pr-10"
                  />
                  {searchFilter && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setSearchFilter("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {searchFilter && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {filteredGLEntries.length}件 / {glEntries.length}件
                  </p>
                )}
              </div>
              
              {glLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : glEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  データがありません。上記のボタンからCSVファイルを取り込んでください。
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={filteredGLEntries.length > 0 && selectedGLIds.size === filteredGLEntries.length}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedGLIds(new Set(filteredGLEntries.map(gl => gl.id)));
                              } else {
                                setSelectedGLIds(new Set());
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>伝票No</TableHead>
                        <TableHead>日付</TableHead>
                        <TableHead>勘定科目</TableHead>
                        <TableHead>摘要</TableHead>
                        <TableHead>借/貸</TableHead>
                        <TableHead className="text-right">金額</TableHead>
                        <TableHead>状態</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGLEntries.map((gl) => (
                        <TableRow
                          key={gl.id}
                          className={gl.isExcluded === "true" ? "bg-muted/50" : ""}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedGLIds.has(gl.id)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(selectedGLIds);
                                if (checked) {
                                  newSet.add(gl.id);
                                } else {
                                  newSet.delete(gl.id);
                                }
                                setSelectedGLIds(newSet);
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{gl.voucherNo}</TableCell>
                          <TableCell>{gl.transactionDate}</TableCell>
                          <TableCell>{gl.accountCode} {gl.accountName}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{gl.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {gl.debitCredit}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(gl.amount)}</TableCell>
                          <TableCell>
                            {gl.isExcluded === "true" ? (
                              <Badge variant="outline" className="text-xs bg-muted">
                                除外済
                              </Badge>
                            ) : (
                              <ReconciliationStatusBadge status={gl.reconciliationStatus as "matched" | "fuzzy" | "unmatched"} />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Exclusion Dialog */}
        <ExclusionDialog
          open={exclusionDialogOpen}
          onOpenChange={setExclusionDialogOpen}
          selectedCount={selectedGLIds.size}
          isExcluding={isExcluding}
          onConfirm={handleConfirmExclusion}
        />
      </div>
    </div>
  );
}

