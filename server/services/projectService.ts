import { CreateProjectData, Project, ProjectAnalysisSummary,ProjectFilter, UpdateProjectData } from '@shared/schema/integrated';

// import { db } from '../db'; // 未使用のためコメントアウト
import { AppError } from '../middleware/errorHandler';
import { BudgetTargetRepository } from '../storage/budgetTarget';
import { CustomerRepository } from '../storage/customer';
import { OrderForecastRepository } from '../storage/orderForecast';
import { ProjectRepository } from '../storage/project';
import { StaffingRepository } from '../storage/staffing';

/**
 * プロジェクト管理サービスクラス
 * 
 * @description プロジェクトに関するビジネスロジックを担当
 * @responsibility プロジェクトの作成・更新・削除時のビジネスルール適用
 */
export class ProjectService {
  constructor(
    private projectRepository: ProjectRepository,
    private customerRepository: CustomerRepository,
    private orderForecastRepository: OrderForecastRepository,
    private staffingRepository: StaffingRepository,
    private budgetTargetRepository: BudgetTargetRepository
  ) {}

  /**
   * プロジェクト一覧取得
   * 
   * @param filter - 検索フィルター
   * @param limit - 取得件数制限
   * @param offset - オフセット
   * @param sortBy - ソート項目
   * @param sortOrder - ソート順序
   * @returns プロジェクト一覧と総件数
   */
  async getProjects(
    filter: ProjectFilter = {},
    limit: number = 20,
    offset: number = 0,
    sortBy: 'code' | 'name' | 'fiscalYear' | 'createdAt' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ projects: Project[]; totalCount: number }> {
    try {
      const [projects, totalCount] = await Promise.all([
        this.projectRepository.findAll({
          filter,
          limit,
          offset,
          sortBy,
          sortOrder,
        }),
        this.projectRepository.count(filter),
      ]);

      return { projects, totalCount };
    } catch (error) {
      console.error('プロジェクト一覧取得エラー:', error);
      throw new AppError('プロジェクト一覧の取得中にエラーが発生しました', 500);
    }
  }

  /**
   * プロジェクト詳細取得
   * 
   * @param id - プロジェクトID
   * @returns プロジェクト詳細情報
   * @throws AppError - プロジェクトが見つからない場合
   */
  async getProjectById(id: string): Promise<Project> {
    try {
      const project = await this.projectRepository.findById(id);
      
      if (!project) {
        throw new AppError('プロジェクトが見つかりません', 404);
      }

      return project;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('プロジェクト詳細取得エラー:', error);
      throw new AppError('プロジェクト詳細の取得中にエラーが発生しました', 500);
    }
  }

  /**
   * 年度別プロジェクト取得
   * 
   * @param fiscalYear - 年度
   * @returns 年度別プロジェクト一覧
   */
  async getProjectsByFiscalYear(fiscalYear: number): Promise<Project[]> {
    try {
      return await this.projectRepository.findByFiscalYear(fiscalYear);
    } catch (error) {
      console.error('年度別プロジェクト取得エラー:', error);
      throw new AppError('年度別プロジェクトの取得中にエラーが発生しました', 500);
    }
  }

  /**
   * 顧客別プロジェクト取得
   * 
   * @param customerId - 顧客ID
   * @returns 顧客別プロジェクト一覧
   */
  async getProjectsByCustomer(customerId: string): Promise<Project[]> {
    try {
      return await this.projectRepository.findByCustomerId(customerId);
    } catch (error) {
      console.error('顧客別プロジェクト取得エラー:', error);
      throw new AppError('顧客別プロジェクトの取得中にエラーが発生しました', 500);
    }
  }

  /**
   * プロジェクト作成
   * 
   * @param data - プロジェクト作成データ
   * @returns 作成されたプロジェクト情報
   * @throws AppError - プロジェクトコード重複時、顧客不存在時
   */
  async createProject(data: CreateProjectData): Promise<Project> {
    try {
      // プロジェクトコードの重複チェック
      const existingProject = await this.projectRepository.findByCode(data.code);
      if (existingProject) {
        throw new AppError('プロジェクトコードが既に存在します', 409);
      }

      // 顧客の存在チェック
      const customer = await this.customerRepository.findById(data.customerId);
      if (!customer) {
        throw new AppError('指定された顧客が見つかりません', 404);
      }

      const project = await this.projectRepository.create(data);
      
      return project;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('プロジェクト作成エラー:', error);
      throw new AppError('プロジェクトの作成中にエラーが発生しました', 500);
    }
  }

  /**
   * プロジェクト更新
   * 
   * @param id - プロジェクトID
   * @param data - プロジェクト更新データ
   * @returns 更新されたプロジェクト情報
   * @throws AppError - プロジェクトが見つからない場合、コード重複時
   */
  async updateProject(id: string, data: UpdateProjectData): Promise<Project> {
    try {
      // プロジェクトの存在チェック
      const existingProject = await this.projectRepository.findById(id);
      if (!existingProject) {
        throw new AppError('プロジェクトが見つかりません', 404);
      }

      // プロジェクトコードの重複チェック（更新時）
      if (data.code && data.code !== existingProject.code) {
        const duplicateProject = await this.projectRepository.findByCode(data.code);
        if (duplicateProject) {
          throw new AppError('プロジェクトコードが既に存在します', 409);
        }
      }

      // 顧客の存在チェック（顧客ID変更時）
      if (data.customerId && data.customerId !== existingProject.customerId) {
        const customer = await this.customerRepository.findById(data.customerId);
        if (!customer) {
          throw new AppError('指定された顧客が見つかりません', 404);
        }
      }

      const project = await this.projectRepository.update(id, data);
      
      if (!project) {
        throw new AppError('プロジェクトの更新に失敗しました', 500);
      }

      return project;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('プロジェクト更新エラー:', error);
      throw new AppError('プロジェクトの更新中にエラーが発生しました', 500);
    }
  }

  /**
   * プロジェクト削除
   * 
   * @param id - プロジェクトID
   * @returns 削除成功フラグ
   * @throws AppError - プロジェクトが見つからない場合、関連受発注データ存在時
   */
  async deleteProject(id: string): Promise<boolean> {
    try {
      // プロジェクトの存在チェック
      const existingProject = await this.projectRepository.findById(id);
      if (!existingProject) {
        throw new AppError('プロジェクトが見つかりません', 404);
      }

      // 関連受発注データの存在チェック
      const relatedOrderForecasts = await this.orderForecastRepository.findAll({
        filter: { projectId: id },
        limit: 1,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      if (relatedOrderForecasts.length > 0) {
        throw new AppError(
          `プロジェクトに関連する受発注データが${relatedOrderForecasts.length}件存在するため削除できません`,
          409
        );
      }

      const deleted = await this.projectRepository.delete(id);
      
      if (!deleted) {
        throw new AppError('プロジェクトの削除に失敗しました', 500);
      }

      return true;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('プロジェクト削除エラー:', error);
      throw new AppError('プロジェクトの削除中にエラーが発生しました', 500);
    }
  }

  /**
   * プロジェクトコード重複チェック
   * 
   * @param code - プロジェクトコード
   * @param excludeId - 除外するプロジェクトID（更新時）
   * @returns 重複チェック結果
   */
  async checkCodeExists(code: string, excludeId?: string): Promise<boolean> {
    try {
      return await this.projectRepository.isCodeExists(code, excludeId);
    } catch (error) {
      console.error('プロジェクトコード重複チェックエラー:', error);
      throw new AppError('プロジェクトコードの重複チェック中にエラーが発生しました', 500);
    }
  }

  /**
   * プロジェクト統計情報取得
   * 
   * @param fiscalYear - 年度（オプション）
   * @returns プロジェクト統計情報
   */
  async getProjectStatistics(fiscalYear?: number): Promise<{
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalBudget: number;
    totalActualCost: number;
  }> {
    try {
      const filter = fiscalYear ? { fiscalYear } : {};
      const projects = await this.projectRepository.findAll({ filter });

      const statistics = projects.reduce(
        (acc, project: any) => {
          acc.totalProjects++;
          if (project.status === 'active') {acc.activeProjects++;}
          if (project.status === 'completed') {acc.completedProjects++;}
          acc.totalBudget += parseFloat(project.budget || '0');
          acc.totalActualCost += parseFloat(project.actualCost || '0');
          return acc;
        },
        {
          totalProjects: 0,
          activeProjects: 0,
          completedProjects: 0,
          totalBudget: 0,
          totalActualCost: 0,
        }
      );

      return statistics;
    } catch (error) {
      console.error('プロジェクト統計情報取得エラー:', error);
      throw new AppError('プロジェクト統計情報の取得中にエラーが発生しました', 500);
    }
  }

  /**
   * プロジェクト分析サマリー取得
   * 
   * @param fiscalYear - 年度
   * @returns プロジェクト分析サマリー一覧
   */
  async getProjectAnalysisSummary(fiscalYear: number): Promise<ProjectAnalysisSummary[]> {
    try {
      // 年度のプロジェクト一覧取得
      const projects = await this.projectRepository.findByFiscalYear(fiscalYear);
      
      if (projects.length === 0) {
        return [];
      }

      // プロジェクトIDリストを作成
      const projectIds = projects.map(p => p.id);
      
      // 並列でデータを一括取得
      const [budgetTargets, orderForecastSummary, workHoursSummary] = await Promise.all([
        // 目標値を取得
        this.budgetTargetRepository.findAll({
          filter: { fiscalYear },
          limit: undefined,
          offset: 0,
          sortBy: 'serviceType',
          sortOrder: 'asc'
        }),
        // 受発注データ一括集計
        this.orderForecastRepository.getProjectAnalysisSummary(fiscalYear, projectIds),
        // 配員計画データ一括集計
        this.staffingRepository.getProjectWorkHoursSummary(fiscalYear, projectIds)
      ]);
      
      // Map作成: "サービス区分_分析区分" => 目標値
      const targetMap = new Map<string, number>();
      for (const target of budgetTargets) {
        const key = `${target.serviceType}_${target.analysisType}`;
        targetMap.set(key, parseFloat(target.targetValue));
      }
      
      const analysisSummaries: ProjectAnalysisSummary[] = [];

      // プロジェクトごとにデータをマージ（DBアクセスなし）
      for (const project of projects) {
        // 受発注データの集計結果を取得
        const orderSummary = orderForecastSummary.get(project.id) || {
          revenue: 0,
          costOfSales: 0,
          sgaExpenses: 0
        };
        
        // 配員計画データの工数を取得
        const workHoursRaw = workHoursSummary.get(project.id) || 0;
        // 画面表示と同じ精度（小数点第1位）で丸める
        const workHours = parseFloat(workHoursRaw.toFixed(1));

        // 分析区分別の計算
        const grossProfit = orderSummary.revenue - orderSummary.costOfSales - orderSummary.sgaExpenses;
        const productivity = workHours > 0 ? grossProfit / workHours : 0;

        const summary: ProjectAnalysisSummary = {
          id: project.id,
          code: project.code,
          name: project.name,
          serviceType: project.serviceType,
          analysisType: project.analysisType,
          revenue: orderSummary.revenue,
          costOfSales: orderSummary.costOfSales,
          sgaExpenses: orderSummary.sgaExpenses,
          workHours,
          ...(project.analysisType === '生産性' ? { productivity } : { grossProfit }),
          targetValue: targetMap.get(`${project.serviceType}_${project.analysisType}`)
        };

        analysisSummaries.push(summary);
      }

      // サービス区分→分析区分→プロジェクトコードの順でソート
      const serviceOrder = ['インテグレーション', 'エンジニアリング', 'ソフトウェアマネージド', 'リセール'];
      const analysisTypeOrder = ['生産性', '粗利'];

      return analysisSummaries.sort((a, b) => {
        // サービス区分でソート
        const serviceIndexA = serviceOrder.indexOf(a.serviceType);
        const serviceIndexB = serviceOrder.indexOf(b.serviceType);
        if (serviceIndexA !== serviceIndexB) {
          return serviceIndexA - serviceIndexB;
        }

        // 分析区分でソート
        const analysisIndexA = analysisTypeOrder.indexOf(a.analysisType);
        const analysisIndexB = analysisTypeOrder.indexOf(b.analysisType);
        if (analysisIndexA !== analysisIndexB) {
          return analysisIndexA - analysisIndexB;
        }

        // プロジェクトコードでソート
        return a.code.localeCompare(b.code);
      });
    } catch (error) {
      console.error('プロジェクト分析サマリー取得エラー:', error);
      throw new AppError('プロジェクト分析サマリーの取得中にエラーが発生しました', 500);
    }
  }
}
