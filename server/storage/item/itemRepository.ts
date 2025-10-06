import { 
  type Item, 
  type InsertItem,
} from "@shared/schema";
import { randomUUID } from "crypto";

/**
 * 品目マスタリポジトリ
 * 
 * 操作対象テーブル: items
 * 責務: 品目マスタのCRUD操作
 */
export class ItemRepository {
  private items: Map<string, Item>;

  constructor() {
    this.items = new Map();
    this.initializeMockData();
  }

  /**
   * モックデータの初期化
   */
  private initializeMockData() {
    const mockItems: Item[] = [
      { id: "1", code: "I001", name: "製品A", createdAt: new Date() },
      { id: "2", code: "I002", name: "製品B", createdAt: new Date() },
      { id: "3", code: "I003", name: "製品C", createdAt: new Date() },
      { id: "4", code: "I004", name: "サービスD", createdAt: new Date() },
      { id: "5", code: "I005", name: "部品E", createdAt: new Date() },
    ];
    mockItems.forEach(i => this.items.set(i.id, i));
  }

  /**
   * 全品目を取得
   */
  async getItems(): Promise<Item[]> {
    return Array.from(this.items.values());
  }

  /**
   * IDで品目を取得
   */
  async getItem(id: string): Promise<Item | undefined> {
    return this.items.get(id);
  }

  /**
   * 品目を作成
   */
  async createItem(data: InsertItem): Promise<Item> {
    const id = randomUUID();
    const item: Item = {
      ...data,
      id,
      createdAt: new Date(),
    };
    this.items.set(id, item);
    return item;
  }
}
