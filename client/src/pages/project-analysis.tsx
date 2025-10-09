import { BarChart3, TrendingUp } from "lucide-react";
import { useState } from "react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBudgetsRevenue } from "@/hooks/useBudgetsRevenue";
import { useProjects } from "@/hooks/useMasters";
import { useOrderForecasts } from "@/hooks/useOrderForecasts";
import { useStaffing } from "@/hooks/useStaffing";

const FISCAL_YEARS = [2023, 2024, 2025, 2026];

export default function ProjectAnalysisPage() {
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // Fetch data
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: orderForecasts = [], isLoading: ordersLoading } = useOrderForecasts({
    fiscalYear: selectedYear,
    projectId: selectedProjectId || undefined,
  });
  const { data: staffingData = [], isLoading: staffingLoading } = useStaffing({
    projectId: selectedProjectId || undefined,
    fiscalYear: selectedYear,
  });
  const { data: revenueBudgets = [], isLoading: budgetLoading } = useBudgetsRevenue({ fiscalYear: selectedYear });

  const isLoading = projectsLoading || ordersLoading || staffingLoading || budgetLoading;

  // Filter projects by year
  const yearProjects = projects.filter((p) => p.fiscalYear === selectedYear);
  const selectedProject = yearProjects.find((p) => p.id === selectedProjectId);

  // Calculate aggregated data
  const totalRevenue = orderForecasts.reduce((sum, order) => sum + Number(order.amount), 0);
  const totalWorkHours = staffingData.reduce((sum, staff) => sum + Number(staff.workHours), 0);

  // Calculate by month
  const monthlyData: Record<
    string,
    {
      month: string;
      revenue: number;
      workHours: number;
    }
  > = {};

  orderForecasts.forEach((order) => {
    const month = order.accountingPeriod;
    if (!monthlyData[month]) {
      monthlyData[month] = { month, revenue: 0, workHours: 0 };
    }
    monthlyData[month].revenue += Number(order.amount);
  });

  staffingData.forEach((staff) => {
    const month = `${staff.fiscalYear}-${String(staff.month).padStart(2, "0")}`;
    if (!monthlyData[month]) {
      monthlyData[month] = { month, revenue: 0, workHours: 0 };
    }
    monthlyData[month].workHours += Number(staff.workHours);
  });

  const monthlyDataArray = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

  // Calculate budget vs actual
  const serviceBudget = selectedProject
    ? revenueBudgets.find((b) => b.serviceType === selectedProject.serviceType)
    : null;

  const budgetAmount = serviceBudget ? Number(serviceBudget.budgetAmount) : 0;
  const achievementRate = budgetAmount > 0 ? (totalRevenue / budgetAmount) * 100 : 0;

  const formatCurrency = (value: number) => {
    return `¥${value.toLocaleString()}`;
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

              <Label htmlFor="project-select">プロジェクト:</Label>
              <Select
                value={selectedProjectId}
                onValueChange={(value) => setSelectedProjectId(value)}
              >
                <SelectTrigger id="project-select" className="w-[250px]" data-testid="select-project">
                  <SelectValue placeholder="プロジェクトを選択" />
                </SelectTrigger>
                <SelectContent>
                  {yearProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        <p className="text-muted-foreground mt-1">プロジェクトごとの詳細分析を表示します</p>
      </div>

        {!selectedProjectId ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                プロジェクトを選択してください
              </div>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : (
          <>
            {/* Project Summary */}
            {selectedProject && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{selectedProject.name}</span>
                    <div className="flex gap-2">
                      <Badge variant="outline">{selectedProject.serviceType}</Badge>
                      <Badge variant="secondary">{selectedProject.analysisType}</Badge>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    {selectedProject.code} | 取引先: {selectedProject.customerName} | 営業担当:{" "}
                    {selectedProject.salesPerson}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">売上実績</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                  <p className="text-xs text-muted-foreground mt-1">受発注見込から算出</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">予算</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(budgetAmount)}</div>
                  <p className="text-xs text-muted-foreground mt-1">サービス別予算</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    <TrendingUp className="inline h-4 w-4 mr-1" />
                    達成率
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{achievementRate.toFixed(1)}%</div>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        achievementRate >= 100 ? "bg-success" : achievementRate >= 75 ? "bg-warning" : "bg-destructive"
                      }`}
                      style={{ width: `${Math.min(achievementRate, 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">総工数</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalWorkHours.toFixed(1)}h</div>
                  <p className="text-xs text-muted-foreground mt-1">配員計画から算出</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="monthly" className="w-full">
              <TabsList>
                <TabsTrigger value="monthly" data-testid="tab-monthly">
                  月別推移
                </TabsTrigger>
                <TabsTrigger value="revenue" data-testid="tab-revenue">
                  売上詳細
                </TabsTrigger>
                <TabsTrigger value="staffing" data-testid="tab-staffing">
                  配員詳細
                </TabsTrigger>
              </TabsList>

              {/* Monthly Trend */}
              <TabsContent value="monthly" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">月別推移</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {monthlyDataArray.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">データがありません</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>年月</TableHead>
                            <TableHead className="text-right">売上</TableHead>
                            <TableHead className="text-right">工数</TableHead>
                            <TableHead className="text-right">時間単価</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {monthlyDataArray.map((data) => {
                            const hourlyRate = data.workHours > 0 ? data.revenue / data.workHours : 0;
                            return (
                              <TableRow key={data.month}>
                                <TableCell>{data.month}</TableCell>
                                <TableCell className="text-right font-mono">
                                  {formatCurrency(data.revenue)}
                                </TableCell>
                                <TableCell className="text-right font-mono">{data.workHours.toFixed(1)}h</TableCell>
                                <TableCell className="text-right font-mono">
                                  {formatCurrency(Math.round(hourlyRate))}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Revenue Detail */}
              <TabsContent value="revenue" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">売上詳細</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orderForecasts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">データがありません</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>計上年月</TableHead>
                            <TableHead>科目</TableHead>
                            <TableHead>摘要</TableHead>
                            <TableHead className="text-right">金額</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderForecasts.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell>{order.accountingPeriod}</TableCell>
                              <TableCell>{order.accountingItem}</TableCell>
                              <TableCell className="max-w-[300px] truncate">{order.description}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(Number(order.amount))}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-muted/50">
                            <TableCell colSpan={3}>合計</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(totalRevenue)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Staffing Detail */}
              <TabsContent value="staffing" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">配員詳細</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {staffingData.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">データがありません</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>年月</TableHead>
                            <TableHead>従業員名</TableHead>
                            <TableHead className="text-right">工数</TableHead>
                            <TableHead>備考</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {staffingData.map((staff) => (
                            <TableRow key={staff.id}>
                              <TableCell>
                                {staff.fiscalYear}年 {staff.month}月
                              </TableCell>
                              <TableCell>{staff.employeeName}</TableCell>
                              <TableCell className="text-right font-mono">{Number(staff.workHours).toFixed(1)}h</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{staff.remarks || "-"}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-muted/50">
                            <TableCell colSpan={2}>合計</TableCell>
                            <TableCell className="text-right font-mono">{totalWorkHours.toFixed(1)}h</TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
