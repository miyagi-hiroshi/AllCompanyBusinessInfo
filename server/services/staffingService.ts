import type { NewStaffing, Staffing, StaffingFilter } from "@shared/schema";

import { getEngineerEmployees } from "../storage/existing/existingRepository";
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

  /**
   * 工数入力チェックデータを取得
   * 
   * @param fiscalYear - 年度
   * @returns 従業員×月別の工数集計データ
   */
  async getStaffingCheckData(fiscalYear: number): Promise<{
    employees: Array<{
      employeeId: string;
      employeeName: string;
      monthlyHours: Array<{
        month: number;
        totalHours: number;
      }>;
      availableHours: number;
    }>;
    totalAvailableHours: number;
  }> {
    // エンジニア従業員を取得
    const engineers = await getEngineerEmployees();
    
    // 指定年度の工数集計データを取得
    const aggregationData = await this.staffingRepository.getMonthlyAggregation(fiscalYear);
    
    // 現在の月を取得（年度の月順序: 4月=1, 5月=2, ..., 3月=12）
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const currentFiscalMonth = currentMonth >= 4 ? currentMonth - 3 : currentMonth + 9; // 年度月に変換
    
    // 従業員ごとのデータを構築
    const employees = engineers.map(engineer => {
      const employeeData = aggregationData.filter(data => data.employeeId === engineer.employeeId);
      
      // 12ヶ月分のデータを初期化（4月=1, 5月=2, ..., 3月=12）
      const monthlyHours = Array.from({ length: 12 }, (_, index) => {
        const fiscalMonth = index + 1; // 年度月: 4月=1, 5月=2, ..., 3月=12
        // 年度月を通常の月に変換: 4月（1月）→4, 5月（2月）→5, ..., 3月（12月）→3
        const calendarMonth = fiscalMonth <= 9 ? fiscalMonth + 3 : fiscalMonth - 9;
        const monthData = employeeData.find(data => data.month === calendarMonth);
        return {
          month: fiscalMonth,
          totalHours: monthData ? parseFloat(monthData.totalHours.toString()) : 0
        };
      });
      
        // 空き工数を計算（翌月以降の月数 - 翌月以降の配置工数のサマリ）
        const futureMonths = monthlyHours.filter(m => m.month >= currentFiscalMonth + 1);
        const futureMonthsCount = futureMonths.length;
        const futureHoursSum = futureMonths.reduce((sum, m) => sum + m.totalHours, 0);
        const availableHours = futureMonthsCount - futureHoursSum;
      
      return {
        employeeId: engineer.employeeId,
        employeeName: `${engineer.lastName} ${engineer.firstName}`,
        monthlyHours,
        availableHours
      };
    });
    
    // 全従業員の空き工数合計
    const totalAvailableHours = employees.reduce((sum, emp) => sum + emp.availableHours, 0);
    
    return {
      employees,
      totalAvailableHours
    };
  }
}

