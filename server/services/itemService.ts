import type { Item, NewItem } from '@shared/schema/integrated';

import { AppError } from '../middleware/errorHandler';
import { type ItemFilter,ItemRepository } from '../storage/item';

/**
 * アイテム管理サービスクラス
 * 
 * @description アイテムに関するビジネスロジックを担当
 * @responsibility アイテムの管理、統計情報の提供
 */
export class ItemService {
  constructor(
    private itemRepository: ItemRepository
  ) {}

  /**
   * アイテム一覧取得
   * 
   * @param filter - 検索条件
   * @param limit - 取得件数
   * @param offset - オフセット
   * @param sortBy - ソート項目
   * @param sortOrder - ソート順
   * @returns アイテム一覧と総件数
   */
  async getItems(
    filter: ItemFilter,
    limit: number,
    offset: number,
    sortBy: 'code' | 'name' | 'category' | 'createdAt' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ items: Item[]; totalCount: number }> {
    try {
      const items = await this.itemRepository.findAll({
        filter,
        limit,
        offset,
        sortBy,
        sortOrder,
      });

      const totalCount = await this.itemRepository.count(filter);

      return { items, totalCount };
    } catch (error) {
      console.error('アイテム一覧取得エラー:', error);
      throw new AppError('アイテム一覧の取得に失敗しました', 500);
    }
  }

  /**
   * アイテム詳細取得
   * 
   * @param id - アイテムID
   * @returns アイテム詳細
   */
  async getItemById(id: string): Promise<Item> {
    const item = await this.itemRepository.findById(id);

    if (!item) {
      throw new AppError('アイテムが見つかりません', 404, true, 'NOT_FOUND');
    }

    return item;
  }

  /**
   * アイテム作成
   * 
   * @param data - アイテムデータ
   * @param user - 実行ユーザー
   * @returns 作成されたアイテム
   */
  async createItem(data: NewItem, _user: any): Promise<Item> {
    try {
      // コードの重複チェック
      const existingItem = await this.itemRepository.findByCode(data.code);
      if (existingItem) {
        throw new AppError('このアイテムコードは既に使用されています', 409, true, 'CONFLICT');
      }

      const item = await this.itemRepository.create(data);

      return item;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('アイテム作成エラー:', error);
      throw new AppError('アイテムの作成に失敗しました', 500);
    }
  }

  /**
   * アイテム更新
   * 
   * @param id - アイテムID
   * @param data - 更新データ
   * @param user - 実行ユーザー
   * @returns 更新されたアイテム
   */
  async updateItem(id: string, data: Partial<NewItem>, _user: any): Promise<Item> {
    try {
      // アイテムの存在チェック
      const existingItem = await this.itemRepository.findById(id);
      if (!existingItem) {
        throw new AppError('アイテムが見つかりません', 404, true, 'NOT_FOUND');
      }

      // コードが変更される場合は重複チェック
      if (data.code && data.code !== existingItem.code) {
        const duplicateItem = await this.itemRepository.findByCode(data.code);
        if (duplicateItem) {
          throw new AppError('このアイテムコードは既に使用されています', 409, true, 'CONFLICT');
        }
      }

      const item = await this.itemRepository.update(id, data);

      if (!item) {
        throw new AppError('アイテムが見つかりません', 404, true, 'NOT_FOUND');
      }

      return item;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('アイテム更新エラー:', error);
      throw new AppError('アイテムの更新に失敗しました', 500);
    }
  }

  /**
   * アイテム削除
   * 
   * @param id - アイテムID
   */
  async deleteItem(id: string): Promise<void> {
    try {
      // アイテムの存在チェック
      const existingItem = await this.itemRepository.findById(id);
      if (!existingItem) {
        throw new AppError('アイテムが見つかりません', 404, true, 'NOT_FOUND');
      }

      await this.itemRepository.delete(id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('アイテム削除エラー:', error);
      throw new AppError('アイテムの削除に失敗しました', 500);
    }
  }

  /**
   * アイテムコード重複チェック
   * 
   * @param code - アイテムコード
   * @param excludeId - 除外するアイテムID（更新時）
   * @returns コードが存在するかどうか
   */
  async checkCodeExists(code: string, excludeId?: string): Promise<boolean> {
    const exists = await this.itemRepository.isCodeExists(code, excludeId);
    return exists;
  }
}

