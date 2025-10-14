import type { AccountingItem, Customer, Project } from "@shared/schema";
import { Filter, Search, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { sortAccountingItemsByOrder } from "@/lib/accountingItemOrder";

export interface SearchFilter {
  salesPerson?: string;
  accountingItem?: string;
  customerId?: string;
  searchText?: string;
  reconciliationStatus?: 'matched' | 'fuzzy' | 'unmatched';
}

interface SearchFilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter: SearchFilter;
  onSearch: (filter: SearchFilter) => void;
  projects: Project[];
  customers: Customer[];
  accountingItems: AccountingItem[];
}

export function SearchFilterPanel({
  open,
  onOpenChange,
  filter,
  onSearch,
  projects,
  customers,
  accountingItems,
}: SearchFilterPanelProps) {
  // ローカルstate（一時保存）
  const [localFilter, setLocalFilter] = useState<SearchFilter>(filter);

  // 営業担当者のユニークリストを抽出
  const salesPersons = Array.from(new Set(projects.map(p => p.salesPerson))).sort();

  // アクティブな検索条件の数をカウント
  const activeFilterCount = Object.values(filter).filter(v => v !== undefined && v !== '').length;

  const handleSearch = () => {
    onSearch(localFilter);
    onOpenChange(false);
  };

  const handleClear = () => {
    const emptyFilter: SearchFilter = {};
    setLocalFilter(emptyFilter);
    onSearch(emptyFilter);
    onOpenChange(false);
  };

  // パネルが開かれた時、現在のfilterをローカルstateに同期
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setLocalFilter(filter);
    }
    onOpenChange(isOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button 
          variant={activeFilterCount > 0 ? "default" : "outline"}
          data-testid="button-open-search"
        >
          <Search className="h-4 w-4 mr-2" />
          検索
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            詳細検索
          </SheetTitle>
          <SheetDescription>
            受発注データを詳細条件で絞り込みます
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* 営業窓口 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">営業窓口</label>
            <Select 
              value={localFilter.salesPerson || "all"} 
              onValueChange={(value) => setLocalFilter({
                ...localFilter,
                salesPerson: value === "all" ? undefined : value
              })}
            >
              <SelectTrigger data-testid="search-select-sales-person">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ての営業窓口</SelectItem>
                {salesPersons.map((person) => (
                  <SelectItem key={person} value={person}>
                    {person}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 計上科目 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">計上科目</label>
            <Select 
              value={localFilter.accountingItem || "all"} 
              onValueChange={(value) => setLocalFilter({
                ...localFilter,
                accountingItem: value === "all" ? undefined : value
              })}
            >
              <SelectTrigger data-testid="search-select-accounting-item">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ての計上科目</SelectItem>
                {sortAccountingItemsByOrder(accountingItems).map((item) => (
                  <SelectItem key={item.id} value={item.name}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 取引先 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">取引先</label>
            <Select 
              value={localFilter.customerId || "all"} 
              onValueChange={(value) => setLocalFilter({
                ...localFilter,
                customerId: value === "all" ? undefined : value
              })}
            >
              <SelectTrigger data-testid="search-select-customer">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ての取引先</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.code} - {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 突合状態 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">突合状態</label>
            <Select 
              value={localFilter.reconciliationStatus || "all"} 
              onValueChange={(value) => setLocalFilter({
                ...localFilter,
                reconciliationStatus: value === "all" ? undefined : (value as 'matched' | 'fuzzy' | 'unmatched')
              })}
            >
              <SelectTrigger data-testid="search-select-reconciliation-status">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ての状態</SelectItem>
                <SelectItem value="matched">突合済み</SelectItem>
                <SelectItem value="fuzzy">曖昧一致</SelectItem>
                <SelectItem value="unmatched">未突合</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 摘要文・備考のあいまい検索 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">摘要文・備考</label>
            <Input
              type="text"
              placeholder="検索キーワードを入力..."
              value={localFilter.searchText || ""}
              onChange={(e) => setLocalFilter({
                ...localFilter,
                searchText: e.target.value || undefined
              })}
              data-testid="search-input-text"
            />
            <p className="text-xs text-muted-foreground">
              摘要文または備考に含まれるキーワードで検索
            </p>
          </div>
        </div>

        {/* フッター: アクションボタン */}
        <div className="mt-8 flex gap-2">
          <Button 
            onClick={handleSearch}
            className="flex-1"
            data-testid="button-apply-search"
          >
            <Search className="h-4 w-4 mr-2" />
            検索
          </Button>
          <Button 
            variant="outline"
            onClick={handleClear}
            data-testid="button-clear-search"
          >
            <X className="h-4 w-4 mr-2" />
            クリア
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}


