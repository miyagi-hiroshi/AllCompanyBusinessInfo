import { Calendar, CalendarDays, FolderKanban, Users } from "lucide-react";
import { useState } from "react";

import {
  type AutocompleteOption,
  AutocompleteSelect,
} from "@/components/autocomplete-select";
import { ProjectStaffingInput } from "@/components/project-staffing-input";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmployees } from "@/hooks/useEmployees";
import { useProjects } from "@/hooks/useMasters";

const FISCAL_YEARS = [2023, 2024, 2025, 2026];

export default function StaffingProjectPage() {
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");

  const { data: projects = [] } = useProjects(selectedYear);
  const { data: employees = [] } = useEmployees();
  const productivityProjects = projects.filter(p => p.analysisType === "生産性");

  // AutocompleteSelect用の従業員オプションを生成（「全従業員」を先頭に追加）
  const employeeOptions: AutocompleteOption[] = [
    { value: "all", label: "全従業員" },
    ...employees
      .filter((employee) => employee.status !== "terminated")
      .sort((a, b) => parseInt(a.id) - parseInt(b.id))
      .map((employee) => ({
        value: employee.employeeId,
        label: `${employee.lastName} ${employee.firstName}`,
        code: employee.employeeId,
      })),
  ];

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-card/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold" data-testid="text-page-title">
              プロジェクト別工数入力
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
                placeholder="プロジェクトを選択"
                className="w-[400px]"
              />
            </div>

            {/* 対象従業員選択 */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <AutocompleteSelect
                value={selectedEmployeeId}
                onChange={(value) => setSelectedEmployeeId(value)}
                options={employeeOptions}
                placeholder="全従業員"
                searchPlaceholder="従業員を検索..."
                className="w-[200px]"
                testId="employee-select"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-6">
        <ProjectStaffingInput 
          selectedYear={selectedYear}
          selectedProjectIds={selectedProjectIds}
          selectedEmployeeId={selectedEmployeeId}
          employees={employees}
        />
      </main>
    </div>
  );
}
