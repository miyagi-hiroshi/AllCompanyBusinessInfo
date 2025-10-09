import type { NewStaffing, Staffing, StaffingFilter } from "@shared/schema";

import { StaffingRepository } from "../storage/staffing";

export class StaffingService {
  constructor(private staffingRepository: StaffingRepository) {}

  async getStaffing(
    filter?: StaffingFilter,
    limit?: number,
    offset?: number,
    sortBy?: "fiscalYear" | "month" | "employeeName" | "workHours" | "createdAt",
    sortOrder?: "asc" | "desc"
  ): Promise<{ staffing: Staffing[]; totalCount: number }> {
    const [staffing, totalCount] = await Promise.all([
      this.staffingRepository.findAll({
        filter,
        limit,
        offset,
        sortBy,
        sortOrder,
      }),
      this.staffingRepository.count(filter),
    ]);

    return { staffing, totalCount };
  }

  async getStaffingById(id: string): Promise<Staffing> {
    const staffing = await this.staffingRepository.findById(id);
    if (!staffing) {
      throw new Error(`配員計画が見つかりません: ${id}`);
    }
    return staffing;
  }

  async createStaffing(data: NewStaffing): Promise<Staffing> {
    return await this.staffingRepository.create(data);
  }

  async updateStaffing(id: string, data: Partial<NewStaffing>): Promise<Staffing> {
    const updated = await this.staffingRepository.update(id, data);
    if (!updated) {
      throw new Error(`配員計画が見つかりません: ${id}`);
    }
    return updated;
  }

  async deleteStaffing(id: string): Promise<void> {
    const deleted = await this.staffingRepository.delete(id);
    if (!deleted) {
      throw new Error(`配員計画が見つかりません: ${id}`);
    }
  }
}

