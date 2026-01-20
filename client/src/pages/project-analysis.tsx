import { BarChart3, Camera, Check, ChevronsUpDown, GitCompare } from "lucide-react";
import { useMemo, useState } from "react";

import { ProjectAnalysisSnapshotCompare } from "@/components/project-analysis-snapshot-compare";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { type ProjectAnalysisSummary, useProjectAnalysis } from "@/hooks/useProjectAnalysis";
import {
  useCreateProjectAnalysisSnapshot,
  useProjectAnalysisSnapshots,
} from "@/hooks/useProjectAnalysisSnapshots";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

const FISCAL_YEARS = [2023, 2024, 2025, 2026];

// サービス区分の表示順序
const SERVICE_ORDER = ['インテグレーション', 'エンジニアリング', 'ソフトウェアマネージド', 'リセール'];

// 分析区分の表示順序
const ANALYSIS_TYPE_ORDER = ['生産性', '粗利'];

export default function ProjectAnalysisPage() {
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedSnapshots, setSelectedSnapshots] = useState<string[]>(['current']);
  const [isSnapshotDialogOpen, setIsSnapshotDialogOpen] = useState(false);
  const [snapshotName, setSnapshotName] = useState<string>("");
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState(false);
  const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false);

  const { toast } = useToast();

  // プロジェクト分析サマリー取得
  const { data: analysisData, isLoading } = useProjectAnalysis(selectedYear);

  // スナップショット一覧取得
  const { data: snapshotsData } = useProjectAnalysisSnapshots(selectedYear);
  const snapshots = snapshotsData?.data || [];

  // スナップショット作成Mutation
  const createSnapshotMutation = useCreateProjectAnalysisSnapshot();

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

  // スナップショット作成ハンドラー
  const handleCreateSnapshot = () => {
    if (!analysisData?.data?.projects || analysisData.data.projects.length === 0) {
      toast({
        title: "エラー",
        description: "分析結果がありません",
        variant: "destructive",
      });
      return;
    }
    setIsSnapshotDialogOpen(true);
  };

  // スナップショット作成実行
  const handleCreateSnapshotSubmit = async () => {
    if (!snapshotName.trim()) {
      toast({
        title: "エラー",
        description: "スナップショット名を入力してください",
        variant: "destructive",
      });
      return;
    }

    if (!analysisData?.data?.projects) {
      return;
    }

    try {
      const rows = flattenData(analysisData.data.projects);
      await createSnapshotMutation.mutateAsync({
        fiscalYear: selectedYear,
        name: snapshotName.trim(),
        snapshotData: { rows },
      });

      toast({
        title: "成功",
        description: "スナップショットを作成しました",
      });

      setSnapshotName("");
      setIsSnapshotDialogOpen(false);
    } catch (_error) {
      toast({
        title: "エラー",
        description: "スナップショットの作成に失敗しました",
        variant: "destructive",
      });
    }
  };

  // スナップショット選択ハンドラー
  const handleSnapshotToggle = (value: string) => {
    if (value === 'current') {
      // 「現在」のトグル
      if (selectedSnapshots.includes('current')) {
        // 「現在」を解除する場合
        setSelectedSnapshots(selectedSnapshots.filter(id => id !== 'current'));
      } else {
        // 「現在」を追加する場合（既存の選択を保持）
        setSelectedSnapshots([...selectedSnapshots, 'current']);
      }
    } else {
      // スナップショットのトグル
      if (selectedSnapshots.includes(value)) {
        // スナップショットを解除する場合
        setSelectedSnapshots(selectedSnapshots.filter(id => id !== value));
      } else {
        // スナップショットを追加する場合（「現在」を含めて既存の選択を保持）
        setSelectedSnapshots([...selectedSnapshots, value]);
      }
    }
  };

  // 表示用データの取得
  const displayRows = useMemo(() => {
    if (selectedSnapshots.length === 0 || selectedSnapshots.includes('current')) {
      // 「現在」が選択されている場合、または何も選択されていない場合
      return flattenData(analysisData?.data?.projects || []);
    } else {
      // スナップショットが選択されている場合
      const selectedSnapshotId = selectedSnapshots.find(id => id !== 'current');
      if (selectedSnapshotId) {
        const snapshot = snapshots.find(s => s.id === selectedSnapshotId);
        return snapshot?.snapshotData.rows || [];
      }
      return [];
    }
  }, [selectedSnapshots, analysisData, snapshots]);

  // マルチセレクトの選択肢
  const snapshotOptions = useMemo(() => {
    const options = [
      { label: '現在', value: 'current' },
      ...snapshots.map(snapshot => ({
        label: `${snapshot.name} (${new Date(snapshot.createdAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })})`,
        value: snapshot.id,
      })),
    ];
    return options;
  }, [snapshots]);

  // 比較分析ボタンの有効化判定
  const canCompare = useMemo(() => {
    const hasCurrent = selectedSnapshots.includes('current');
    const snapshotIds = selectedSnapshots.filter(id => id !== 'current');
    
    // 「現在」+ スナップショット1件、またはスナップショット2件
    return (hasCurrent && snapshotIds.length === 1) || snapshotIds.length === 2;
  }, [selectedSnapshots]);

  // 比較分析実行
  const handleCompare = () => {
    const hasCurrent = selectedSnapshots.includes('current');
    const snapshotIds = selectedSnapshots.filter(id => id !== 'current');
    
    if ((hasCurrent && snapshotIds.length === 1) || snapshotIds.length === 2) {
      setIsCompareDialogOpen(true);
    }
  };

  // 比較対象のスナップショットID取得（作成日時でソート：古い→新しい）
  const compareSnapshotIds = useMemo(() => {
    const hasCurrent = selectedSnapshots.includes('current');
    const snapshotIds = selectedSnapshots.filter(id => id !== 'current');
    
    if (hasCurrent && snapshotIds.length === 1) {
      // 「現在」+ スナップショット1件の場合
      const snapshot = snapshots.find(s => snapshotIds.includes(s.id));
      if (!snapshot) {
        return ['current', ''];
      }
      
      // 「現在」を常に最新のデータとして扱い、スナップショットより新しいと仮定
      // 古い方が左、新しい方が右
      // 「現在」は常に最新なので、スナップショットが古い場合は左に配置
      return [snapshot.id, 'current'];
    } else if (snapshotIds.length === 2) {
      // スナップショット2件の場合（既存ロジック）
      const selectedSnapshotsData = snapshots.filter(s => snapshotIds.includes(s.id));
      
      if (selectedSnapshotsData.length !== 2) {
        // スナップショットが見つからない場合はフォールバック
        return snapshotIds;
      }
      
      // createdAtでソート（古い順）
      const sortedSnapshots = [...selectedSnapshotsData].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      // 古い方が左（snapshot1）、新しい方が右（snapshot2）
      return [sortedSnapshots[0].id, sortedSnapshots[1].id];
    }
    
    return ['', ''];
  }, [selectedSnapshots, snapshots]);

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 space-y-3">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">{selectedYear}年度 プロジェクト分析</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* 年度選択 */}
            <Select value={selectedYear.toString()} onValueChange={(value) => {
              setSelectedYear(parseInt(value));
              // 年度変更時に選択を「現在」にリセット
              setSelectedSnapshots(['current']);
            }}>
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

            {/* スナップショット取得ボタン */}
            <Button
              variant="outline"
              size="sm"
              disabled={!analysisData?.data?.projects || analysisData.data.projects.length === 0}
              onClick={handleCreateSnapshot}
            >
              <Camera className="h-4 w-4 mr-2" />
              スナップショット取得
            </Button>

            {/* マルチセレクト */}
            <Popover open={isMultiSelectOpen} onOpenChange={setIsMultiSelectOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-between">
                  {selectedSnapshots.length === 0 ? (
                    "現在"
                  ) : selectedSnapshots.length === 1 ? (
                    selectedSnapshots[0] === 'current' 
                      ? '現在'
                      : snapshotOptions.find(opt => opt.value === selectedSnapshots[0])?.label || '選択中'
                  ) : (
                    `${selectedSnapshots.length}件選択中`
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="検索..." />
                  <CommandList>
                    <CommandEmpty>見つかりません</CommandEmpty>
                    <CommandGroup>
                      {/* 「現在」オプション */}
                      <CommandItem
                        value="current"
                        onSelect={() => handleSnapshotToggle("current")}
                      >
                        <div className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          selectedSnapshots.includes("current")
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}>
                          <Check className="h-4 w-4" />
                        </div>
                        現在
                      </CommandItem>

                      {/* スナップショット履歴（動的生成） */}
                      {snapshots.map((snapshot) => (
                        <CommandItem
                          key={snapshot.id}
                          value={snapshot.id}
                          onSelect={() => handleSnapshotToggle(snapshot.id)}
                        >
                          <div className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            selectedSnapshots.includes(snapshot.id)
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible"
                          )}>
                            <Check className="h-4 w-4" />
                          </div>
                          {snapshot.name} ({new Date(snapshot.createdAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>

                {/* 比較分析ボタン（PopoverContent内） */}
                <div className="border-t p-2">
                  <Button
                    className="w-full"
                    disabled={!canCompare}
                    onClick={handleCompare}
                  >
                    <GitCompare className="mr-2 h-4 w-4" />
                    比較分析
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* スナップショット作成ダイアログ */}
        <Dialog open={isSnapshotDialogOpen} onOpenChange={setIsSnapshotDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>スナップショット作成</DialogTitle>
              <DialogDescription>
                現在の分析結果をスナップショットとして保存します
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="snapshot-name">スナップショット名</Label>
                <Input
                  id="snapshot-name"
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  placeholder="例: 2025年1月時点"
                  className="mt-2"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsSnapshotDialogOpen(false)}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleCreateSnapshotSubmit}
                disabled={createSnapshotMutation.isPending || !snapshotName.trim()}
              >
                {createSnapshotMutation.isPending ? "作成中..." : "作成"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 比較分析ダイアログ */}
        {compareSnapshotIds[0] && compareSnapshotIds[1] && (
          <ProjectAnalysisSnapshotCompare
            snapshotId1={compareSnapshotIds[0]}
            snapshotId2={compareSnapshotIds[1]}
            currentData={compareSnapshotIds[0] === 'current' || compareSnapshotIds[1] === 'current' 
              ? flattenData(analysisData?.data?.projects || [])
              : undefined}
            currentLabel="現在"
            open={isCompareDialogOpen}
            onOpenChange={setIsCompareDialogOpen}
            formatCurrency={formatCurrency}
            formatHours={formatHours}
            formatProductivity={formatProductivity}
            getAchievementColor={getAchievementColor}
          />
        )}

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
                      <TableHead className="text-right w-[100px] text-xs py-1 px-2">売上原価</TableHead>
                      <TableHead className="text-right w-[100px] text-xs py-1 px-2">販管費</TableHead>
                      <TableHead className="text-right w-[100px] text-xs py-1 px-2">山積み工数</TableHead>
                      <TableHead className="text-right w-[110px] text-xs py-1 px-2">生産性/粗利(目標)</TableHead>
                      <TableHead className="text-right w-[110px] text-xs py-1 px-2">生産性/粗利(実績)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayRows.map((row, index) => (
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
                        
                        {/* 売上原価列 */}
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