import type { SnapshotDataRow } from "@shared/schema/projectAnalysisSnapshot/types";
import { GitCompare } from "lucide-react";
import React, { useMemo } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompareProjectAnalysisSnapshots, useProjectAnalysisSnapshot } from "@/hooks/useProjectAnalysisSnapshots";
import { cn } from "@/lib/utils";

interface ProjectAnalysisSnapshotCompareProps {
  snapshotId1: string;
  snapshotId2: string;
  currentData?: Array<{
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
  }>;
  currentLabel?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formatCurrency: (value: number) => string;
  formatHours: (value: number) => string;
  formatProductivity: (value: number) => string;
  getAchievementColor: (actualValue: number, targetValue?: number) => string;
}

export function ProjectAnalysisSnapshotCompare({
  snapshotId1,
  snapshotId2,
  currentData,
  currentLabel = '現在',
  open,
  onOpenChange,
  formatCurrency,
  formatHours,
  formatProductivity,
  getAchievementColor: _getAchievementColor,
}: ProjectAnalysisSnapshotCompareProps) {
  const isCurrent1 = snapshotId1 === 'current';
  const isCurrent2 = snapshotId2 === 'current';

  const { data: compareData, isLoading } = useCompareProjectAnalysisSnapshots(
    isCurrent1 ? '' : snapshotId1,
    isCurrent2 ? '' : snapshotId2,
    {
      enabled: !isCurrent1 && !isCurrent2, // 「現在」が含まれている場合はAPIを呼ばない
    }
  );

  // 「現在」+ スナップショットの場合、個別にスナップショットを取得
  const { data: snapshot1Data } = useProjectAnalysisSnapshot(
    !isCurrent1 && snapshotId1 ? snapshotId1 : ''
  );
  const { data: snapshot2Data } = useProjectAnalysisSnapshot(
    !isCurrent2 && snapshotId2 ? snapshotId2 : ''
  );

  // 差分計算関数
  const calculateDiff = (value1: number, value2: number): number => {
    return value2 - value1;
  };

  // 差分の色分けクラス
  const getDiffColor = (diff: number): string => {
    if (diff > 0) {
      return 'text-green-600 bg-green-50';
    } else if (diff < 0) {
      return 'text-red-600 bg-red-50';
    }
    return '';
  };

  // 比較用データの準備
  const comparisonRows = useMemo(() => {
    let rows1: SnapshotDataRow[] = [];
    let rows2: SnapshotDataRow[] = [];
    let label1 = '';
    let label2 = '';
    
    if (isCurrent1 && currentData) {
      rows1 = currentData as SnapshotDataRow[];
      label1 = currentLabel;
    } else if (compareData?.data?.snapshot1) {
      rows1 = compareData.data.snapshot1.snapshotData.rows;
      label1 = compareData.data.snapshot1.name;
    } else if (snapshot1Data?.data) {
      // 「現在」+ スナップショットの場合、個別に取得したデータを使用
      rows1 = snapshot1Data.data.snapshotData.rows;
      label1 = snapshot1Data.data.name;
    }
    
    if (isCurrent2 && currentData) {
      rows2 = currentData as SnapshotDataRow[];
      label2 = currentLabel;
    } else if (compareData?.data?.snapshot2) {
      rows2 = compareData.data.snapshot2.snapshotData.rows;
      label2 = compareData.data.snapshot2.name;
    } else if (snapshot2Data?.data) {
      // 「現在」+ スナップショットの場合、個別に取得したデータを使用
      rows2 = snapshot2Data.data.snapshotData.rows;
      label2 = snapshot2Data.data.name;
    }
    
    if (rows1.length === 0 && rows2.length === 0) {
      return { rows: [], label1: '', label2: '' };
    }

    // 両方のスナップショットの行をマージ
    // プロジェクト行はIDでマッチング、小計行はサービス区分+分析区分でマッチング
    const mergedRows: Array<{
      row1?: SnapshotDataRow;
      row2?: SnapshotDataRow;
      key: string;
    }> = [];

    // 行1を基準にマージ
    rows1.forEach((row1) => {
      const key = row1.type === 'project'
        ? `${row1.type}_${row1.projectCode}`
        : `${row1.type}_${row1.serviceType}_${row1.analysisType}`;
      
      const row2 = rows2.find((r2) => {
        if (row1.type === 'project' && r2.type === 'project') {
          return r2.projectCode === row1.projectCode;
        }
        if (row1.type === 'subtotal' && r2.type === 'subtotal') {
          return r2.serviceType === row1.serviceType && r2.analysisType === row1.analysisType;
        }
        return false;
      });

      mergedRows.push({ row1, row2, key });
    });

    // 行2にのみ存在する行を追加
    rows2.forEach((row2) => {
      const key = row2.type === 'project'
        ? `${row2.type}_${row2.projectCode}`
        : `${row2.type}_${row2.serviceType}_${row2.analysisType}`;
      
      const exists = mergedRows.some(mr => mr.key === key);
      if (!exists) {
        mergedRows.push({ row2, key });
      }
    });

    return { rows: mergedRows, label1, label2 };
  }, [compareData, currentData, isCurrent1, isCurrent2, currentLabel, snapshot1Data, snapshot2Data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            スナップショット比較分析
          </DialogTitle>
          <DialogDescription>
            {comparisonRows.label1 && comparisonRows.label2 && (
              <>
                {comparisonRows.label1} vs {comparisonRows.label2}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {(isLoading && !isCurrent1 && !isCurrent2) || (snapshot1Data?.data === undefined && !isCurrent1 && snapshotId1) || (snapshot2Data?.data === undefined && !isCurrent2 && snapshotId2) ? (
          <div className="py-8 text-center text-muted-foreground">
            読み込み中...
          </div>
        ) : comparisonRows.rows.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            データがありません
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px] text-xs py-1 px-2">サービス</TableHead>
                  <TableHead className="w-[80px] text-xs py-1 px-2">分析区分</TableHead>
                  <TableHead className="w-[180px] text-xs py-1 px-2">プロジェクト名</TableHead>
                  <TableHead className="text-right w-[100px] text-xs py-1 px-2">項目</TableHead>
                  <TableHead className="text-right w-[120px] text-xs py-1 px-2">
                    {comparisonRows.label1 || 'スナップショット1'}
                  </TableHead>
                  <TableHead className="text-right w-[120px] text-xs py-1 px-2">
                    {comparisonRows.label2 || 'スナップショット2'}
                  </TableHead>
                  <TableHead className="text-right w-[100px] text-xs py-1 px-2">差分</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonRows.rows.map((merged) => {
                  const row1 = merged.row1;
                  const row2 = merged.row2;
                  
                  if (!row1 && !row2) {
                    return null;
                  }

                  // プロジェクト行と小計行の両方に対応
                  const isSubtotal = row1?.type === 'subtotal' || row2?.type === 'subtotal';
                  const analysisType = row1?.analysisType || row2?.analysisType;
                  
                  // 比較する項目
                  const items = [
                    { label: '売上', key: 'revenue' as const },
                    { label: '売上原価', key: 'costOfSales' as const },
                    { label: '販管費', key: 'sgaExpenses' as const },
                    { label: '山積み工数', key: 'workHours' as const },
                    { label: analysisType === '生産性' ? '生産性' : '粗利', key: 'actualValue' as const },
                  ];

                  return (
                    <React.Fragment key={merged.key}>
                      {/* プロジェクト行の場合、プロジェクト情報を表示 */}
                      {!isSubtotal && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={7} className="text-xs py-1 px-2">
                            <div className="font-semibold">
                              {row1?.projectName || row2?.projectName}
                            </div>
                            <div className="text-muted-foreground">
                              {row1?.projectCode || row2?.projectCode}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {/* 各項目の比較行 */}
                      {items.map((item) => {
                        const value1 = (row1?.[item.key] ?? 0);
                        const value2 = (row2?.[item.key] ?? 0);
                        const diff = calculateDiff(value1, value2);
                        
                        // フォーマット関数の選択
                        const formatValue = (val: number) => {
                          if (item.key === 'revenue' || item.key === 'costOfSales' || item.key === 'sgaExpenses') {
                            return formatCurrency(val);
                          }
                          if (item.key === 'workHours') {
                            return formatHours(val);
                          }
                          if (item.key === 'actualValue') {
                            return analysisType === '生産性' 
                              ? formatProductivity(val)
                              : formatCurrency(val);
                          }
                          return String(val);
                        };

                        return (
                          <TableRow 
                            key={`${merged.key}_${item.key}`}
                            className={cn(
                              isSubtotal && 'font-bold bg-muted/50'
                            )}
                          >
                            {/* サービス列 */}
                            <TableCell className="text-xs py-1 px-2">
                              {isSubtotal ? (row1?.serviceType || row2?.serviceType) : ''}
                            </TableCell>
                            
                            {/* 分析区分列 */}
                            <TableCell className="text-xs py-1 px-2">
                              {isSubtotal ? analysisType : ''}
                            </TableCell>
                            
                            {/* プロジェクト名列 */}
                            <TableCell className="text-xs py-1 px-2">
                              {isSubtotal ? '-' : ''}
                            </TableCell>
                            
                            {/* 項目列 */}
                            <TableCell className="text-right font-mono text-xs py-1 px-2">
                              {item.label}
                            </TableCell>
                            
                            {/* スナップショット1の値 */}
                            <TableCell className="text-right font-mono text-xs py-1 px-2">
                              {row1 ? formatValue(value1) : '-'}
                            </TableCell>
                            
                            {/* スナップショット2の値 */}
                            <TableCell className="text-right font-mono text-xs py-1 px-2">
                              {row2 ? formatValue(value2) : '-'}
                            </TableCell>
                            
                            {/* 差分列 */}
                            <TableCell className={cn(
                              "text-right font-mono text-xs py-1 px-2",
                              row1 && row2 && getDiffColor(diff)
                            )}>
                              {row1 && row2 ? (
                                <>
                                  {diff > 0 ? '+' : diff < 0 ? '' : ''}
                                  {diff !== 0 ? formatValue(Math.abs(diff)) : '0'}
                                </>
                              ) : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

