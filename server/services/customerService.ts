import { CreateCustomerData, Customer, CustomerFilter,UpdateCustomerData } from '@shared/schema/integrated';

// import { db } from '../db'; // 未使用のためコメントアウト
import { AppError } from '../middleware/errorHandler';
import { CustomerRepository } from '../storage/customer';
import { ProjectRepository } from '../storage/project';

/**
 * 顧客管理サービスクラス
 * 
 * @description 顧客に関するビジネスロジックを担当
 * @responsibility 顧客の作成・更新・削除時のビジネスルール適用
 */
export class CustomerService {
  constructor(
    private customerRepository: CustomerRepository,
    private projectRepository: ProjectRepository
  ) {}

  /**
   * 顧客一覧取得
   * 
   * @param filter - 検索フィルター
   * @param limit - 取得件数制限
   * @param offset - オフセット
   * @param sortBy - ソート項目
   * @param sortOrder - ソート順序
   * @returns 顧客一覧と総件数
   */
  async getCustomers(
    filter: CustomerFilter = {},
    limit: number = 20,
    offset: number = 0,
    sortBy: 'code' | 'name' | 'createdAt' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ customers: Customer[]; totalCount: number }> {
    try {
      const [customers, totalCount] = await Promise.all([
        this.customerRepository.findAll({
          filter,
          limit,
          offset,
          sortBy,
          sortOrder,
        }),
        this.customerRepository.count(filter),
      ]);

      return { customers, totalCount };
    } catch (error) {
      console.error('顧客一覧取得エラー:', error);
      throw new AppError('顧客一覧の取得中にエラーが発生しました', 500);
    }
  }

  /**
   * 顧客詳細取得
   * 
   * @param id - 顧客ID
   * @returns 顧客詳細情報
   * @throws AppError - 顧客が見つからない場合
   */
  async getCustomerById(id: string): Promise<Customer> {
    try {
      const customer = await this.customerRepository.findById(id);
      
      if (!customer) {
        throw new AppError('顧客が見つかりません', 404);
      }

      return customer;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('顧客詳細取得エラー:', error);
      throw new AppError('顧客詳細の取得中にエラーが発生しました', 500);
    }
  }

  /**
   * 顧客作成
   * 
   * @param data - 顧客作成データ
   * @param user - 作成者ユーザー情報
   * @returns 作成された顧客情報
   * @throws AppError - 顧客コード重複時
   */
  async createCustomer(data: CreateCustomerData, user: { id: string; employee?: { id: number } }): Promise<Customer> {
    try {
      // 顧客コードの重複チェック
      const existingCustomer = await this.customerRepository.findByCode(data.code);
      if (existingCustomer) {
        throw new AppError('顧客コードが既に存在します', 409);
      }

      // 顧客データの作成
      const customerData = {
        ...data,
        createdByUserId: user.id,
        createdByEmployeeId: user.employee?.id?.toString(),
      };

      const customer = await this.customerRepository.create(customerData);
      
      return customer;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('顧客作成エラー:', error);
      throw new AppError('顧客の作成中にエラーが発生しました', 500);
    }
  }

  /**
   * 顧客更新
   * 
   * @param id - 顧客ID
   * @param data - 顧客更新データ
   * @returns 更新された顧客情報
   * @throws AppError - 顧客が見つからない場合、コード重複時
   */
  async updateCustomer(id: string, data: UpdateCustomerData): Promise<Customer> {
    try {
      // 顧客の存在チェック
      const existingCustomer = await this.customerRepository.findById(id);
      if (!existingCustomer) {
        throw new AppError('顧客が見つかりません', 404);
      }

      // 顧客コードの重複チェック（更新時）
      if (data.code && data.code !== existingCustomer.code) {
        const duplicateCustomer = await this.customerRepository.findByCode(data.code);
        if (duplicateCustomer) {
          throw new AppError('顧客コードが既に存在します', 409);
        }
      }

      const customer = await this.customerRepository.update(id, data);
      
      if (!customer) {
        throw new AppError('顧客の更新に失敗しました', 500);
      }

      return customer;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('顧客更新エラー:', error);
      throw new AppError('顧客の更新中にエラーが発生しました', 500);
    }
  }

  /**
   * 顧客削除
   * 
   * @param id - 顧客ID
   * @returns 削除成功フラグ
   * @throws AppError - 顧客が見つからない場合、関連プロジェクト存在時
   */
  async deleteCustomer(id: string): Promise<boolean> {
    try {
      // 顧客の存在チェック
      const existingCustomer = await this.customerRepository.findById(id);
      if (!existingCustomer) {
        throw new AppError('顧客が見つかりません', 404);
      }

      // 関連プロジェクトの存在チェック
      const relatedProjects = await this.projectRepository.findByCustomerId(id);
      if (relatedProjects.length > 0) {
        throw new AppError(
          `顧客に関連するプロジェクトが${relatedProjects.length}件存在するため削除できません`,
          409
        );
      }

      const deleted = await this.customerRepository.delete(id);
      
      if (!deleted) {
        throw new AppError('顧客の削除に失敗しました', 500);
      }

      return true;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('顧客削除エラー:', error);
      throw new AppError('顧客の削除中にエラーが発生しました', 500);
    }
  }

  /**
   * 顧客コード重複チェック
   * 
   * @param code - 顧客コード
   * @param excludeId - 除外する顧客ID（更新時）
   * @returns 重複チェック結果
   */
  async checkCodeExists(code: string, excludeId?: string): Promise<boolean> {
    try {
      return await this.customerRepository.isCodeExists(code, excludeId);
    } catch (error) {
      console.error('顧客コード重複チェックエラー:', error);
      throw new AppError('顧客コードの重複チェック中にエラーが発生しました', 500);
    }
  }

  /**
   * 顧客統計情報取得
   * 
   * @returns 顧客統計情報
   */
  async getCustomerStatistics(): Promise<{
    totalCustomers: number;
    activeCustomers: number;
    inactiveCustomers: number;
  }> {
    try {
      const [totalCount, activeCount] = await Promise.all([
        this.customerRepository.count({}),
        this.customerRepository.count({}),
      ]);

      return {
        totalCustomers: totalCount,
        activeCustomers: activeCount,
        inactiveCustomers: totalCount - activeCount,
      };
    } catch (error) {
      console.error('顧客統計情報取得エラー:', error);
      throw new AppError('顧客統計情報の取得中にエラーが発生しました', 500);
    }
  }
}
