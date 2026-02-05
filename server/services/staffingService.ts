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
   * 一括操作（作成・更新・削除）をトランザクション内で実行
   * 
   * @param createData - 作成するデータの配列
   * @param updateData - 更新するデータの配列（idと更新データ）
   * @param deleteIds - 削除するIDの配列
   * @returns 操作結果
   */
  async bulkOperation(
    createData: NewStaffing[],
    updateData: Array<{ id: string; data: Partial<NewStaffing> }>,
    deleteIds: string[]
  ): Promise<{
    created: Staffing[];
    updated: Staffing[];
    deleted: number;
  }> {
    return await this.staffingRepository.bulkOperation(createData, updateData, deleteIds);
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
    
    // 年度順の暦月配列（4月=4, 5月=5, ..., 3月=3）
    const fiscalMonths = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
    
    // 選択された年度が現在年度か判定
    // 現在が4月〜12月の場合: 現在年度 = currentYear, 過去年度 = < currentYear
    // 現在が1月〜3月の場合: 現在年度 = currentYear - 1, 過去年度 = < currentYear - 1
    const currentFiscalYear = currentMonth >= 4 ? currentYear : currentYear - 1;
    const isCurrentFiscalYear = fiscalYear === currentFiscalYear;
    const isPastFiscalYear = fiscalYear < currentFiscalYear;
    const isFutureFiscalYear = fiscalYear > currentFiscalYear;
    
    // 従業員ごとのデータを構築
    const employees = engineers.map(engineer => {
      const employeeData = aggregationData.filter(data => data.employeeId === engineer.employeeId.toString());
      
      // 12ヶ月分のデータを初期化（暦月ベース: 4月=4, 5月=5, ..., 3月=3）
      const monthlyHours = fiscalMonths.map((calendarMonth) => {
        // データベースには暦月で保存されているので、そのまま使用
        const monthData = employeeData.find(data => data.month === calendarMonth);
        return {
          month: calendarMonth,
          totalHours: monthData ? parseFloat(monthData.totalHours.toString()) : 0
        };
      });
      
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
        // 現在年度: 現在の月より未来の月のみを空き工数として計算（暦月ベース）
        const futureMonths = monthlyHours.filter(m => {
          // 暦月で未来かどうかを判定（年度をまたぐケースを考慮）
          if (currentMonth >= 4) {
            // 現在が4-12月（年度前半）の場合
            if (m.month >= 4) {
              // 4-12月: 暦月で比較
              return m.month > currentMonth;
            } else {
              // 1-3月: 常に未来
              return true;
            }
          } else {
            // 現在が1-3月（年度後半）の場合
            if (m.month >= 4) {
              // 4-12月: 常に過去
              return false;
            } else {
              // 1-3月: 暦月で比較
              return m.month > currentMonth;
            }
          }
        });
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

