import { 
  type AccountingItem, 
  type InsertAccountingItem,
} from "@shared/schema";
import { randomUUID } from "crypto";

/**
 * 計上科目マスタリポジトリ
 * 
 * 操作対象テーブル: accounting_items
 * 責務: 計上科目マスタのCRUD操作
 */
export class AccountingItemRepository {
  private accountingItems: Map<string, AccountingItem>;

  constructor() {
    this.accountingItems = new Map();
    this.initializeMockData();
  }

  /**
   * モックデータの初期化
   */
  private initializeMockData() {
    const mockAccountingItems: AccountingItem[] = [
      { id: "1", code: "AC001", name: "売上高", createdAt: new Date() },
      { id: "2", code: "AC002", name: "売上原価", createdAt: new Date() },
      { id: "3", code: "AC003", name: "販売費及び一般管理費", createdAt: new Date() },
      { id: "4", code: "AC004", name: "営業外収益", createdAt: new Date() },
      { id: "5", code: "AC005", name: "営業外費用", createdAt: new Date() },
    ];
    mockAccountingItems.forEach(ai => this.accountingItems.set(ai.id, ai));
  }

  /**
   * 全計上科目を取得
   */
  async getAccountingItems(): Promise<AccountingItem[]> {
    return Array.from(this.accountingItems.values());
  }

  /**
   * IDで計上科目を取得
   */
  async getAccountingItem(id: string): Promise<AccountingItem | undefined> {
    return this.accountingItems.get(id);
  }

  /**
   * 計上科目を作成
   */
  async createAccountingItem(data: InsertAccountingItem): Promise<AccountingItem> {
    const id = randomUUID();
    const accountingItem: AccountingItem = {
      ...data,
      id,
      createdAt: new Date(),
    };
    this.accountingItems.set(id, accountingItem);
    return accountingItem;
  }
}
