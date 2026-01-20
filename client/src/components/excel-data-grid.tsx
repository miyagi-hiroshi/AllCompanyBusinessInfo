import { ArrowDown, ArrowUp, ArrowUpDown, Copy, Plus, Save, Search, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

import { type AutocompleteOption,AutocompleteSelect } from "./autocomplete-select";

export interface GridColumn {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "autocomplete" | "toggle" | "button";
  width?: number;
  required?: boolean;
  autocompleteOptions?: AutocompleteOption[];
  readonly?: boolean;
  className?: string;
  sortable?: boolean;
  onToggleChange?: (rowId: string, newValue: boolean) => void;
  onButtonClick?: (rowId: string, value: string | number | boolean | undefined) => void;
  getButtonLabel?: (value: string | number | boolean | undefined) => string;
  getButtonVariant?: (value: string | number | boolean | undefined) => "default" | "outline" | "secondary" | "ghost" | "link" | "destructive" | "success" | "warning";
}

export interface GridRow {
  id: string;
  _modified?: boolean;
  _error?: string;
  _readonly?: boolean;
  _selected?: boolean;
}

export type GridRowData = GridRow & Record<string, string | number | boolean | undefined>;

interface ExcelDataGridProps {
  columns: GridColumn[];
  rows: GridRowData[];
  onRowsChange: (rows: GridRowData[]) => void;
  onSave?: () => void;
  onSearch?: () => void;
  enableKeyboardShortcuts?: boolean;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
}

export function ExcelDataGrid({
  columns,
  rows,
  onRowsChange,
  onSave,
  onSearch,
  enableKeyboardShortcuts = true,
  pageSize = 50,
  onPageSizeChange,
}: ExcelDataGridProps) {
  const [activeCell, setActiveCell] = useState<{ rowIndex: number; colKey: string } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; colKey: string } | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(pageSize);
  const gridRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());
  const { toast } = useToast();

  // Sync selectedRows with _selected property
  useEffect(() => {
    const newSelectedRows = new Set<number>();
    rows.forEach((row, index) => {
      if (row._selected) {
        newSelectedRows.add(index);
      }
    });
    setSelectedRows(newSelectedRows);
  }, [rows]);

  // Focus on active cell when it changes
  useEffect(() => {
    if (activeCell && !editingCell) {
      const cellKey = `${activeCell.rowIndex}-${activeCell.colKey}`;
      const cellElement = cellRefs.current.get(cellKey);
      if (cellElement) {
        cellElement.focus();
      }
    }
  }, [activeCell, editingCell]);

  // Ctrl+Enter: Save
  useHotkeys(
    "ctrl+enter",
    (e) => {
      e.preventDefault();
      if (onSave) {
        onSave();
        toast({
          title: "保存しました",
          description: "変更が保存されました",
        });
      }
    },
    { enabled: enableKeyboardShortcuts }
  );

  // Ctrl+Shift+ArrowDown: Add row
  useHotkeys(
    "ctrl+shift+down",
    (e) => {
      e.preventDefault();
      handleAddRow();
    },
    { enabled: enableKeyboardShortcuts }
  );

  // Ctrl+Shift+Delete: Delete selected rows
  useHotkeys(
    "ctrl+shift+delete",
    (e) => {
      e.preventDefault();
      if (selectedRows.size > 0) {
        handleDeleteRows();
      }
    },
    { enabled: enableKeyboardShortcuts }
  );

  // Ctrl+Shift+D: Duplicate row
  useHotkeys(
    "ctrl+shift+d",
    (e) => {
      e.preventDefault();
      if (activeCell) {
        handleDuplicateRow(activeCell.rowIndex);
      }
    },
    { enabled: enableKeyboardShortcuts }
  );

  // Ctrl+F: Search
  useHotkeys(
    "ctrl+f",
    (e) => {
      e.preventDefault();
      if (onSearch) {
        onSearch();
      }
    },
    { enabled: enableKeyboardShortcuts }
  );

  const handleAddRow = () => {
    const newRow: GridRowData = {
      id: `temp-${Date.now()}`,
      _modified: true,
    };
    
    columns.forEach((col) => {
      if (col.type === "number") {
        newRow[col.key] = 0;
      } else if (col.type === "toggle") {
        newRow[col.key] = false;
      } else if (col.type === "button") {
        newRow[col.key] = "unmatched";
      } else {
        newRow[col.key] = "";
      }
    });

    // activeCellがある場合はその行の直下に挿入、ない場合は最下行に追加
    let newRows: GridRowData[];
    let insertedRowIndex: number;
    
    if (activeCell) {
      newRows = [...rows];
      insertedRowIndex = activeCell.rowIndex + 1;
      newRows.splice(insertedRowIndex, 0, newRow);
    } else {
      newRows = [...rows, newRow];
      insertedRowIndex = newRows.length - 1;
    }
    
    onRowsChange(newRows);
    
    // Focus on first cell of new row
    setTimeout(() => {
      setActiveCell({ rowIndex: insertedRowIndex, colKey: columns[0].key });
    }, 0);
  };

  const handleDeleteRows = () => {
    // 削除可能な行のみをフィルタリング（読み取り専用の行は削除しない）
    const deletableRows = Array.from(selectedRows).filter(index => !rows[index]._readonly);
    
    if (deletableRows.length === 0) {
      toast({
        title: "削除できません",
        description: "選択された行は突合済みのため削除できません",
        variant: "destructive",
      });
      return;
    }
    
    const newRows = rows.filter((_, index) => !deletableRows.includes(index));
    onRowsChange(newRows);
    setSelectedRows(new Set());
    setActiveCell(null);
    
    toast({
      title: "削除対象に設定しました",
      description: `${deletableRows.length}行を削除対象に設定しました。保存ボタン（Ctrl+Enter）で確定してください。`,
    });
  };

  const handleDuplicateRow = (rowIndex: number) => {
    const sourceRow = rows[rowIndex];
    const newRow: GridRowData = {
      ...sourceRow,
      id: `temp-${Date.now()}`,
      _modified: true,
    };
    
    const newRows = [...rows];
    newRows.splice(rowIndex + 1, 0, newRow);
    onRowsChange(newRows);
    
    toast({
      title: "行を複製しました",
      description: "直下に新しい行を追加しました",
    });
  };

  const handleCellChange = (rowIndex: number, colKey: string, value: string | number) => {
    const newRows = [...rows];
    newRows[rowIndex] = {
      ...newRows[rowIndex],
      [colKey]: value,
      _modified: true,
    };
    onRowsChange(newRows);
  };

  const handleHeaderClick = (columnKey: string) => {
    if (sortBy === columnKey) {
      // 同じカラムをクリック: 昇順 → 降順 → ソート解除
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else if (sortOrder === 'desc') {
        setSortBy(null);
        setSortOrder(null);
      }
    } else {
      // 新しいカラムをクリック: 昇順でソート
      setSortBy(columnKey);
      setSortOrder('asc');
    }
  };

  // ソート済みの行を取得
  const sortedRows = [...rows];
  if (sortBy && sortOrder) {
    sortedRows.sort((a, b) => {
      // プロジェクト列の場合はコードで並び替え
      let aValue: any;
      let bValue: any;
      
      if (sortBy === "projectId") {
        aValue = a.projectCode;
        bValue = b.projectCode;
      } else {
        aValue = a[sortBy];
        bValue = b[sortBy];
      }
      
      // null/undefined を末尾に
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      // 文字列比較（accountingPeriodは"YYYY-MM"形式なので文字列比較で正しくソート）
      const aStr = String(aValue);
      const bStr = String(bValue);
      
      if (sortOrder === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }

  // ページネーション計算
  const totalPages = Math.ceil(sortedRows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedRows = sortedRows.slice(startIndex, endIndex);

  // ページ切り替えハンドラ
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePageSizeChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);  // ページを1に戻す
    if (onPageSizeChange) {
      onPageSizeChange(size);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    rowIndex: number,
    colKey: string
  ) => {
    if (!activeCell) {return;}

    const colIndex = columns.findIndex((col) => col.key === colKey);

    switch (e.key) {
      case "Tab":
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+Tab: Previous cell
          if (colIndex > 0) {
            setActiveCell({ rowIndex, colKey: columns[colIndex - 1].key });
          } else if (rowIndex > 0) {
            setActiveCell({ rowIndex: rowIndex - 1, colKey: columns[columns.length - 1].key });
          }
        } else {
          // Tab: Next cell
          if (colIndex < columns.length - 1) {
            setActiveCell({ rowIndex, colKey: columns[colIndex + 1].key });
          } else if (rowIndex < rows.length - 1) {
            setActiveCell({ rowIndex: rowIndex + 1, colKey: columns[0].key });
          }
        }
        setEditingCell(null);
        break;

      case "Enter":
        e.preventDefault();
        if (editingCell) {
          // Confirm edit and move down
          setEditingCell(null);
          if (rowIndex < rows.length - 1) {
            setActiveCell({ rowIndex: rowIndex + 1, colKey });
          }
        } else {
          // Start editing only if row is not readonly
          const isRowReadonly = rows[rowIndex]._readonly || false;
          if (!isRowReadonly) {
            setEditingCell({ rowIndex, colKey });
          }
        }
        break;

      case "Escape":
        e.preventDefault();
        setEditingCell(null);
        break;

      case "ArrowUp":
        if (!editingCell) {
          e.preventDefault();
          if (rowIndex > 0) {
            setActiveCell({ rowIndex: rowIndex - 1, colKey });
          }
        }
        break;

      case "ArrowDown":
        if (!editingCell) {
          e.preventDefault();
          if (rowIndex < rows.length - 1) {
            setActiveCell({ rowIndex: rowIndex + 1, colKey });
          }
        }
        break;

      case "ArrowLeft":
        if (!editingCell && colIndex > 0) {
          e.preventDefault();
          setActiveCell({ rowIndex, colKey: columns[colIndex - 1].key });
        }
        break;

      case "ArrowRight":
        if (!editingCell && colIndex < columns.length - 1) {
          e.preventDefault();
          setActiveCell({ rowIndex, colKey: columns[colIndex + 1].key });
        }
        break;
    }
  };

  const renderCell = (row: GridRowData, rowIndex: number, column: GridColumn) => {
    const isActive = activeCell?.rowIndex === rowIndex && activeCell?.colKey === column.key;
    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.colKey === column.key;
    const value = row[column.key];
    const isRowReadonly = row._readonly || false;

    const cellClassName = cn(
      "border-r border-border p-2 text-sm",
      column.className,
      {
        "bg-grid-active ring-2 ring-primary ring-inset": isActive && !isEditing,
        "bg-background": !isActive,
        "border-l-4 border-l-warning": row._modified,
        "bg-grid-error": row._error,
      }
    );

    // Check for special column types that should render even when readonly
    if (column.type === "toggle") {
      const booleanValue = value === "true" || value === true;
      // Show toggle switch only if reconciliationStatus is not "matched"
      const showToggle = row.reconciliationStatus !== "matched";
      
      return (
        <td
          key={column.key}
          className={cn(cellClassName, "text-center")}
          ref={(el) => {
            const cellKey = `${rowIndex}-${column.key}`;
            if (el) {
              cellRefs.current.set(cellKey, el);
            } else {
              cellRefs.current.delete(cellKey);
            }
          }}
          onClick={() => setActiveCell({ rowIndex, colKey: column.key })}
          onKeyDown={(e) => handleKeyDown(e, rowIndex, column.key)}
          tabIndex={0}
          data-testid={`cell-${rowIndex}-${column.key}`}
        >
          {showToggle && (
            <div className="flex items-center justify-center">
              <Switch
                checked={booleanValue}
                onCheckedChange={(checked) => {
                  if (!isRowReadonly && column.onToggleChange) {
                    column.onToggleChange(row.id, checked);
                  }
                }}
                disabled={isRowReadonly}
              />
            </div>
          )}
        </td>
      );
    }

    if (column.type === "button" && (column.readonly || isRowReadonly)) {
      // Check if row is excluded - if so, show "突合不要" label instead of button
      const isExcluded = row.isExcluded === "true" || row.isExcluded === true;
      
      if (isExcluded) {
        return (
          <td
            key={column.key}
            className={cn(cellClassName, "text-center")}
            ref={(el) => {
              const cellKey = `${rowIndex}-${column.key}`;
              if (el) {
                cellRefs.current.set(cellKey, el);
              } else {
                cellRefs.current.delete(cellKey);
              }
            }}
            onClick={() => setActiveCell({ rowIndex, colKey: column.key })}
            onKeyDown={(e) => handleKeyDown(e, rowIndex, column.key)}
            tabIndex={0}
            data-testid={`cell-${rowIndex}-${column.key}`}
          >
            <div className="flex items-center justify-center">
              <span className="text-xs text-muted-foreground">突合不要</span>
            </div>
          </td>
        );
      }
      
      const buttonLabel = column.getButtonLabel ? column.getButtonLabel(value) : String(value || "");
      const rawVariant = column.getButtonVariant ? column.getButtonVariant(value) : "outline";
      
      // Map custom variants to standard variants + custom classes
      let buttonVariant: "default" | "outline" | "secondary" | "ghost" | "destructive" = "outline";
      let customClasses = "";
      
      if (rawVariant === "success") {
        buttonVariant = "outline";
        customClasses = "bg-success/20 text-success border-success/30 hover:bg-success/30";
      } else if (rawVariant === "warning") {
        buttonVariant = "outline";
        customClasses = "bg-warning/20 text-warning border-warning/30 hover:bg-warning/30";
      } else if (rawVariant === "link") {
        buttonVariant = "ghost";
      } else {
        buttonVariant = rawVariant;
      }
      
      return (
        <td
          key={column.key}
          className={cn(cellClassName, "text-center")}
          ref={(el) => {
            const cellKey = `${rowIndex}-${column.key}`;
            if (el) {
              cellRefs.current.set(cellKey, el);
            } else {
              cellRefs.current.delete(cellKey);
            }
          }}
          onClick={() => setActiveCell({ rowIndex, colKey: column.key })}
          onKeyDown={(e) => handleKeyDown(e, rowIndex, column.key)}
          tabIndex={0}
          data-testid={`cell-${rowIndex}-${column.key}`}
        >
          <div className="flex items-center justify-center">
            <Button
              variant={buttonVariant}
              size="sm"
              onClick={() => {
                if (column.onButtonClick) {
                  column.onButtonClick(row.id, value);
                }
              }}
              className={cn("h-7 text-xs", customClasses)}
            >
              {buttonLabel}
            </Button>
          </div>
        </td>
      );
    }

    if (column.readonly || isRowReadonly) {
      // 読み取り専用セルの表示値を決定
      let displayValue = value;
      
      // autocompleteの場合は、関連する名前フィールドから表示値を取得
      if (column.type === "autocomplete") {
        if (column.key.includes("customer") && row.customerName) {
          displayValue = row.customerName;
        } else if (column.key === "projectId") {
          // プロジェクトの場合は「コード プロジェクト名」の形式で表示
          if (row.projectCode && row.projectName) {
            displayValue = `${row.projectCode} ${row.projectName}`;
          } else if (row.projectCode) {
            displayValue = row.projectCode;
          } else if (row.projectName) {
            displayValue = row.projectName;
          }
        } else if (column.key.includes("project") && row.projectName) {
          displayValue = row.projectName;
        } else if (column.key.includes("item") && row.itemName) {
          displayValue = row.itemName;
        } else if (column.autocompleteOptions) {
          // フォールバック: optionsから検索
          const option = column.autocompleteOptions.find((opt) => opt.value === value);
          displayValue = option?.label || value;
        }
      }
      
      // 数値型（金額）の場合は、カンマ区切りで小数点以下なしにフォーマット
      if (column.type === "number" && value != null && value !== "") {
        const numValue = typeof value === "number" ? value : parseFloat(String(value));
        if (!isNaN(numValue)) {
          displayValue = Math.floor(numValue).toLocaleString("ja-JP");
        }
      }
      
      return (
        <td
          key={column.key}
          className={cn(
            cellClassName, 
            "bg-muted/50 text-muted-foreground",
            column.type === "number" && "text-right"
          )}
          ref={(el) => {
            const cellKey = `${rowIndex}-${column.key}`;
            if (el) {
              cellRefs.current.set(cellKey, el);
            } else {
              cellRefs.current.delete(cellKey);
            }
          }}
          onClick={() => setActiveCell({ rowIndex, colKey: column.key })}
          onKeyDown={(e) => handleKeyDown(e, rowIndex, column.key)}
          tabIndex={0}
          data-testid={`cell-${rowIndex}-${column.key}`}
        >
          {displayValue}
        </td>
      );
    }

    if (column.type === "button") {
      // Check if row is excluded - if so, show "突合不要" label instead of button
      const isExcluded = row.isExcluded === "true" || row.isExcluded === true;
      
      if (isExcluded) {
        return (
          <td
            key={column.key}
            className={cn(cellClassName, "text-center")}
            ref={(el) => {
              const cellKey = `${rowIndex}-${column.key}`;
              if (el) {
                cellRefs.current.set(cellKey, el);
              } else {
                cellRefs.current.delete(cellKey);
              }
            }}
            onClick={() => setActiveCell({ rowIndex, colKey: column.key })}
            onKeyDown={(e) => handleKeyDown(e, rowIndex, column.key)}
            tabIndex={0}
            data-testid={`cell-${rowIndex}-${column.key}`}
          >
            <div className="flex items-center justify-center">
              <span className="text-xs text-muted-foreground">突合不要</span>
            </div>
          </td>
        );
      }
      
      const buttonLabel = column.getButtonLabel ? column.getButtonLabel(value) : String(value || "");
      const rawVariant = column.getButtonVariant ? column.getButtonVariant(value) : "outline";
      
      // Map custom variants to standard variants + custom classes
      let buttonVariant: "default" | "outline" | "secondary" | "ghost" | "destructive" = "outline";
      let customClasses = "";
      
      if (rawVariant === "success") {
        buttonVariant = "outline";
        customClasses = "bg-success/20 text-success border-success/30 hover:bg-success/30";
      } else if (rawVariant === "warning") {
        buttonVariant = "outline";
        customClasses = "bg-warning/20 text-warning border-warning/30 hover:bg-warning/30";
      } else if (rawVariant === "link") {
        buttonVariant = "ghost";
      } else {
        buttonVariant = rawVariant;
      }
      
      return (
        <td
          key={column.key}
          className={cn(cellClassName, "text-center")}
          ref={(el) => {
            const cellKey = `${rowIndex}-${column.key}`;
            if (el) {
              cellRefs.current.set(cellKey, el);
            } else {
              cellRefs.current.delete(cellKey);
            }
          }}
          onClick={() => setActiveCell({ rowIndex, colKey: column.key })}
          onKeyDown={(e) => handleKeyDown(e, rowIndex, column.key)}
          tabIndex={0}
          data-testid={`cell-${rowIndex}-${column.key}`}
        >
          <div className="flex items-center justify-center">
            <Button
              variant={buttonVariant}
              size="sm"
              onClick={() => {
                if (!isRowReadonly && column.onButtonClick) {
                  column.onButtonClick(row.id, value);
                }
              }}
              disabled={isRowReadonly}
              className={cn("h-7 text-xs", customClasses)}
            >
              {buttonLabel}
            </Button>
          </div>
        </td>
      );
    }

    if (column.type === "autocomplete" && column.autocompleteOptions) {
      return (
        <td
          key={column.key}
          className={cellClassName}
          ref={(el) => {
            const cellKey = `${rowIndex}-${column.key}`;
            if (el) {
              cellRefs.current.set(cellKey, el);
            } else {
              cellRefs.current.delete(cellKey);
            }
          }}
          onClick={() => {
            setActiveCell({ rowIndex, colKey: column.key });
          }}
          onDoubleClick={() => {
            if (!isRowReadonly) {
              setEditingCell({ rowIndex, colKey: column.key });
            }
          }}
          onKeyDown={(e) => handleKeyDown(e, rowIndex, column.key)}
          tabIndex={0}
          data-testid={`cell-${rowIndex}-${column.key}`}
        >
          {isEditing ? (
            <AutocompleteSelect
              value={value as string | undefined}
              onChange={(val, option) => {
                const newRows = [...rows];
                const updates: Record<string, string | number | boolean | undefined> = {
                  [column.key]: val,
                  _modified: true,
                };
                
                // Also update related fields if needed
                // 空の場合はundefinedにする（空文字を避ける）
                if (column.key.includes("customer")) {
                  updates.customerCode = option.code || undefined;
                  updates.customerName = option.label || undefined;
                } else if (column.key === "projectId") {
                  updates.projectCode = option.code || undefined;
                  updates.projectName = option.label || undefined;
                } else if (column.key.includes("project")) {
                  updates.projectCode = option.code || undefined;
                  updates.projectName = option.label || undefined;
                } else if (column.key.includes("item")) {
                  updates.itemCode = option.code || undefined;
                  updates.itemName = option.label || undefined;
                }
                
                newRows[rowIndex] = {
                  ...newRows[rowIndex],
                  ...updates,
                };
                onRowsChange(newRows);
                
                // Exit editing mode after selection
                setEditingCell(null);
              }}
              options={column.autocompleteOptions}
              placeholder={column.label}
              className="h-8"
            />
          ) : (
            <div className="truncate">
              {column.key === "projectId" 
                ? (row.projectCode && row.projectName 
                    ? `${row.projectCode} ${row.projectName}`
                    : row.projectCode || row.projectName || column.autocompleteOptions.find((opt) => opt.value === value)?.label || value)
                : column.autocompleteOptions.find((opt) => opt.value === value)?.label || value}
            </div>
          )}
        </td>
      );
    }

    return (
      <td
        key={column.key}
        className={cellClassName}
        ref={(el) => {
          const cellKey = `${rowIndex}-${column.key}`;
          if (el) {
            cellRefs.current.set(cellKey, el);
          } else {
            cellRefs.current.delete(cellKey);
          }
        }}
        onClick={() => setActiveCell({ rowIndex, colKey: column.key })}
        onDoubleClick={() => {
          if (!isRowReadonly) {
            setEditingCell({ rowIndex, colKey: column.key });
          }
        }}
        onKeyDown={(e) => handleKeyDown(e, rowIndex, column.key)}
        tabIndex={0}
        data-testid={`cell-${rowIndex}-${column.key}`}
      >
        {isEditing ? (
          <Input
            type={column.type === "number" ? "number" : column.type === "date" ? "date" : "text"}
            step={column.type === "number" ? "1" : undefined}
            value={typeof value === "boolean" ? String(value) : (value || "")}
            onChange={(e) => handleCellChange(rowIndex, column.key, e.target.value)}
            onBlur={() => setEditingCell(null)}
            autoFocus
            className={cn("h-8 border-0 p-1 focus-visible:ring-0", column.type === "number" && "text-right")}
            data-testid={`input-${rowIndex}-${column.key}`}
          />
        ) : (
          <div className={cn("truncate", column.type === "number" && "font-mono text-right")}>
            {column.type === "number" && value != null && value !== "" 
              ? (() => {
                  const numValue = typeof value === "number" ? value : parseFloat(String(value));
                  return !isNaN(numValue) ? Math.floor(numValue).toLocaleString("ja-JP") : value;
                })()
              : value
            }
          </div>
        )}
      </td>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-[600px]">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleAddRow}
            data-testid="button-add-row"
          >
            <Plus className="h-4 w-4 mr-1" />
            行追加
            <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">Ctrl</span>
              <span className="text-xs">⇧</span>
              <span className="text-xs">↓</span>
            </kbd>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteRows}
            disabled={selectedRows.size === 0}
            data-testid="button-delete-rows"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            削除
            <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">Ctrl</span>
              <span className="text-xs">⇧</span>
              <span className="text-xs">Del</span>
            </kbd>
          </Button>
          
          {activeCell && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDuplicateRow(activeCell.rowIndex)}
              data-testid="button-duplicate-row"
            >
              <Copy className="h-4 w-4 mr-1" />
              複製
              <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">Ctrl</span>
                <span className="text-xs">⇧</span>
                <span className="text-xs">D</span>
              </kbd>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onSearch && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSearch}
              data-testid="button-search"
            >
              <Search className="h-4 w-4 mr-1" />
              検索
              <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">Ctrl</span>
                <span className="text-xs">F</span>
              </kbd>
            </Button>
          )}
          
          {onSave && (
            <Button
              variant="default"
              size="sm"
              onClick={onSave}
              data-testid="button-save"
            >
              <Save className="h-4 w-4 mr-1" />
              保存
              <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-primary-border px-1.5 font-mono text-[10px] font-medium text-primary-foreground opacity-100">
                <span className="text-xs">Ctrl</span>
                <span className="text-xs">↵</span>
              </kbd>
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto min-h-0 pb-16" ref={gridRef}>
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted">
              <th className="border-r border-border p-2 text-left text-sm font-medium w-12">
                #
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "border-r border-border p-2 text-left text-sm font-medium",
                    column.sortable && "cursor-pointer hover:bg-muted-foreground/10 select-none"
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleHeaderClick(column.key)}
                >
                  <div className="flex items-center gap-1">
                    <span>
                      {column.label}
                      {column.required && <span className="text-destructive ml-1">*</span>}
                    </span>
                    {column.sortable && (
                      <span className="ml-auto">
                        {sortBy === column.key ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-50" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((row, displayIndex) => {
              const actualRowIndex = startIndex + displayIndex;  // 実際の行インデックス
              return (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-border",
                  selectedRows.has(actualRowIndex) && "bg-primary/10"
                )}
                data-testid={`row-${actualRowIndex}`}
              >
                <td className="border-r border-border p-2 text-sm text-muted-foreground text-center">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(actualRowIndex)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedRows);
                      if (e.target.checked) {
                        newSelected.add(actualRowIndex);
                      } else {
                        newSelected.delete(actualRowIndex);
                      }
                      setSelectedRows(newSelected);
                      
                      // 行データの_selectedも更新
                      const updatedRows = rows.map((r, idx) => {
                        if (idx === actualRowIndex) {
                          return { ...r, _selected: e.target.checked };
                        }
                        return r;
                      });
                      onRowsChange(updatedRows);
                    }}
                    data-testid={`checkbox-row-${actualRowIndex}`}
                  />
                </td>
                {columns.map((column) => renderCell(row, actualRowIndex, column))}
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {/* Status Bar - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 md:left-[var(--sidebar-width)] right-0 z-50 flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground backdrop-blur-sm transition-[left] duration-200 ease-linear group-data-[collapsible=icon]:md:left-0">
        <div className="flex items-center gap-4">
          <span>総行数: {sortedRows.length}</span>
          <span>変更済: {sortedRows.filter((r) => r._modified).length}</span>
          {selectedRows.size > 0 && <span>選択: {selectedRows.size}</span>}
        </div>
        
        {/* ページネーション */}
        <div className="flex items-center gap-3">
          {/* 表示件数選択 */}
          <div className="flex items-center gap-2">
            <span>表示件数:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="h-7 px-2 text-xs border rounded bg-background"
            >
              <option value={20}>20件</option>
              <option value={50}>50件</option>
              <option value={100}>100件</option>
            </select>
          </div>
          
          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-7 px-2"
              >
                前へ
              </Button>
              
              {/* ページ番号 */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  // 表示するページ番号を計算（最大5ページ表示）
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      size="sm"
                      variant={currentPage === pageNum ? "default" : "outline"}
                      onClick={() => handlePageChange(pageNum)}
                      className="h-7 w-7 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-7 px-2"
              >
                次へ
              </Button>
              
              <span className="ml-2">{currentPage} / {totalPages}ページ</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs">Tab: 次のセル</span>
          <span className="text-xs">Enter: 編集/確定</span>
          <span className="text-xs">Esc: キャンセル</span>
        </div>
      </div>
    </div>
  );
}
