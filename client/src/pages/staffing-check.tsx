import { ClipboardCheck } from "lucide-react";
import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStaffingCheck } from "@/hooks/useStaffing";
import { cn } from "@/lib/utils";

const FISCAL_YEARS = [2023, 2024, 2025, 2026];

// 月名の配列（年度順: 4月=1, 5月=2, ..., 3月=12）
const MONTH_NAMES = [
  "4月", "5月", "6月", "7月", "8月", "9月",
  "10月", "11月", "12月", "1月", "2月", "3月"
];

export default function StaffingCheckPage() {
  const [selectedYear, setSelectedYear] = useState<number>(2025);

  // 工数入力チェックデータ取得
  const { data: checkData, isLoading } = useStaffingCheck(selectedYear);

  // 現在の月を取得（年度の月順序: 4月=1, 5月=2, ..., 3月=12）
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentFiscalMonth = currentMonth >= 4 ? currentMonth - 3 : currentMonth + 9; // 年度月に変換

  // 工数フォーマット関数
  const formatHours = (value: number) => {
    return `${value.toFixed(1)}人月`;
  };

  // セル色分けロジック
  const getCellColor = (hours: number, month: number): string => {
    // 翌月以降のチェック（年度考慮: 4月=1, 5月=2, ... 3月=12）
    const isFuture = month >= currentFiscalMonth + 1;

    if (!isFuture) {
      return ''; // 当月以前は色分けなし
    }

    if (hours === 0) {
      return 'bg-red-50 text-red-900 font-semibold';
    }

    if (hours > 0 && hours < 1) {
      return 'bg-yellow-50 text-yellow-900 font-semibold';
    }

    return '';
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 space-y-3">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">{selectedYear}年度 工数入力チェック</h1>
          </div>
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-[120px]">
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

        {/* 工数入力チェックテーブル */}
        {isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <Card>
            <CardContent className="p-4">
              {checkData?.employees?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {selectedYear}年度のエンジニア従業員データがありません
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[180px] text-xs py-1 px-2">従業員名</TableHead>
                      {MONTH_NAMES.map((monthName, index) => (
                        <TableHead key={index} className="text-center w-[80px] text-xs py-1 px-2">
                          {monthName}
                        </TableHead>
                      ))}
                      <TableHead className="text-center w-[100px] text-xs py-1 px-2">空き工数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkData?.employees?.map((employee) => (
                      <TableRow key={employee.employeeId}>
                        <TableCell className="font-medium text-xs py-1 px-2">
                          {employee.employeeName}
                        </TableCell>
                        {employee.monthlyHours.map((month) => (
                          <TableCell 
                            key={month.month}
                            className={cn(
                              "text-center font-mono text-xs py-1 px-2",
                              getCellColor(month.totalHours, month.month)
                            )}
                          >
                            {formatHours(month.totalHours)}
                          </TableCell>
                        ))}
                        <TableCell className="text-center font-mono font-semibold text-xs py-1 px-2">
                          {formatHours(employee.availableHours)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* サマリ行 */}
                    {checkData && (
                      <TableRow className="font-bold bg-muted/50 border-t-2">
                        <TableCell className="text-xs py-1 px-2">合計</TableCell>
                        <TableCell colSpan={12}></TableCell>
                        <TableCell className="text-center font-mono text-xs py-1 px-2">
                          {formatHours(checkData.totalAvailableHours)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
