import { BarChart3 } from "lucide-react";
import { useState } from "react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import { type ProjectAnalysisSummary,useProjectAnalysis } from "@/hooks/useProjectAnalysis";

const FISCAL_YEARS = [2023, 2024, 2025, 2026];

// サービス区分の表示順序
const SERVICE_ORDER = ['インテグレーション', 'エンジニアリング', 'ソフトウェアマネージド', 'リセール'];

// 分析区分の表示順序
const ANALYSIS_TYPE_ORDER = ['生産性', '粗利'];

export default function ProjectAnalysisPage() {
  const [selectedYear, setSelectedYear] = useState<number>(2025);

  // プロジェクト分析サマリー取得
  const { data: analysisData, isLoading } = useProjectAnalysis(selectedYear);

  // データをサービス区分→分析区分でグループ化
  const groupedData = analysisData?.data?.projects?.reduce((acc, project) => {
    const serviceType = project.serviceType;
    const analysisType = project.analysisType;

    if (!acc[serviceType]) {
      acc[serviceType] = {};
    }
    if (!acc[serviceType][analysisType]) {
      acc[serviceType][analysisType] = [];
    }

    acc[serviceType][analysisType].push(project);
    return acc;
  }, {} as Record<string, Record<string, ProjectAnalysisSummary[]>>) || {};

  // サービス区分を表示順序でソート
  const sortedServiceTypes = SERVICE_ORDER.filter(service => groupedData[service]);

  // 数値フォーマット関数
  const formatCurrency = (value: number) => {
    return `¥${value.toLocaleString()}`;
  };

  const formatHours = (value: number) => {
    return `${value.toFixed(1)}人月`;
  };

  const formatProductivity = (value: number) => {
    return `¥${Math.round(value).toLocaleString()}/人月`;
  };

  // グループのサマリー計算
  const calculateGroupSummary = (projects: ProjectAnalysisSummary[]) => {
    const totalRevenue = projects.reduce((sum, p) => sum + p.revenue, 0);
    const totalCostOfSales = projects.reduce((sum, p) => sum + p.costOfSales, 0);
    const totalSgaExpenses = projects.reduce((sum, p) => sum + p.sgaExpenses, 0);
    const totalWorkHours = projects.reduce((sum, p) => sum + p.workHours, 0);
    const totalGrossProfit = totalRevenue - totalCostOfSales - totalSgaExpenses;
    const totalProductivity = totalWorkHours > 0 ? totalGrossProfit / totalWorkHours : 0;

    return {
      totalRevenue,
      totalCostOfSales,
      totalSgaExpenses,
      totalWorkHours,
      totalGrossProfit,
      totalProductivity,
    };
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold" data-testid="text-page-title">
                プロジェクト分析
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
            </div>
          </div>
          <p className="text-muted-foreground mt-1">年度ごとのプロジェクト毎サマリーリストを表示します</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{selectedYear}年度 プロジェクト分析サマリー</CardTitle>
              <CardDescription>
                サービス区分→分析区分でグループ化されたプロジェクト一覧
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sortedServiceTypes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {selectedYear}年度のプロジェクトデータがありません
                </div>
              ) : (
                <Accordion type="multiple" className="w-full" defaultValue={SERVICE_ORDER}>
                  {sortedServiceTypes.map((serviceType) => {
                    const serviceData = groupedData[serviceType];
                    const analysisTypes = ANALYSIS_TYPE_ORDER.filter(type => serviceData[type]);

                    return (
                      <AccordionItem key={serviceType} value={serviceType}>
                        <AccordionTrigger className="text-lg font-semibold">
                          {serviceType}サービス
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-6">
                            {analysisTypes.map((analysisType) => {
                              const projects = serviceData[analysisType];
                              const summary = calculateGroupSummary(projects);

                              return (
                                <div key={analysisType} className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-base font-medium">{analysisType}</h4>
                                    <Badge variant="outline">{projects.length}件</Badge>
                                  </div>
                                  
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-[200px]">プロジェクト名</TableHead>
                                        <TableHead className="text-right w-[120px]">売上</TableHead>
                                        <TableHead className="text-right w-[120px]">仕入高</TableHead>
                                        <TableHead className="text-right w-[120px]">販管費</TableHead>
                                        {analysisType === '生産性' && (
                                          <TableHead className="text-right w-[120px]">山積み工数（人月）</TableHead>
                                        )}
                                        {analysisType === '粗利' && (
                                          <TableHead className="text-right w-[120px]">-</TableHead>
                                        )}
                                        <TableHead className="text-right w-[120px]">
                                          {analysisType === '生産性' ? '生産性（円/人月）' : '粗利'}
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {projects.map((project) => (
                                        <TableRow key={project.id}>
                                          <TableCell className="font-medium">
                                            <div>
                                              <div className="font-semibold">{project.name}</div>
                                              <div className="text-sm text-muted-foreground">{project.code}</div>
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-right font-mono">
                                            {formatCurrency(project.revenue)}
                                          </TableCell>
                                          <TableCell className="text-right font-mono">
                                            {formatCurrency(project.costOfSales)}
                                          </TableCell>
                                          <TableCell className="text-right font-mono">
                                            {formatCurrency(project.sgaExpenses)}
                                          </TableCell>
                                          {analysisType === '生産性' && (
                                            <TableCell className="text-right font-mono">
                                              {formatHours(project.workHours)}
                                            </TableCell>
                                          )}
                                          {analysisType === '粗利' && (
                                            <TableCell className="text-right text-muted-foreground">
                                              -
                                            </TableCell>
                                          )}
                                          <TableCell className="text-right font-mono">
                                            {analysisType === '生産性' && project.productivity !== undefined
                                              ? formatProductivity(project.productivity)
                                              : analysisType === '粗利' && project.grossProfit !== undefined
                                              ? formatCurrency(project.grossProfit)
                                              : '-'
                                            }
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                      
                                      {/* サマリー行 */}
                                      <TableRow className="font-bold bg-muted/50">
                                        <TableCell>合計</TableCell>
                                        <TableCell className="text-right font-mono">
                                          {formatCurrency(summary.totalRevenue)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                          {formatCurrency(summary.totalCostOfSales)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                          {formatCurrency(summary.totalSgaExpenses)}
                                        </TableCell>
                                        {analysisType === '生産性' && (
                                          <TableCell className="text-right font-mono">
                                            {formatHours(summary.totalWorkHours)}
                                          </TableCell>
                                        )}
                                        {analysisType === '粗利' && (
                                          <TableCell className="text-right text-muted-foreground">
                                            -
                                          </TableCell>
                                        )}
                                        <TableCell className="text-right font-mono">
                                          {analysisType === '生産性'
                                            ? formatProductivity(summary.totalProductivity)
                                            : formatCurrency(summary.totalGrossProfit)
                                          }
                                        </TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}