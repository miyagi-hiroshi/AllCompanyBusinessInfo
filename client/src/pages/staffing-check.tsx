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

// 年度順の暦月配列（4月=4, 5月=5, ..., 3月=3）
const FISCAL_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

export default function StaffingCheckPage() {
  const [selectedYear, setSelectedYear] = useState<number>(2025);

  // 工数入力チェックデータ取得
  const { data: checkData, isLoading } = useStaffingCheck(selectedYear);

  // 工数フォーマット関数
  const formatHours = (value: number) => {
    return `${value.toFixed(1)}人月`;
  };

  // セル色分けロジック（暦月ベース: month=4は4月、month=1は1月）
  const getCellColor = (hours: number, calendarMonth: number): string => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 暦月: 1-12
    
    // 選択された年度の判定
    const currentFiscalYear = currentMonth >= 4 ? currentYear : currentYear - 1;
    const isPastFiscalYear = selectedYear < currentFiscalYear;
    const isCurrentFiscalYear = selectedYear === currentFiscalYear;
    const isFutureFiscalYear = selectedYear > currentFiscalYear;
    
    let isFuture = false;
    
    if (isPastFiscalYear) {
      // 過去年度: 全ての月は過去
      isFuture = false;
    } else if (isFutureFiscalYear) {
      // 未来年度: 全ての月は未来
      isFuture = true;
    } else if (isCurrentFiscalYear) {
      // 現在年度: 暦月で比較（年度をまたぐケースを考慮）
      if (currentMonth >= 4) {
        // 現在が4-12月（年度前半）の場合
        if (calendarMonth >= 4) {
          // 4-12月: 暦月で比較
          isFuture = calendarMonth > currentMonth;
        } else {
          // 1-3月: 常に未来
          isFuture = true;
        }
      } else {
        // 現在が1-3月（年度後半）の場合
        if (calendarMonth >= 4) {
          // 4-12月: 常に過去
          isFuture = false;
        } else {
          // 1-3月: 暦月で比較
          isFuture = calendarMonth > currentMonth;
        }
      }
    }

    if (!isFuture) {
      return ''; // 過去月は色分けなし
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
                      {FISCAL_MONTHS.map((calendarMonth) => (
                        <TableHead key={calendarMonth} className="text-center w-[80px] text-xs py-1 px-2">
                          {calendarMonth}月
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
