import { CalendarDays } from "lucide-react";

import { ProjectStaffingInput } from "@/components/project-staffing-input";

export default function StaffingProjectPage() {
  return (
    <div className="h-full p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            プロジェクト別工数入力
          </h1>
        </div>
        <p className="text-muted-foreground mt-1">プロジェクトごとの要員配置を登録・管理します</p>
      </div>

      <ProjectStaffingInput />
    </div>
  );
}
