/**
 * 受注見込み・角度B案件CSV取込サービス
 * 
 * 責務:
 * - CSVファイルのパース
 * - データのバリデーション
 * - 受注見込み案件・角度B案件の一括登録
 */

import type { NewAngleBForecast, NewOrderForecast } from '@shared/schema/integrated';
import { parse } from 'csv-parse';
import iconv from 'iconv-lite';
import { Readable } from 'stream';

import { db } from '../db';
import { AppError } from '../middleware/errorHandler';
import { AccountingItemRepository } from '../storage/accountingItem';
import { AngleBForecastRepository } from '../storage/angleBForecast';
import { OrderForecastRepository } from '../storage/orderForecast';
import { ProjectRepository } from '../storage/project';

export interface ImportResult {
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errors: Array<{ row: number; message: string }>;
}

export class ForecastImportService {
  constructor(
    private orderForecastRepository: OrderForecastRepository,
    private angleBForecastRepository: AngleBForecastRepository,
    private projectRepository: ProjectRepository,
    private accountingItemRepository: AccountingItemRepository
  ) {}

  /**
   * 受注見込み案件CSV取込
   * 
   * @param fileBuffer - CSVファイルのバッファ
   * @param fiscalYear - 取込対象年度
   * @param userId - 作成者ユーザーID
   * @param employeeId - 作成者従業員ID
   * @returns 取込結果
   */
  async importOrderForecastsFromCSV(
    fileBuffer: Buffer,
    fiscalYear: number,
    userId: string,
    employeeId?: string
  ): Promise<ImportResult> {
    const results: NewOrderForecast[] = [];
    const errors: Array<{ row: number; message: string }> = [];
    let totalRows = 0;
    let skippedRows = 0;

    try {
      // エンコーディング処理（BOM対応）
      const utf8Content = this.decodeCSV(fileBuffer);
      
      // CSVパース（ヘッダーなし、ダブルクォート対応）
      const rawRows: any[] = [];
      await new Promise<void>((resolve, reject) => {
        const stream = Readable.from(utf8Content);
        let rowIndex = 0;

        stream
          .pipe(parse({
            columns: ['projectCode', 'accountingItem', 'accountingPeriod', 'description', 'amount'],
            skipEmptyLines: true,
            relaxColumnCount: true,
            trim: true,
            quote: '"',
            escape: '"',
          }))
          .on('data', (row: any) => {
            rowIndex++;
            totalRows++;
            rawRows.push({ ...row, rowIndex });
          })
          .on('end', () => {
            console.log(`CSVパース完了: 総行数=${totalRows}`);
            resolve();
          })
          .on('error', (error) => {
            console.error('CSVパースエラー:', error);
            reject(error);
          });
      });

      // 各行を順次処理（非同期処理を順次実行）
      for (const row of rawRows) {
        try {
          // 必須項目チェック
          if (!row.projectCode || !row.accountingItem || !row.accountingPeriod || !row.description || !row.amount) {
            skippedRows++;
            errors.push({ row: row.rowIndex, message: '必須項目が不足しています' });
            continue;
          }

          // プロジェクトコードでプロジェクトを検索（年度でフィルタ）
          const project = await this.projectRepository.findByCodeAndFiscalYear(
            String(row.projectCode).trim(),
            fiscalYear
          );
          
          if (!project) {
            skippedRows++;
            errors.push({ 
              row: row.rowIndex, 
              message: `プロジェクトコード "${row.projectCode}" が指定年度のプロジェクトマスタに見つかりません` 
            });
            continue;
          }

          // 計上科目の存在確認（名称で検索）
          const accountingItem = await this.accountingItemRepository.findByName(
            String(row.accountingItem).trim()
          );
          
          if (!accountingItem) {
            skippedRows++;
            errors.push({ 
              row: row.rowIndex, 
              message: `計上科目 "${row.accountingItem}" が見つかりません` 
            });
            continue;
          }

          // 計上年月のバリデーション（YYYY-MM形式）
          const accountingPeriod = String(row.accountingPeriod).trim();
          if (!/^\d{4}-\d{2}$/.test(accountingPeriod)) {
            skippedRows++;
            errors.push({ 
              row: row.rowIndex, 
              message: `計上年月の形式が不正です: ${accountingPeriod} (YYYY-MM形式で入力してください)` 
            });
            continue;
          }

          // 金額のバリデーション（カンマ区切り対応）
          const amountStr = String(row.amount).trim().replace(/,/g, '');
          const amount = parseFloat(amountStr);
          
          if (isNaN(amount) || amount <= 0) {
            skippedRows++;
            errors.push({ 
              row: row.rowIndex, 
              message: `金額が不正です: ${row.amount}` 
            });
            continue;
          }

          // 期間（period）を計上年月から計算
          const period = accountingPeriod;

          // 受注見込みデータ作成
          const orderForecastData: NewOrderForecast = {
            projectId: project.id,
            projectCode: project.code,
            projectName: project.name,
            accountingPeriod: accountingPeriod,
            accountingItem: accountingItem.name,
            description: String(row.description).trim(),
            amount: amount.toString(),
            remarks: '',
            period: period,
            reconciliationStatus: 'unmatched',
            createdByUserId: userId,
            createdByEmployeeId: employeeId,
          };

          results.push(orderForecastData);
        } catch (error: any) {
          console.error(`行 ${row.rowIndex} 処理エラー:`, error);
          skippedRows++;
          errors.push({ row: row.rowIndex, message: error.message || 'データ処理エラー' });
        }
      }

      console.log(`データ処理完了: 取込対象=${results.length}, スキップ=${skippedRows}, エラー=${errors.length}`);

      // トランザクション内で一括登録
      if (results.length > 0) {
        await db.transaction(async (_tx) => {
          for (const orderForecastData of results) {
            await this.orderForecastRepository.create(orderForecastData);
          }
        });
      }

      return {
        totalRows,
        importedRows: results.length,
        skippedRows,
        errors,
      };
    } catch (error) {
      console.error('CSV取込エラー:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('CSVファイルの取込中にエラーが発生しました', 500);
    }
  }

  /**
   * 角度B案件CSV取込
   * 
   * @param fileBuffer - CSVファイルのバッファ
   * @param fiscalYear - 取込対象年度
   * @param userId - 作成者ユーザーID
   * @param employeeId - 作成者従業員ID
   * @returns 取込結果
   */
  async importAngleBForecastsFromCSV(
    fileBuffer: Buffer,
    fiscalYear: number,
    userId: string,
    employeeId?: string
  ): Promise<ImportResult> {
    const results: NewAngleBForecast[] = [];
    const errors: Array<{ row: number; message: string }> = [];
    let totalRows = 0;
    let skippedRows = 0;

    try {
      // エンコーディング処理（BOM対応）
      const utf8Content = this.decodeCSV(fileBuffer);
      
      // CSVパース（ヘッダーなし、ダブルクォート対応）
      const rawRows: any[] = [];
      await new Promise<void>((resolve, reject) => {
        const stream = Readable.from(utf8Content);
        let rowIndex = 0;

        stream
          .pipe(parse({
            columns: ['projectCode', 'accountingItem', 'accountingPeriod', 'description', 'amount'],
            skipEmptyLines: true,
            relaxColumnCount: true,
            trim: true,
            quote: '"',
            escape: '"',
          }))
          .on('data', (row: any) => {
            rowIndex++;
            totalRows++;
            rawRows.push({ ...row, rowIndex });
          })
          .on('end', () => {
            console.log(`CSVパース完了: 総行数=${totalRows}`);
            resolve();
          })
          .on('error', (error) => {
            console.error('CSVパースエラー:', error);
            reject(error);
          });
      });

      // 各行を順次処理（非同期処理を順次実行）
      for (const row of rawRows) {
        try {
          // 必須項目チェック
          if (!row.projectCode || !row.accountingItem || !row.accountingPeriod || !row.description || !row.amount) {
            skippedRows++;
            errors.push({ row: row.rowIndex, message: '必須項目が不足しています' });
            continue;
          }

          // プロジェクトコードでプロジェクトを検索（年度でフィルタ）
          const project = await this.projectRepository.findByCodeAndFiscalYear(
            String(row.projectCode).trim(),
            fiscalYear
          );
          
          if (!project) {
            skippedRows++;
            errors.push({ 
              row: row.rowIndex, 
              message: `プロジェクトコード "${row.projectCode}" が指定年度のプロジェクトマスタに見つかりません` 
            });
            continue;
          }

          // 計上科目の存在確認（名称で検索）
          const accountingItem = await this.accountingItemRepository.findByName(
            String(row.accountingItem).trim()
          );
          
          if (!accountingItem) {
            skippedRows++;
            errors.push({ 
              row: row.rowIndex, 
              message: `計上科目 "${row.accountingItem}" が見つかりません` 
            });
            continue;
          }

          // 計上年月のバリデーション（YYYY-MM形式）
          const accountingPeriod = String(row.accountingPeriod).trim();
          if (!/^\d{4}-\d{2}$/.test(accountingPeriod)) {
            skippedRows++;
            errors.push({ 
              row: row.rowIndex, 
              message: `計上年月の形式が不正です: ${accountingPeriod} (YYYY-MM形式で入力してください)` 
            });
            continue;
          }

          // 金額のバリデーション（カンマ区切り対応）
          const amountStr = String(row.amount).trim().replace(/,/g, '');
          const amount = parseFloat(amountStr);
          
          if (isNaN(amount) || amount <= 0) {
            skippedRows++;
            errors.push({ 
              row: row.rowIndex, 
              message: `金額が不正です: ${row.amount}` 
            });
            continue;
          }

          // 期間（period）を計上年月から計算
          const period = accountingPeriod;

          // 角度B案件データ作成（確度50固定）
          const angleBForecastData: NewAngleBForecast = {
            projectId: project.id,
            projectCode: project.code,
            projectName: project.name,
            accountingPeriod: accountingPeriod,
            accountingItem: accountingItem.name,
            description: String(row.description).trim(),
            amount: amount.toString(),
            probability: 50, // 固定値
            remarks: '',
            period: period,
            createdByUserId: userId,
            createdByEmployeeId: employeeId,
          };

          results.push(angleBForecastData);
        } catch (error: any) {
          console.error(`行 ${row.rowIndex} 処理エラー:`, error);
          skippedRows++;
          errors.push({ row: row.rowIndex, message: error.message || 'データ処理エラー' });
        }
      }

      console.log(`データ処理完了: 取込対象=${results.length}, スキップ=${skippedRows}, エラー=${errors.length}`);

      // トランザクション内で一括登録
      if (results.length > 0) {
        await db.transaction(async (_tx) => {
          for (const angleBForecastData of results) {
            await this.angleBForecastRepository.create(angleBForecastData);
          }
        });
      }

      return {
        totalRows,
        importedRows: results.length,
        skippedRows,
        errors,
      };
    } catch (error) {
      console.error('CSV取込エラー:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('CSVファイルの取込中にエラーが発生しました', 500);
    }
  }

  /**
   * CSVファイルのエンコーディング処理（BOM対応）
   * 
   * @param fileBuffer - CSVファイルのバッファ
   * @returns UTF-8文字列
   */
  private decodeCSV(fileBuffer: Buffer): string {
    // BOM検出（UTF-8 BOM: EF BB BF）
    if (fileBuffer.length >= 3 && fileBuffer[0] === 0xEF && fileBuffer[1] === 0xBB && fileBuffer[2] === 0xBF) {
      return fileBuffer.slice(3).toString('utf8');
    }

    // エンコーディング自動検出
    const encodings = ['utf8', 'shift_jis', 'euc-jp', 'iso-2022-jp'];
    
    for (const enc of encodings) {
      try {
        const decoded = iconv.decode(fileBuffer, enc);
        // 日本語文字の存在確認
        if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(decoded) || enc === 'utf8') {
          return decoded;
        }
      } catch (error) {
        continue;
      }
    }

    // デフォルトはUTF-8
    return fileBuffer.toString('utf8');
  }
}

