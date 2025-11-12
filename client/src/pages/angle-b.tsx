import type { AngleBForecast, NewAngleBForecast } from "@shared/schema";
import { ArrowUpCircle, FileSpreadsheet } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AdvancedFilterPanel, type FilterState } from "@/components/advanced-filter-panel";
import { ExcelDataGrid, type GridColumn, type GridRowData } from "@/components/excel-data-grid";
import { KeyboardShortcutsPanel } from "@/components/keyboard-shortcuts-panel";
import { type SearchFilter, SearchFilterPanel } from "@/components/search-filter-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAngleBForecasts,
  useCreateAngleBForecast,
  useDeleteAngleBForecast,
  usePromoteAngleBForecast,
  useUpdateAngleBForecast,
} from "@/hooks/useAngleBForecasts";
import { useAccountingItems, useCustomers, useProjects } from "@/hooks/useMasters";
import { useToast } from "@/hooks/useToast";
import { sortAccountingItemsByOrder } from "@/lib/accountingItemOrder";

export default function AngleBPage() {
  const [filter, setFilter] = useState<FilterState>(() => {
    const now = new Date();
    return {
      fiscalYear: now.getFullYear(),
      month: now.getMonth() + 1,
    };
  });
  
  // 詳細検索条件
  const [searchFilter, setSearchFilter] = useState<SearchFilter>({});
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  
  const { toast } = useToast();

  // Fetch data from backend with combined filters
  const { data: angleBForecasts = [], isLoading: angleBLoading, refetch: refetchAngleB } = useAngleBForecasts({
    ...filter,
    ...searchFilter,
  });
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: projectsRaw = [], isLoading: projectsLoading } = useProjects(filter.fiscalYear);
  // プロジェクトをコードの昇順でソート
  const projects = [...projectsRaw].sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  const { data: accountingItems = [], isLoading: accountingItemsLoading } = useAccountingItems();

  // Mutations
  const createMutation = useCreateAngleBForecast();
  const updateMutation = useUpdateAngleBForecast();
  const deleteMutation = useDeleteAngleBForecast();
  const promoteMutation = usePromoteAngleBForecast();

  const getPeriodFromFilter = (filter: FilterState): string => {
    const month = filter.month || new Date().getMonth() + 1;
    return `${filter.fiscalYear}-${String(month).padStart(2, "0")}`;
  };

  const currentPeriod = getPeriodFromFilter(filter);

  const handleFilterChange = (newFilter: FilterState) => {
    setFilter(newFilter);
    
    // フィルタ説明文を生成
    const filterParts: string[] = [];
    filterParts.push(`${newFilter.fiscalYear}年度`);
    if (newFilter.month) filterParts.push(`${newFilter.month}月`);
    if (newFilter.projectId) filterParts.push("プロジェクト指定");
    
    const filterDesc = filterParts.join(", ");
    toast({
      title: "フィルタを変更しました",
      description: `${filterDesc}のデータを読み込みました`,
    });
  };

  // 詳細検索実行時
  const handleSearch = (newSearchFilter: SearchFilter) => {
    setSearchFilter(newSearchFilter);
    
    // 検索条件の説明文を生成
    const searchParts: string[] = [];
    if (newSearchFilter.salesPerson) searchParts.push(`営業窓口: ${newSearchFilter.salesPerson}`);
    if (newSearchFilter.accountingItem) searchParts.push(`計上科目: ${newSearchFilter.accountingItem}`);
    if (newSearchFilter.customerId) {
      const customer = customers.find(c => c.id === newSearchFilter.customerId);
      if (customer) searchParts.push(`取引先: ${customer.name}`);
    }
    if (newSearchFilter.searchText) searchParts.push(`検索: ${newSearchFilter.searchText}`);
    
    if (searchParts.length > 0) {
      toast({
        title: "検索を実行しました",
        description: searchParts.join(", "),
      });
    } else {
      toast({
        title: "検索条件をクリアしました",
        description: "すべてのデータを表示しています",
      });
    }
  };

  // Grid columns
  const columns: GridColumn[] = [
    {
      key: "projectId",
      label: "プロジェクト",
      type: "autocomplete",
      width: 200,
      required: true,
      sortable: true, // 並び替え機能を追加
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
      required: false, // 非必須に変更
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
      sortable: true,
      autocompleteOptions: (() => {
        const periods: string[] = [];
        const fiscalYear = filter.fiscalYear;
        
        // 会計年度: 4月～翌年3月
        // 4月～12月は同じ年、1月～3月は翌年
        for (let month = 4; month <= 12; month++) {
          const periodValue = `${fiscalYear}-${String(month).padStart(2, "0")}`;
          periods.push(periodValue);
        }
        for (let month = 1; month <= 3; month++) {
          const periodValue = `${fiscalYear + 1}-${String(month).padStart(2, "0")}`;
          periods.push(periodValue);
        }
        
        return periods.map(p => ({
          value: p,
          label: `${p.split("-")[0]}年${p.split("-")[1]}月`,
        }));
      })(),
    },
    {
      key: "accountingItem",
      label: "計上科目",
      type: "autocomplete",
      width: 200,
      required: true,
      autocompleteOptions: sortAccountingItemsByOrder(accountingItems).map((ai) => ({
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
      key: "probability",
      label: "確度（%）",
      type: "number",
      width: 100,
      required: true,
    },
    {
      key: "remarks",
      label: "備考",
      type: "text",
      width: 200,
    },
  ];

  const [localRows, setLocalRows] = useState<GridRowData[]>([]);
  const lastSyncedDataRef = useRef<AngleBForecast[]>([]);
  const deletedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const hasModifiedRows = localRows.some((row) => row._modified);
    if (hasModifiedRows) {
      return;
    }

    const dataChanged = JSON.stringify(angleBForecasts) !== JSON.stringify(lastSyncedDataRef.current);

    if (dataChanged) {
      const freshGridRows: GridRowData[] = angleBForecasts.map((angleB) => ({
        id: angleB.id,
        projectId: angleB.projectId,
        projectCode: angleB.projectCode,
        projectName: angleB.projectName,
        customerId: angleB.customerId || undefined,
        customerCode: angleB.customerCode || undefined,
        customerName: angleB.customerName || undefined,
        accountingPeriod: angleB.accountingPeriod,
        accountingItem: angleB.accountingItem,
        description: angleB.description,
        amount: angleB.amount,
        probability: angleB.probability,
        remarks: angleB.remarks || "",
        _modified: false,
        _selected: false,
      }));
      setLocalRows(freshGridRows);
      lastSyncedDataRef.current = angleBForecasts;
    }
  }, [filter, angleBForecasts, localRows]);

  const handleRowsChange = (rows: GridRowData[]) => {
    const newRowIds = new Set(rows.map((r) => r.id));
    localRows.forEach((oldRow) => {
      if (!newRowIds.has(oldRow.id) && !oldRow.id.startsWith("temp-")) {
        deletedIdsRef.current.add(oldRow.id);
      }
    });

    setLocalRows(rows);
  };

  const handleSave = async () => {
    try {
      const modifiedRows = localRows.filter((row) => row._modified);

      const validationErrors: string[] = [];
      modifiedRows.forEach((row, index) => {
        const amount = Number(row.amount);
        const probability = Number(row.probability);

        if (isNaN(amount)) {
          validationErrors.push(`行${index + 1}: 金額は有効な数値を入力してください`);
        }
        if (isNaN(probability) || probability < 0 || probability > 100) {
          validationErrors.push(`行${index + 1}: 確度は0〜100の範囲で入力してください`);
        }
        // 取引先は非必須なのでチェックから除外
        if (
          !row.projectId ||
          !row.accountingPeriod ||
          !row.accountingItem ||
          !row.description
        ) {
          validationErrors.push(`行${index + 1}: 必須項目を入力してください`);
        }
      });

      if (validationErrors.length > 0) {
        toast({
          title: "入力エラー",
          description: validationErrors.join(", "),
          variant: "destructive",
        });
        return;
      }

      for (const row of modifiedRows) {
        if (row.id.startsWith("temp-")) {
          const newAngleB: NewAngleBForecast = {
            projectId: row.projectId as string,
            projectCode: row.projectCode as string,
            projectName: row.projectName as string,
            // 取引先は非必須なので、空の場合はundefinedにする
            ...(row.customerId ? {
              customerId: row.customerId as string,
              customerCode: row.customerCode as string,
              customerName: row.customerName as string,
            } : {}),
            accountingPeriod: row.accountingPeriod as string,
            accountingItem: row.accountingItem as string,
            description: row.description as string,
            amount: String(row.amount),
            probability: Number(row.probability),
            remarks: (row.remarks as string) || "",
            period: currentPeriod,
          };
          await createMutation.mutateAsync({ ...newAngleB, filter });
        } else {
          const existing = angleBForecasts.find((a) => a.id === row.id);
          if (existing) {
            // 取引先は非必須なので、空の場合はnullにする
            const updateData: any = {
              projectId: row.projectId as string,
              projectCode: row.projectCode as string,
              projectName: row.projectName as string,
              accountingPeriod: row.accountingPeriod as string,
              accountingItem: row.accountingItem as string,
              description: row.description as string,
              amount: String(row.amount),
              probability: Number(row.probability),
              remarks: (row.remarks as string) || "",
            };
            
            if (row.customerId) {
              updateData.customerId = row.customerId as string;
              updateData.customerCode = row.customerCode as string;
              updateData.customerName = row.customerName as string;
            } else {
              updateData.customerId = null;
              updateData.customerCode = null;
              updateData.customerName = null;
            }
            
            await updateMutation.mutateAsync({
              id: row.id,
              data: updateData,
              filter,
            });
          }
        }
      }

      for (const deletedId of Array.from(deletedIdsRef.current)) {
        await deleteMutation.mutateAsync({ id: deletedId, filter });
      }
      deletedIdsRef.current.clear();

      const { data: freshData } = await refetchAngleB();
      if (freshData) {
        const freshRows: GridRowData[] = freshData.map((angleB) => ({
          id: angleB.id,
          projectId: angleB.projectId,
          projectCode: angleB.projectCode,
          projectName: angleB.projectName,
          customerId: angleB.customerId || undefined,
          customerCode: angleB.customerCode || undefined,
          customerName: angleB.customerName || undefined,
          accountingPeriod: angleB.accountingPeriod,
          accountingItem: angleB.accountingItem,
          description: angleB.description,
          amount: angleB.amount,
          probability: angleB.probability,
          remarks: angleB.remarks || "",
          _modified: false,
          _selected: false,
        }));
        setLocalRows(freshRows);
      }

      toast({
        title: "保存しました",
        description: `${modifiedRows.length}件のデータを保存しました`,
      });
    } catch (_error) {
      toast({
        title: "保存に失敗しました",
        description: "データの保存中にエラーが発生しました",
        variant: "destructive",
      });
    }
  };

  const handlePromote = async () => {
    try {
      const selectedRows = localRows.filter((row) => row._selected && !row.id.startsWith("temp-"));

      if (selectedRows.length === 0) {
        toast({
          title: "行を選択してください",
          description: "見込みへ昇格する角度B案件を選択してください",
          variant: "destructive",
        });
        return;
      }

      for (const row of selectedRows) {
        await promoteMutation.mutateAsync({ id: row.id, filter });
      }

      const { data: freshData } = await refetchAngleB();
      if (freshData) {
        const freshRows: GridRowData[] = freshData.map((angleB) => ({
          id: angleB.id,
          projectId: angleB.projectId,
          projectCode: angleB.projectCode,
          projectName: angleB.projectName,
          customerId: angleB.customerId || undefined,
          customerCode: angleB.customerCode || undefined,
          customerName: angleB.customerName || undefined,
          accountingPeriod: angleB.accountingPeriod,
          accountingItem: angleB.accountingItem,
          description: angleB.description,
          amount: angleB.amount,
          probability: angleB.probability,
          remarks: angleB.remarks || "",
          _modified: false,
          _selected: false,
        }));
        setLocalRows(freshRows);
      }

      toast({
        title: "見込みへ昇格しました",
        description: `${selectedRows.length}件の角度B案件を受発注見込に昇格しました`,
      });
    } catch (_error) {
      toast({
        title: "昇格に失敗しました",
        description: "見込みへの昇格中にエラーが発生しました",
        variant: "destructive",
      });
    }
  };

  if (angleBLoading || customersLoading || projectsLoading || accountingItemsLoading) {
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
            <h1 className="text-xl font-semibold" data-testid="text-page-title">
              角度B案件登録
            </h1>
          </div>
          <div className="h-6 w-px bg-border" />
          <AdvancedFilterPanel filter={filter} onChange={handleFilterChange} projects={projects} />
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handlePromote} variant="outline" data-testid="button-promote">
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            見込みへ昇格
          </Button>
          <SearchFilterPanel
            open={isSearchPanelOpen}
            onOpenChange={setIsSearchPanelOpen}
            filter={searchFilter}
            onSearch={handleSearch}
            projects={projects}
            customers={customers}
            accountingItems={accountingItems}
          />
          <KeyboardShortcutsPanel />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content - Data Grid */}
      <main className="flex-1 overflow-hidden pb-16">
        <ExcelDataGrid
          columns={columns}
          rows={localRows}
          onRowsChange={handleRowsChange}
          onSave={handleSave}
        />
      </main>
    </div>
  );
}
