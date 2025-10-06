import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Upload, Pencil, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Customer, InsertCustomer } from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";

export default function CustomersPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<InsertCustomer>({ code: "", name: "" });
  const [csvText, setCsvText] = useState("");

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCustomer) => {
      const res = await apiRequest("POST", "/api/customers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "成功",
        description: "取引先を作成しました",
      });
      setIsCreateOpen(false);
      setFormData({ code: "", name: "" });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "取引先の作成に失敗しました",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertCustomer> }) => {
      const res = await apiRequest("PUT", `/api/customers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "成功",
        description: "取引先を更新しました",
      });
      setIsEditOpen(false);
      setSelectedCustomer(null);
      setFormData({ code: "", name: "" });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "取引先の更新に失敗しました",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "成功",
        description: "取引先を削除しました",
      });
      setIsDeleteOpen(false);
      setSelectedCustomer(null);
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "取引先の削除に失敗しました",
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (data: InsertCustomer[]) => {
      const res = await apiRequest("POST", "/api/customers/import", { data });
      return res.json() as Promise<{ success: boolean; count: number; customers: Customer[] }>;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "成功",
        description: `${response.count}件の取引先をインポートしました`,
      });
      setIsImportOpen(false);
      setCsvText("");
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "CSVインポートに失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleEdit = () => {
    if (!selectedCustomer) return;
    updateMutation.mutate({
      id: selectedCustomer.id,
      data: formData,
    });
  };

  const handleDelete = () => {
    if (!selectedCustomer) return;
    deleteMutation.mutate(selectedCustomer.id);
  };

  const handleImport = () => {
    try {
      const lines = csvText.trim().split("\n");
      const data: InsertCustomer[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const [code, name] = line.split(",").map((s) => s.trim());
        if (code && name) {
          data.push({ code, name });
        }
      }

      if (data.length === 0) {
        toast({
          title: "エラー",
          description: "有効なデータが見つかりませんでした",
          variant: "destructive",
        });
        return;
      }

      importMutation.mutate(data);
    } catch (error) {
      toast({
        title: "エラー",
        description: "CSVの解析に失敗しました",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({ code: customer.code, name: customer.name });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteOpen(true);
  };

  const downloadTemplate = () => {
    const template = "code,name\nC999,サンプル取引先\n";
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "customers_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">取引先マスタ</h1>
          <p className="text-muted-foreground mt-1">取引先情報の管理</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsImportOpen(true)}
            data-testid="button-import-csv"
          >
            <Upload className="h-4 w-4 mr-2" />
            CSVインポート
          </Button>
          <Button
            onClick={() => {
              setFormData({ code: "", name: "" });
              setIsCreateOpen(true);
            }}
            data-testid="button-create-customer"
          >
            <Plus className="h-4 w-4 mr-2" />
            新規作成
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>取引先一覧</CardTitle>
          <CardDescription>
            {customers.length}件の取引先が登録されています
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              読み込み中...
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              取引先が登録されていません
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>取引先コード</TableHead>
                  <TableHead>取引先名</TableHead>
                  <TableHead>作成日時</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                    <TableCell className="font-mono" data-testid={`text-code-${customer.id}`}>
                      {customer.code}
                    </TableCell>
                    <TableCell data-testid={`text-name-${customer.id}`}>
                      {customer.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(customer.createdAt).toLocaleString("ja-JP")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(customer)}
                          data-testid={`button-edit-${customer.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDeleteDialog(customer)}
                          data-testid={`button-delete-${customer.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent data-testid="dialog-create-customer">
          <DialogHeader>
            <DialogTitle>新規取引先作成</DialogTitle>
            <DialogDescription>
              新しい取引先情報を入力してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">取引先コード</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="例: C001"
                data-testid="input-code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">取引先名</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例: 株式会社サンプル"
                data-testid="input-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              data-testid="button-cancel-create"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.code || !formData.name || createMutation.isPending}
              data-testid="button-submit-create"
            >
              {createMutation.isPending ? "作成中..." : "作成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent data-testid="dialog-edit-customer">
          <DialogHeader>
            <DialogTitle>取引先編集</DialogTitle>
            <DialogDescription>
              取引先情報を編集してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-code">取引先コード</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                data-testid="input-edit-code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">取引先名</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-edit-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              data-testid="button-cancel-edit"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!formData.code || !formData.name || updateMutation.isPending}
              data-testid="button-submit-edit"
            >
              {updateMutation.isPending ? "更新中..." : "更新"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent data-testid="dialog-delete-customer">
          <AlertDialogHeader>
            <AlertDialogTitle>取引先を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。取引先「{selectedCustomer?.name}」を削除してもよろしいですか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-import-csv">
          <DialogHeader>
            <DialogTitle>CSVインポート</DialogTitle>
            <DialogDescription>
              CSV形式で取引先データを一括インポートします
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>CSVデータ</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={downloadTemplate}
                  data-testid="button-download-template"
                >
                  <Download className="h-4 w-4 mr-2" />
                  テンプレートDL
                </Button>
              </div>
              <Textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="code,name&#10;C001,株式会社A商事&#10;C002,B物産株式会社"
                className="font-mono text-sm min-h-[300px]"
                data-testid="textarea-csv"
              />
              <p className="text-sm text-muted-foreground">
                ※ 1行目はヘッダー行（code,name）、2行目以降がデータ行です
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsImportOpen(false)}
              data-testid="button-cancel-import"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleImport}
              disabled={!csvText.trim() || importMutation.isPending}
              data-testid="button-submit-import"
            >
              {importMutation.isPending ? "インポート中..." : "インポート"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
