import { FileUp, Upload } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useImportForecastCSV } from "@/hooks/useForecastImport";
import { useToast } from "@/hooks/useToast";

export default function ForecastImportPage() {
  const [fiscalYear, setFiscalYear] = useState<number>(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    // システム日付が含まれる会計年度を計算
    // 4月～12月: その年の年度、1月～3月: 前年の年度
    return currentMonth >= 4 ? currentYear : currentYear - 1;
  });
  const [importType, setImportType] = useState<'order-forecasts' | 'angle-b-forecasts'>('order-forecasts');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    totalRows: number;
    importedRows: number;
    skippedRows: number;
    errors: Array<{ row: number; message: string }>;
  } | null>(null);

  const importCSV = useImportForecastCSV();
  const { toast } = useToast();

  // 年度選択肢を生成
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setImportResult(null); // ファイル変更時に結果をクリア
    }
  };

  const handleImport = () => {
    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: "ファイル未選択",
        description: "CSVファイルを選択してください",
      });
      return;
    }

    if (!fiscalYear) {
      toast({
        variant: "destructive",
        title: "年度未選択",
        description: "取込対象年度を選択してください",
      });
      return;
    }

    importCSV.mutate(
      { file: selectedFile, fiscalYear, type: importType },
      {
        onSuccess: (data) => {
          setImportResult(data);
          toast({
            title: "CSV取込完了",
            description: `${data.importedRows}件のデータを取り込みました（スキップ: ${data.skippedRows}件）`,
          });
        },
        onError: (error: any) => {
          const errorMessage = error?.message || "CSVファイルの取込中にエラーが発生しました";
          toast({
            variant: "destructive",
            title: "CSV取込エラー",
            description: errorMessage,
          });
        },
      }
    );
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileUp className="h-7 w-7" />
            受注見込み・角度B案件CSV取込
          </h1>
          <p className="text-muted-foreground mt-1">
            CSVファイルをアップロードして、受注見込み案件または角度B案件を一括登録します
          </p>
        </div>

        {/* Import Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CSV取込設定</CardTitle>
            <CardDescription>
              取込対象年度と取込対象を選択し、CSVファイルをアップロードしてください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* 年度選択 */}
              <div className="space-y-2">
                <Label htmlFor="fiscalYear">取込対象年度</Label>
                <Select
                  value={fiscalYear.toString()}
                  onValueChange={(value) => setFiscalYear(parseInt(value, 10))}
                >
                  <SelectTrigger id="fiscalYear" className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}年度
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 取込対象選択 */}
              <div className="space-y-2">
                <Label>取込対象</Label>
                <RadioGroup
                  value={importType}
                  onValueChange={(value) => {
                    setImportType(value as 'order-forecasts' | 'angle-b-forecasts');
                    setImportResult(null); // 取込対象変更時に結果をクリア
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="order-forecasts" id="order-forecasts" />
                    <Label htmlFor="order-forecasts" className="cursor-pointer">
                      受注見込み案件
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="angle-b-forecasts" id="angle-b-forecasts" />
                    <Label htmlFor="angle-b-forecasts" className="cursor-pointer">
                      角度B案件
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* CSVファイル選択 */}
              <div className="space-y-2">
                <Label htmlFor="csvFile">CSVファイル</Label>
                <input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-muted-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-primary-foreground
                    hover:file:bg-primary/90"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    選択: {selectedFile.name}
                  </p>
                )}
              </div>

              {/* CSVフォーマット説明 */}
              <div className="bg-muted p-4 rounded-md text-sm">
                <p className="font-medium mb-2">CSVフォーマット:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-3">
                  <li>列1: プロジェクトコード（指定年度のプロジェクトマスタに存在するコード）</li>
                  <li>列2: 計上科目（計上科目マスタの名称、例: 保守売上、ソフト売上、仕入高）</li>
                  <li>列3: 計上年月（YYYY-MM形式、例: 2026-01）</li>
                  <li>列4: 摘要文</li>
                  <li>列5: 金額（カンマ区切り可、例: 500000 または 500,000）</li>
                </ul>
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="font-medium mb-2">CSV例:</p>
                  <pre className="bg-background p-2 rounded text-xs font-mono overflow-x-auto">
{`035,保守売上,2026-01,保守費用（1月分）,500000
036,保守売上,2026-01,ヘルプデスク費用,300000`}
                  </pre>
                </div>
                <p className="mt-3 text-muted-foreground">
                  <strong>注意:</strong> ヘッダー行は不要です。各項目はダブルクォートで囲んでも囲まなくても構いません。
                </p>
              </div>

              {/* 取込実行ボタン */}
              <div>
                <Button
                  onClick={handleImport}
                  disabled={!selectedFile || !fiscalYear || importCSV.isPending}
                  className="w-full sm:w-auto"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {importCSV.isPending ? "取込中..." : "CSV取込実行"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Import Result */}
        {importCSV.isPending ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">取込結果</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        ) : importResult ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">取込結果</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* サマリー */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-muted p-4 rounded-md">
                    <div className="text-sm text-muted-foreground">総行数</div>
                    <div className="text-2xl font-bold mt-1">{importResult.totalRows}</div>
                  </div>
                  <div className="bg-muted p-4 rounded-md">
                    <div className="text-sm text-muted-foreground">取込成功</div>
                    <div className="text-2xl font-bold text-success mt-1">
                      {importResult.importedRows}
                    </div>
                  </div>
                  <div className="bg-muted p-4 rounded-md">
                    <div className="text-sm text-muted-foreground">スキップ</div>
                    <div className="text-2xl font-bold text-warning mt-1">
                      {importResult.skippedRows}
                    </div>
                  </div>
                </div>

                {/* エラー詳細 */}
                {importResult.errors.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">エラー詳細</h3>
                    <div className="rounded-md border max-h-[400px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">行番号</TableHead>
                            <TableHead>エラーメッセージ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importResult.errors.map((error, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono">{error.row}</TableCell>
                              <TableCell className="text-sm">{error.message}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

