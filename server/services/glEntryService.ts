import { CreateGLEntryData, GLEntry, GLEntryFilter,UpdateGLEntryData } from '@shared/schema/integrated';
import { convertHalfWidthKanaToFullWidth } from '@shared/utils/textNormalization';
import csv from 'csv-parser';
import iconv from 'iconv-lite';
import { Readable } from 'stream';

import { db } from '../db';
import { AppError } from '../middleware/errorHandler';
import { GLEntryRepository } from '../storage/glEntry';
import { OrderForecastRepository } from '../storage/orderForecast';
import { ReconciliationLogRepository } from '../storage/reconciliationLog';
import { ReconciliationService } from './reconciliationService';

/**
 * GL総勘定元帳管理サービスクラス
 * 
 * @description GL総勘定元帳に関するビジネスロジックを担当
 * @responsibility GLデータの作成・更新・削除・突合処理時のビジネスルール適用
 */
export class GLEntryService {
  private reconciliationService: ReconciliationService;

  constructor(
    private glEntryRepository: GLEntryRepository,
    private orderForecastRepository: OrderForecastRepository
  ) {
    // ReconciliationServiceを初期化
    const reconciliationLogRepository = new ReconciliationLogRepository();
    this.reconciliationService = new ReconciliationService(
      reconciliationLogRepository,
      orderForecastRepository,
      glEntryRepository
    );
  }

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
  async importFromCSV(fileBuffer: Buffer, encoding?: string): Promise<{
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
      // 🔍 エンコーディング処理（手動指定対応）
      console.log('=== CSVファイルエンコーディング処理 ===');
      console.log('ファイルサイズ:', fileBuffer.length, 'bytes');
      console.log('指定エンコーディング:', encoding || '自動検出');
      
      let utf8Content: string = '';
      let detectedEncoding = encoding || 'shift_jis';
      
      // 手動指定されたエンコーディングがある場合はそれを使用
      if (encoding) {
        try {
          utf8Content = iconv.decode(fileBuffer, encoding);
          console.log(`指定エンコーディング ${encoding} で処理完了`);
          console.log(`${encoding} サンプル:`, utf8Content.slice(0, 200));
        } catch (error) {
          console.log(`指定エンコーディング ${encoding} でエラー:`, error.message);
          throw new Error(`指定されたエンコーディング ${encoding} でファイルを読み込めませんでした`);
        }
      } else {
        // 自動検出処理
        const encodings = ['shift_jis', 'euc-jp', 'utf8', 'iso-2022-jp'];
        let bestEncoding = 'shift_jis';
        let bestScore = 0;
        
        for (const enc of encodings) {
          try {
            const decoded = iconv.decode(fileBuffer, enc);
            
            // 日本語文字の数をカウント
            const japaneseCount = (decoded.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;
            
            // 文字化け文字の数をカウント
            const garbledCount = (decoded.match(/[\uFFFD]/g) || []).length;
            
            // スコア計算（日本語文字が多いほど高スコア、文字化け文字があるほど低スコア）
            const score = japaneseCount - (garbledCount * 10);
            
            console.log(`${enc}: 日本語文字=${japaneseCount}, 文字化け=${garbledCount}, スコア=${score}`);
            console.log(`${enc} サンプル:`, decoded.slice(0, 100));
            
            if (score > bestScore) {
              bestScore = score;
              bestEncoding = enc;
              utf8Content = decoded;
              detectedEncoding = enc;
            }
            
          } catch (error) {
            console.log(`${enc}: エラー - ${error.message}`);
            continue;
          }
        }
        
        console.log(`最適なエンコーディング: ${bestEncoding} (スコア: ${bestScore})`);
      }
      
      console.log(`最終選択エンコーディング: ${detectedEncoding}`);
      
      // CSVパース
      console.log('=== CSVパース開始 ===');
      console.log('CSV内容サンプル:', utf8Content.slice(0, 500));
      
      await new Promise<void>((resolve, reject) => {
        const stream = Readable.from(utf8Content);
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
              console.log(`行 ${rowIndex}:`, {
                accountCode: row.accountCode,
                accountName: row.accountName,
                transactionDate: row.transactionDate,
                voucherNo: row.voucherNo,
                debitAmount: row.debitAmount,
                creditAmount: row.creditAmount
              });

              // 対象科目コードチェック
              if (!TARGET_ACCOUNT_CODES.includes(row.accountCode)) {
                console.log(`行 ${rowIndex}: 対象外科目コード ${row.accountCode}`);
                skippedRows++;
                return;
              }

              // データ変換
              const debitAmount = parseFloat(row.debitAmount || '0');
              const creditAmount = parseFloat(row.creditAmount || '0');
              
              console.log(`行 ${rowIndex}: 借方=${debitAmount}, 貸方=${creditAmount}`);
              
              if (debitAmount === 0 && creditAmount === 0) {
                console.log(`行 ${rowIndex}: 金額が0のためスキップ`);
                skippedRows++;
                return;
              }

              const amount = debitAmount > 0 ? debitAmount : creditAmount;
              const debitCredit = debitAmount > 0 ? 'debit' : 'credit';

              // 日付からperiodを抽出 (YYYYMMDD形式またはYYYY/MM/DD形式)
              const dateStr = row.transactionDate;
              let period: string;
              let transactionDate: string;
              
              if (dateStr && dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
                // YYYYMMDD形式
                period = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}`;
                transactionDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
              } else if (dateStr && dateStr.includes('/')) {
                // YYYY/MM/DD形式
                const dateParts = dateStr.split('/');
                if (dateParts.length !== 3) {
                  errors.push({ row: rowIndex, message: '日付フォーマットエラー' });
                  return;
                }
                period = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}`;
                transactionDate = dateStr.replace(/\//g, '-'); // YYYY/MM/DD -> YYYY-MM-DD
              } else {
                errors.push({ row: rowIndex, message: `日付フォーマットエラー: ${dateStr}` });
                return;
              }

              // データ作成
              const glEntry: CreateGLEntryData = {
                voucherNo: row.voucherNo,
                transactionDate: transactionDate,
                accountCode: row.accountCode,
                accountName: convertHalfWidthKanaToFullWidth(row.accountName),
                amount: amount.toString(),
                debitCredit,
                description: row.description || '',
                period,
              };

              console.log(`行 ${rowIndex}: GLエントリー作成`, glEntry);
              results.push(glEntry);
            } catch (error: any) {
              console.error(`行 ${rowIndex} 処理エラー:`, error);
              errors.push({ row: rowIndex, message: error.message });
            }
          })
          .on('end', () => {
            console.log(`CSVパース完了: 総行数=${totalRows}, 取込対象=${results.length}, スキップ=${skippedRows}, エラー=${errors.length}`);
            resolve();
          })
          .on('error', (error) => {
            console.error('CSVパースエラー:', error);
            reject(error);
          });
      });

      // CSVに含まれるすべての期間（period）を抽出
      const periods = new Set<string>();
      for (const glEntry of results) {
        periods.add(glEntry.period);
      }

      // 各期間について既存データをチェック
      for (const period of periods) {
        const existingData = await this.glEntryRepository.findByPeriod(period);
        if (existingData.length > 0) {
          throw new AppError(
            `対象期間（${period}）に既存のGLデータが${existingData.length}件存在します。先に月度データを削除してから取り込んでください。`,
            400
          );
        }
      }

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

  /**
   * 期間でGLデータを削除（突合解除も含む）
   * 
   * @param period - 期間（YYYY-MM形式）
   * @returns 削除件数、突合解除件数
   */
  async deleteByPeriod(period: string): Promise<{
    deletedCount: number;
    unmatchedCount: number;
  }> {
    try {
      // 対象期間のGLデータを取得
      const glEntries = await this.glEntryRepository.findByPeriod(period);
      
      if (glEntries.length === 0) {
        return { deletedCount: 0, unmatchedCount: 0 };
      }

      // 突合済みデータを抽出
      const matchedEntries = glEntries.filter(gl => gl.reconciliationStatus === 'matched' && gl.orderMatchId);

      let unmatchedCount = 0;

      // トランザクション内で突合解除と削除を実行
      await db.transaction(async (_tx) => {
        // 突合済みデータの突合解除
        for (const glEntry of matchedEntries) {
          if (glEntry.orderMatchId) {
            try {
              await this.reconciliationService.unmatchReconciliation(glEntry.id, glEntry.orderMatchId);
              unmatchedCount++;
            } catch (error) {
              console.error(`突合解除エラー (GL ID: ${glEntry.id}):`, error);
              // エラーが発生しても処理を続行
            }
          }
        }

        // すべてのGLデータを削除
        await this.glEntryRepository.deleteByPeriod(period);
      });

      return {
        deletedCount: glEntries.length,
        unmatchedCount,
      };
    } catch (error) {
      console.error('期間削除エラー:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('期間削除処理中にエラーが発生しました', 500);
    }
  }
}
