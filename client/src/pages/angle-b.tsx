import type { AngleBForecast, NewAngleBForecast } from "@shared/schema";
import { ArrowUpCircle, FileSpreadsheet } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AdvancedFilterPanel, type FilterState } from "@/components/advanced-filter-panel";
import { ExcelDataGrid, type GridColumn, type GridRowData } from "@/components/excel-data-grid";
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

export default function AngleBPage() {
  const [filter, setFilter] = useState<FilterState>(() => {
    const now = new Date();
    return {
      fiscalYear: now.getFullYear(),
      month: now.getMonth() + 1,
    };
  });
  const { toast } = useToast();

  // Fetch data from backend
  const { data: angleBForecasts = [], isLoading: angleBLoading, refetch: refetchAngleB } = useAngleBForecasts(filter);
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
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
    const filterDesc = `${newFilter.fiscalYear}年度${newFilter.month ? ` ${newFilter.month}月` : ""}`;
    toast({
      title: "フィルタを変更しました",
      description: `${filterDesc}のデータを読み込みました`,
    });
  };

  // Grid columns
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
          const periodValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          periods.push(periodValue);
        }
        return periods.map((p) => ({
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
        customerId: angleB.customerId,
        customerCode: angleB.customerCode,
        customerName: angleB.customerName,
        accountingPeriod: angleB.accountingPeriod,
        accountingItem: angleB.accountingItem,
        description: angleB.description,
        amount: angleB.amount,
        probability: angleB.probability,
        remarks: angleB.remarks || "",
        _modified: false,
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
        if (
          !row.projectId ||
          !row.customerId ||
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
            customerId: row.customerId as string,
            customerCode: row.customerCode as string,
            customerName: row.customerName as string,
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
            await updateMutation.mutateAsync({
              id: row.id,
              data: {
                projectId: row.projectId as string,
                projectCode: row.projectCode as string,
                projectName: row.projectName as string,
                customerId: row.customerId as string,
                customerCode: row.customerCode as string,
                customerName: row.customerName as string,
                accountingPeriod: row.accountingPeriod as string,
                accountingItem: row.accountingItem as string,
                description: row.description as string,
                amount: String(row.amount),
                probability: Number(row.probability),
                remarks: (row.remarks as string) || "",
              },
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
          customerId: angleB.customerId,
          customerCode: angleB.customerCode,
          customerName: angleB.customerName,
          accountingPeriod: angleB.accountingPeriod,
          accountingItem: angleB.accountingItem,
          description: angleB.description,
          amount: angleB.amount,
          probability: angleB.probability,
          remarks: angleB.remarks || "",
          _modified: false,
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
          customerId: angleB.customerId,
          customerCode: angleB.customerCode,
          customerName: angleB.customerName,
          accountingPeriod: angleB.accountingPeriod,
          accountingItem: angleB.accountingItem,
          description: angleB.description,
          amount: angleB.amount,
          probability: angleB.probability,
          remarks: angleB.remarks || "",
          _modified: false,
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

  const handleSearch = () => {
    toast({
      title: "検索機能",
      description: "検索ダイアログを表示します（モック）",
    });
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
