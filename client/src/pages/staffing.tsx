import type { NewStaffing, Staffing } from "@shared/schema";
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { useEmployees } from "@/hooks/useEmployees";
import { useProjects } from "@/hooks/useMasters";
import {
  useCreateStaffing,
  useDeleteStaffing,
  useStaffing,
  useUpdateStaffing,
} from "@/hooks/useStaffing";
import { useToast } from "@/hooks/useToast";

const FISCAL_YEARS = [2023, 2024, 2025, 2026];
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function StaffingPage() {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedStaffing, setSelectedStaffing] = useState<Staffing | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<NewStaffing>>({
    projectId: "",
    projectCode: "",
    projectName: "",
    fiscalYear: selectedYear,
    month: selectedMonth,
    employeeId: "",
    employeeName: "",
    workHours: "",
    remarks: "",
  });

  // Fetch data
  const { data: projects = [] } = useProjects();
  const { data: employees = [] } = useEmployees();
  const { data: staffingData = [], isLoading } = useStaffing({
    projectId: selectedProjectId || undefined,
    fiscalYear: selectedYear,
    month: selectedMonth,
  });
  
  // 生産性プロジェクトのみをフィルタリング
  const productivityProjects = projects.filter(p => p.analysisType === "生産性");

  // Mutations
  const createMutation = useCreateStaffing();
  const updateMutation = useUpdateStaffing();
  const deleteMutation = useDeleteStaffing();

  const openCreateDialog = () => {
    setEditMode(false);
    setSelectedStaffing(null);
    setFormData({
      projectId: "",
      projectCode: "",
      projectName: "",
      fiscalYear: selectedYear,
      month: selectedMonth,
      employeeId: "",
      employeeName: "",
      workHours: "",
      remarks: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (staffing: Staffing) => {
    setEditMode(true);
    setSelectedStaffing(staffing);
    setFormData({
      projectId: staffing.projectId,
      projectCode: staffing.projectCode,
      projectName: staffing.projectName,
      fiscalYear: staffing.fiscalYear,
      month: staffing.month,
      employeeId: staffing.employeeId || "",
      employeeName: staffing.employeeName,
      workHours: staffing.workHours,
      remarks: staffing.remarks || "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (
      !formData.projectId ||
      !formData.employeeName ||
      !formData.workHours ||
      !formData.fiscalYear ||
      !formData.month
    ) {
      toast({
        title: "入力エラー",
        description: "必須項目を入力してください",
        variant: "destructive",
      });
      return;
    }

    // 数値変換と空文字列のクリーンアップ
    const dataToSubmit = {
      ...formData,
      workHours: parseFloat(formData.workHours),
      employeeId: formData.employeeId || undefined, // 空文字列をundefinedに変換
      remarks: formData.remarks || undefined, // 空文字列をundefinedに変換
    };
    
    console.log('送信データ:', dataToSubmit); // デバッグログ

    if (editMode && selectedStaffing) {
      updateMutation.mutate(
        {
          id: selectedStaffing.id,
          data: dataToSubmit as any,
        },
        {
          onSuccess: () => {
            toast({
              title: "更新完了",
              description: "配員計画を更新しました",
            });
            setDialogOpen(false);
          },
          onError: (error) => {
            console.error('更新エラー:', error);
            toast({
              title: "エラー",
              description: "配員計画の更新に失敗しました",
              variant: "destructive",
            });
          },
        }
      );
    } else {
      createMutation.mutate(dataToSubmit as any, {
        onSuccess: () => {
          toast({
            title: "作成完了",
            description: "配員計画を作成しました",
          });
          setDialogOpen(false);
        },
        onError: (error) => {
          console.error('作成エラー:', error);
          toast({
            title: "エラー",
            description: "配員計画の作成に失敗しました",
            variant: "destructive",
          });
        },
      });
    }
  };

  const handleDelete = () => {
    if (selectedStaffing) {
      deleteMutation.mutate(selectedStaffing.id, {
        onSuccess: () => {
          toast({
            title: "削除完了",
            description: "配員計画を削除しました",
          });
          setDeleteOpen(false);
          setSelectedStaffing(null);
        },
        onError: () => {
          toast({
            title: "エラー",
            description: "配員計画の削除に失敗しました",
            variant: "destructive",
          });
        },
      });
    }
  };

  const handleProjectChange = (projectId: string) => {
    const project = productivityProjects.find((p) => p.id === projectId);
    setFormData({
      ...formData,
      projectId,
      projectCode: project?.code || "",
      projectName: project?.name || "",
    });
  };
  
  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    const fullName = employee ? `${employee.lastName} ${employee.firstName}` : "";
    setFormData({
      ...formData,
      employeeId,
      employeeName: fullName,
    });
  };

  // Calculate total hours by employee
  const employeeTotals = staffingData.reduce(
    (acc, staff) => {
      acc[staff.employeeName] = (acc[staff.employeeName] || 0) + Number(staff.workHours);
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="h-full p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold" data-testid="text-page-title">
              要員山積み登録
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="fiscal-year-select">年度:</Label>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger id="fiscal-year-select" className="w-[120px]" data-testid="select-fiscal-year">
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

            <Label htmlFor="month-select">月:</Label>
            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => setSelectedMonth(parseInt(value))}
            >
              <SelectTrigger id="month-select" className="w-[100px]" data-testid="select-month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month) => (
                  <SelectItem key={month} value={month.toString()}>
                    {month}月
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Label htmlFor="project-select">プロジェクト:</Label>
            <Select
              value={selectedProjectId || "all"}
              onValueChange={(value) => setSelectedProjectId(value === "all" ? "" : value)}
            >
              <SelectTrigger id="project-select" className="w-[200px]" data-testid="select-project">
                <SelectValue placeholder="全て" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て</SelectItem>
                {productivityProjects
                  .filter((p) => p.fiscalYear === selectedYear)
                  .map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-muted-foreground mt-1">プロジェクトごとの要員配置を登録・管理します</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>配員計画</CardTitle>
              <CardDescription>
                {selectedYear}年度 {selectedMonth}月
                {selectedProjectId && ` - ${projects.find((p) => p.id === selectedProjectId)?.name}`}
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog} data-testid="button-create-staffing">
              <Plus className="w-4 h-4 mr-2" />
              新規作成
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
          ) : staffingData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">配員計画が登録されていません</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>プロジェクト</TableHead>
                  <TableHead>従業員名</TableHead>
                  <TableHead className="text-right">工数（人月）</TableHead>
                  <TableHead>備考</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffingData.map((staff) => (
                  <TableRow key={staff.id} data-testid={`row-staffing-${staff.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{staff.projectName}</div>
                        <div className="text-sm text-muted-foreground">{staff.projectCode}</div>
                      </div>
                    </TableCell>
                    <TableCell>{staff.employeeName}</TableCell>
                    <TableCell className="text-right font-mono">{Number(staff.workHours).toFixed(2)}人月</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{staff.remarks || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(staff)}
                          data-testid={`button-edit-${staff.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedStaffing(staff);
                            setDeleteOpen(true);
                          }}
                          data-testid={`button-delete-${staff.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {Object.keys(employeeTotals).length > 0 && (
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>合計</TableCell>
                    <TableCell colSpan={4}>
                      <div className="flex gap-4">
                        {Object.entries(employeeTotals).map(([name, hours]) => (
                          <span key={name} className="text-sm">
                            {name}: {hours.toFixed(2)}人月
                          </span>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="dialog-staffing">
          <DialogHeader>
            <DialogTitle>{editMode ? "配員計画編集" : "配員計画新規作成"}</DialogTitle>
            <DialogDescription>配員計画情報を入力してください</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="staffing-fiscal-year">年度</Label>
                <Input
                  id="staffing-fiscal-year"
                  type="number"
                  value={formData.fiscalYear}
                  onChange={(e) => setFormData({ ...formData, fiscalYear: parseInt(e.target.value) })}
                  data-testid="input-fiscal-year"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staffing-month">月</Label>
                <Select
                  value={formData.month?.toString()}
                  onValueChange={(value) => setFormData({ ...formData, month: parseInt(value) })}
                >
                  <SelectTrigger id="staffing-month" data-testid="select-month">
                    <SelectValue placeholder="月を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month} value={month.toString()}>
                        {month}月
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffing-project">プロジェクト</Label>
              <Select value={formData.projectId} onValueChange={handleProjectChange}>
                <SelectTrigger id="staffing-project" data-testid="select-project">
                  <SelectValue placeholder="プロジェクトを選択" />
                </SelectTrigger>
                <SelectContent>
                  {productivityProjects
                    .filter((p) => p.fiscalYear === (formData.fiscalYear || selectedYear))
                    .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffing-employee">従業員</Label>
              <Select value={formData.employeeId || ""} onValueChange={handleEmployeeChange}>
                <SelectTrigger id="staffing-employee" data-testid="select-employee">
                  <SelectValue placeholder="従業員を選択" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.lastName} {employee.firstName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffing-work-hours">工数（人月）</Label>
              <Input
                id="staffing-work-hours"
                type="number"
                step="0.01"
                min="0"
                max="99.99"
                value={formData.workHours}
                onChange={(e) => setFormData({ ...formData, workHours: e.target.value })}
                placeholder="1.00"
                data-testid="input-work-hours"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffing-remarks">備考</Label>
              <Textarea
                id="staffing-remarks"
                value={formData.remarks || ""}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="備考を入力"
                data-testid="textarea-remarks"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel">
              キャンセル
            </Button>
            <Button onClick={handleSave} data-testid="button-submit">
              {editMode ? "更新" : "作成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent data-testid="dialog-delete-staffing">
          <AlertDialogHeader>
            <AlertDialogTitle>配員計画を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。配員計画を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} data-testid="button-confirm-delete">
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
