import type { AngleBForecast, AngleBForecastFilter, NewAngleBForecast, NewOrderForecast } from "@shared/schema";

import { AngleBForecastRepository } from "../storage/angleBForecast";
import { OrderForecastRepository } from "../storage/orderForecast";

export class AngleBForecastService {
  constructor(
    private angleBForecastRepository: AngleBForecastRepository,
    private orderForecastRepository: OrderForecastRepository
  ) {}

  async getAngleBForecasts(
    filter?: AngleBForecastFilter,
    limit?: number,
    offset?: number,
    sortBy?: "accountingPeriod" | "amount" | "probability" | "createdAt",
    sortOrder?: "asc" | "desc"
  ): Promise<{ angleBForecasts: AngleBForecast[]; totalCount: number }> {
    const [angleBForecasts, totalCount] = await Promise.all([
      this.angleBForecastRepository.findAll({
        filter,
        limit,
        offset,
        sortBy,
        sortOrder,
      }),
      this.angleBForecastRepository.count(filter),
    ]);

    return { angleBForecasts, totalCount };
  }

  async getAngleBForecastById(id: string): Promise<AngleBForecast> {
    const angleBForecast = await this.angleBForecastRepository.findById(id);
    if (!angleBForecast) {
      throw new Error(`角度B案件が見つかりません: ${id}`);
    }
    return angleBForecast;
  }

  async createAngleBForecast(data: NewAngleBForecast): Promise<AngleBForecast> {
    return await this.angleBForecastRepository.create(data);
  }

  async updateAngleBForecast(id: string, data: Partial<NewAngleBForecast>): Promise<AngleBForecast> {
    const updated = await this.angleBForecastRepository.update(id, data);
    if (!updated) {
      throw new Error(`角度B案件が見つかりません: ${id}`);
    }
    return updated;
  }

  async deleteAngleBForecast(id: string): Promise<void> {
    const deleted = await this.angleBForecastRepository.delete(id);
    if (!deleted) {
      throw new Error(`角度B案件が見つかりません: ${id}`);
    }
  }

  /**
   * 角度B案件を受発注見込みに昇格
   * トランザクション内で角度Bデータを削除し、受発注見込を作成
   */
  async promoteToOrderForecast(id: string): Promise<{ orderForecast: NewOrderForecast; deleted: boolean }> {
    // 角度B案件を取得
    const angleBForecast = await this.angleBForecastRepository.findById(id);
    if (!angleBForecast) {
      throw new Error(`角度B案件が見つかりません: ${id}`);
    }

    // 受発注見込データを作成
    const orderForecastData: NewOrderForecast = {
      projectId: angleBForecast.projectId,
      projectCode: angleBForecast.projectCode,
      projectName: angleBForecast.projectName,
      customerId: angleBForecast.customerId,
      customerCode: angleBForecast.customerCode,
      customerName: angleBForecast.customerName,
      accountingPeriod: angleBForecast.accountingPeriod,
      accountingItem: angleBForecast.accountingItem,
      description: angleBForecast.description,
      amount: angleBForecast.amount,
      remarks: angleBForecast.remarks || "",
      period: angleBForecast.period,
      reconciliationStatus: "unmatched",
      createdByUserId: angleBForecast.createdByUserId,
      createdByEmployeeId: angleBForecast.createdByEmployeeId,
    };

    // 受発注見込を作成
    const orderForecast = await this.orderForecastRepository.create(orderForecastData);

    // 角度B案件を削除
    const deleted = await this.angleBForecastRepository.delete(id);

    return { orderForecast, deleted };
  }
}

