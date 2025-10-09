import type { Customer,NewProject, Project } from "@shared/schema";
import { useMutation,useQuery } from "@tanstack/react-query";
import { Copy, Edit, Loader2,Plus, Trash2 } from "lucide-react";
import { useState } from "react";

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
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEmployees } from "@/hooks/useMasters";
import { useToast } from "@/hooks/useToast";
import { apiRequest,queryClient } from "@/lib/queryClient";

const SERVICE_TYPES = [
  "インテグレーション",
  "エンジニアリング",
  "ソフトウェアマネージド",
  "リセール"
] as const;

const ANALYSIS_TYPES = ["生産性", "粗利"] as const;

type ServiceType = typeof SERVICE_TYPES[number];
type AnalysisType = typeof ANALYSIS_TYPES[number];

const FISCAL_YEARS = [2023, 2024, 2025, 2026];

export default function ProjectsPage() {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Form states
  const [formData, setFormData] = useState<Partial<NewProject>>({
    code: "",
    name: "",
    fiscalYear: selectedYear,
    customerId: "",
    customerName: "",
    salesPerson: "",
    serviceType: "インテグレーション",
    analysisType: "生産性",
  });

  // Fetch projects
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects", selectedYear],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/projects?fiscalYear=${selectedYear}`, undefined);
      const result = await response.json();
      // APIレスポンス: { success: true, data: { items: [...], total, page, limit } }
      return result.data?.items || [];
    },
  });

  // Fetch customers for dropdown
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/customers", undefined);
      const result = await response.json();
      // APIレスポンス: { success: true, data: { items: [...], total, page, limit } }
      return result.data?.items || [];
    },
  });

  // Fetch employees for dropdown
  const { data: employees = [], isLoading: isLoadingEmployees } = useEmployees();
  
  // デバッグログ
  console.log('👥 従業員データ:', {
    count: employees.length,
    isLoading: isLoadingEmployees,
    employees: employees
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: NewProject) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "プロジェクト作成完了",
        description: "新しいプロジェクトが作成されました",
      });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "プロジェクトの作成に失敗しました",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NewProject> }) => {
      const res = await apiRequest("PUT", `/api/projects/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "更新完了",
        description: "プロジェクトが更新されました",
      });
      setEditDialogOpen(false);
      setSelectedProject(null);
      resetForm();
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "プロジェクトの更新に失敗しました",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/projects/${id}`, undefined);
      return res.ok;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "削除完了",
        description: "プロジェクトが削除されました",
      });
      setDeleteDialogOpen(false);
      setSelectedProject(null);
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "プロジェクトの削除に失敗しました",
        variant: "destructive",
      });
    },
  });

  // Copy from previous year mutation
  const copyMutation = useMutation({
    mutationFn: async (targetYear: number) => {
      const res = await apiRequest("POST", "/api/projects/copy-from-previous-year", { targetYear });
      return res.json() as Promise<{ success: boolean; count: number; projects: Project[] }>;
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "コピー完了",
        description: `${result.count}件のプロジェクトをコピーしました`,
      });
      setCopyDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "前年度からのコピーに失敗しました",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      fiscalYear: selectedYear,
      customerId: "",
      customerName: "",
      salesPerson: "",
      serviceType: "インテグレーション",
      analysisType: "生産性",
    });
  };

  const handleCreate = () => {
    if (
      !formData.code ||
      !formData.name ||
      !formData.customerId ||
      !formData.customerName ||
      !formData.salesPerson ||
      !formData.serviceType ||
      !formData.analysisType
    ) {
      toast({
        title: "入力エラー",
        description: "すべての項目を入力してください",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData as NewProject);
  };

  const handleEdit = () => {
    if (!selectedProject) {return;}
    if (
      !formData.code ||
      !formData.name ||
      !formData.customerId ||
      !formData.customerName ||
      !formData.salesPerson ||
      !formData.serviceType ||
      !formData.analysisType
    ) {
      toast({
        title: "入力エラー",
        description: "すべての項目を入力してください",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({
      id: selectedProject.id,
      data: formData,
    });
  };

  const handleDelete = () => {
    if (selectedProject) {
      deleteMutation.mutate(selectedProject.id);
    }
  };

  const handleCopyFromPreviousYear = () => {
    copyMutation.mutate(selectedYear);
  };

  const openEditDialog = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      code: project.code,
      name: project.name,
      fiscalYear: project.fiscalYear,
      customerId: project.customerId,
      customerName: project.customerName,
      salesPerson: project.salesPerson,
      serviceType: project.serviceType as ServiceType,
      analysisType: project.analysisType as AnalysisType,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (project: Project) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    setFormData({
      ...formData,
      customerId,
      customerName: customer?.name || "",
    });
  };

  return (
    <div className="h-full p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">
          年度別プロジェクトマスタ
        </h1>
        <p className="text-muted-foreground mt-1">
          年度ごとのプロジェクト情報を管理します
        </p>
      </div>

      {/* Filter and Actions */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Label htmlFor="fiscal-year-filter">年度:</Label>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger
              id="fiscal-year-filter"
              className="w-[150px]"
              data-testid="select-fiscal-year"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FISCAL_YEARS.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}年度
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        <Button
          onClick={() => setCopyDialogOpen(true)}
          variant="outline"
          data-testid="button-copy-previous-year"
        >
          <Copy className="w-4 h-4 mr-2" />
          前年度からコピー
        </Button>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm();
                setFormData((prev: Partial<NewProject>) => ({ ...prev, fiscalYear: selectedYear }));
              }}
              data-testid="button-create-project"
            >
              <Plus className="w-4 h-4 mr-2" />
              新規作成
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>プロジェクト新規作成</DialogTitle>
              <DialogDescription>
                新しいプロジェクトの情報を入力してください
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="create-fiscal-year" className="text-right">
                  年度
                </Label>
                <Input
                  id="create-fiscal-year"
                  type="number"
                  value={formData.fiscalYear}
                  onChange={(e) =>
                    setFormData({ ...formData, fiscalYear: parseInt(e.target.value) })
                  }
                  className="col-span-3"
                  data-testid="input-fiscal-year"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="create-code" className="text-right">
                  プロジェクトコード
                </Label>
                <Input
                  id="create-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="P001"
                  className="col-span-3"
                  data-testid="input-code"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="create-name" className="text-right">
                  プロジェクト名
                </Label>
                <Input
                  id="create-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="プロジェクトA"
                  className="col-span-3"
                  data-testid="input-name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="create-customer" className="text-right">
                  取引先
                </Label>
                <Select
                  value={formData.customerId}
                  onValueChange={handleCustomerChange}
                >
                  <SelectTrigger
                    id="create-customer"
                    className="col-span-3"
                    data-testid="select-customer"
                  >
                    <SelectValue placeholder="取引先を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="create-sales-person" className="text-right">
                  営業担当者
                </Label>
                <Select
                  value={formData.salesPerson}
                  onValueChange={(value) =>
                    setFormData({ ...formData, salesPerson: value })
                  }
                >
                  <SelectTrigger
                    id="create-sales-person"
                    className="col-span-3"
                    data-testid="select-sales-person"
                  >
                    <SelectValue placeholder="営業担当者を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem 
                        key={employee.id} 
                        value={`${employee.lastName}${employee.firstName}`}
                      >
                        {employee.lastName}{employee.firstName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="create-service-type" className="text-right">
                  サービス
                </Label>
                <Select
                  value={formData.serviceType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, serviceType: value as ServiceType })
                  }
                >
                  <SelectTrigger
                    id="create-service-type"
                    className="col-span-3"
                    data-testid="select-service-type"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="create-analysis-type" className="text-right">
                  分析区分
                </Label>
                <Select
                  value={formData.analysisType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, analysisType: value as AnalysisType })
                  }
                >
                  <SelectTrigger
                    id="create-analysis-type"
                    className="col-span-3"
                    data-testid="select-analysis-type"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANALYSIS_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false);
                  resetForm();
                }}
                data-testid="button-cancel-create"
              >
                キャンセル
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                data-testid="button-submit-create"
              >
                {createMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                作成
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Projects Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>年度</TableHead>
                <TableHead>コード</TableHead>
                <TableHead>プロジェクト名</TableHead>
                <TableHead>取引先</TableHead>
                <TableHead>営業担当者</TableHead>
                <TableHead>サービス</TableHead>
                <TableHead>分析区分</TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    プロジェクトがありません
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow key={project.id} data-testid={`row-project-${project.id}`}>
                    <TableCell>{project.fiscalYear}年度</TableCell>
                    <TableCell className="font-mono">{project.code}</TableCell>
                    <TableCell>{project.name}</TableCell>
                    <TableCell>{project.customerName}</TableCell>
                    <TableCell>{project.salesPerson}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{project.serviceType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{project.analysisType}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(project)}
                          data-testid={`button-edit-${project.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(project)}
                          data-testid={`button-delete-${project.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>プロジェクト編集</DialogTitle>
            <DialogDescription>プロジェクト情報を編集します</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-fiscal-year" className="text-right">
                年度
              </Label>
              <Input
                id="edit-fiscal-year"
                type="number"
                value={formData.fiscalYear}
                onChange={(e) =>
                  setFormData({ ...formData, fiscalYear: parseInt(e.target.value) })
                }
                className="col-span-3"
                data-testid="input-edit-fiscal-year"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-code" className="text-right">
                プロジェクトコード
              </Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="col-span-3"
                data-testid="input-edit-code"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                プロジェクト名
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
                data-testid="input-edit-name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-customer" className="text-right">
                取引先
              </Label>
              <Select
                value={formData.customerId}
                onValueChange={handleCustomerChange}
              >
                <SelectTrigger
                  id="edit-customer"
                  className="col-span-3"
                  data-testid="select-edit-customer"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-sales-person" className="text-right">
                営業担当者
              </Label>
              <Select
                value={formData.salesPerson}
                onValueChange={(value) =>
                  setFormData({ ...formData, salesPerson: value })
                }
              >
                <SelectTrigger
                  id="edit-sales-person"
                  className="col-span-3"
                  data-testid="select-edit-sales-person"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem 
                      key={employee.id} 
                      value={`${employee.lastName}${employee.firstName}`}
                    >
                      {employee.lastName}{employee.firstName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-service-type" className="text-right">
                サービス
              </Label>
              <Select
                value={formData.serviceType}
                onValueChange={(value) =>
                  setFormData({ ...formData, serviceType: value as ServiceType })
                }
              >
                <SelectTrigger
                  id="edit-service-type"
                  className="col-span-3"
                  data-testid="select-edit-service-type"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-analysis-type" className="text-right">
                分析区分
              </Label>
              <Select
                value={formData.analysisType}
                onValueChange={(value) =>
                  setFormData({ ...formData, analysisType: value as AnalysisType })
                }
              >
                <SelectTrigger
                  id="edit-analysis-type"
                  className="col-span-3"
                  data-testid="select-edit-analysis-type"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANALYSIS_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedProject(null);
                resetForm();
              }}
              data-testid="button-cancel-edit"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleEdit}
              disabled={updateMutation.isPending}
              data-testid="button-submit-edit"
            >
              {updateMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>プロジェクトを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。プロジェクト「{selectedProject?.name}」を
              完全に削除します。
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
              {deleteMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Copy from Previous Year Dialog */}
      <AlertDialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>前年度からコピー</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedYear - 1}年度のプロジェクトを{selectedYear}
              年度にコピーします。よろしいですか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-copy">
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCopyFromPreviousYear}
              disabled={copyMutation.isPending}
              data-testid="button-confirm-copy"
            >
              {copyMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              コピー実行
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
