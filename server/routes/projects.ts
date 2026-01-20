import { insertProjectSchema } from '@shared/schema/integrated';
import express, { type Request, Response } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import { ProjectService } from '../services/projectService';
import { BudgetTargetRepository } from '../storage/budgetTarget';
import { CustomerRepository } from '../storage/customer';
import { OrderForecastRepository } from '../storage/orderForecast';
import { ProjectRepository } from '../storage/project';
import { ProjectAnalysisSnapshotRepository } from '../storage/projectAnalysisSnapshot';
import { StaffingRepository } from '../storage/staffing';

const router = express.Router();
const projectRepository = new ProjectRepository();
const customerRepository = new CustomerRepository();
const orderForecastRepository = new OrderForecastRepository();
const staffingRepository = new StaffingRepository();
const budgetTargetRepository = new BudgetTargetRepository();
const projectService = new ProjectService(projectRepository, customerRepository, orderForecastRepository, staffingRepository, budgetTargetRepository);
const projectAnalysisSnapshotRepository = new ProjectAnalysisSnapshotRepository();

// プロジェクト作成スキーマ
const createProjectSchema = insertProjectSchema;

// プロジェクト更新スキーマ
const updateProjectSchema = insertProjectSchema.partial();

// プロジェクト検索スキーマ
const searchProjectSchema = z.object({
  search: z.string().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  fiscalYear: z.string().transform(Number).optional(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  salesPerson: z.string().optional(),
  serviceType: z.string().optional(),
  analysisType: z.string().optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
  sortBy: z.enum(['code', 'name', 'fiscalYear', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// 前年度コピーリクエストスキーマ
const copyFromPreviousYearSchema = z.object({
  targetYear: z.number().int().positive(),
});

/**
 * 営業担当者一覧取得API
 * GET /api/projects/sales-persons
 */
router.get('/sales-persons', requireAuth, async (req: Request, res: Response) => {
  try {
    const salesPersons = await projectRepository.getSalesPersons();
    
    res.json({
      success: true,
      data: salesPersons,
    });
  } catch (error) {
    console.error('営業担当者一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '営業担当者一覧の取得中にエラーが発生しました',
    });
  }
});

/**
 * プロジェクト一覧取得API
 * GET /api/projects
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const query = searchProjectSchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;
    
    const [projects, totalCount] = await Promise.all([
      projectRepository.findAll({
        filter: {
          search: query.search,
          code: query.code,
          name: query.name,
          fiscalYear: query.fiscalYear,
          customerId: query.customerId,
          customerName: query.customerName,
          salesPerson: query.salesPerson,
          serviceType: query.serviceType,
          analysisType: query.analysisType,
        },
        limit: query.limit,
        offset,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }),
      projectRepository.count({
        search: query.search,
        code: query.code,
        name: query.name,
        fiscalYear: query.fiscalYear,
        customerId: query.customerId,
        customerName: query.customerName,
        salesPerson: query.salesPerson,
        serviceType: query.serviceType,
        analysisType: query.analysisType,
      }),
    ]);

    res.json({
      success: true,
      data: {
        items: projects,
        total: totalCount,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(totalCount / query.limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '検索パラメータが正しくありません',
        errors: error.errors,
      });
    }

    console.error('プロジェクト一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'プロジェクト一覧の取得中にエラーが発生しました',
    });
  }
});

/**
 * プロジェクト分析サマリー取得API
 * GET /api/projects/analysis-summary
 */
router.get('/analysis-summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const { fiscalYear } = req.query;
    
    if (!fiscalYear || typeof fiscalYear !== 'string') {
      return res.status(400).json({
        success: false,
        message: '年度パラメータが必要です',
      });
    }
    
    const fiscalYearNum = parseInt(fiscalYear);
    if (isNaN(fiscalYearNum)) {
      return res.status(400).json({
        success: false,
        message: '年度が正しくありません',
      });
    }
    
    const analysisSummaries = await projectService.getProjectAnalysisSummary(fiscalYearNum);

    res.json({
      success: true,
      data: {
        projects: analysisSummaries,
      },
    });
  } catch (error: any) {
    console.error('プロジェクト分析サマリー取得エラー:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'プロジェクト分析サマリーの取得中にエラーが発生しました',
    });
  }
});

/**
 * プロジェクト分析スナップショット作成API
 * POST /api/projects/analysis-snapshots
 */
router.post('/analysis-snapshots', requireAuth, async (req: Request, res: Response) => {
  try {
    const { fiscalYear, name, snapshotData } = req.body;
    const employeeId = req.user!.employeeId;

    if (fiscalYear === undefined || !name || !snapshotData) {
      return res.status(400).json({
        success: false,
        message: '年度、スナップショット名、スナップショットデータが必要です',
      });
    }

    const snapshot = await projectAnalysisSnapshotRepository.create({
      fiscalYear: typeof fiscalYear === 'number' ? fiscalYear : parseInt(String(fiscalYear)),
      name: String(name),
      snapshotData: snapshotData,
      createdByEmployeeId: String(employeeId),
    });

    res.json({
      success: true,
      data: snapshot,
    });
  } catch (error: any) {
    console.error('スナップショット作成エラー:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'スナップショットの作成中にエラーが発生しました',
    });
  }
});

/**
 * プロジェクト分析スナップショット一覧取得API
 * GET /api/projects/analysis-snapshots
 */
router.get('/analysis-snapshots', requireAuth, async (req: Request, res: Response) => {
  try {
    const fiscalYear = req.query.fiscalYear 
      ? parseInt(req.query.fiscalYear as string) 
      : undefined;
    
    const snapshots = await projectAnalysisSnapshotRepository.findAll(fiscalYear);

    res.json({
      success: true,
      data: snapshots,
    });
  } catch (error: any) {
    console.error('スナップショット一覧取得エラー:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'スナップショット一覧の取得中にエラーが発生しました',
    });
  }
});

/**
 * プロジェクト分析スナップショット詳細取得API
 * GET /api/projects/analysis-snapshots/:id
 */
router.get('/analysis-snapshots/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const snapshot = await projectAnalysisSnapshotRepository.findById(id);

    if (!snapshot) {
      return res.status(404).json({
        success: false,
        message: 'スナップショットが見つかりません',
      });
    }

    res.json({
      success: true,
      data: snapshot,
    });
  } catch (error: any) {
    console.error('スナップショット詳細取得エラー:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'スナップショットの取得中にエラーが発生しました',
    });
  }
});

/**
 * プロジェクト分析スナップショット比較API
 * GET /api/projects/analysis-snapshots/compare/:id1/:id2
 */
router.get('/analysis-snapshots/compare/:id1/:id2', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id1, id2 } = req.params;
    
    const [snapshot1, snapshot2] = await Promise.all([
      projectAnalysisSnapshotRepository.findById(id1),
      projectAnalysisSnapshotRepository.findById(id2),
    ]);

    if (!snapshot1 || !snapshot2) {
      return res.status(404).json({
        success: false,
        message: 'スナップショットが見つかりません',
      });
    }

    res.json({
      success: true,
      data: {
        snapshot1,
        snapshot2,
      },
    });
  } catch (error: any) {
    console.error('スナップショット比較エラー:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'スナップショットの比較中にエラーが発生しました',
    });
  }
});

/**
 * プロジェクト詳細取得API
 * GET /api/projects/:id
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const project = await projectRepository.findById(id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'プロジェクトが見つかりません',
      });
    }

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('プロジェクト詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'プロジェクト詳細の取得中にエラーが発生しました',
    });
  }
});

/**
 * 年度別プロジェクト取得API
 * GET /api/projects/fiscal-year/:fiscalYear
 */
router.get('/fiscal-year/:fiscalYear', requireAuth, async (req: Request, res: Response) => {
  try {
    const { fiscalYear } = req.params;
    const fiscalYearNum = parseInt(fiscalYear);
    
    if (isNaN(fiscalYearNum)) {
      return res.status(400).json({
        success: false,
        message: '年度が正しくありません',
      });
    }
    
    const projects = await projectRepository.findByFiscalYear(fiscalYearNum);

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error('年度別プロジェクト取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '年度別プロジェクトの取得中にエラーが発生しました',
    });
  }
});

/**
 * 顧客別プロジェクト取得API
 * GET /api/projects/customer/:customerId
 */
router.get('/customer/:customerId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    
    const projects = await projectRepository.findByCustomerId(customerId);

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error('顧客別プロジェクト取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '顧客別プロジェクトの取得中にエラーが発生しました',
    });
  }
});

/**
 * プロジェクト作成API
 * POST /api/projects
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = createProjectSchema.parse(req.body);
    const _user = (req as any).user;
    
    // プロジェクトコードの重複チェック（年度を含める）
    const codeExists = await projectRepository.isCodeExists(data.code, data.fiscalYear);
    if (codeExists) {
      return res.status(409).json({
        success: false,
        message: 'プロジェクトコードが既に存在します',
      });
    }

    const project = await projectRepository.create(data);

    res.status(201).json({
      success: true,
      data: project,
      message: 'プロジェクトが正常に作成されました',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力値が正しくありません',
        errors: error.errors,
      });
    }

    console.error('プロジェクト作成エラー:', error);
    res.status(500).json({
      success: false,
      message: 'プロジェクトの作成中にエラーが発生しました',
    });
  }
});

/**
 * 前年度からプロジェクトをコピーAPI
 * POST /api/projects/copy-from-previous-year
 */
router.post('/copy-from-previous-year', requireAuth, async (req: Request, res: Response) => {
  try {
    const { targetYear } = copyFromPreviousYearSchema.parse(req.body);
    
    const result = await projectService.copyFromPreviousYear(targetYear);
    
    res.json({
      success: true,
      data: {
        count: result.count,
        projects: result.projects,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力値が正しくありません',
        errors: error.errors,
      });
    }
    
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || '前年度からのコピー中にエラーが発生しました',
    });
  }
});

/**
 * プロジェクト更新API
 * PUT /api/projects/:id
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateProjectSchema.parse(req.body);
    
    const project = await projectService.updateProject(id, data);

    res.json({
      success: true,
      data: project,
      message: 'プロジェクトが正常に更新されました',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力値が正しくありません',
        errors: error.errors,
      });
    }

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'プロジェクトの更新中にエラーが発生しました',
    });
  }
});

/**
 * プロジェクト削除API
 * DELETE /api/projects/:id
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await projectService.deleteProject(id);

    res.json({
      success: true,
      message: 'プロジェクトが正常に削除されました',
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'プロジェクトの削除中にエラーが発生しました',
    });
  }
});

/**
 * プロジェクトコード重複チェックAPI
 * GET /api/projects/check-code/:code
 */
router.get('/check-code/:code', requireAuth, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { excludeId, fiscalYear } = req.query;
    
    if (!fiscalYear || typeof fiscalYear !== 'string') {
      return res.status(400).json({
        success: false,
        message: '年度パラメータが必要です',
      });
    }
    
    const fiscalYearNum = parseInt(fiscalYear);
    if (isNaN(fiscalYearNum)) {
      return res.status(400).json({
        success: false,
        message: '年度が正しくありません',
      });
    }
    
    const exists = await projectService.checkCodeExists(code, fiscalYearNum, excludeId as string);
    
    res.json({
      success: true,
      data: {
        code,
        exists,
      },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'プロジェクトコードの重複チェック中にエラーが発生しました',
    });
  }
});

export default router;
