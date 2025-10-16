import type { BudgetExpense, BudgetRevenue, BudgetTarget, NewBudgetExpense, NewBudgetRevenue, NewBudgetTarget } from "@shared/schema";
import { DollarSign, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAccountingItems } from "@/hooks/useAccountingItems";
import {
  useBudgetsExpense,
  useCreateBudgetExpense,
  useDeleteBudgetExpense,
  useUpdateBudgetExpense,
} from "@/hooks/useBudgetsExpense";
import {
  useBudgetsRevenue,
  useCreateBudgetRevenue,
  useDeleteBudgetRevenue,
  useUpdateBudgetRevenue,
} from "@/hooks/useBudgetsRevenue";
import {
  useBudgetsTarget,
  useCreateBudgetTarget,
  useDeleteBudgetTarget,
  useUpdateBudgetTarget,
} from "@/hooks/useBudgetsTarget";
import { useToast } from "@/hooks/useToast";

const SERVICE_TYPES = [
  "インテグレーション",
  "エンジニアリング",
  "ソフトウェアマネージド",
  "リセール",
];

const ANALYSIS_TYPES = ["生産性", "粗利"] as const;

const FISCAL_YEARS = [2023, 2024, 2025, 2026];

export default function BudgetPage() {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<number>(2025);

  // Revenue budget states
  const [revenueDialogOpen, setRevenueDialogOpen] = useState(false);
  const [revenueEditMode, setRevenueEditMode] = useState(false);
  const [selectedRevenue, setSelectedRevenue] = useState<BudgetRevenue | null>(null);
  const [revenueDeleteOpen, setRevenueDeleteOpen] = useState(false);
  const [revenueFormData, setRevenueFormData] = useState<Partial<NewBudgetRevenue>>({
    fiscalYear: selectedYear,
    serviceType: "",
    budgetAmount: "",
    remarks: "",
  });

  // Expense budget states
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [expenseEditMode, setExpenseEditMode] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<BudgetExpense | null>(null);
  const [expenseDeleteOpen, setExpenseDeleteOpen] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState<Partial<NewBudgetExpense>>({
    fiscalYear: selectedYear,
    accountingItem: "",
    budgetAmount: "",
    remarks: "",
  });

  // Target budget states
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [targetEditMode, setTargetEditMode] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<BudgetTarget | null>(null);
  const [targetDeleteOpen, setTargetDeleteOpen] = useState(false);
  const [targetFormData, setTargetFormData] = useState<Partial<NewBudgetTarget>>({
    fiscalYear: selectedYear,
    serviceType: "",
    analysisType: "生産性",
    targetValue: "",
    remarks: "",
  });

  // Fetch budgets
  const { data: revenuebudgets = [], isLoading: revenueLoading } = useBudgetsRevenue({ fiscalYear: selectedYear });
  const { data: expenseBudgets = [], isLoading: expenseLoading } = useBudgetsExpense({ fiscalYear: selectedYear });
  const { data: targetBudgets = [], isLoading: targetLoading } = useBudgetsTarget({ fiscalYear: selectedYear });
  
  // 計上科目マスタを取得（売上系コード510-519を除外）
  const { data: accountingItems = { items: [], total: 0 }, isLoading: accountingItemsLoading } = useAccountingItems({ 
    excludeRevenueCodes: true 
  });

  // Revenue mutations
  const createRevenueMutation = useCreateBudgetRevenue();
  const updateRevenueMutation = useUpdateBudgetRevenue();
  const deleteRevenueMutation = useDeleteBudgetRevenue();

  // Expense mutations
  const createExpenseMutation = useCreateBudgetExpense();
  const updateExpenseMutation = useUpdateBudgetExpense();
  const deleteExpenseMutation = useDeleteBudgetExpense();

  // Target mutations
  const createTargetMutation = useCreateBudgetTarget();
  const updateTargetMutation = useUpdateBudgetTarget();
  const deleteTargetMutation = useDeleteBudgetTarget();

  const formatCurrency = (value: string | number) => {
    return `¥${Number(value).toLocaleString()}`;
  };

  const formatTargetValue = (value: string | number, analysisType: string) => {
    const numValue = Number(value);
    if (analysisType === "生産性") {
      return `${numValue.toFixed(2)}/人月`;
    } else if (analysisType === "粗利") {
      return `¥${numValue.toLocaleString()}`;
    }
    return numValue.toString();
  };

  // Revenue handlers
  const openRevenueCreateDialog = () => {
    setRevenueEditMode(false);
    setSelectedRevenue(null);
    setRevenueFormData({
      fiscalYear: selectedYear,
      serviceType: "",
      budgetAmount: "",
      remarks: "",
    });
    setRevenueDialogOpen(true);
  };

  const openRevenueEditDialog = (budget: BudgetRevenue) => {
    setRevenueEditMode(true);
    setSelectedRevenue(budget);
    setRevenueFormData({
      fiscalYear: budget.fiscalYear,
      serviceType: budget.serviceType,
      budgetAmount: budget.budgetAmount,
      remarks: budget.remarks || "",
    });
    setRevenueDialogOpen(true);
  };

  const handleRevenueSave = () => {
    if (!revenueFormData.serviceType || !revenueFormData.budgetAmount) {
      toast({
        title: "入力エラー",
        description: "サービス区分と予算額を入力してください",
        variant: "destructive",
      });
      return;
    }

    if (revenueEditMode && selectedRevenue) {
      updateRevenueMutation.mutate(
        {
          id: selectedRevenue.id,
          data: revenueFormData as NewBudgetRevenue,
        },
        {
          onSuccess: () => {
            toast({
              title: "更新完了",
              description: "売上予算を更新しました",
            });
            setRevenueDialogOpen(false);
          },
          onError: () => {
            toast({
              title: "エラー",
              description: "売上予算の更新に失敗しました",
              variant: "destructive",
            });
          },
        }
      );
    } else {
      createRevenueMutation.mutate(revenueFormData as NewBudgetRevenue, {
        onSuccess: () => {
          toast({
            title: "作成完了",
            description: "売上予算を作成しました",
          });
          setRevenueDialogOpen(false);
        },
        onError: (error: any) => {
          const errorMessage = error?.message || "売上予算の作成に失敗しました";
          toast({
            title: "エラー",
            description: errorMessage,
            variant: "destructive",
          });
        },
      });
    }
  };

  const handleRevenueDelete = () => {
    if (selectedRevenue) {
      deleteRevenueMutation.mutate(selectedRevenue.id, {
        onSuccess: () => {
          toast({
            title: "削除完了",
            description: "売上予算を削除しました",
          });
          setRevenueDeleteOpen(false);
          setSelectedRevenue(null);
        },
        onError: () => {
          toast({
            title: "エラー",
            description: "売上予算の削除に失敗しました",
            variant: "destructive",
          });
        },
      });
    }
  };

  // Expense handlers
  const openExpenseCreateDialog = () => {
    setExpenseEditMode(false);
    setSelectedExpense(null);
    setExpenseFormData({
      fiscalYear: selectedYear,
      accountingItem: "",
      budgetAmount: "",
      remarks: "",
    });
    setExpenseDialogOpen(true);
  };

  const openExpenseEditDialog = (budget: BudgetExpense) => {
    setExpenseEditMode(true);
    setSelectedExpense(budget);
    setExpenseFormData({
      fiscalYear: budget.fiscalYear,
      accountingItem: budget.accountingItem,
      budgetAmount: budget.budgetAmount,
      remarks: budget.remarks || "",
    });
    setExpenseDialogOpen(true);
  };

  const handleExpenseSave = () => {
    if (!expenseFormData.accountingItem || !expenseFormData.budgetAmount) {
      toast({
        title: "入力エラー",
        description: "科目と予算額を入力してください",
        variant: "destructive",
      });
      return;
    }

    if (expenseEditMode && selectedExpense) {
      updateExpenseMutation.mutate(
        {
          id: selectedExpense.id,
          data: expenseFormData as NewBudgetExpense,
        },
        {
          onSuccess: () => {
            toast({
              title: "更新完了",
              description: "原価・販管費予算を更新しました",
            });
            setExpenseDialogOpen(false);
          },
          onError: () => {
            toast({
              title: "エラー",
              description: "原価・販管費予算の更新に失敗しました",
              variant: "destructive",
            });
          },
        }
      );
    } else {
      createExpenseMutation.mutate(expenseFormData as NewBudgetExpense, {
        onSuccess: () => {
          toast({
            title: "作成完了",
            description: "原価・販管費予算を作成しました",
          });
          setExpenseDialogOpen(false);
        },
        onError: (error: any) => {
          const errorMessage = error?.message || "原価・販管費予算の作成に失敗しました";
          toast({
            title: "エラー",
            description: errorMessage,
            variant: "destructive",
          });
        },
      });
    }
  };

  const handleExpenseDelete = () => {
    if (selectedExpense) {
      deleteExpenseMutation.mutate(selectedExpense.id, {
        onSuccess: () => {
          toast({
            title: "削除完了",
            description: "原価・販管費予算を削除しました",
          });
          setExpenseDeleteOpen(false);
          setSelectedExpense(null);
        },
        onError: () => {
          toast({
            title: "エラー",
            description: "原価・販管費予算の削除に失敗しました",
            variant: "destructive",
          });
        },
      });
    }
  };

  // Target handlers
  const openTargetCreateDialog = () => {
    setTargetEditMode(false);
    setSelectedTarget(null);
    setTargetFormData({
      fiscalYear: selectedYear,
      serviceType: "",
      analysisType: "生産性",
      targetValue: "",
      remarks: "",
    });
    setTargetDialogOpen(true);
  };

  const openTargetEditDialog = (budget: BudgetTarget) => {
    setTargetEditMode(true);
    setSelectedTarget(budget);
    setTargetFormData({
      fiscalYear: budget.fiscalYear,
      serviceType: budget.serviceType,
      analysisType: budget.analysisType,
      targetValue: budget.targetValue,
      remarks: budget.remarks || "",
    });
    setTargetDialogOpen(true);
  };

  const handleTargetSave = () => {
    if (!targetFormData.serviceType || !targetFormData.analysisType || !targetFormData.targetValue) {
      toast({
        title: "入力エラー",
        description: "サービス区分、分析区分、目標値を入力してください",
        variant: "destructive",
      });
      return;
    }

    // 目標値の桁数チェック
    const targetValue = parseFloat(targetFormData.targetValue);
    if (isNaN(targetValue)) {
      toast({
        title: "入力エラー",
        description: "目標値は数値で入力してください",
        variant: "destructive",
      });
      return;
    }

    // 分析区分に応じたバリデーション
    if (targetFormData.analysisType === "生産性") {
      if (targetValue > 999.99) {
        toast({
          title: "入力エラー",
          description: "生産性の目標値は999.99以下で入力してください",
          variant: "destructive",
        });
        return;
      }
      
      // 小数部分が2桁を超えていないかチェック
      const targetValueStr = targetFormData.targetValue;
      const [, decimalPart] = targetValueStr.includes('.') ? targetValueStr.split('.') : [targetValueStr, ''];
      
      if (decimalPart.length > 2) {
        toast({
          title: "入力エラー",
          description: "生産性の目標値の小数部分は2桁まで入力できます",
          variant: "destructive",
        });
        return;
      }
    } else if (targetFormData.analysisType === "粗利") {
      if (!Number.isInteger(targetValue)) {
        toast({
          title: "入力エラー",
          description: "粗利の目標値は整数で入力してください",
          variant: "destructive",
        });
        return;
      }
      
      if (targetValue > 999999999999) {
        toast({
          title: "入力エラー",
          description: "粗利の目標値は999,999,999,999以下で入力してください",
          variant: "destructive",
        });
        return;
      }
    }

    if (targetEditMode && selectedTarget) {
      updateTargetMutation.mutate(
        {
          id: selectedTarget.id,
          data: targetFormData as NewBudgetTarget,
        },
        {
          onSuccess: () => {
            toast({
              title: "更新完了",
              description: "目標値予算を更新しました",
            });
            setTargetDialogOpen(false);
          },
          onError: (error: any) => {
            const errorMessage = error?.message || "目標値予算の更新に失敗しました";
            toast({
              title: "エラー",
              description: errorMessage,
              variant: "destructive",
            });
          },
        }
      );
    } else {
      createTargetMutation.mutate(targetFormData as NewBudgetTarget, {
        onSuccess: () => {
          toast({
            title: "作成完了",
            description: "目標値予算を作成しました",
          });
          setTargetDialogOpen(false);
        },
        onError: (error: any) => {
          const errorMessage = error?.message || "目標値予算の作成に失敗しました";
          toast({
            title: "エラー",
            description: errorMessage,
            variant: "destructive",
          });
        },
      });
    }
  };

  const handleTargetDelete = () => {
    if (selectedTarget) {
      deleteTargetMutation.mutate(selectedTarget.id, {
        onSuccess: () => {
          toast({
            title: "削除完了",
            description: "目標値予算を削除しました",
          });
          setTargetDeleteOpen(false);
          setSelectedTarget(null);
        },
        onError: () => {
          toast({
            title: "エラー",
            description: "目標値予算の削除に失敗しました",
            variant: "destructive",
          });
        },
      });
    }
  };

  return (
    <div className="h-full p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold" data-testid="text-page-title">
              予算登録
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="fiscal-year-select">年度:</Label>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger id="fiscal-year-select" className="w-[150px]" data-testid="select-fiscal-year">
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
        <p className="text-muted-foreground mt-1">年度ごとの売上予算・原価・販管費予算・目標値を管理します</p>
      </div>

      <Tabs defaultValue="revenue" className="w-full">
        <TabsList>
          <TabsTrigger value="revenue" data-testid="tab-revenue">
            売上予算
          </TabsTrigger>
          <TabsTrigger value="expense" data-testid="tab-expense">
            原価・販管費予算
          </TabsTrigger>
          <TabsTrigger value="target" data-testid="tab-target">
            目標値
          </TabsTrigger>
        </TabsList>

        {/* Revenue Budget Tab */}
        <TabsContent value="revenue" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>売上予算</CardTitle>
                  <CardDescription>サービス区分ごとの売上予算を管理します</CardDescription>
                </div>
                <Button onClick={openRevenueCreateDialog} data-testid="button-create-revenue">
                  <Plus className="w-4 h-4 mr-2" />
                  新規作成
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {revenueLoading ? (
                <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
              ) : revenuebudgets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">売上予算が登録されていません</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>年度</TableHead>
                      <TableHead>サービス区分</TableHead>
                      <TableHead className="text-right">予算額</TableHead>
                      <TableHead>備考</TableHead>
                      <TableHead className="w-[100px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenuebudgets.map((budget) => (
                      <TableRow key={budget.id} data-testid={`row-revenue-${budget.id}`}>
                        <TableCell>{budget.fiscalYear}年度</TableCell>
                        <TableCell>{budget.serviceType}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(budget.budgetAmount)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {budget.remarks || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openRevenueEditDialog(budget)}
                              data-testid={`button-edit-revenue-${budget.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedRevenue(budget);
                                setRevenueDeleteOpen(true);
                              }}
                              data-testid={`button-delete-revenue-${budget.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expense Budget Tab */}
        <TabsContent value="expense" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>原価・販管費予算</CardTitle>
                  <CardDescription>科目ごとの原価・販管費予算を管理します</CardDescription>
                </div>
                <Button onClick={openExpenseCreateDialog} data-testid="button-create-expense">
                  <Plus className="w-4 h-4 mr-2" />
                  新規作成
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {expenseLoading ? (
                <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
              ) : expenseBudgets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">原価・販管費予算が登録されていません</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>年度</TableHead>
                      <TableHead>科目</TableHead>
                      <TableHead className="text-right">予算額</TableHead>
                      <TableHead>備考</TableHead>
                      <TableHead className="w-[100px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseBudgets.map((budget) => (
                      <TableRow key={budget.id} data-testid={`row-expense-${budget.id}`}>
                        <TableCell>{budget.fiscalYear}年度</TableCell>
                        <TableCell>{budget.accountingItem}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(budget.budgetAmount)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {budget.remarks || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openExpenseEditDialog(budget)}
                              data-testid={`button-edit-expense-${budget.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedExpense(budget);
                                setExpenseDeleteOpen(true);
                              }}
                              data-testid={`button-delete-expense-${budget.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Target Budget Tab */}
        <TabsContent value="target" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>目標値</CardTitle>
                  <CardDescription>サービス区分×分析区分ごとの目標値を管理します</CardDescription>
                </div>
                <Button onClick={openTargetCreateDialog} data-testid="button-create-target">
                  <Plus className="w-4 h-4 mr-2" />
                  新規作成
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {targetLoading ? (
                <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
              ) : targetBudgets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">目標値が登録されていません</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>年度</TableHead>
                      <TableHead>サービス区分</TableHead>
                      <TableHead>分析区分</TableHead>
                      <TableHead className="text-right">目標値</TableHead>
                      <TableHead>備考</TableHead>
                      <TableHead className="w-[100px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {targetBudgets.map((budget) => (
                      <TableRow key={budget.id} data-testid={`row-target-${budget.id}`}>
                        <TableCell>{budget.fiscalYear}年度</TableCell>
                        <TableCell>{budget.serviceType}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{budget.analysisType}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatTargetValue(budget.targetValue, budget.analysisType)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {budget.remarks || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openTargetEditDialog(budget)}
                              data-testid={`button-edit-target-${budget.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedTarget(budget);
                                setTargetDeleteOpen(true);
                              }}
                              data-testid={`button-delete-target-${budget.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Revenue Budget Dialog */}
      <Dialog open={revenueDialogOpen} onOpenChange={setRevenueDialogOpen}>
        <DialogContent data-testid="dialog-revenue">
          <DialogHeader>
            <DialogTitle>{revenueEditMode ? "売上予算編集" : "売上予算新規作成"}</DialogTitle>
            <DialogDescription>売上予算情報を入力してください</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="revenue-fiscal-year">年度</Label>
              <Input
                id="revenue-fiscal-year"
                type="number"
                value={revenueFormData.fiscalYear}
                onChange={(e) =>
                  setRevenueFormData({ ...revenueFormData, fiscalYear: parseInt(e.target.value) })
                }
                data-testid="input-revenue-fiscal-year"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="revenue-service-type">サービス区分</Label>
              <Select
                value={revenueFormData.serviceType}
                onValueChange={(value) => setRevenueFormData({ ...revenueFormData, serviceType: value })}
              >
                <SelectTrigger id="revenue-service-type" data-testid="select-revenue-service-type">
                  <SelectValue placeholder="サービス区分を選択" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="revenue-budget-amount">予算額</Label>
              <Input
                id="revenue-budget-amount"
                type="number"
                value={revenueFormData.budgetAmount}
                onChange={(e) => setRevenueFormData({ ...revenueFormData, budgetAmount: e.target.value })}
                placeholder="10000000"
                data-testid="input-revenue-budget-amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="revenue-remarks">備考</Label>
              <Textarea
                id="revenue-remarks"
                value={revenueFormData.remarks || ""}
                onChange={(e) => setRevenueFormData({ ...revenueFormData, remarks: e.target.value })}
                placeholder="備考を入力"
                data-testid="textarea-revenue-remarks"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevenueDialogOpen(false)} data-testid="button-cancel-revenue">
              キャンセル
            </Button>
            <Button onClick={handleRevenueSave} data-testid="button-submit-revenue">
              {revenueEditMode ? "更新" : "作成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Budget Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent data-testid="dialog-expense">
          <DialogHeader>
            <DialogTitle>{expenseEditMode ? "原価・販管費予算編集" : "原価・販管費予算新規作成"}</DialogTitle>
            <DialogDescription>原価・販管費予算情報を入力してください</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="expense-fiscal-year">年度</Label>
              <Input
                id="expense-fiscal-year"
                type="number"
                value={expenseFormData.fiscalYear}
                onChange={(e) =>
                  setExpenseFormData({ ...expenseFormData, fiscalYear: parseInt(e.target.value) })
                }
                data-testid="input-expense-fiscal-year"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-accounting-item">科目</Label>
              <Select
                value={expenseFormData.accountingItem}
                onValueChange={(value) => setExpenseFormData({ ...expenseFormData, accountingItem: value })}
              >
                <SelectTrigger id="expense-accounting-item" data-testid="select-expense-accounting-item">
                  <SelectValue placeholder="科目を選択" />
                </SelectTrigger>
                <SelectContent>
                  {accountingItemsLoading ? (
                    <SelectItem value="" disabled>読み込み中...</SelectItem>
                  ) : (
                    accountingItems.items.map((item) => (
                      <SelectItem key={item.id} value={item.name}>
                        {item.code} - {item.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-budget-amount">予算額</Label>
              <Input
                id="expense-budget-amount"
                type="number"
                value={expenseFormData.budgetAmount}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, budgetAmount: e.target.value })}
                placeholder="5000000"
                data-testid="input-expense-budget-amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-remarks">備考</Label>
              <Textarea
                id="expense-remarks"
                value={expenseFormData.remarks || ""}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, remarks: e.target.value })}
                placeholder="備考を入力"
                data-testid="textarea-expense-remarks"
              />
            </div>
      </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseDialogOpen(false)} data-testid="button-cancel-expense">
              キャンセル
            </Button>
            <Button onClick={handleExpenseSave} data-testid="button-submit-expense">
              {expenseEditMode ? "更新" : "作成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Target Budget Dialog */}
      <Dialog open={targetDialogOpen} onOpenChange={setTargetDialogOpen}>
        <DialogContent data-testid="dialog-target">
          <DialogHeader>
            <DialogTitle>{targetEditMode ? "目標値予算編集" : "目標値予算新規作成"}</DialogTitle>
            <DialogDescription>目標値予算情報を入力してください</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="target-fiscal-year">年度</Label>
              <Input
                id="target-fiscal-year"
                type="number"
                value={targetFormData.fiscalYear}
                onChange={(e) =>
                  setTargetFormData({ ...targetFormData, fiscalYear: parseInt(e.target.value) })
                }
                data-testid="input-target-fiscal-year"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-service-type">サービス区分</Label>
              <Select
                value={targetFormData.serviceType}
                onValueChange={(value) => setTargetFormData({ ...targetFormData, serviceType: value })}
              >
                <SelectTrigger id="target-service-type" data-testid="select-target-service-type">
                  <SelectValue placeholder="サービス区分を選択" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-analysis-type">分析区分</Label>
              <Select
                value={targetFormData.analysisType}
                onValueChange={(value) => setTargetFormData({ ...targetFormData, analysisType: value as "生産性" | "粗利" })}
              >
                <SelectTrigger id="target-analysis-type" data-testid="select-target-analysis-type">
                  <SelectValue placeholder="分析区分を選択" />
                </SelectTrigger>
                <SelectContent>
                  {ANALYSIS_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-value">目標値</Label>
              <Input
                id="target-value"
                type="number"
                step={targetFormData.analysisType === "生産性" ? "0.01" : "1"}
                max={targetFormData.analysisType === "生産性" ? 999.99 : 999999999999}
                value={targetFormData.targetValue}
                onChange={(e) => setTargetFormData({ ...targetFormData, targetValue: e.target.value })}
                placeholder={targetFormData.analysisType === "生産性" ? "100.50" : "5000"}
                data-testid="input-target-value"
              />
              <p className="text-xs text-muted-foreground">
                {targetFormData.analysisType === "生産性" 
                  ? "生産性: 999.99以下、小数部分2桁まで（例: 100.50/人月）" 
                  : "粗利: 999,999,999,999以下の整数（例: ¥5,000）"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-remarks">備考</Label>
              <Textarea
                id="target-remarks"
                value={targetFormData.remarks || ""}
                onChange={(e) => setTargetFormData({ ...targetFormData, remarks: e.target.value })}
                placeholder="備考を入力"
                data-testid="textarea-target-remarks"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTargetDialogOpen(false)} data-testid="button-cancel-target">
              キャンセル
            </Button>
            <Button onClick={handleTargetSave} data-testid="button-submit-target">
              {targetEditMode ? "更新" : "作成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revenue Delete Dialog */}
      <AlertDialog open={revenueDeleteOpen} onOpenChange={setRevenueDeleteOpen}>
        <AlertDialogContent data-testid="dialog-delete-revenue">
          <AlertDialogHeader>
            <AlertDialogTitle>売上予算を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。売上予算を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-revenue">キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevenueDelete} data-testid="button-confirm-delete-revenue">
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Expense Delete Dialog */}
      <AlertDialog open={expenseDeleteOpen} onOpenChange={setExpenseDeleteOpen}>
        <AlertDialogContent data-testid="dialog-delete-expense">
          <AlertDialogHeader>
            <AlertDialogTitle>原価・販管費予算を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。原価・販管費予算を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-expense">キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleExpenseDelete} data-testid="button-confirm-delete-expense">
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Target Delete Dialog */}
      <AlertDialog open={targetDeleteOpen} onOpenChange={setTargetDeleteOpen}>
        <AlertDialogContent data-testid="dialog-delete-target">
          <AlertDialogHeader>
            <AlertDialogTitle>目標値予算を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。目標値予算を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-target">キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleTargetDelete} data-testid="button-confirm-delete-target">
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
