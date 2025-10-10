import { CreateGLEntryData, GLEntry, GLEntryFilter,UpdateGLEntryData } from '@shared/schema/integrated';
import csv from 'csv-parser';
import iconv from 'iconv-lite';
import { Readable } from 'stream';

import { db } from '../db';
import { AppError } from '../middleware/errorHandler';
import { GLEntryRepository } from '../storage/glEntry';
import { OrderForecastRepository } from '../storage/orderForecast';

/**
 * GL総勘定元帳管理サービスクラス
 * 
 * @description GL総勘定元帳に関するビジネスロジックを担当
 * @responsibility GLデータの作成・更新・削除・突合処理時のビジネスルール適用
 */
export class GLEntryService {
  constructor(
    private glEntryRepository: GLEntryRepository,
    private orderForecastRepository: OrderForecastRepository
  ) {}

  /**
   * GLデータ一覧取得
   * 
   * @param filter - 検索フィルター
   * @param limit - 取得件数制限
   * @param offset - オフセット
   * @param sortBy - ソート項目
   * @param sortOrder - ソート順序
   * @returns GLデータ一覧と総件数
   */
  async getGLEntries(
    filter: GLEntryFilter = {},
    limit: number = 20,
    offset: number = 0,
    sortBy: 'voucherNo' | 'transactionDate' | 'accountCode' | 'amount' | 'createdAt' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ glEntries: GLEntry[]; totalCount: number }> {
    try {
      const [glEntries, totalCount] = await Promise.all([
        this.glEntryRepository.findAll({
          filter,
          limit,
          offset,
          sortBy,
          sortOrder,
        }),
        this.glEntryRepository.count(filter),
      ]);

      return { glEntries, totalCount };
    } catch (error) {
      console.error('GLデータ一覧取得エラー:', error);
      throw new AppError('GLデータ一覧の取得中にエラーが発生しました', 500);
    }
  }

  /**
   * GLデータ詳細取得
   * 
   * @param id - GLデータID
   * @returns GLデータ詳細情報
   * @throws AppError - GLデータが見つからない場合
   */
  async getGLEntryById(id: string): Promise<GLEntry> {
    try {
      const glEntry = await this.glEntryRepository.findById(id);
      
      if (!glEntry) {
        throw new AppError('GLデータが見つかりません', 404);
      }

      return glEntry;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('GLデータ詳細取得エラー:', error);
      throw new AppError('GLデータ詳細の取得中にエラーが発生しました', 500);
    }
  }

  /**
   * 伝票番号別GLデータ取得
   * 
   * @param voucherNo - 伝票番号
   * @returns 伝票番号別GLデータ一覧
   */
  async getGLEntriesByVoucherNo(voucherNo: string): Promise<GLEntry[]> {
    try {
      return await this.glEntryRepository.findByVoucherNo(voucherNo);
    } catch (error) {
      console.error('伝票番号別GLデータ取得エラー:', error);
      throw new AppError('伝票番号別GLデータの取得中にエラーが発生しました', 500);
    }
  }

  /**
   * 期間別GLデータ取得
   * 
   * @param period - 期間
   * @returns 期間別GLデータ一覧
   */
  async getGLEntriesByPeriod(period: string): Promise<GLEntry[]> {
    try {
      return await this.glEntryRepository.findByPeriod(period);
    } catch (error) {
      console.error('期間別GLデータ取得エラー:', error);
      throw new AppError('期間別GLデータの取得中にエラーが発生しました', 500);
    }
  }

  /**
   * 未突合GLデータ取得
   * 
   * @param period - 期間（オプション）
   * @returns 未突合GLデータ一覧
   */
  async getUnmatchedGLEntries(period?: string): Promise<GLEntry[]> {
    try {
      return await this.glEntryRepository.findUnmatched(period);
    } catch (error) {
      console.error('未突合GLデータ取得エラー:', error);
      throw new AppError('未突合GLデータの取得中にエラーが発生しました', 500);
    }
  }

  /**
   * 突合済みGLデータ取得
   * 
   * @param period - 期間（オプション）
   * @returns 突合済みGLデータ一覧
   */
  async getMatchedGLEntries(period?: string): Promise<GLEntry[]> {
    try {
      return await this.glEntryRepository.findMatched(period);
    } catch (error) {
      console.error('突合済みGLデータ取得エラー:', error);
      throw new AppError('突合済みGLデータの取得中にエラーが発生しました', 500);
    }
  }

  /**
   * GLデータ作成
   * 
   * @param data - GLデータ作成データ
   * @returns 作成されたGLデータ情報
   */
  async createGLEntry(data: CreateGLEntryData): Promise<GLEntry> {
    try {
      const glEntry = await this.glEntryRepository.create(data);
      
      return glEntry;
    } catch (error) {
      console.error('GLデータ作成エラー:', error);
      throw new AppError('GLデータの作成中にエラーが発生しました', 500);
    }
  }

  /**
   * GLデータ更新
   * 
   * @param id - GLデータID
   * @param data - GLデータ更新データ
   * @returns 更新されたGLデータ情報
   * @throws AppError - GLデータが見つからない場合
   */
  async updateGLEntry(id: string, data: UpdateGLEntryData): Promise<GLEntry> {
    try {
      // GLデータの存在チェック
      const existingGlEntry = await this.glEntryRepository.findById(id);
      if (!existingGlEntry) {
        throw new AppError('GLデータが見つかりません', 404);
      }

      const glEntry = await this.glEntryRepository.update(id, data);
      
      if (!glEntry) {
        throw new AppError('GLデータの更新に失敗しました', 500);
      }

      return glEntry;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('GLデータ更新エラー:', error);
      throw new AppError('GLデータの更新中にエラーが発生しました', 500);
    }
  }

  /**
   * GLデータ削除
   * 
   * @param id - GLデータID
   * @returns 削除成功フラグ
   * @throws AppError - GLデータが見つからない場合
   */
  async deleteGLEntry(id: string): Promise<boolean> {
    try {
      // GLデータの存在チェック
      const existingGlEntry = await this.glEntryRepository.findById(id);
      if (!existingGlEntry) {
        throw new AppError('GLデータが見つかりません', 404);
      }

      const deleted = await this.glEntryRepository.delete(id);
      
      if (!deleted) {
        throw new AppError('GLデータの削除に失敗しました', 500);
      }

      return true;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('GLデータ削除エラー:', error);
      throw new AppError('GLデータの削除中にエラーが発生しました', 500);
    }
  }

  /**
   * 突合ステータス更新
   * 
   * @param id - GLデータID
   * @param status - 突合ステータス
   * @param orderMatchId - 突合受発注データID
   * @returns 更新されたGLデータ情報
   * @throws AppError - GLデータが見つからない場合、不正なステータス時
   */
  async updateReconciliationStatus(
    id: string, 
    status: 'matched' | 'fuzzy' | 'unmatched', 
    orderMatchId?: string
  ): Promise<GLEntry> {
    try {
      // GLデータの存在チェック
      const existingGlEntry = await this.glEntryRepository.findById(id);
      if (!existingGlEntry) {
        throw new AppError('GLデータが見つかりません', 404);
      }

      // ステータスの妥当性チェック
      if (!['matched', 'fuzzy', 'unmatched'].includes(status)) {
        throw new AppError('突合ステータスが正しくありません', 400);
      }

      // 受発注データの存在チェック（マッチ時）
      if ((status === 'matched' || status === 'fuzzy') && orderMatchId) {
        const orderForecast = await this.orderForecastRepository.findById(orderMatchId);
        if (!orderForecast) {
          throw new AppError('指定された受発注データが見つかりません', 404);
        }
      }

      const glEntry = await this.glEntryRepository.updateReconciliationStatus(
        id,
        status,
        orderMatchId
      );
      
      if (!glEntry) {
        throw new AppError('突合ステータスの更新に失敗しました', 500);
      }

      return glEntry;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('突合ステータス更新エラー:', error);
      throw new AppError('突合ステータスの更新中にエラーが発生しました', 500);
    }
  }

  /**
   * GLデータ統計情報取得
   * 
   * @param period - 期間（オプション）
   * @returns GLデータ統計情報
   */
  async getGLEntryStatistics(period?: string): Promise<{
    totalCount: number;
    matchedCount: number;
    fuzzyMatchedCount: number;
    unmatchedCount: number;
    totalDebitAmount: number;
    totalCreditAmount: number;
    matchedAmount: number;
  }> {
    try {
      const filter = period ? { period } : {};
      const glEntries = await this.glEntryRepository.findAll({ filter });

      const statistics = glEntries.reduce(
        (acc, glEntry) => {
          acc.totalCount++;
          
          const amount = parseFloat(glEntry.amount || '0');
          if (glEntry.debitCredit === 'debit') {
            acc.totalDebitAmount += amount;
          } else {
            acc.totalCreditAmount += amount;
          }
          
          if (glEntry.reconciliationStatus === 'matched') {
            acc.matchedCount++;
            acc.matchedAmount += amount;
          } else if (glEntry.reconciliationStatus === 'fuzzy') {
            acc.fuzzyMatchedCount++;
          } else {
            acc.unmatchedCount++;
          }
          
          return acc;
        },
        {
          totalCount: 0,
          matchedCount: 0,
          fuzzyMatchedCount: 0,
          unmatchedCount: 0,
          totalDebitAmount: 0,
          totalCreditAmount: 0,
          matchedAmount: 0,
        }
      );

      return statistics;
    } catch (error) {
      console.error('GLデータ統計情報取得エラー:', error);
      throw new AppError('GLデータ統計情報の取得中にエラーが発生しました', 500);
    }
  }

  /**
   * 勘定科目別GLデータ取得
   * 
   * @param accountCode - 勘定科目コード
   * @param period - 期間（オプション）
   * @returns 勘定科目別GLデータ一覧
   */
  async getGLEntriesByAccountCode(accountCode: string, period?: string): Promise<GLEntry[]> {
    try {
      const filter: GLEntryFilter = { accountCode };
      if (period) {
        filter.period = period;
      }
      
      return await this.glEntryRepository.findAll({ filter });
    } catch (error) {
      console.error('勘定科目別GLデータ取得エラー:', error);
      throw new AppError('勘定科目別GLデータの取得中にエラーが発生しました', 500);
    }
  }

  /**
   * CSV取込処理
   * 
   * @param fileBuffer - CSVファイルのバッファ
   * @returns 取込結果
   */
  async importFromCSV(fileBuffer: Buffer): Promise<{
    totalRows: number;
    importedRows: number;
    skippedRows: number;
    errors: Array<{ row: number; message: string }>;
  }> {
    const TARGET_ACCOUNT_CODES = ['511', '512', '513', '514', '541', '515', '727', '737', '740', '745'];
    const results: CreateGLEntryData[] = [];
    const errors: Array<{ row: number; message: string }> = [];
    let totalRows = 0;
    let skippedRows = 0;

    try {
      // Shift_JISからUTF-8に変換
      const utf8Buffer = iconv.decode(fileBuffer, 'Shift_JIS');
      
      // CSVパース
      await new Promise<void>((resolve, reject) => {
        const stream = Readable.from(utf8Buffer);
        let rowIndex = 0;

        stream
          .pipe(csv({
            headers: [
              'accountCode', 'accountName', 'auxCode', 'auxName',
              'taxCode', 'taxName', 'transactionDate', 'voucherNo',
              'counterAccountCode', 'counterAccountName', 'counterAuxCode', 'counterAuxName',
              'counterTaxCode', 'counterTaxName', 'description',
              'number1', 'number2', 'debitAmount', 'debitTax',
              'creditAmount', 'creditTax', 'balance'
            ],
            skipLines: 0,
          }))
          .on('data', (row: any) => {
            rowIndex++;
            totalRows++;

            try {
              // 対象科目コードチェック
              if (!TARGET_ACCOUNT_CODES.includes(row.accountCode)) {
                skippedRows++;
                return;
              }

              // データ変換
              const debitAmount = parseFloat(row.debitAmount || '0');
              const creditAmount = parseFloat(row.creditAmount || '0');
              
              if (debitAmount === 0 && creditAmount === 0) {
                skippedRows++;
                return;
              }

              const amount = debitAmount > 0 ? debitAmount : creditAmount;
              const debitCredit = debitAmount > 0 ? 'debit' : 'credit';

              // 日付からperiodを抽出 (YYYY/MM/DD -> YYYY-MM)
              const dateParts = row.transactionDate.split('/');
              if (dateParts.length !== 3) {
                errors.push({ row: rowIndex, message: '日付フォーマットエラー' });
                return;
              }
              const period = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}`;

              // データ作成
              const glEntry: CreateGLEntryData = {
                voucherNo: row.voucherNo,
                transactionDate: row.transactionDate.replace(/\//g, '-'), // YYYY/MM/DD -> YYYY-MM-DD
                accountCode: row.accountCode,
                accountName: row.accountName,
                amount: amount.toString(),
                debitCredit,
                description: row.description || '',
                period,
              };

              results.push(glEntry);
            } catch (error: any) {
              errors.push({ row: rowIndex, message: error.message });
            }
          })
          .on('end', () => resolve())
          .on('error', (error) => reject(error));
      });

      // トランザクション内で一括登録
      if (results.length > 0) {
        await db.transaction(async (_tx) => {
          for (const glEntry of results) {
            await this.glEntryRepository.create(glEntry);
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
      throw new AppError('CSVファイルの取込中にエラーが発生しました', 500);
    }
  }

  /**
   * GL明細の除外設定
   * 
   * @param ids - GL明細IDリスト
   * @param isExcluded - 除外フラグ
   * @param exclusionReason - 除外理由
   * @returns 更新件数
   */
  async setExclusion(ids: string[], isExcluded: boolean, exclusionReason?: string): Promise<number> {
    try {
      let updatedCount = 0;
      
      await db.transaction(async (_tx) => {
        for (const id of ids) {
          const updated = await this.glEntryRepository.update(id, {
            isExcluded: isExcluded ? 'true' : 'false',
            exclusionReason: isExcluded ? exclusionReason : null,
          });
          if (updated) {
            updatedCount++;
          }
        }
      });

      return updatedCount;
    } catch (error) {
      console.error('除外設定エラー:', error);
      throw new AppError('除外設定の更新中にエラーが発生しました', 500);
    }
  }
}
