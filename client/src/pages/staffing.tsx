import type { NewStaffing, Staffing } from "@shared/schema";
import { Calendar, CalendarDays, FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
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
import { MultiSelect } from "@/components/ui/multi-select";
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
const MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]; // 会計年度順（4月～3月）

export default function StaffingPage() {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

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
  const { data: projects = [] } = useProjects(selectedYear);
  const { data: employees = [] } = useEmployees();
  const { data: staffingData = [], isLoading } = useStaffing({
    projectId: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
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
      employeeId: staffing.employeeId ? String(staffing.employeeId) : "",
      employeeName: staffing.employeeName,
      workHours: String(staffing.workHours),
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
      employeeId: formData.employeeId || undefined, // 空文字列をundefinedに変換
      remarks: formData.remarks || undefined, // 空文字列をundefinedに変換
    };

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
  
  const handleEmployeeChange = (employeeIdStr: string) => {
    const employee = employees.find((e) => e.employeeId === employeeIdStr);
    const fullName = employee ? `${employee.lastName} ${employee.firstName}` : "";
    setFormData({
      ...formData,
      employeeId: employeeIdStr,
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
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-card/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold" data-testid="text-page-title">
              月別工数入力
            </h1>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-3 flex-wrap">
            {/* 年度選択 */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
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
            </div>

            {/* 月選択 */}
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
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
            </div>

            {/* プロジェクト選択 */}
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
              <MultiSelect
                options={productivityProjects
                  .filter((p) => p.fiscalYear === selectedYear)
                  .sort((a, b) => a.code.localeCompare(b.code))
                  .map((project) => ({
                    label: project.name,
                    value: project.id,
                  }))}
                selected={selectedProjectIds}
                onChange={setSelectedProjectIds}
                placeholder="全て"
                className="w-[300px]"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-6">
        <MonthlyStaffingInput
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        selectedProjectIds={selectedProjectIds}
        productivityProjects={productivityProjects}
        projects={projects}
        employees={employees}
        staffingData={staffingData}
        isLoading={isLoading}
        _employeeTotals={employeeTotals}
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        editMode={editMode}
        selectedStaffing={selectedStaffing}
        setSelectedStaffing={setSelectedStaffing}
        formData={formData}
        setFormData={setFormData}
        deleteOpen={deleteOpen}
        setDeleteOpen={setDeleteOpen}
        openCreateDialog={openCreateDialog}
        openEditDialog={openEditDialog}
        handleSave={handleSave}
        handleDelete={handleDelete}
        handleProjectChange={handleProjectChange}
        handleEmployeeChange={handleEmployeeChange}
        createMutation={createMutation}
        updateMutation={updateMutation}
        deleteMutation={deleteMutation}
        />
      </main>
    </div>
  );
}

function MonthlyStaffingInput({
  selectedYear,
  selectedMonth,
  selectedProjectIds,
  productivityProjects,
  projects,
  employees,
  staffingData,
  isLoading,
  _employeeTotals,
  dialogOpen,
  setDialogOpen,
  editMode,
  selectedStaffing: _selectedStaffing,
  setSelectedStaffing,
  formData,
  setFormData,
  deleteOpen,
  setDeleteOpen,
  openCreateDialog,
  openEditDialog,
  handleSave,
  handleDelete,
  handleProjectChange,
  handleEmployeeChange,
  createMutation: _createMutation,
  updateMutation: _updateMutation,
  deleteMutation: _deleteMutation,
}: {
  selectedYear: number;
  selectedMonth: number;
  selectedProjectIds: string[];
  productivityProjects: any[];
  projects: any[];
  employees: any[];
  staffingData: Staffing[];
  isLoading: boolean;
  _employeeTotals: Record<string, number>;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  editMode: boolean;
  selectedStaffing: Staffing | null;
  setSelectedStaffing: (staffing: Staffing | null) => void;
  formData: Partial<NewStaffing>;
  setFormData: (data: Partial<NewStaffing>) => void;
  deleteOpen: boolean;
  setDeleteOpen: (open: boolean) => void;
  openCreateDialog: () => void;
  openEditDialog: (staffing: Staffing) => void;
  handleSave: () => void;
  handleDelete: () => void;
  handleProjectChange: (projectId: string) => void;
  handleEmployeeChange: (employeeId: string) => void;
  createMutation: any;
  updateMutation: any;
  deleteMutation: any;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>配員計画</CardTitle>
              <CardDescription>
                {selectedYear}年度 {selectedMonth}月
                {selectedProjectIds.length > 0 && ` - ${selectedProjectIds.map(id => projects.find(p => p.id === id)?.name).filter(Boolean).join(", ")}`}
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
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
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
                </TableBody>
              </Table>
            </div>
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
              <Select value={formData.employeeId ? String(formData.employeeId) : ""} onValueChange={handleEmployeeChange}>
                <SelectTrigger id="staffing-employee" data-testid="select-employee">
                  <SelectValue placeholder="従業員を選択" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.employeeId}>
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

