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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type ProjectAnalysisSummary,useProjectAnalysis } from "@/hooks/useProjectAnalysis";
import { cn } from "@/lib/utils";

const FISCAL_YEARS = [2023, 2024, 2025, 2026];

// サービス区分の表示順序
const SERVICE_ORDER = ['インテグレーション', 'エンジニアリング', 'ソフトウェアマネージド', 'リセール'];

// 分析区分の表示順序
const ANALYSIS_TYPE_ORDER = ['生産性', '粗利'];

export default function ProjectAnalysisPage() {
  const [selectedYear, setSelectedYear] = useState<number>(2025);

  // プロジェクト分析サマリー取得
  const { data: analysisData, isLoading } = useProjectAnalysis(selectedYear);

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

  // 達成度による色分けを返す関数
  const getAchievementColor = (actualValue: number, targetValue?: number): string => {
    if (targetValue === undefined || targetValue === 0) {
      return ''; // 目標値がない場合は色分けなし
    }
    
    const achievementRate = actualValue / targetValue;
    
    if (achievementRate >= 1.1) {
      // 大幅達成（110%以上）：緑
      return 'text-green-600 bg-green-50 font-semibold';
    } else if (achievementRate >= 1.0) {
      // 達成（100%以上110%未満）：青
      return 'text-blue-600 bg-blue-50 font-semibold';
    } else {
      // 未達（100%未満）：赤
      return 'text-red-600 bg-red-50 font-semibold';
    }
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

  // データを平坦化する関数
  const flattenData = (projects: ProjectAnalysisSummary[]) => {
    const rows: Array<{
      type: 'project' | 'subtotal';
      serviceType: string;
      projectName?: string;
      projectCode?: string;
      analysisType: string;
      revenue: number;
      costOfSales: number;
      sgaExpenses: number;
      workHours: number;
      targetValue?: number;
      actualValue?: number;
    }> = [];

    // サービス区分→分析区分でグループ化
    const grouped = projects.reduce((acc, project) => {
      const key = `${project.serviceType}_${project.analysisType}`;
      if (!acc[key]) {
        acc[key] = {
          serviceType: project.serviceType,
          analysisType: project.analysisType,
          projects: []
        };
      }
      acc[key].projects.push(project);
      return acc;
    }, {} as Record<string, any>);

    // サービス順、分析区分順でソート
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      const [serviceA, analysisA] = a.split('_');
      const [serviceB, analysisB] = b.split('_');
      
      const serviceIndexA = SERVICE_ORDER.indexOf(serviceA);
      const serviceIndexB = SERVICE_ORDER.indexOf(serviceB);
      if (serviceIndexA !== serviceIndexB) {
        return serviceIndexA - serviceIndexB;
      }
      
      const analysisIndexA = ANALYSIS_TYPE_ORDER.indexOf(analysisA);
      const analysisIndexB = ANALYSIS_TYPE_ORDER.indexOf(analysisB);
      return analysisIndexA - analysisIndexB;
    });

    // 各グループのプロジェクト行と小計行を追加
    for (const key of sortedKeys) {
      const group = grouped[key];
      
      // プロジェクト行
      for (const project of group.projects) {
        rows.push({
          type: 'project',
          serviceType: project.serviceType,
          projectName: project.name,
          projectCode: project.code,
          analysisType: project.analysisType,
          revenue: project.revenue,
          costOfSales: project.costOfSales,
          sgaExpenses: project.sgaExpenses,
          workHours: project.workHours,
          actualValue: project.analysisType === '生産性' ? project.productivity : project.grossProfit
        });
      }

      // 小計行
      const summary = calculateGroupSummary(group.projects);
      rows.push({
        type: 'subtotal',
        serviceType: group.serviceType,
        analysisType: group.analysisType,
        revenue: summary.totalRevenue,
        costOfSales: summary.totalCostOfSales,
        sgaExpenses: summary.totalSgaExpenses,
        workHours: summary.totalWorkHours,
        targetValue: group.projects[0]?.targetValue,
        actualValue: group.analysisType === '生産性' 
          ? summary.totalProductivity 
          : summary.totalGrossProfit
      });
    }

    return rows;
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 space-y-3">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">{selectedYear}年度 プロジェクト分析</h1>
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

        {/* 統一テーブル */}
        {isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <Card>
            <CardContent className="p-4">
              {analysisData?.data?.projects?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {selectedYear}年度のプロジェクトデータがありません
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px] text-xs py-1 px-2">サービス</TableHead>
                      <TableHead className="w-[80px] text-xs py-1 px-2">分析区分</TableHead>
                      <TableHead className="w-[180px] text-xs py-1 px-2">プロジェクト名</TableHead>
                      <TableHead className="text-right w-[100px] text-xs py-1 px-2">売上</TableHead>
                      <TableHead className="text-right w-[100px] text-xs py-1 px-2">仕入高</TableHead>
                      <TableHead className="text-right w-[100px] text-xs py-1 px-2">販管費</TableHead>
                      <TableHead className="text-right w-[100px] text-xs py-1 px-2">山積み工数</TableHead>
                      <TableHead className="text-right w-[110px] text-xs py-1 px-2">生産性/粗利(目標)</TableHead>
                      <TableHead className="text-right w-[110px] text-xs py-1 px-2">生産性/粗利(実績)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flattenData(analysisData?.data?.projects || []).map((row, index) => (
                      <TableRow 
                        key={index} 
                        className={row.type === 'subtotal' ? 'font-bold bg-muted/50' : ''}
                      >
                        {/* サービス列 */}
                        <TableCell className="text-xs py-1 px-2">
                          {row.type === 'subtotal' ? row.serviceType : ''}
                        </TableCell>
                        
                        {/* 分析区分列 */}
                        <TableCell className="text-xs py-1 px-2">
                          {row.type === 'subtotal' ? row.analysisType : ''}
                        </TableCell>
                        
                        {/* プロジェクト名列 */}
                        <TableCell className="text-xs py-1 px-2">
                          {row.type === 'project' ? (
                            <div>
                              <div className="font-semibold">{row.projectName}</div>
                              <div className="text-muted-foreground">{row.projectCode}</div>
                            </div>
                          ) : '-'}
                        </TableCell>
                        
                        {/* 売上列 */}
                        <TableCell className="text-right font-mono text-xs py-1 px-2">
                          {formatCurrency(row.revenue)}
                        </TableCell>
                        
                        {/* 仕入高列 */}
                        <TableCell className="text-right font-mono text-xs py-1 px-2">
                          {formatCurrency(row.costOfSales)}
                        </TableCell>
                        
                        {/* 販管費列 */}
                        <TableCell className="text-right font-mono text-xs py-1 px-2">
                          {formatCurrency(row.sgaExpenses)}
                        </TableCell>
                        
                        {/* 山積み工数列 */}
                        <TableCell className="text-right font-mono text-xs py-1 px-2">
                          {row.analysisType === '生産性' ? formatHours(row.workHours) : '-'}
                        </TableCell>
                        
                        {/* 生産性/粗利(目標)列 */}
                        <TableCell className="text-right font-mono text-xs py-1 px-2">
                          {row.type === 'subtotal' && row.targetValue !== undefined
                            ? (row.analysisType === '生産性'
                                ? formatProductivity(row.targetValue)
                                : formatCurrency(row.targetValue))
                            : '-'
                          }
                        </TableCell>
                        
                        {/* 生産性/粗利(実績)列 */}
                        <TableCell className={cn(
                          "text-right font-mono text-xs py-1 px-2",
                          row.type === 'subtotal' 
                            ? getAchievementColor(row.actualValue || 0, row.targetValue)
                            : ''
                        )}>
                          {row.actualValue !== undefined
                            ? (row.analysisType === '生産性'
                                ? formatProductivity(row.actualValue)
                                : formatCurrency(row.actualValue))
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
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