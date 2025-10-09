import { Keyboard } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  { keys: ["Tab"], description: "次のセルへ移動", category: "ナビゲーション" },
  { keys: ["Shift", "Tab"], description: "前のセルへ移動", category: "ナビゲーション" },
  { keys: ["Enter"], description: "編集開始 / 確定して下へ", category: "ナビゲーション" },
  { keys: ["Esc"], description: "編集キャンセル", category: "ナビゲーション" },
  { keys: ["↑", "↓", "←", "→"], description: "セル移動", category: "ナビゲーション" },
  
  { keys: ["Ctrl", "Enter"], description: "一括保存", category: "データ操作" },
  { keys: ["Ctrl", "Shift", "↓"], description: "行追加", category: "データ操作" },
  { keys: ["Ctrl", "Shift", "D"], description: "行複製", category: "データ操作" },
  { keys: ["Ctrl", "F"], description: "検索", category: "データ操作" },
  
  { keys: ["Alt", "0"], description: "列レイアウト初期化", category: "表示" },
];

export function KeyboardShortcutsPanel() {
  const [open, setOpen] = useState(false);

  const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-shortcuts">
          <Keyboard className="h-5 w-5" />
          <span className="sr-only">キーボードショートカット</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            キーボードショートカット
          </SheetTitle>
          <SheetDescription>
            効率的な入力操作のためのショートカット一覧
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {categories.map((category) => (
            <div key={category} className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts
                  .filter((s) => s.category === category)
                  .map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                      data-testid={`shortcut-${shortcut.keys.join("-")}`}
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, i) => (
                          <span key={i} className="flex items-center gap-1">
                            <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-xs font-medium text-muted-foreground">
                              {key}
                            </kbd>
                            {i < shortcut.keys.length - 1 && (
                              <span className="text-muted-foreground text-xs">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground">
            💡 ヒント: Excel同様の操作感でデータ入力が可能です。
            セルをダブルクリックして編集を開始することもできます。
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
