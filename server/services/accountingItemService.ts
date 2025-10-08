import type { AccountingItem, NewAccountingItem } from '@shared/schema/integrated';

import { AppError } from '../middleware/errorHandler';
import { type AccountingItemFilter,AccountingItemRepository } from '../storage/accountingItem';

/**
 * 会計項目管理サービスクラス
 * 
 * @description 会計項目に関するビジネスロジックを担当
 * @responsibility 会計項目の管理、統計情報の提供
 */
export class AccountingItemService {
  constructor(
    private accountingItemRepository: AccountingItemRepository
  ) {}

  /**
   * 会計項目一覧取得
   * 
   * @param filter - 検索条件
   * @param limit - 取得件数
   * @param offset - オフセット
   * @param sortBy - ソート項目
   * @param sortOrder - ソート順
   * @returns 会計項目一覧と総件数
   */
  async getAccountingItems(
    filter: AccountingItemFilter,
    limit: number,
    offset: number,
    sortBy: 'code' | 'name' | 'createdAt' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ accountingItems: AccountingItem[]; totalCount: number }> {
    try {
      const accountingItems = await this.accountingItemRepository.findAll({
        filter,
        limit,
        offset,
        sortBy,
        sortOrder,
      });

      const totalCount = await this.accountingItemRepository.count(filter);

      return { accountingItems, totalCount };
    } catch (error) {
      console.error('会計項目一覧取得エラー:', error);
      throw new AppError('会計項目一覧の取得に失敗しました', 500);
    }
  }

  /**
   * 会計項目詳細取得
   * 
   * @param id - 会計項目ID
   * @returns 会計項目詳細
   */
  async getAccountingItemById(id: string): Promise<AccountingItem> {
    const accountingItem = await this.accountingItemRepository.findById(id);

    if (!accountingItem) {
      throw new AppError('会計項目が見つかりません', 404, true, 'NOT_FOUND');
    }

    return accountingItem;
  }

  /**
   * 会計項目作成
   * 
   * @param data - 会計項目データ
   * @param user - 実行ユーザー
   * @returns 作成された会計項目
   */
  async createAccountingItem(data: NewAccountingItem, _user: any): Promise<AccountingItem> {
    try {
      // コードの重複チェック
      const existingAccountingItem = await this.accountingItemRepository.findByCode(data.code);
      if (existingAccountingItem) {
        throw new AppError('この会計項目コードは既に使用されています', 409, true, 'CONFLICT');
      }

      const accountingItem = await this.accountingItemRepository.create(data);

      return accountingItem;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('会計項目作成エラー:', error);
      throw new AppError('会計項目の作成に失敗しました', 500);
    }
  }

  /**
   * 会計項目更新
   * 
   * @param id - 会計項目ID
   * @param data - 更新データ
   * @param user - 実行ユーザー
   * @returns 更新された会計項目
   */
  async updateAccountingItem(id: string, data: Partial<NewAccountingItem>, _user: any): Promise<AccountingItem> {
    try {
      // 会計項目の存在チェック
      const existingAccountingItem = await this.accountingItemRepository.findById(id);
      if (!existingAccountingItem) {
        throw new AppError('会計項目が見つかりません', 404, true, 'NOT_FOUND');
      }

      // コードが変更される場合は重複チェック
      if (data.code && data.code !== existingAccountingItem.code) {
        const duplicateAccountingItem = await this.accountingItemRepository.findByCode(data.code);
        if (duplicateAccountingItem) {
          throw new AppError('この会計項目コードは既に使用されています', 409, true, 'CONFLICT');
        }
      }

      const accountingItem = await this.accountingItemRepository.update(id, data);
      
      if (!accountingItem) {
        throw new AppError('会計項目の更新に失敗しました', 500);
      }

      return accountingItem;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('会計項目更新エラー:', error);
      throw new AppError('会計項目の更新に失敗しました', 500);
    }
  }

  /**
   * 会計項目削除
   * 
   * @param id - 会計項目ID
   */
  async deleteAccountingItem(id: string): Promise<void> {
    try {
      // 会計項目の存在チェック
      const existingAccountingItem = await this.accountingItemRepository.findById(id);
      if (!existingAccountingItem) {
        throw new AppError('会計項目が見つかりません', 404, true, 'NOT_FOUND');
      }

      await this.accountingItemRepository.delete(id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('会計項目削除エラー:', error);
      throw new AppError('会計項目の削除に失敗しました', 500);
    }
  }

  /**
   * 会計項目コード重複チェック
   * 
   * @param code - 会計項目コード
   * @param excludeId - 除外する会計項目ID（更新時）
   * @returns コードが存在するかどうか
   */
  async checkCodeExists(code: string, excludeId?: string): Promise<boolean> {
    const exists = await this.accountingItemRepository.isCodeExists(code, excludeId);
    return exists;
  }
}

