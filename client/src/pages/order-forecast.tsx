import { useState, useMemo, useEffect, useRef } from "react";
import { ExcelDataGrid, type GridColumn, type GridRow } from "@/components/excel-data-grid";
import { GLReconciliationPanel } from "@/components/gl-reconciliation-panel";
import { PeriodSelector } from "@/components/period-selector";
import { KeyboardShortcutsPanel } from "@/components/keyboard-shortcuts-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { ReconciliationStatusBadge } from "@/components/reconciliation-status-badge";
import { useToast } from "@/hooks/use-toast";
import { useOrderForecasts, useCreateOrderForecast, useUpdateOrderForecast, useDeleteOrderForecast } from "@/hooks/use-order-forecasts";
import { useGLEntries } from "@/hooks/use-gl-entries";
import { useCustomers, useProjects, useAccountingItems } from "@/hooks/use-masters";
import { useReconciliation } from "@/hooks/use-reconciliation";
import type { OrderForecast, InsertOrderForecast } from "@shared/schema";
import { FileSpreadsheet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrderForecastPage() {
  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [period, setPeriod] = useState(currentPeriod);
  const { toast } = useToast();

  // Fetch data from backend
  const { data: orderForecasts = [], isLoading: ordersLoading, refetch: refetchOrders } = useOrderForecasts(period);
  const { data: glEntries = [], isLoading: glLoading } = useGLEntries(period);
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: accountingItems = [], isLoading: accountingItemsLoading } = useAccountingItems();

  // Mutations
  const createMutation = useCreateOrderForecast();
  const updateMutation = useUpdateOrderForecast();
  const deleteMutation = useDeleteOrderForecast();
  const reconcileMutation = useReconciliation();

  // 期間変更時にデータを再取得
  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    toast({
      title: "期間を変更しました",
      description: `${newPeriod}のデータを読み込みました`,
    });
  };

  // グリッド列定義
  const columns: GridColumn[] = [
    {
      key: "projectId",
      label: "プロジェクト",
      type: "autocomplete",
      width: 200,
      required: true,
      autocompleteOptions: projects.map((p) => ({
        value: p.id,
        label: p.name,
        code: p.code,
      })),
    },
    {
      key: "customerId",
      label: "取引先",
      type: "autocomplete",
      width: 250,
      required: true,
      autocompleteOptions: customers.map((c) => ({
        value: c.id,
        label: c.name,
        code: c.code,
      })),
    },
    {
      key: "accountingPeriod",
      label: "計上年月",
      type: "autocomplete",
      width: 140,
      required: true,
      autocompleteOptions: (() => {
        const periods: string[] = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const periodValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          periods.push(periodValue);
        }
        return periods.map(p => ({
          value: p,
          label: `${p.split('-')[0]}年${p.split('-')[1]}月`,
        }));
      })(),
    },
    {
      key: "accountingItem",
      label: "計上科目",
      type: "autocomplete",
      width: 200,
      required: true,
      autocompleteOptions: accountingItems.map((ai) => ({
        value: ai.name,
        label: ai.name,
        code: ai.code,
      })),
    },
    {
      key: "description",
      label: "摘要文",
      type: "text",
      width: 250,
      required: true,
    },
    {
      key: "amount",
      label: "金額",
      type: "number",
      width: 140,
      required: true,
    },
    {
      key: "remarks",
      label: "備考",
      type: "text",
      width: 200,
    },
    {
      key: "reconciliationStatus",
      label: "突合状態",
      type: "text",
      width: 120,
      readonly: true,
      className: "text-center",
    },
  ];

  // GridRow形式に変換
  const gridRows: GridRow[] = orderForecasts.map((order) => ({
    id: order.id,
    projectId: order.projectId,
    projectCode: order.projectCode,
    projectName: order.projectName,
    customerId: order.customerId,
    customerCode: order.customerCode,
    customerName: order.customerName,
    accountingPeriod: order.accountingPeriod,
    accountingItem: order.accountingItem,
    description: order.description,
    amount: order.amount,
    remarks: order.remarks || "",
    reconciliationStatus: order.reconciliationStatus,
    _modified: false,
  }));

  const [localRows, setLocalRows] = useState<GridRow[]>([]);
  const lastSyncedDataRef = useRef<OrderForecast[]>([]);
  const deletedIdsRef = useRef<Set<string>>(new Set());

  // Sync local rows only when period changes or on initial load
  useEffect(() => {
    // Don't sync if there are pending saves (modified rows exist)
    const hasModifiedRows = localRows.some(row => row._modified);
    if (hasModifiedRows) {
      return; // Preserve _modified flags during save
    }

    // Check if orderForecasts data is actually different from what we last synced
    const dataChanged = JSON.stringify(orderForecasts) !== JSON.stringify(lastSyncedDataRef.current);
    
    // Only sync if data changed (prevents infinite loop from same-data re-renders)
    if (dataChanged) {
      const freshGridRows: GridRow[] = orderForecasts.map((order) => ({
        id: order.id,
        projectId: order.projectId,
        projectCode: order.projectCode,
        projectName: order.projectName,
        customerId: order.customerId,
        customerCode: order.customerCode,
        customerName: order.customerName,
        accountingPeriod: order.accountingPeriod,
        accountingItem: order.accountingItem,
        description: order.description,
        amount: order.amount,
        remarks: order.remarks || "",
        reconciliationStatus: order.reconciliationStatus,
        _modified: false,
      }));
      setLocalRows(freshGridRows);
      lastSyncedDataRef.current = orderForecasts;
    }
  }, [period, orderForecasts, localRows]);

  const handleRowsChange = (rows: GridRow[]) => {
    // Track deletions: find rows that were in localRows but not in new rows
    const newRowIds = new Set(rows.map(r => r.id));
    localRows.forEach(oldRow => {
      if (!newRowIds.has(oldRow.id) && !oldRow.id.startsWith("temp-")) {
        // Real row was deleted (not a temp row)
        deletedIdsRef.current.add(oldRow.id);
      }
    });
    
    setLocalRows(rows);
  };

  const handleSave = async () => {
    try {
      // Find modified rows
      const modifiedRows = localRows.filter((row) => row._modified);

      // Validate all modified rows before saving
      const validationErrors: string[] = [];
      modifiedRows.forEach((row, index) => {
        const amount = Number(row.amount);

        if (isNaN(amount)) {
          validationErrors.push(`行${index + 1}: 金額は有効な数値を入力してください`);
        }
        if (!row.projectId || !row.customerId || !row.accountingPeriod || !row.accountingItem || !row.description) {
          validationErrors.push(`行${index + 1}: 必須項目を入力してください`);
        }
      });

      if (validationErrors.length > 0) {
        toast({
          title: "入力エラー",
          description: validationErrors.join(', '),
          variant: "destructive",
        });
        return;
      }

      for (const row of modifiedRows) {
        if (row.id.startsWith("temp-")) {
          // Create new order
          const newOrder: InsertOrderForecast = {
            projectId: row.projectId,
            projectCode: row.projectCode,
            projectName: row.projectName,
            customerId: row.customerId,
            customerCode: row.customerCode,
            customerName: row.customerName,
            accountingPeriod: row.accountingPeriod,
            accountingItem: row.accountingItem,
            description: row.description,
            amount: String(row.amount),
            remarks: row.remarks || "",
            period,
          };
          await createMutation.mutateAsync(newOrder);
        } else {
          // Update existing order
          const existing = orderForecasts.find((o) => o.id === row.id);
          if (existing) {
            await updateMutation.mutateAsync({
              id: row.id,
              data: {
                projectId: row.projectId,
                projectCode: row.projectCode,
                projectName: row.projectName,
                customerId: row.customerId,
                customerCode: row.customerCode,
                customerName: row.customerName,
                accountingPeriod: row.accountingPeriod,
                accountingItem: row.accountingItem,
                description: row.description,
                amount: String(row.amount),
                remarks: row.remarks || "",
                period, // Include period for cache invalidation
              },
            });
          }
        }
      }

      // Delete explicitly deleted rows (tracked in deletedIdsRef)
      for (const deletedId of Array.from(deletedIdsRef.current)) {
        await deleteMutation.mutateAsync({ id: deletedId, period });
      }
      // Clear deleted IDs after successful deletion
      deletedIdsRef.current.clear();

      // Refetch and update local rows with fresh data
      const { data: freshData } = await refetchOrders();
      if (freshData) {
        const freshRows: GridRow[] = freshData.map((order) => ({
          id: order.id,
          projectId: order.projectId,
          projectCode: order.projectCode,
          projectName: order.projectName,
          customerId: order.customerId,
          customerCode: order.customerCode,
          customerName: order.customerName,
          accountingPeriod: order.accountingPeriod,
          accountingItem: order.accountingItem,
          description: order.description,
          amount: order.amount,
          remarks: order.remarks || "",
          reconciliationStatus: order.reconciliationStatus,
          _modified: false,
        }));
        setLocalRows(freshRows);
      }
      
      toast({
        title: "保存しました",
        description: `${modifiedRows.length}件のデータを保存しました`,
      });
    } catch (error) {
      toast({
        title: "保存に失敗しました",
        description: "データの保存中にエラーが発生しました",
        variant: "destructive",
      });
    }
  };

  const handleReconcile = async (type: "exact" | "fuzzy") => {
    try {
      const result = await reconcileMutation.mutateAsync({
        period,
        type: type === "exact" ? "exact" : "fuzzy",
      });

      // Refetch and update local rows with reconciliation results
      const { data: freshData } = await refetchOrders();
      if (freshData) {
        const freshRows: GridRow[] = freshData.map((order) => ({
          id: order.id,
          projectId: order.projectId,
          projectCode: order.projectCode,
          projectName: order.projectName,
          customerId: order.customerId,
          customerCode: order.customerCode,
          customerName: order.customerName,
          accountingPeriod: order.accountingPeriod,
          accountingItem: order.accountingItem,
          description: order.description,
          amount: order.amount,
          remarks: order.remarks || "",
          reconciliationStatus: order.reconciliationStatus,
          _modified: false,
        }));
        setLocalRows(freshRows);
      }

      toast({
        title: `${type === "exact" ? "厳格" : "ファジー"}突合完了`,
        description: `突合済: ${result.totalMatched}件、曖昧一致: ${result.totalFuzzy}件`,
      });
    } catch (error) {
      toast({
        title: "突合に失敗しました",
        description: "突合処理中にエラーが発生しました",
        variant: "destructive",
      });
    }
  };

  const handleManualMatch = (orderId: string, glId: string) => {
    // Manual matching would require a separate API endpoint
    toast({
      title: "手動突合",
      description: "手動突合機能は開発中です",
    });
  };

  const handleSearch = () => {
    toast({
      title: "検索機能",
      description: "検索ダイアログを表示します（モック）",
    });
  };

  const matchedCount = orderForecasts.filter((o) => o.reconciliationStatus === "matched").length;
  const fuzzyCount = orderForecasts.filter((o) => o.reconciliationStatus === "fuzzy").length;
  const unmatchedCount = orderForecasts.filter((o) => o.reconciliationStatus === "unmatched").length;

  // Loading state
  if (ordersLoading || glLoading || customersLoading || projectsLoading || accountingItemsLoading) {
    return (
      <div className="flex flex-col h-screen">
        <header className="flex items-center justify-between px-6 py-4 border-b">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
        </header>
        <main className="flex-1 p-6">
          <Skeleton className="h-full w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-card/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold" data-testid="text-page-title">受発注見込み入力</h1>
          </div>
          <div className="h-6 w-px bg-border" />
          <PeriodSelector value={period} onChange={handlePeriodChange} />
        </div>

        <div className="flex items-center gap-2">
          {/* Status Summary */}
          <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-md mr-2">
            <div className="flex items-center gap-1" data-testid="text-matched-count">
              <ReconciliationStatusBadge status="matched" />
              <span className="text-sm font-medium">{matchedCount}</span>
            </div>
            <div className="flex items-center gap-1" data-testid="text-fuzzy-count">
              <ReconciliationStatusBadge status="fuzzy" />
              <span className="text-sm font-medium">{fuzzyCount}</span>
            </div>
            <div className="flex items-center gap-1" data-testid="text-unmatched-count">
              <ReconciliationStatusBadge status="unmatched" />
              <span className="text-sm font-medium">{unmatchedCount}</span>
            </div>
          </div>

          <GLReconciliationPanel
            period={period}
            orderForecasts={orderForecasts}
            glEntries={glEntries}
            onReconcile={handleReconcile}
            onManualMatch={handleManualMatch}
          />
          <KeyboardShortcutsPanel />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content - Data Grid */}
      <main className="flex-1 overflow-hidden">
        <ExcelDataGrid
          columns={columns}
          rows={localRows}
          onRowsChange={handleRowsChange}
          onSave={handleSave}
          onSearch={handleSearch}
        />
      </main>
    </div>
  );
}
