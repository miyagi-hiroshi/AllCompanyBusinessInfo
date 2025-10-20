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
    
    // 現在の年月を取得
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    
    // 従業員ごとのデータを構築
    const employees = engineers.map(engineer => {
      const employeeData = aggregationData.filter(data => data.employeeId === engineer.employeeId.toString());
      
      // 12ヶ月分のデータを初期化（4月=1, 5月=2, ..., 3月=12）
      const monthlyHours = Array.from({ length: 12 }, (_, index) => {
        const fiscalMonth = index + 1; // 年度月: 4月=1, 5月=2, ..., 3月=12
        // データベースには既に年度月で保存されているので、そのまま使用
        const monthData = employeeData.find(data => data.month === fiscalMonth);
        return {
          month: fiscalMonth,
          totalHours: monthData ? parseFloat(monthData.totalHours.toString()) : 0
        };
      });
      
      // 選択された年度が現在年度か判定
      // 現在が4月〜12月の場合: 現在年度 = currentYear, 過去年度 = < currentYear
      // 現在が1月〜3月の場合: 現在年度 = currentYear - 1, 過去年度 = < currentYear - 1
      const currentFiscalYear = currentMonth >= 4 ? currentYear : currentYear - 1;
      const isCurrentFiscalYear = fiscalYear === currentFiscalYear;
      const isPastFiscalYear = fiscalYear < currentFiscalYear;
      const isFutureFiscalYear = fiscalYear > currentFiscalYear;
      
      
      let availableHours = 0;
      
      if (isPastFiscalYear) {
        // 過去年度: 空き工数は0
        availableHours = 0;
      } else if (isFutureFiscalYear) {
        // 未来年度: 全ての月を空き工数として計算
        const futureMonthsCount = 12;
        const futureHoursSum = monthlyHours.reduce((sum, m) => sum + m.totalHours, 0);
        availableHours = futureMonthsCount - futureHoursSum;
      } else if (isCurrentFiscalYear) {
        // 現在年度: 現在の月より未来の月のみを空き工数として計算
        const currentFiscalMonth = currentMonth >= 4 ? currentMonth - 3 : currentMonth + 9;
        const futureMonths = monthlyHours.filter(m => m.month >= currentFiscalMonth + 1);
        const futureMonthsCount = futureMonths.length;
        const futureHoursSum = futureMonths.reduce((sum, m) => sum + m.totalHours, 0);
        availableHours = futureMonthsCount - futureHoursSum;
      }
      
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

