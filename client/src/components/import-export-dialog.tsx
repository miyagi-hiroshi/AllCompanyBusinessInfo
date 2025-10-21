import { AlertCircle, CheckCircle,Database, Download, FileSpreadsheet, FileText, Upload } from "lucide-react";
import { useRef,useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportToCSV, exportToExcel, exportToJSON, FileFormat, generateTemplate, ImportResult,parseFile } from "@/lib/importExport";

interface ImportExportDialogProps<T = any> {
  data: T[];
  onImport?: (data: T[]) => void;
  filename: string;
  sampleData?: T[];
  children: React.ReactNode;
}

export function ImportExportDialog<T extends Record<string, any>>({
  data,
  onImport,
  filename,
  sampleData,
  children,
}: ImportExportDialogProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult<T> | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<FileFormat>(FileFormat.EXCEL);
  const [exportFilename, setExportFilename] = useState(filename);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ファイルインポート処理
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {return;}

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await parseFile<T>(file);
      setImportResult(result);
    } catch (error) {
      console.error("Import error:", error);
    } finally {
      setIsImporting(false);
    }
  };

  // インポート確定処理
  const handleImportConfirm = () => {
    if (importResult?.success && importResult.data.length > 0 && onImport) {
      onImport(importResult.data);
      setIsOpen(false);
      setImportResult(null);
    }
  };

  // エクスポート処理
  const handleExport = async () => {
    const config = {
      filename: exportFilename,
      format: exportFormat,
    };

    switch (exportFormat) {
      case FileFormat.CSV:
        await exportToCSV(data, config);
        break;
      case FileFormat.EXCEL:
        await exportToExcel(data, config);
        break;
      case FileFormat.JSON:
        await exportToJSON(data, config);
        break;
    }
  };

  // テンプレート生成処理
  const handleGenerateTemplate = async () => {
    if (!sampleData || sampleData.length === 0) {return;}

    const config = {
      filename: exportFilename,
      format: exportFormat,
    };

    await generateTemplate(sampleData, config);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>データのインポート・エクスポート</DialogTitle>
          <DialogDescription>
            データをファイル形式でインポート・エクスポートできます
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              インポート
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              エクスポート
            </TabsTrigger>
          </TabsList>

          {/* インポートタブ */}
          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  ファイルインポート
                </CardTitle>
                <CardDescription>
                  Excel、CSV、JSONファイルからデータをインポートできます
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="import-file">ファイルを選択</Label>
                  <Input
                    id="import-file"
                    type="file"
                    accept=".xlsx,.xls,.csv,.json"
                    onChange={handleFileImport}
                    disabled={isImporting}
                    ref={fileInputRef}
                  />
                  <p className="text-sm text-muted-foreground">
                    対応形式: Excel (.xlsx, .xls), CSV (.csv), JSON (.json)
                  </p>
                </div>

                {/* インポート結果表示 */}
                {importResult && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {importResult.success ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        インポート結果
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>総行数</Label>
                          <Badge variant="outline">{importResult.totalRows}</Badge>
                        </div>
                        <div className="space-y-2">
                          <Label>有効行数</Label>
                          <Badge variant="outline">{importResult.validRows}</Badge>
                        </div>
                      </div>

                      {/* エラー表示 */}
                      {importResult.errors.length > 0 && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-1">
                              <p>以下のエラーが発生しました:</p>
                              <ul className="list-disc list-inside text-sm">
                                {importResult.errors.map((error, index) => (
                                  <li key={index}>{error}</li>
                                ))}
                              </ul>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* 警告表示 */}
                      {importResult.warnings.length > 0 && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-1">
                              <p>以下の警告があります:</p>
                              <ul className="list-disc list-inside text-sm">
                                {importResult.warnings.map((warning, index) => (
                                  <li key={index}>{warning}</li>
                                ))}
                              </ul>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* インポート確定ボタン */}
                      {importResult.success && importResult.data.length > 0 && (
                        <Button onClick={handleImportConfirm} className="w-full">
                          データをインポート ({importResult.data.length}件)
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* エクスポートタブ */}
          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  データエクスポート
                </CardTitle>
                <CardDescription>
                  現在のデータをファイル形式でエクスポートできます
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="export-filename">ファイル名</Label>
                    <Input
                      id="export-filename"
                      value={exportFilename}
                      onChange={(e) => setExportFilename(e.target.value)}
                      placeholder="ファイル名を入力"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="export-format">ファイル形式</Label>
                    <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as FileFormat)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={FileFormat.EXCEL}>
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4" />
                            Excel (.xlsx)
                          </div>
                        </SelectItem>
                        <SelectItem value={FileFormat.CSV}>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            CSV (.csv)
                          </div>
                        </SelectItem>
                        <SelectItem value={FileFormat.JSON}>
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            JSON (.json)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleExport} className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    エクスポート ({data.length}件)
                  </Button>
                  {sampleData && sampleData.length > 0 && (
                    <Button onClick={handleGenerateTemplate} variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      テンプレート生成
                    </Button>
                  )}
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    エクスポートするデータ: <strong>{data.length}</strong>件
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
