import type { Project } from "@shared/schema";
import { Calendar, CalendarDays, FolderKanban } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FilterState {
  fiscalYear: number;
  month?: number;
  projectId?: string;
}

interface AdvancedFilterPanelProps {
  filter: FilterState;
  onChange: (filter: FilterState) => void;
  projects: Project[];
}

export function AdvancedFilterPanel({ filter, onChange, projects }: AdvancedFilterPanelProps) {
  // 年度リスト生成（現在年から前後2年）
  const generateFiscalYears = (): number[] => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let i = -2; i <= 2; i++) {
      years.push(currentYear + i);
    }
    return years.sort((a, b) => b - a); // 降順
  };

  const fiscalYears = generateFiscalYears();

  // 月リスト（1-12）
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // 選択した年度に紐付くプロジェクトのみフィルタリングし、プロジェクトコード昇順でソート
  const filteredProjects = projects
    .filter(p => p.fiscalYear === filter.fiscalYear)
    .sort((a, b) => a.code.localeCompare(b.code));

  const handleFiscalYearChange = (year: string) => {
    onChange({
      fiscalYear: parseInt(year),
      month: undefined,
      projectId: undefined,
    });
  };

  const handleMonthChange = (month: string) => {
    onChange({
      ...filter,
      month: month === "all" ? undefined : parseInt(month),
    });
  };

  const handleProjectChange = (projectId: string) => {
    onChange({
      ...filter,
      projectId: projectId === "all" ? undefined : projectId,
    });
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* 年度選択（必須） */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Select 
          value={filter.fiscalYear.toString()} 
          onValueChange={handleFiscalYearChange}
        >
          <SelectTrigger className="w-[140px]" data-testid="select-fiscal-year">
            <SelectValue placeholder="年度を選択" />
          </SelectTrigger>
          <SelectContent>
            {fiscalYears.map((year) => (
              <SelectItem 
                key={year} 
                value={year.toString()} 
                data-testid={`option-fiscal-year-${year}`}
              >
                {year}年度
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 月選択（任意） */}
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <Select 
          value={filter.month?.toString() || "all"} 
          onValueChange={handleMonthChange}
        >
          <SelectTrigger className="w-[120px]" data-testid="select-month">
            <SelectValue placeholder="月を選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="option-month-all">
              全ての月
            </SelectItem>
            {months.map((month) => (
              <SelectItem 
                key={month} 
                value={month.toString()} 
                data-testid={`option-month-${month}`}
              >
                {month}月
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* プロジェクト選択（任意） */}
      <div className="flex items-center gap-2">
        <FolderKanban className="h-4 w-4 text-muted-foreground" />
        <Select 
          value={filter.projectId || "all"} 
          onValueChange={handleProjectChange}
        >
          <SelectTrigger className="w-[220px]" data-testid="select-project">
            <SelectValue placeholder="プロジェクトを選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="option-project-all">
              全てのプロジェクト
            </SelectItem>
            {filteredProjects.map((project) => (
              <SelectItem 
                key={project.id} 
                value={project.id} 
                data-testid={`option-project-${project.id}`}
              >
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
