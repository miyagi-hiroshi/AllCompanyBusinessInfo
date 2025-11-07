import { insertOrderForecastSchema } from '@shared/schema/integrated';
import express, { type Request, Response } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import { OrderForecastService } from '../services/orderForecastService';
import { AccountingItemRepository } from '../storage/accountingItem';
import { AngleBForecastRepository } from '../storage/angleBForecast';
import { GLEntryRepository } from '../storage/glEntry';
import { OrderForecastRepository } from '../storage/orderForecast';
import { ProjectRepository } from '../storage/project';

const router = express.Router();
const orderForecastRepository = new OrderForecastRepository();
const projectRepository = new ProjectRepository();
const glEntryRepository = new GLEntryRepository();
const accountingItemRepository = new AccountingItemRepository();
const angleBForecastRepository = new AngleBForecastRepository();
const orderForecastService = new OrderForecastService(orderForecastRepository, projectRepository, glEntryRepository, accountingItemRepository, angleBForecastRepository);

// 受発注データ作成スキーマ
// 取引先フィールドをoptionalにする
const createOrderForecastSchema = insertOrderForecastSchema.extend({
  customerId: z.string().optional().nullable(),
  customerCode: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
});

// 受発注データ更新スキーマ
// 取引先フィールドをoptionalにする
const updateOrderForecastSchema = insertOrderForecastSchema.partial().extend({
  customerId: z.string().optional().nullable(),
  customerCode: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
});

// 受発注データ検索スキーマ
const searchOrderForecastSchema = z.object({
  fiscalYear: z.string().transform(Number).optional(),
  search: z.string().optional(),
  projectId: z.string().optional(),
  projectCode: z.string().optional(),
  customerId: z.string().optional(),
  customerCode: z.string().optional(),
  accountingPeriod: z.string().optional(),
  accountingItem: z.string().optional(),
  period: z.string().optional(),
  reconciliationStatus: z.enum(['matched', 'fuzzy', 'unmatched', 'excluded']).optional(),
  createdByUserId: z.string().optional(),
  createdByEmployeeId: z.string().optional(),
  salesPerson: z.string().optional(),
  searchText: z.string().optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
  sortBy: z.enum(['projectCode', 'customerName', 'accountingPeriod', 'amount', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * 除外設定API
 * POST /api/order-forecasts/set-exclusion
 */
router.post('/set-exclusion', requireAuth, async (req: Request, res: Response) => {
  try {
    const { ids, isExcluded, exclusionReason } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '受発注見込み明細IDリストが正しくありません',
      });
    }

    if (typeof isExcluded !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: '除外フラグが正しくありません',
      });
    }

    const updatedCount = await orderForecastService.setExclusion(ids, isExcluded, exclusionReason);

    res.json({
      success: true,
      data: { updatedCount },
      message: `${updatedCount}件の受発注見込み明細を${isExcluded ? '除外' : '除外解除'}しました`,
    });
  } catch (error: any) {
    console.error('除外設定エラー:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || '除外設定の更新中にエラーが発生しました',
    });
  }
});

/**
 * 受発注データ一覧取得API
 * GET /api/order-forecasts
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const query = searchOrderForecastSchema.parse(req.query);
    
    // limit指定なしの場合は全件取得（limitをundefinedに）
    const limit = query.limit;
    const page = query.page || 1;
    const offset = limit ? (page - 1) * limit : undefined;
    
    const [orderForecasts, totalCount] = await Promise.all([
      orderForecastRepository.findAll({
        filter: {
          fiscalYear: query.fiscalYear,
          search: query.search,
          projectId: query.projectId,
          projectCode: query.projectCode,
          customerId: query.customerId,
          customerCode: query.customerCode,
          accountingPeriod: query.accountingPeriod,
          accountingItem: query.accountingItem,
          period: query.period,
          reconciliationStatus: query.reconciliationStatus,
          createdByUserId: query.createdByUserId,
          createdByEmployeeId: query.createdByEmployeeId,
          salesPerson: query.salesPerson,
          searchText: query.searchText,
        },
        limit,
        offset,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }),
      orderForecastRepository.count({
        fiscalYear: query.fiscalYear,
        search: query.search,
        projectId: query.projectId,
        projectCode: query.projectCode,
        customerId: query.customerId,
        customerCode: query.customerCode,
        accountingPeriod: query.accountingPeriod,
        accountingItem: query.accountingItem,
        period: query.period,
        reconciliationStatus: query.reconciliationStatus,
        createdByUserId: query.createdByUserId,
        createdByEmployeeId: query.createdByEmployeeId,
        salesPerson: query.salesPerson,
        searchText: query.searchText,
      }),
    ]);

    res.json({
      success: true,
      data: {
        items: orderForecasts,
        total: totalCount,
        page: page,
        limit: limit || totalCount,
        totalPages: limit ? Math.ceil(totalCount / limit) : 1,
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

    console.error('受発注データ一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '受発注データ一覧の取得中にエラーが発生しました',
    });
  }
});

/**
 * 営業担当者別サマリ取得API
 * GET /api/order-forecasts/sales-person-summary
 */
router.get('/sales-person-summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const { fiscalYear, includeAngleB, salesPersons } = req.query;
    
    if (!fiscalYear || isNaN(Number(fiscalYear))) {
      return res.status(400).json({
        success: false,
        message: '年度を指定してください',
      });
    }

    const includeAngleBFlag = includeAngleB === 'true';
    const salesPersonsParam = typeof salesPersons === 'string' && salesPersons.length > 0
      ? salesPersons.split(',').filter(p => p.trim().length > 0)
      : undefined;
    
    const summary = await orderForecastService.getSalesPersonSummary(
      Number(fiscalYear),
      includeAngleBFlag,
      salesPersonsParam
    );
    
    res.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || '営業担当者別サマリの取得中にエラーが発生しました',
    });
  }
});

/**
 * 月次サマリ取得API
 * GET /api/order-forecasts/monthly-summary
 */
router.get('/monthly-summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const { fiscalYear, includeAngleB, salesPerson } = req.query;
    
    if (!fiscalYear || isNaN(Number(fiscalYear))) {
      return res.status(400).json({
        success: false,
        message: '年度を指定してください',
      });
    }

    const includeAngleBFlag = includeAngleB === 'true';
    const salesPersonParam = typeof salesPerson === 'string' && salesPerson !== 'all' ? salesPerson : undefined;
    const summary = await orderForecastService.getMonthlySummaryByAccountingItem(Number(fiscalYear), includeAngleBFlag, salesPersonParam);
    
    res.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || '月次サマリの取得中にエラーが発生しました',
    });
  }
});

/**
 * 受発注データ詳細取得API
 * GET /api/order-forecasts/:id
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const orderForecast = await orderForecastRepository.findById(id);
    
    if (!orderForecast) {
      return res.status(404).json({
        success: false,
        message: '受発注データが見つかりません',
      });
    }

    res.json({
      success: true,
      data: orderForecast,
    });
  } catch (error) {
    console.error('受発注データ詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '受発注データ詳細の取得中にエラーが発生しました',
    });
  }
});

/**
 * 期間別受発注データ取得API
 * GET /api/order-forecasts/period/:period
 */
router.get('/period/:period', requireAuth, async (req: Request, res: Response) => {
  try {
    const { period } = req.params;
    
    const orderForecasts = await orderForecastRepository.findByPeriod(period);

    res.json({
      success: true,
      data: orderForecasts,
    });
  } catch (error) {
    console.error('期間別受発注データ取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '期間別受発注データの取得中にエラーが発生しました',
    });
  }
});

/**
 * 突合されていない受発注データ取得API
 * GET /api/order-forecasts/unmatched
 */
router.get('/unmatched', requireAuth, async (req: Request, res: Response) => {
  try {
    const { period } = req.query;
    
    const orderForecasts = await orderForecastRepository.findUnmatched(period as string);

    res.json({
      success: true,
      data: orderForecasts,
    });
  } catch (error) {
    console.error('未突合受発注データ取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '未突合受発注データの取得中にエラーが発生しました',
    });
  }
});

/**
 * 突合済み受発注データ取得API
 * GET /api/order-forecasts/matched
 */
router.get('/matched', requireAuth, async (req: Request, res: Response) => {
  try {
    const { period } = req.query;
    
    const orderForecasts = await orderForecastRepository.findMatched(period as string);

    res.json({
      success: true,
      data: orderForecasts,
    });
  } catch (error) {
    console.error('突合済み受発注データ取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '突合済み受発注データの取得中にエラーが発生しました',
    });
  }
});

/**
 * 受発注データ作成API
 * POST /api/order-forecasts
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = createOrderForecastSchema.parse(req.body);
    const user = (req as any).user;

    const orderForecast = await orderForecastRepository.create({
      ...data,
      createdByUserId: user.id,
      createdByEmployeeId: user.employee?.id?.toString(),
    });

    res.status(201).json({
      success: true,
      data: orderForecast,
      message: '受発注データが正常に作成されました',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力値が正しくありません',
        errors: error.errors,
      });
    }

    console.error('受発注データ作成エラー:', error);
    res.status(500).json({
      success: false,
      message: '受発注データの作成中にエラーが発生しました',
    });
  }
});

/**
 * 受発注データ更新API
 * PUT /api/order-forecasts/:id
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateOrderForecastSchema.parse(req.body);
    
    const orderForecast = await orderForecastService.updateOrderForecast(id, data);

    res.json({
      success: true,
      data: orderForecast,
      message: '受発注データが正常に更新されました',
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
      message: error.message || '受発注データの更新中にエラーが発生しました',
    });
  }
});

/**
 * 受発注データ削除API
 * DELETE /api/order-forecasts/:id
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await orderForecastService.deleteOrderForecast(id);

    res.json({
      success: true,
      message: '受発注データが正常に削除されました',
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || '受発注データの削除中にエラーが発生しました',
    });
  }
});

/**
 * 突合ステータス更新API
 * PUT /api/order-forecasts/:id/reconciliation-status
 */
router.put('/:id/reconciliation-status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, glMatchId } = req.body;
    
    if (!status || !['matched', 'fuzzy', 'unmatched', 'excluded'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '突合ステータスが正しくありません',
      });
    }

    const orderForecast = await orderForecastRepository.updateReconciliationStatus(
      id,
      status,
      glMatchId
    );
    
    if (!orderForecast) {
      return res.status(404).json({
        success: false,
        message: '受発注データが見つからないか、更新に失敗しました',
      });
    }

    res.json({
      success: true,
      data: orderForecast,
      message: '突合ステータスが正常に更新されました',
    });
  } catch (error) {
    console.error('突合ステータス更新エラー:', error);
    res.status(500).json({
      success: false,
      message: '突合ステータスの更新中にエラーが発生しました',
    });
  }
});

export default router;
