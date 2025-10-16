import { BarChart3 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccountingSummary } from "@/hooks/useAccountingSummary";
import { useSalesPersons } from "@/hooks/useSalesPersons";

const FISCAL_YEARS = [2023, 2024, 2025, 2026];

export default function AccountingSummaryPage() {
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [includeAngleB, setIncludeAngleB] = useState<boolean>(false);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<string>("all");

  // 営業担当者一覧取得
  const { data: salesPersons } = useSalesPersons();

  // 月次サマリデータ取得
  const { data: summaryData, isLoading } = useAccountingSummary(selectedYear, includeAngleB, selectedSalesPerson);

  // 数値フォーマット関数
  const formatCurrency = (value: number) => {
    return `¥${value.toLocaleString()}`;
  };

  // 月名を日本語で表示する関数
  const formatMonthName = (monthStr: string) => {
    const month = parseInt(monthStr.split('-')[1]);
    const monthNames = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    return monthNames[month];
  };

  // カテゴリ別の色分け
  const getCategoryColor = (category: 'revenue' | 'costOfSales' | 'sgaExpenses') => {
    switch (category) {
      case 'revenue':
        return 'text-green-600 bg-green-50';
      case 'costOfSales':
        return 'text-red-600 bg-red-50';
      case 'sgaExpenses':
        return 'text-orange-600 bg-orange-50';
      default:
        return '';
    }
  };

  // 年度合計を計算する関数
  const calculateAnnualTotal = (monthlyAmounts: Record<string, number>) => {
    return months.reduce((total, month) => total + (monthlyAmounts[month] || 0), 0);
  };

  // サマリの年度合計を計算する関数
  const calculateSummaryAnnualTotal = (summaryTotals: Record<string, number>) => {
    return months.reduce((total, month) => total + (summaryTotals[month] || 0), 0);
  };

  // サマリ行の色分け
  const getSummaryColor = (summaryType: string) => {
    switch (summaryType) {
      case 'revenue':
        return 'text-green-700 bg-green-100 font-bold';
      case 'costOfSales':
        return 'text-red-700 bg-red-100 font-bold';
      case 'sgaExpenses':
        return 'text-orange-700 bg-orange-100 font-bold';
      default:
        return 'bg-gray-100 font-bold';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">計上区分別月次サマリ</h1>
        </div>
        <Card>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!summaryData?.success || !summaryData.data) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">計上区分別月次サマリ</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-500">データの取得に失敗しました</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { months, accountingItems, summaries } = summaryData.data;

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 space-y-3">
        {/* ページヘッダー */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">
              {selectedYear}年度 計上区分別月次サマリ
              {includeAngleB ? "（受発注見込み+角度B）" : "（受発注見込みのみ）"}
              {selectedSalesPerson !== "all" && ` - ${selectedSalesPerson}`}
            </h1>
          </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="include-angle-b"
                    checked={includeAngleB}
                    onCheckedChange={setIncludeAngleB}
                  />
                  <label htmlFor="include-angle-b" className="text-sm font-medium">
                    角度B案件を含める
                  </label>
                </div>
                <Select value={selectedSalesPerson} onValueChange={setSelectedSalesPerson}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="営業担当者" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    {salesPersons?.map((person) => (
                      <SelectItem key={person} value={person}>
                        {person}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number(value))}>
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
        </div>

        {/* データテーブル */}
        <Card>
          <CardContent className="p-4">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] text-xs py-1 px-2">コード</TableHead>
                  <TableHead className="w-[180px] text-xs py-1 px-2">計上区分名</TableHead>
                  {months.map((month) => (
                    <TableHead key={month} className="w-[100px] text-center text-xs py-1 px-2">
                      {formatMonthName(month)}
                    </TableHead>
                  ))}
                  <TableHead className="w-[120px] text-center font-bold text-xs py-1 px-2">年度合計</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* 純売上 */}
                {accountingItems
                  .filter(item => item.category === 'revenue')
                  .map((item) => (
                    <TableRow key={item.code} className={getCategoryColor(item.category)}>
                      <TableCell className="font-medium text-xs py-1 px-2">{item.code}</TableCell>
                      <TableCell className="text-xs py-1 px-2">{item.name}</TableCell>
                      {months.map((month) => (
                        <TableCell key={month} className="text-right font-mono text-xs py-1 px-2">
                          {formatCurrency(item.monthlyAmounts[month] || 0)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-mono font-bold text-xs py-1 px-2">
                        {formatCurrency(calculateAnnualTotal(item.monthlyAmounts))}
                      </TableCell>
                    </TableRow>
                  ))}
                {/* 純売上サマリ */}
                <TableRow className={getSummaryColor('revenue')}>
                  <TableCell colSpan={2} className="text-xs py-1 px-2">純売上計</TableCell>
                  {months.map((month) => (
                    <TableCell key={month} className="text-right font-mono text-xs py-1 px-2">
                      {formatCurrency(summaries.revenue.monthlyTotals[month] || 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-mono font-bold text-xs py-1 px-2">
                    {formatCurrency(calculateSummaryAnnualTotal(summaries.revenue.monthlyTotals))}
                  </TableCell>
                </TableRow>

                {/* 売上原価 */}
                {accountingItems
                  .filter(item => item.category === 'costOfSales')
                  .map((item) => (
                    <TableRow key={item.code} className={getCategoryColor(item.category)}>
                      <TableCell className="font-medium text-xs py-1 px-2">{item.code}</TableCell>
                      <TableCell className="text-xs py-1 px-2">{item.name}</TableCell>
                      {months.map((month) => (
                        <TableCell key={month} className="text-right font-mono text-xs py-1 px-2">
                          {formatCurrency(item.monthlyAmounts[month] || 0)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-mono font-bold text-xs py-1 px-2">
                        {formatCurrency(calculateAnnualTotal(item.monthlyAmounts))}
                      </TableCell>
                    </TableRow>
                  ))}
                {/* 売上原価サマリ */}
                <TableRow className={getSummaryColor('costOfSales')}>
                  <TableCell colSpan={2} className="text-xs py-1 px-2">売上原価計</TableCell>
                  {months.map((month) => (
                    <TableCell key={month} className="text-right font-mono text-xs py-1 px-2">
                      {formatCurrency(summaries.costOfSales.monthlyTotals[month] || 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-mono font-bold text-xs py-1 px-2">
                    {formatCurrency(calculateSummaryAnnualTotal(summaries.costOfSales.monthlyTotals))}
                  </TableCell>
                </TableRow>

                {/* 販管費 */}
                {accountingItems
                  .filter(item => item.category === 'sgaExpenses')
                  .map((item) => (
                    <TableRow key={item.code} className={getCategoryColor(item.category)}>
                      <TableCell className="font-medium text-xs py-1 px-2">{item.code}</TableCell>
                      <TableCell className="text-xs py-1 px-2">{item.name}</TableCell>
                      {months.map((month) => (
                        <TableCell key={month} className="text-right font-mono text-xs py-1 px-2">
                          {formatCurrency(item.monthlyAmounts[month] || 0)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-mono font-bold text-xs py-1 px-2">
                        {formatCurrency(calculateAnnualTotal(item.monthlyAmounts))}
                      </TableCell>
                    </TableRow>
                  ))}
                {/* 販管費サマリ */}
                <TableRow className={getSummaryColor('sgaExpenses')}>
                  <TableCell colSpan={2} className="text-xs py-1 px-2">販管費計</TableCell>
                  {months.map((month) => (
                    <TableCell key={month} className="text-right font-mono text-xs py-1 px-2">
                      {formatCurrency(summaries.sgaExpenses.monthlyTotals[month] || 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-mono font-bold text-xs py-1 px-2">
                    {formatCurrency(calculateSummaryAnnualTotal(summaries.sgaExpenses.monthlyTotals))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
