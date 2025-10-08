import Papa from "papaparse";
import * as XLSX from "xlsx";

import { handleError, showErrorToast, showSuccessToast, toAppError } from "./errorHandler";

/**
 * ファイル形式の定義
 */
export enum FileFormat {
  EXCEL = "excel",
  CSV = "csv",
  JSON = "json",
}

/**
 * インポート結果のインターフェース
 */
export interface ImportResult<T = any> {
  success: boolean;
  data: T[];
  errors: string[];
  warnings: string[];
  totalRows: number;
  validRows: number;
}

/**
 * エクスポート設定のインターフェース
 */
export interface ExportConfig {
  filename: string;
  format: FileFormat;
  sheetName?: string;
  includeHeaders?: boolean;
}

/**
 * CSVファイルをパース
 */
export function parseCSV<T = any>(
  file: File,
  options?: {
    header?: boolean;
    skipEmptyLines?: boolean;
    delimiter?: string;
  }
): Promise<ImportResult<T>> {
  return new Promise((resolve) => {
    const config = {
      header: true,
      skipEmptyLines: true,
      delimiter: ",",
      ...options,
    };

    Papa.parse(file, {
      ...config,
      complete: (results) => {
        const errors = results.errors.map(error => 
          `行 ${error.row}: ${error.message}`
        );
        
        resolve({
          success: errors.length === 0,
          data: results.data as T[],
          errors,
          warnings: [],
          totalRows: results.data.length,
          validRows: results.data.length - errors.length,
        });
      },
      error: (error) => {
        resolve({
          success: false,
          data: [],
          errors: [error.message],
          warnings: [],
          totalRows: 0,
          validRows: 0,
        });
      },
    });
  });
}

/**
 * Excelファイルをパース
 */
export async function parseExcel<T = any>(
  file: File,
  sheetName?: string
): Promise<ImportResult<T>> {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    
    // シート名を取得
    const targetSheet = sheetName || workbook.SheetNames[0];
    
    if (!workbook.Sheets[targetSheet]) {
      throw new Error(`シート "${targetSheet}" が見つかりません`);
    }
    
    // シートをJSONに変換
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[targetSheet], {
      header: 1,
      defval: "",
    });
    
    // ヘッダー行を取得
    const headers = jsonData[0] as string[];
    const rows = jsonData.slice(1) as any[][];
    
    // データをオブジェクト配列に変換
    const dataObjects = rows.map((row, _index) => {
      const obj: any = {};
      headers.forEach((header, colIndex) => {
        obj[header] = row[colIndex] || "";
      });
      return obj;
    });
    
    return {
      success: true,
      data: dataObjects as T[],
      errors: [],
      warnings: [],
      totalRows: dataObjects.length,
      validRows: dataObjects.length,
    };
  } catch (error) {
    const appError = handleError(error, false);
    return {
      success: false,
      data: [],
      errors: [appError.message],
      warnings: [],
      totalRows: 0,
      validRows: 0,
    };
  }
}

/**
 * データをCSV形式でエクスポート
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  config: ExportConfig
): void {
  try {
    if (data.length === 0) {
      showErrorToast(toAppError(new Error("エクスポートするデータがありません")));
      return;
    }

    // CSVデータを生成
    const csv = Papa.unparse(data, {
      header: config.includeHeaders !== false,
      delimiter: ",",
    });

    // ファイルをダウンロード
    downloadFile(csv, `${config.filename}.csv`, "text/csv");
    
    showSuccessToast("エクスポート完了", `${data.length}件のデータをCSVファイルでエクスポートしました`);
  } catch (error) {
    const appError = handleError(error, false);
    showErrorToast(appError);
  }
}

/**
 * データをExcel形式でエクスポート
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  config: ExportConfig
): void {
  try {
    if (data.length === 0) {
      showErrorToast(toAppError(new Error("エクスポートするデータがありません")));
      return;
    }

    // ワークブックを作成
    const workbook = XLSX.utils.book_new();
    
    // ワークシートを作成
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // ワークシートをワークブックに追加
    XLSX.utils.book_append_sheet(
      workbook, 
      worksheet, 
      config.sheetName || "Sheet1"
    );

    // ファイルをダウンロード
    XLSX.writeFile(workbook, `${config.filename}.xlsx`);
    
    showSuccessToast("エクスポート完了", `${data.length}件のデータをExcelファイルでエクスポートしました`);
  } catch (error) {
    const appError = handleError(error, false);
    showErrorToast(appError);
  }
}

/**
 * データをJSON形式でエクスポート
 */
export function exportToJSON<T extends Record<string, any>>(
  data: T[],
  config: ExportConfig
): void {
  try {
    if (data.length === 0) {
      showErrorToast(toAppError(new Error("エクスポートするデータがありません")));
      return;
    }

    const jsonString = JSON.stringify(data, null, 2);
    
    downloadFile(jsonString, `${config.filename}.json`, "application/json");
    
    showSuccessToast("エクスポート完了", `${data.length}件のデータをJSONファイルでエクスポートしました`);
  } catch (error) {
    const appError = handleError(error, false);
    showErrorToast(appError);
  }
}

/**
 * ファイルをダウンロード
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * ファイル形式を判定
 */
export function detectFileFormat(file: File): FileFormat {
  const extension = file.name.split(".").pop()?.toLowerCase();
  
  switch (extension) {
    case "xlsx":
    case "xls":
      return FileFormat.EXCEL;
    case "csv":
      return FileFormat.CSV;
    case "json":
      return FileFormat.JSON;
    default:
      throw new Error("サポートされていないファイル形式です");
  }
}

/**
 * ファイルをパース（形式を自動判定）
 */
export async function parseFile<T = any>(
  file: File,
  options?: {
    sheetName?: string;
    delimiter?: string;
  }
): Promise<ImportResult<T>> {
  try {
    const format = detectFileFormat(file);
    
    switch (format) {
      case FileFormat.CSV:
        return await parseCSV<T>(file, { delimiter: options?.delimiter });
      case FileFormat.EXCEL:
        return await parseExcel<T>(file, options?.sheetName);
      case FileFormat.JSON: {
        const text = await file.text();
        const data = JSON.parse(text) as T[];
        return {
          success: true,
          data,
          errors: [],
          warnings: [],
          totalRows: data.length,
          validRows: data.length,
        };
      }
      default:
        throw new Error("サポートされていないファイル形式です");
    }
  } catch (error) {
    const appError = handleError(error, false);
    return {
      success: false,
      data: [],
      errors: [appError.message],
      warnings: [],
      totalRows: 0,
      validRows: 0,
    };
  }
}

/**
 * テンプレートファイルを生成
 */
export function generateTemplate<T extends Record<string, any>>(
  sampleData: T[],
  config: ExportConfig
): void {
  try {
    // サンプルデータからヘッダーを抽出
    const headers = Object.keys(sampleData[0] || {});
    const templateData = headers.map(header => ({ [header]: "" }));
    
    switch (config.format) {
      case FileFormat.CSV:
        exportToCSV(templateData, { ...config, filename: `${config.filename}_template` });
        break;
      case FileFormat.EXCEL:
        exportToExcel(templateData, { ...config, filename: `${config.filename}_template` });
        break;
      case FileFormat.JSON:
        exportToJSON(templateData, { ...config, filename: `${config.filename}_template` });
        break;
    }
    
    showSuccessToast("テンプレート生成完了", "テンプレートファイルをダウンロードしました");
  } catch (error) {
    const appError = handleError(error, false);
    showErrorToast(appError);
  }
}
