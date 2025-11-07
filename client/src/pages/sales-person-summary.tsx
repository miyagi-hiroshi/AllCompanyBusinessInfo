import { BarChart3 } from "lucide-react";
import React, { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { MultiSelect } from "@/components/ui/multi-select";
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
import { useSalesPersons } from "@/hooks/useSalesPersons";
import { useSalesPersonSummary } from "@/hooks/useSalesPersonSummary";

const FISCAL_YEARS = [2023, 2024, 2025, 2026];

// サービス区分の表示順序
const SERVICE_ORDER = ['インテグレーション', 'エンジニアリング', 'ソフトウェアマネージド', 'リセール'];

// 分析区分の表示順序
const ANALYSIS_TYPE_ORDER = ['生産性', '粗利'];

export default function SalesPersonSummaryPage() {
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [includeAngleB, setIncludeAngleB] = useState<boolean>(false);
  const [selectedSalesPersons, setSelectedSalesPersons] = useState<string[]>([]);

  // 営業担当者一覧取得
  const { data: salesPersons } = useSalesPersons();

  // 営業担当者別サマリデータ取得
  const { data: summaryData, isLoading } = useSalesPersonSummary(
    selectedYear,
    includeAngleB,
    selectedSalesPersons.length > 0 ? selectedSalesPersons : undefined
  );

  // 数値フォーマット関数
  const formatCurrency = (value: number) => {
    return `¥${value.toLocaleString()}`;
  };

  // 営業担当者リスト（マルチセレクト用）
  const salesPersonOptions = useMemo(() => {
    if (!salesPersons) return [];
    return salesPersons.map(person => ({
      label: person,
      value: person,
    }));
  }, [salesPersons]);

  // データを営業担当者別・サービス区分・分析区分別に整理
  const organizedData = useMemo(() => {
    if (!summaryData?.success || !summaryData.data) return null;

    const { summaries = [], salesPersons: allSalesPersons = [] } = summaryData.data;
    
    // summariesから営業担当者を取得（allSalesPersonsが空の場合のフォールバック）
    const salesPersonsFromSummaries = Array.from(new Set(summaries.map(s => s.salesPerson))).sort();
    const availableSalesPersons = allSalesPersons.length > 0 ? allSalesPersons : salesPersonsFromSummaries;
    
    const displaySalesPersons = selectedSalesPersons.length > 0 
      ? selectedSalesPersons 
      : availableSalesPersons;

    // 営業担当者別・サービス区分・分析区分別のマップを作成
    // Map<salesPerson, Map<serviceType, Map<analysisType, summary>>>
    const dataMap = new Map<string, Map<string, Map<string, typeof summaries[0]>>>();
    
    for (const summary of summaries) {
      if (!displaySalesPersons.includes(summary.salesPerson)) continue;
      
      if (!dataMap.has(summary.salesPerson)) {
        dataMap.set(summary.salesPerson, new Map());
      }
      
      const serviceMap = dataMap.get(summary.salesPerson)!;
      if (!serviceMap.has(summary.serviceType)) {
        serviceMap.set(summary.serviceType, new Map());
      }
      
      const analysisMap = serviceMap.get(summary.serviceType)!;
      analysisMap.set(summary.analysisType, summary);
    }

    // サービス区分・分析区分別の合計を計算
    // Map<`${serviceType}_${analysisType}`, totals>
    const serviceAnalysisTotals = new Map<string, {
      revenueWithAngleB: number;
      costOfSalesWithAngleB: number;
      grossProfitWithAngleB: number;
      revenueWithoutAngleB: number;
      costOfSalesWithoutAngleB: number;
      grossProfitWithoutAngleB: number;
    }>();

    for (const summary of summaries) {
      if (!displaySalesPersons.includes(summary.salesPerson)) continue;
      
      const key = `${summary.serviceType}_${summary.analysisType}`;
      if (!serviceAnalysisTotals.has(key)) {
        serviceAnalysisTotals.set(key, {
          revenueWithAngleB: 0,
          costOfSalesWithAngleB: 0,
          grossProfitWithAngleB: 0,
          revenueWithoutAngleB: 0,
          costOfSalesWithoutAngleB: 0,
          grossProfitWithoutAngleB: 0,
        });
      }
      
      const total = serviceAnalysisTotals.get(key)!;
      total.revenueWithAngleB += summary.revenueWithAngleB;
      total.costOfSalesWithAngleB += summary.costOfSalesWithAngleB;
      total.grossProfitWithAngleB += summary.grossProfitWithAngleB;
      total.revenueWithoutAngleB += summary.revenueWithoutAngleB;
      total.costOfSalesWithoutAngleB += summary.costOfSalesWithoutAngleB;
      total.grossProfitWithoutAngleB += summary.grossProfitWithoutAngleB;
    }

    // 全体合計を計算
    const grandTotal = {
      revenueWithAngleB: 0,
      costOfSalesWithAngleB: 0,
      grossProfitWithAngleB: 0,
      revenueWithoutAngleB: 0,
      costOfSalesWithoutAngleB: 0,
      grossProfitWithoutAngleB: 0,
    };

    for (const summary of summaries) {
      if (!displaySalesPersons.includes(summary.salesPerson)) continue;
      grandTotal.revenueWithAngleB += summary.revenueWithAngleB;
      grandTotal.costOfSalesWithAngleB += summary.costOfSalesWithAngleB;
      grandTotal.grossProfitWithAngleB += summary.grossProfitWithAngleB;
      grandTotal.revenueWithoutAngleB += summary.revenueWithoutAngleB;
      grandTotal.costOfSalesWithoutAngleB += summary.costOfSalesWithoutAngleB;
      grandTotal.grossProfitWithoutAngleB += summary.grossProfitWithoutAngleB;
    }

    return {
      dataMap,
      serviceAnalysisTotals,
      grandTotal,
      displaySalesPersons: displaySalesPersons.sort(),
    };
  }, [summaryData, selectedSalesPersons]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">営業担当者別サマリ</h1>
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
          <h1 className="text-2xl font-semibold">営業担当者別サマリ</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-500">データの取得に失敗しました</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!organizedData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">営業担当者別サマリ</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-500">データがありません</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { dataMap, serviceAnalysisTotals, grandTotal, displaySalesPersons } = organizedData;

  // displaySalesPersonsが空の場合でもテーブルを表示するための処理
  const hasData = displaySalesPersons.length > 0 || dataMap.size > 0;

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 space-y-3">
        {/* ページヘッダー */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">
              {selectedYear}年度 営業担当者別サマリ
              {includeAngleB ? "（受発注見込み+角度B）" : "（受発注見込みのみ）"}
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
            <div className="w-[300px]">
              <MultiSelect
                options={salesPersonOptions}
                selected={selectedSalesPersons}
                onChange={setSelectedSalesPersons}
                placeholder="営業担当者を選択"
              />
            </div>
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
            {!hasData ? (
              <p className="text-center text-gray-500 py-8">データがありません</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px] text-xs py-1 px-2 sticky left-0 bg-white">項目</TableHead>
                      {displaySalesPersons.map((salesPerson) => (
                        <TableHead key={salesPerson} className="w-[120px] text-center text-xs py-1 px-2">
                          {salesPerson}
                        </TableHead>
                      ))}
                      <TableHead className="w-[120px] text-center font-bold text-xs py-1 px-2">合計</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* 売上合計 */}
                    <TableRow className="text-green-700 bg-green-100 font-bold">
                      <TableCell className="text-xs py-1 px-2 sticky left-0 bg-green-100">売上合計</TableCell>
                      {displaySalesPersons.map((salesPerson) => {
                        let total = 0;
                        const serviceMap = dataMap.get(salesPerson);
                        if (serviceMap) {
                          for (const analysisMap of serviceMap.values()) {
                            for (const summary of analysisMap.values()) {
                              total += includeAngleB ? summary.revenueWithAngleB : summary.revenueWithoutAngleB;
                            }
                          }
                        }
                        return (
                          <TableCell key={salesPerson} className="text-right font-mono text-xs py-1 px-2">
                            {formatCurrency(total)}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-mono font-bold text-xs py-1 px-2">
                        {formatCurrency(includeAngleB ? grandTotal.revenueWithAngleB : grandTotal.revenueWithoutAngleB)}
                      </TableCell>
                    </TableRow>

                  {/* 売上原価合計 */}
                  <TableRow className="text-red-700 bg-red-100 font-bold">
                    <TableCell className="text-xs py-1 px-2 sticky left-0 bg-red-100">売上原価合計</TableCell>
                    {displaySalesPersons.map((salesPerson) => {
                      let total = 0;
                      const serviceMap = dataMap.get(salesPerson);
                      if (serviceMap) {
                        for (const analysisMap of serviceMap.values()) {
                          for (const summary of analysisMap.values()) {
                            total += includeAngleB ? summary.costOfSalesWithAngleB : summary.costOfSalesWithoutAngleB;
                          }
                        }
                      }
                      return (
                        <TableCell key={salesPerson} className="text-right font-mono text-xs py-1 px-2">
                          {formatCurrency(total)}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-mono font-bold text-xs py-1 px-2">
                      {formatCurrency(includeAngleB ? grandTotal.costOfSalesWithAngleB : grandTotal.costOfSalesWithoutAngleB)}
                    </TableCell>
                  </TableRow>

                  {/* 粗利 */}
                  <TableRow className="text-blue-700 bg-blue-100 font-bold">
                    <TableCell className="text-xs py-1 px-2 sticky left-0 bg-blue-100">粗利</TableCell>
                    {displaySalesPersons.map((salesPerson) => {
                      let total = 0;
                      const serviceMap = dataMap.get(salesPerson);
                      if (serviceMap) {
                        for (const analysisMap of serviceMap.values()) {
                          for (const summary of analysisMap.values()) {
                            total += includeAngleB ? summary.grossProfitWithAngleB : summary.grossProfitWithoutAngleB;
                          }
                        }
                      }
                      return (
                        <TableCell key={salesPerson} className="text-right font-mono text-xs py-1 px-2">
                          {formatCurrency(total)}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-mono font-bold text-xs py-1 px-2">
                      {formatCurrency(includeAngleB ? grandTotal.grossProfitWithAngleB : grandTotal.grossProfitWithoutAngleB)}
                    </TableCell>
                  </TableRow>

                  {/* サービス区分→分析区分毎のサマリ */}
                  {SERVICE_ORDER.map((serviceType) => {
                    // このサービス区分に存在する分析区分を取得
                    const analysisTypes = new Set<string>();
                    for (const salesPerson of displaySalesPersons) {
                      const serviceMap = dataMap.get(salesPerson);
                      const analysisMap = serviceMap?.get(serviceType);
                      if (analysisMap) {
                        for (const analysisType of analysisMap.keys()) {
                          analysisTypes.add(analysisType);
                        }
                      }
                    }
                    
                    // 分析区分が存在しない場合はスキップ
                    if (analysisTypes.size === 0) return null;

                    // 分析区分を順序通りにソート
                    const sortedAnalysisTypes = ANALYSIS_TYPE_ORDER.filter(at => analysisTypes.has(at));

                    return (
                      <React.Fragment key={serviceType}>
                        {/* サービス区分ヘッダー */}
                        <TableRow className="bg-gray-100">
                          <TableCell colSpan={displaySalesPersons.length + 2} className="text-xs font-bold py-1 px-2">
                            {serviceType}
                          </TableCell>
                        </TableRow>

                        {/* 分析区分毎のサマリ */}
                        {sortedAnalysisTypes.map((analysisType) => {
                          const key = `${serviceType}_${analysisType}`;
                          const serviceAnalysisTotal = serviceAnalysisTotals.get(key);
                          const showGrossProfit = analysisType === '粗利';

                          return (
                            <React.Fragment key={key}>
                              {/* 分析区分ヘッダー */}
                              <TableRow className="bg-gray-50">
                                <TableCell colSpan={displaySalesPersons.length + 2} className="text-xs font-medium py-1 px-2 pl-4">
                                  {analysisType}
                                </TableCell>
                              </TableRow>

                              {/* 売上 */}
                              <TableRow className="text-green-700 bg-green-50">
                                <TableCell className="text-xs py-1 px-2 sticky left-0 bg-green-50 pl-8">売上</TableCell>
                                {displaySalesPersons.map((salesPerson) => {
                                  const serviceMap = dataMap.get(salesPerson);
                                  const analysisMap = serviceMap?.get(serviceType);
                                  const summary = analysisMap?.get(analysisType);
                                  const value = includeAngleB 
                                    ? (summary?.revenueWithAngleB || 0)
                                    : (summary?.revenueWithoutAngleB || 0);
                                  return (
                                    <TableCell key={salesPerson} className="text-right font-mono text-xs py-1 px-2">
                                      {formatCurrency(value)}
                                    </TableCell>
                                  );
                                })}
                                <TableCell className="text-right font-mono font-bold text-xs py-1 px-2">
                                  {formatCurrency(includeAngleB 
                                    ? (serviceAnalysisTotal?.revenueWithAngleB || 0)
                                    : (serviceAnalysisTotal?.revenueWithoutAngleB || 0))}
                                </TableCell>
                              </TableRow>

                              {/* 売上原価 */}
                              <TableRow className="text-red-700 bg-red-50">
                                <TableCell className="text-xs py-1 px-2 sticky left-0 bg-red-50 pl-8">売上原価</TableCell>
                                {displaySalesPersons.map((salesPerson) => {
                                  const serviceMap = dataMap.get(salesPerson);
                                  const analysisMap = serviceMap?.get(serviceType);
                                  const summary = analysisMap?.get(analysisType);
                                  const value = includeAngleB 
                                    ? (summary?.costOfSalesWithAngleB || 0)
                                    : (summary?.costOfSalesWithoutAngleB || 0);
                                  return (
                                    <TableCell key={salesPerson} className="text-right font-mono text-xs py-1 px-2">
                                      {formatCurrency(value)}
                                    </TableCell>
                                  );
                                })}
                                <TableCell className="text-right font-mono font-bold text-xs py-1 px-2">
                                  {formatCurrency(includeAngleB 
                                    ? (serviceAnalysisTotal?.costOfSalesWithAngleB || 0)
                                    : (serviceAnalysisTotal?.costOfSalesWithoutAngleB || 0))}
                                </TableCell>
                              </TableRow>

                              {/* 粗利（分析区分が「粗利」の場合のみ表示） */}
                              {showGrossProfit && (
                                <TableRow className="text-blue-700 bg-blue-50">
                                  <TableCell className="text-xs py-1 px-2 sticky left-0 bg-blue-50 pl-8">粗利</TableCell>
                                  {displaySalesPersons.map((salesPerson) => {
                                    const serviceMap = dataMap.get(salesPerson);
                                    const analysisMap = serviceMap?.get(serviceType);
                                    const summary = analysisMap?.get(analysisType);
                                    const value = includeAngleB 
                                      ? (summary?.grossProfitWithAngleB || 0)
                                      : (summary?.grossProfitWithoutAngleB || 0);
                                    return (
                                      <TableCell key={salesPerson} className="text-right font-mono text-xs py-1 px-2">
                                        {formatCurrency(value)}
                                      </TableCell>
                                    );
                                  })}
                                  <TableCell className="text-right font-mono font-bold text-xs py-1 px-2">
                                    {formatCurrency(includeAngleB 
                                      ? (serviceAnalysisTotal?.grossProfitWithAngleB || 0)
                                      : (serviceAnalysisTotal?.grossProfitWithoutAngleB || 0))}
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

