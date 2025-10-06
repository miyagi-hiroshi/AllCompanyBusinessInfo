import { 
  type OrderForecast, 
  type InsertOrderForecast,
} from "@shared/schema";
import { randomUUID } from "crypto";
import type { OrderForecastFilter } from "./types";

/**
 * 受発注見込みデータリポジトリ
 * 
 * 操作対象テーブル: order_forecasts
 * 責務: 受発注見込みデータのCRUD操作
 */
export class OrderForecastRepository {
  private orderForecasts: Map<string, OrderForecast>;

  constructor() {
    this.orderForecasts = new Map();
    this.initializeMockData();
  }

  /**
   * モックデータの初期化
   */
  private initializeMockData() {
    const mockForecasts: OrderForecast[] = [
      {
        id: "of-1",
        projectId: "1",
        projectCode: "P001",
        projectName: "プロジェクトA",
        customerId: "1",
        customerCode: "C001",
        customerName: "株式会社A商事",
        accountingPeriod: "2024-04",
        accountingItem: "売上高",
        description: "システム開発売上",
        amount: "1500000",
        remarks: null,
        period: "2024-04",
        reconciliationStatus: "unmatched",
        glMatchId: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "of-2",
        projectId: "2",
        projectCode: "P002",
        projectName: "プロジェクトB",
        customerId: "2",
        customerCode: "C002",
        customerName: "B物産株式会社",
        accountingPeriod: "2024-05",
        accountingItem: "売上高",
        description: "保守サービス売上",
        amount: "800000",
        remarks: null,
        period: "2024-05",
        reconciliationStatus: "unmatched",
        glMatchId: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockForecasts.forEach(of => this.orderForecasts.set(of.id, of));
  }

  /**
   * フィルタ条件に基づいて受発注見込みデータを取得
   */
  async getOrderForecasts(filter: OrderForecastFilter): Promise<OrderForecast[]> {
    return Array.from(this.orderForecasts.values()).filter(o => {
      const [year, month] = o.period.split('-').map(Number);
      
      if (year !== filter.fiscalYear) return false;
      if (filter.month !== undefined && month !== filter.month) return false;
      if (filter.projectId !== undefined && o.projectId !== filter.projectId) return false;
      
      return true;
    });
  }

  /**
   * IDで受発注見込みデータを取得
   */
  async getOrderForecast(id: string): Promise<OrderForecast | undefined> {
    return this.orderForecasts.get(id);
  }

  /**
   * 受発注見込みデータを作成
   */
  async createOrderForecast(data: InsertOrderForecast): Promise<OrderForecast> {
    const id = randomUUID();
    const orderForecast: OrderForecast = {
      ...data,
      id,
      amount: String(data.amount),
      remarks: data.remarks ?? null,
      reconciliationStatus: "unmatched",
      glMatchId: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.orderForecasts.set(id, orderForecast);
    return orderForecast;
  }

  /**
   * 受発注見込みデータを更新
   */
  async updateOrderForecast(id: string, data: Partial<OrderForecast>): Promise<OrderForecast | undefined> {
    const existing = this.orderForecasts.get(id);
    if (!existing) return undefined;

    const updated: OrderForecast = {
      ...existing,
      ...data,
      updatedAt: new Date(),
      version: existing.version + 1,
    };
    this.orderForecasts.set(id, updated);
    return updated;
  }

  /**
   * 受発注見込みデータを削除
   */
  async deleteOrderForecast(id: string): Promise<boolean> {
    return this.orderForecasts.delete(id);
  }
}
