import { Upload } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useImportGLEntriesCSV } from "@/hooks/useGLEntries";
import { useToast } from "@/hooks/useToast";

export function GLCSVImportDialog() {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const importCSV = useImportGLEntriesCSV();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImport = () => {
    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: "ファイル未選択",
        description: "CSVファイルを選択してください",
      });
      return;
    }

    importCSV.mutate(selectedFile, {
      onSuccess: (data) => {
        toast({
          title: "CSV取込完了",
          description: `${data.data.importedRows}件のデータを取り込みました（スキップ: ${data.data.skippedRows}件）`,
        });
        setOpen(false);
        setSelectedFile(null);
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "CSV取込エラー",
          description: "CSVファイルの取込中にエラーが発生しました",
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          GL CSV取込
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>総勘定元帳CSV取込</DialogTitle>
          <DialogDescription>
            総勘定元帳のCSVファイルを選択して取り込みます。
            対象科目のみが自動的にフィルタリングされます。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">CSVファイル</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                選択: {selectedFile.name}
              </p>
            )}
          </div>
          <div className="bg-muted p-3 rounded-md text-sm">
            <p className="font-medium mb-2">対象科目コード：</p>
            <p className="text-muted-foreground">
              511 保守売上、512 ソフト売上、513 商品売上、514 消耗品売上、
              541 仕入高、515 その他売上、727 通信費、737 消耗品費、
              740 支払保守料、745 外注加工費
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleImport} disabled={!selectedFile || importCSV.isPending}>
            {importCSV.isPending ? "取込中..." : "取込実行"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

