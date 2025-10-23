import type { NewStaffing } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useEffect,useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useEmployees } from "@/hooks/useEmployees";
import { useProjects } from "@/hooks/useMasters";
import { useBulkCreateStaffing, useBulkDeleteStaffing,useBulkUpdateStaffing } from "@/hooks/useStaffing";
import { useToast } from "@/hooks/useToast";
import { apiRequest } from "@/lib/queryClient";

const FISCAL_YEARS = [2023, 2024, 2025, 2026];
const MONTHS = [
  { value: 4, label: "4月" },
  { value: 5, label: "5月" },
  { value: 6, label: "6月" },
  { value: 7, label: "7月" },
  { value: 8, label: "8月" },
  { value: 9, label: "9月" },
  { value: 10, label: "10月" },
  { value: 11, label: "11月" },
  { value: 12, label: "12月" },
  { value: 1, label: "1月" },
  { value: 2, label: "2月" },
  { value: 3, label: "3月" },
];

interface StaffingRow {
  id: string;
  employeeId: string;
  employeeName: string;
  projectId: string;
  projectName: string;
  monthlyHours: Record<number, number>; // month -> workHours
}

export function ProjectStaffingInput() {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [staffingRows, setStaffingRows] = useState<StaffingRow[]>([]);

  // Fetch data
  const { data: projects = [] } = useProjects(selectedYear);
  const { data: employees = [] } = useEmployees();
  
  // 生産性プロジェクトのみをフィルタリング
  const productivityProjects = projects.filter(p => p.analysisType === "生産性");
  
  // 選択されたプロジェクトの詳細情報
  const selectedProjects = productivityProjects.filter(p => 
    p.fiscalYear === selectedYear && selectedProjectIds.includes(p.id)
  );

  // 既存のstaffingデータを取得（プロジェクトが選択されている場合のみ）
  // プロジェクト別入力専用のクエリキーを使用してキャッシュの競合を回避
  const { data: existingStaffing = [], isLoading } = useQuery<NewStaffing[]>({
    queryKey: ["/api/staffing", "project-input", selectedYear, selectedProjectIds],
    queryFn: async () => {
      const url = `/api/staffing?fiscalYear=${selectedYear}&limit=10000&sortBy=employeeId&sortOrder=asc`;
      const res = await apiRequest("GET", url, undefined);
      const result = await res.json();
      return result.data?.items || [];
    },
    enabled: selectedProjectIds.length > 0, // プロジェクトが選択されている場合のみ
  });

  // 既存データをStaffingRow形式に変換してフィルタリング
  useEffect(() => {
    if (existingStaffing.length > 0) {
      
      // フィルタリング処理を追加
      let filteredStaffing = existingStaffing;
      
      // 従業員でフィルタリング（staff.employeeIdとemployee.employee_idを比較）
      if (selectedEmployeeId && selectedEmployeeId !== "all") {
        filteredStaffing = filteredStaffing.filter(
          staff => staff.employeeId === selectedEmployeeId
        );
      }
      
      // プロジェクトでフィルタリング（選択されていない場合はフィルタリングしない）
      if (selectedProjectIds.length > 0) {
        filteredStaffing = filteredStaffing.filter(
          staff => selectedProjectIds.includes(staff.projectId)
        );
      }
      
      const groupedData = filteredStaffing.reduce((acc, staff) => {
        // employeeIdを文字列として明示的に変換（DBではvarchar型）
               const empId = String(staff.employeeId || "");
               const key = `${empId}_${staff.projectId || ""}`;
        if (!acc[key]) {
          acc[key] = {
            id: staff.id || "",
            employeeId: empId, // 文字列として保存
            employeeName: staff.employeeName || "",
            projectId: staff.projectId || "",
            projectName: staff.projectName || "",
            monthlyHours: {},
          };
        }
        // workHoursを数値に変換してmonthlyHoursに格納
        const hours = Number(staff.workHours) || 0;
        acc[key].monthlyHours[Number(staff.month)] = hours;
        
        
        return acc;
      }, {} as Record<string, StaffingRow>);


      // employee_id昇順＆プロジェクト名昇順でソート
      const sortedRows = Object.values(groupedData).sort((a, b) => {
        // employee_idで比較（数値として比較）
        const employeeIdA = parseInt(a.employeeId) || 0;
        const employeeIdB = parseInt(b.employeeId) || 0;
        if (employeeIdA !== employeeIdB) {
          return employeeIdA - employeeIdB;
        }
        // employee_idが同じ場合はプロジェクト名で比較
        return a.projectName.localeCompare(b.projectName);
      });

      
            setStaffingRows(sortedRows);
          } else {
            setStaffingRows([]);
          }
        }, [existingStaffing, selectedEmployeeId, selectedProjectIds]);

  // 行を追加
  const addRow = () => {
    const employee = selectedEmployeeId && selectedEmployeeId !== "all"
      ? employees.find(e => e.employeeId === selectedEmployeeId)
      : null;
      
    const newRow: StaffingRow = {
      id: `temp_${Date.now()}`,
      employeeId: selectedEmployeeId && selectedEmployeeId !== "all" ? selectedEmployeeId : "",
      employeeName: employee 
        ? `${employee.lastName} ${employee.firstName}` 
        : "",
      projectId: "",
      projectName: "",
      monthlyHours: {},
    };
    setStaffingRows([...staffingRows, newRow]);
  };

  // 行を削除
  const removeRow = (index: number) => {
    setStaffingRows(staffingRows.filter((_, i) => i !== index));
  };

  // 従業員選択
  const handleEmployeeChange = (index: number, employeeId: string) => {
    // employee.employee_idを使用して検索
    const employee = employees.find(e => e.employeeId === employeeId);
    const fullName = employee ? `${employee.lastName} ${employee.firstName}` : "";
    
    const updatedRows = [...staffingRows];
    const currentRow = updatedRows[index];
    
    // 重複チェック（現在の行以外で同じ従業員-プロジェクトの組み合わせがあるか）
    const isDuplicate = updatedRows.some((row, i) => 
      i !== index && 
      row.employeeId === employeeId && 
      row.projectId === currentRow.projectId &&
      row.employeeId !== "" && 
      row.projectId !== ""
    );
    
    if (isDuplicate) {
      toast({
        title: "重複エラー",
        description: "同じ従業員-プロジェクトの組み合わせは既に存在します",
        variant: "destructive",
      });
      return;
    }
    
    updatedRows[index] = {
      ...updatedRows[index],
      employeeId, // 文字列として保存
      employeeName: fullName,
    };
    setStaffingRows(updatedRows);
  };

  // プロジェクト選択
  const handleProjectChange = (index: number, projectId: string) => {
    // 選択されたプロジェクトまたは既存データのプロジェクトから検索
    const project = selectedProjects.find(p => p.id === projectId) || 
                   productivityProjects.find(p => p.id === projectId);
    
    const updatedRows = [...staffingRows];
    const currentRow = updatedRows[index];
    
    // 重複チェック（現在の行以外で同じ従業員-プロジェクトの組み合わせがあるか）
    const isDuplicate = updatedRows.some((row, i) => 
      i !== index && 
      row.employeeId === currentRow.employeeId && 
      row.projectId === projectId &&
      row.employeeId !== "" && 
      projectId !== ""
    );
    
    if (isDuplicate) {
      toast({
        title: "重複エラー",
        description: "同じ従業員-プロジェクトの組み合わせは既に存在します",
        variant: "destructive",
      });
      return;
    }
    
    updatedRows[index] = {
      ...updatedRows[index],
      projectId: projectId || "",
      projectName: project?.name || "",
    };
    setStaffingRows(updatedRows);
  };

  // 月次工数入力
  const handleMonthlyHoursChange = (index: number, month: number, value: string) => {
    const updatedRows = [...staffingRows];
    updatedRows[index].monthlyHours[month] = parseFloat(value) || 0;
    setStaffingRows(updatedRows);
  };

  // Mutations
  const bulkCreateMutation = useBulkCreateStaffing();
  const bulkUpdateMutation = useBulkUpdateStaffing();
  const bulkDeleteMutation = useBulkDeleteStaffing();

  // 保存処理
  const handleSave = async () => {
    try {
      // バリデーション
      for (const row of staffingRows) {
        if (!row.employeeId || !row.projectId) {
          toast({
            title: "入力エラー",
            description: "従業員とプロジェクトを選択してください",
            variant: "destructive",
          });
          return;
        }
      }

      // 重複チェック
      const combinations = new Set<string>();
      for (const row of staffingRows) {
        const combination = `${row.employeeId}_${row.projectId}`;
        if (combinations.has(combination)) {
          toast({
            title: "重複エラー",
            description: "同じ従業員-プロジェクトの組み合わせが複数存在します",
            variant: "destructive",
          });
          return;
        }
        combinations.add(combination);
      }

      // 既存データと比較して、作成・更新・削除を決定
      const existingDataMap = new Map();
      existingStaffing.forEach(staff => {
        const key = `${staff.employeeId}_${staff.projectId}_${staff.month}`;
        existingDataMap.set(key, staff);
      });

      const createData: NewStaffing[] = [];
      const updateData: Array<{ id: string; data: Partial<NewStaffing> }> = [];
      const deleteIds: string[] = [];

      // 各行について処理
      staffingRows.forEach(row => {
        MONTHS.forEach(month => {
          const workHours = row.monthlyHours[month.value] || 0;
          const key = `${row.employeeId}_${row.projectId}_${month.value}`;
          const existingStaff = existingDataMap.get(key);

          if (workHours > 0) {
            const staffData: NewStaffing = {
              projectId: row.projectId,
              projectCode: productivityProjects.find(p => p.id === row.projectId)?.code || "",
              projectName: row.projectName,
              fiscalYear: selectedYear,
              month: month.value,
              employeeId: row.employeeId,
              employeeName: row.employeeName,
              workHours: workHours.toString(),
              remarks: "",
            };

            if (existingStaff) {
              // 工数が変更されている場合のみ更新
              const existingHours = parseFloat(existingStaff.workHours || "0");
              if (existingHours !== workHours) {
                updateData.push({
                  id: existingStaff.id,
                  data: { workHours: workHours.toString() }
                });
              }
            } else {
              // 新規作成
              createData.push(staffData);
            }
          } else if (existingStaff) {
            // 工数が0の場合、既存データがあれば削除
            deleteIds.push(existingStaff.id);
          }
        });
      });


      // 一括操作を実行
      const promises = [];
      
      if (createData.length > 0) {
        promises.push(bulkCreateMutation.mutateAsync(createData));
      }
      
      if (updateData.length > 0) {
        promises.push(bulkUpdateMutation.mutateAsync(updateData));
      }
      
      if (deleteIds.length > 0) {
        promises.push(bulkDeleteMutation.mutateAsync(deleteIds));
      }

      await Promise.all(promises);
      
      toast({
        title: "保存完了",
        description: `配員計画を保存しました（新規: ${createData.length}件、更新: ${updateData.length}件、削除: ${deleteIds.length}件）`,
      });
    } catch (error) {
      console.error('保存エラー:', error);
      toast({
        title: "エラー",
        description: "配員計画の保存に失敗しました",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 年度・プロジェクト選択 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="project-fiscal-year">年度:</Label>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger id="project-fiscal-year" className="w-[120px]">
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

        <div className="flex items-center gap-2">
          <Label htmlFor="project-select">対象プロジェクト:</Label>
          <MultiSelect
            options={productivityProjects
              .filter((p) => p.fiscalYear === selectedYear)
              .map((project) => ({
                label: project.name,
                value: project.id,
              }))}
            selected={selectedProjectIds}
            onChange={setSelectedProjectIds}
            placeholder="プロジェクトを選択"
            className="w-[400px]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="employee-select">対象従業員:</Label>
          <Select
            value={selectedEmployeeId}
            onValueChange={setSelectedEmployeeId}
          >
            <SelectTrigger id="employee-select" className="w-[200px]">
              <SelectValue placeholder="全従業員" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全従業員</SelectItem>
              {employees
                .filter((employee) => employee.status !== "terminated")
                .sort((a, b) => parseInt(a.id) - parseInt(b.id))
                .map((employee) => (
                  <SelectItem key={employee.id} value={employee.employeeId}>
                    {employee.lastName} {employee.firstName}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 入力テーブル */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>プロジェクト別配員計画</CardTitle>
              <CardDescription>
                {selectedYear}年度 - 従業員とプロジェクトの組み合わせで年度全体の工数を入力
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={addRow} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                行追加
              </Button>
              <Button 
                onClick={handleSave}
                disabled={bulkCreateMutation.isPending || bulkUpdateMutation.isPending || bulkDeleteMutation.isPending}
              >
                {bulkCreateMutation.isPending || bulkUpdateMutation.isPending || bulkDeleteMutation.isPending 
                  ? "保存中..." 
                  : "保存"
                }
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
               {isLoading ? (
                 <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
               ) : staffingRows.length === 0 ? (
                 <div className="text-center py-8 text-muted-foreground">
                   {selectedProjectIds.length === 0 
                     ? "プロジェクトを選択してください" 
                     : "データがありません。「行追加」ボタンで従業員を追加してください。"}
                 </div>
               ) : (
            <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[150px]">従業員名</TableHead>
                    <TableHead className="w-[200px]">プロジェクト名</TableHead>
                    {MONTHS.map((month) => (
                      <TableHead key={month.value} className="text-center min-w-[80px]">
                        {month.label}
                      </TableHead>
                    ))}
                    <TableHead className="w-[80px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffingRows.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {selectedEmployeeId && selectedEmployeeId !== "all" ? (
                          // フィルタリング時は従業員名を表示のみ
                          <span className="text-sm">{row.employeeName}</span>
                        ) : (
                          // フィルタリングなしの場合は選択可能
                          <Select
                            value={row.employeeId || ""} // 空文字列をデフォルトに
                            onValueChange={(value) => handleEmployeeChange(index, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="従業員を選択" />
                            </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((employee) => employee.status !== "terminated")
                    .map((employee) => (
                      <SelectItem key={employee.id} value={employee.employeeId}>
                        {employee.lastName} {employee.firstName}
                      </SelectItem>
                    ))}
                </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.projectId}
                          onValueChange={(value) => handleProjectChange(index, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="プロジェクトを選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {/* 既存データのプロジェクトと選択されたプロジェクトの両方を表示 */}
                            {productivityProjects
                              .filter((p) => p.fiscalYear === selectedYear)
                              .map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {MONTHS.map((month) => {
                        const value = row.monthlyHours[month.value] || "";
                        return (
                          <TableCell key={month.value}>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="99.99"
                              value={value}
                              onChange={(e) => handleMonthlyHoursChange(index, month.value, e.target.value)}
                              placeholder="0.00"
                              className="text-center"
                            />
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
