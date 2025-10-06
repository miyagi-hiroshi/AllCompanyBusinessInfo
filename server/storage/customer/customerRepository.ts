import { 
  type Customer, 
  type InsertCustomer,
} from "@shared/schema";
import { randomUUID } from "crypto";

/**
 * 取引先マスタリポジトリ
 * 
 * 操作対象テーブル: customers
 * 責務: 取引先マスタのCRUD操作
 */
export class CustomerRepository {
  private customers: Map<string, Customer>;

  constructor() {
    this.customers = new Map();
    this.initializeMockData();
  }

  /**
   * モックデータの初期化
   */
  private initializeMockData() {
    const mockCustomers: Customer[] = [
      { id: "1", code: "C001", name: "株式会社A商事", createdAt: new Date() },
      { id: "2", code: "C002", name: "B物産株式会社", createdAt: new Date() },
      { id: "3", code: "C003", name: "C工業株式会社", createdAt: new Date() },
      { id: "4", code: "C004", name: "株式会社Dサービス", createdAt: new Date() },
      { id: "5", code: "C005", name: "E商事株式会社", createdAt: new Date() },
    ];
    mockCustomers.forEach(c => this.customers.set(c.id, c));
  }

  /**
   * 全取引先を取得
   */
  async getCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  /**
   * IDで取引先を取得
   */
  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  /**
   * 取引先を作成
   */
  async createCustomer(data: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const customer: Customer = {
      ...data,
      id,
      createdAt: new Date(),
    };
    this.customers.set(id, customer);
    return customer;
  }

  /**
   * 取引先を更新
   */
  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer | undefined> {
    const existing = this.customers.get(id);
    if (!existing) return undefined;

    const updated: Customer = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
    };
    this.customers.set(id, updated);
    return updated;
  }

  /**
   * 取引先を削除
   */
  async deleteCustomer(id: string): Promise<boolean> {
    return this.customers.delete(id);
  }

  /**
   * 取引先を一括作成
   */
  async bulkCreateCustomers(data: InsertCustomer[]): Promise<Customer[]> {
    const customers: Customer[] = [];
    for (const item of data) {
      const customer = await this.createCustomer(item);
      customers.push(customer);
    }
    return customers;
  }
}
