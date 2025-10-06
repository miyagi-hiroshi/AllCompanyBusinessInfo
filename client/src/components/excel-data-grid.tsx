import { useState, useRef, useEffect, useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Copy, Save, Search } from "lucide-react";
import { AutocompleteSelect, type AutocompleteOption } from "./autocomplete-select";
import { useToast } from "@/hooks/use-toast";

export interface GridColumn {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "autocomplete";
  width?: number;
  required?: boolean;
  autocompleteOptions?: AutocompleteOption[];
  readonly?: boolean;
  className?: string;
}

export interface GridRow {
  id: string;
  [key: string]: any;
  _modified?: boolean;
  _error?: string;
}

interface ExcelDataGridProps {
  columns: GridColumn[];
  rows: GridRow[];
  onRowsChange: (rows: GridRow[]) => void;
  onSave?: () => void;
  onSearch?: () => void;
  enableKeyboardShortcuts?: boolean;
}

export function ExcelDataGrid({
  columns,
  rows,
  onRowsChange,
  onSave,
  onSearch,
  enableKeyboardShortcuts = true,
}: ExcelDataGridProps) {
  const [activeCell, setActiveCell] = useState<{ rowIndex: number; colKey: string } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; colKey: string } | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const gridRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
    const newRow: GridRow = {
      id: `temp-${Date.now()}`,
      _modified: true,
    };
    
    columns.forEach((col) => {
      if (col.type === "number") {
        newRow[col.key] = 0;
      } else {
        newRow[col.key] = "";
      }
    });

    const newRows = [...rows, newRow];
    onRowsChange(newRows);
    
    // Focus on first cell of new row
    setTimeout(() => {
      setActiveCell({ rowIndex: newRows.length - 1, colKey: columns[0].key });
    }, 0);
  };

  const handleDeleteRows = () => {
    const newRows = rows.filter((_, index) => !selectedRows.has(index));
    onRowsChange(newRows);
    setSelectedRows(new Set());
    setActiveCell(null);
    
    toast({
      title: "行を削除しました",
      description: `${selectedRows.size}行を削除しました`,
    });
  };

  const handleDuplicateRow = (rowIndex: number) => {
    const sourceRow = rows[rowIndex];
    const newRow: GridRow = {
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

  const handleCellChange = (rowIndex: number, colKey: string, value: any) => {
    const newRows = [...rows];
    newRows[rowIndex] = {
      ...newRows[rowIndex],
      [colKey]: value,
      _modified: true,
    };
    onRowsChange(newRows);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    rowIndex: number,
    colKey: string
  ) => {
    if (!activeCell) return;

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
          // Start editing
          setEditingCell({ rowIndex, colKey });
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

  const renderCell = (row: GridRow, rowIndex: number, column: GridColumn) => {
    const isActive = activeCell?.rowIndex === rowIndex && activeCell?.colKey === column.key;
    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.colKey === column.key;
    const value = row[column.key];

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

    if (column.readonly) {
      return (
        <td
          key={column.key}
          className={cn(cellClassName, "bg-muted/50 text-muted-foreground")}
          onClick={() => setActiveCell({ rowIndex, colKey: column.key })}
          data-testid={`cell-${rowIndex}-${column.key}`}
        >
          {value}
        </td>
      );
    }

    if (column.type === "autocomplete" && column.autocompleteOptions) {
      return (
        <td
          key={column.key}
          className={cellClassName}
          onClick={() => {
            setActiveCell({ rowIndex, colKey: column.key });
          }}
          onDoubleClick={() => setEditingCell({ rowIndex, colKey: column.key })}
          onKeyDown={(e) => handleKeyDown(e, rowIndex, column.key)}
          tabIndex={0}
          data-testid={`cell-${rowIndex}-${column.key}`}
        >
          {isEditing ? (
            <AutocompleteSelect
              value={value}
              onChange={(val, option) => {
                const newRows = [...rows];
                const updates: any = {
                  [column.key]: val,
                  _modified: true,
                };
                
                // Also update related fields if needed
                if (column.key.includes("customer")) {
                  updates.customerCode = option.code || "";
                  updates.customerName = option.label || "";
                } else if (column.key.includes("project")) {
                  updates.projectCode = option.code || "";
                  updates.projectName = option.label || "";
                } else if (column.key.includes("item")) {
                  updates.itemCode = option.code || "";
                  updates.itemName = option.label || "";
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
              {column.autocompleteOptions.find((opt) => opt.value === value)?.label || value}
            </div>
          )}
        </td>
      );
    }

    return (
      <td
        key={column.key}
        className={cellClassName}
        onClick={() => setActiveCell({ rowIndex, colKey: column.key })}
        onDoubleClick={() => setEditingCell({ rowIndex, colKey: column.key })}
        onKeyDown={(e) => handleKeyDown(e, rowIndex, column.key)}
        tabIndex={0}
        data-testid={`cell-${rowIndex}-${column.key}`}
      >
        {isEditing ? (
          <Input
            type={column.type === "number" ? "number" : column.type === "date" ? "date" : "text"}
            value={value || ""}
            onChange={(e) => handleCellChange(rowIndex, column.key, e.target.value)}
            onBlur={() => setEditingCell(null)}
            autoFocus
            className="h-8 border-0 p-1 focus-visible:ring-0"
            data-testid={`input-${rowIndex}-${column.key}`}
          />
        ) : (
          <div className={cn("truncate", column.type === "number" && "font-mono text-right")}>
            {value}
          </div>
        )}
      </td>
    );
  };

  return (
    <div className="flex flex-col h-full">
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
      <div className="flex-1 overflow-auto" ref={gridRef}>
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted">
              <th className="border-r border-border p-2 text-left text-sm font-medium w-12">
                #
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="border-r border-border p-2 text-left text-sm font-medium"
                  style={{ width: column.width }}
                >
                  {column.label}
                  {column.required && <span className="text-destructive ml-1">*</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-border",
                  selectedRows.has(rowIndex) && "bg-primary/10"
                )}
                data-testid={`row-${rowIndex}`}
              >
                <td className="border-r border-border p-2 text-sm text-muted-foreground text-center">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(rowIndex)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedRows);
                      if (e.target.checked) {
                        newSelected.add(rowIndex);
                      } else {
                        newSelected.delete(rowIndex);
                      }
                      setSelectedRows(newSelected);
                    }}
                    data-testid={`checkbox-row-${rowIndex}`}
                  />
                </td>
                {columns.map((column) => renderCell(row, rowIndex, column))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>総行数: {rows.length}</span>
          <span>変更済: {rows.filter((r) => r._modified).length}</span>
          {selectedRows.size > 0 && <span>選択: {selectedRows.size}</span>}
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
