import express, { type Request, Response } from 'express';
import { z } from 'zod';
import { OrderForecastService } from '../services/orderForecastService';
import { OrderForecastRepository } from '../storage/orderForecast';
import { ProjectRepository } from '../storage/project';
import { GLEntryRepository } from '../storage/glEntry';
import { requireAuthIntegrated } from '../middleware/authIntegrated';
import { insertOrderForecastSchema } from '@shared/schema/integrated';

const router = express.Router();
const orderForecastRepository = new OrderForecastRepository();
const projectRepository = new ProjectRepository();
const glEntryRepository = new GLEntryRepository();
const orderForecastService = new OrderForecastService(orderForecastRepository, projectRepository, glEntryRepository);

// 受発注データ作成スキーマ
const createOrderForecastSchema = insertOrderForecastSchema;

// 受発注データ更新スキーマ
const updateOrderForecastSchema = insertOrderForecastSchema.partial();

// 受発注データ検索スキーマ
const searchOrderForecastSchema = z.object({
  search: z.string().optional(),
  projectId: z.string().optional(),
  projectCode: z.string().optional(),
  customerId: z.string().optional(),
  customerCode: z.string().optional(),
  accountingPeriod: z.string().optional(),
  accountingItem: z.string().optional(),
  period: z.string().optional(),
  reconciliationStatus: z.enum(['matched', 'fuzzy', 'unmatched']).optional(),
  createdByUserId: z.string().optional(),
  createdByEmployeeId: z.string().optional(),
  page: z.string().transform(Number).optional().default(1),
  limit: z.string().transform(Number).optional().default(20),
  sortBy: z.enum(['projectCode', 'customerName', 'accountingPeriod', 'amount', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * 受発注データ一覧取得API
 * GET /api/order-forecasts
 */
router.get('/', requireAuthIntegrated, async (req: Request, res: Response) => {
  try {
    const query = searchOrderForecastSchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;
    
    const [orderForecasts, totalCount] = await Promise.all([
      orderForecastRepository.findAll({
        filter: {
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
        },
        limit: query.limit,
        offset,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }),
      orderForecastRepository.count({
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
      }),
    ]);

    res.json({
      success: true,
      data: {
        items: orderForecasts,
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

    console.error('受発注データ一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '受発注データ一覧の取得中にエラーが発生しました',
    });
  }
});

/**
 * 受発注データ詳細取得API
 * GET /api/order-forecasts/:id
 */
router.get('/:id', requireAuthIntegrated, async (req: Request, res: Response) => {
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
router.get('/period/:period', requireAuthIntegrated, async (req: Request, res: Response) => {
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
router.get('/unmatched', requireAuthIntegrated, async (req: Request, res: Response) => {
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
router.get('/matched', requireAuthIntegrated, async (req: Request, res: Response) => {
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
router.post('/', requireAuthIntegrated, async (req: Request, res: Response) => {
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
router.put('/:id', requireAuthIntegrated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateOrderForecastSchema.parse(req.body);
    
    // 受発注データの存在チェック
    const existingOrderForecast = await orderForecastRepository.findById(id);
    if (!existingOrderForecast) {
      return res.status(404).json({
        success: false,
        message: '受発注データが見つかりません',
      });
    }

    const orderForecast = await orderForecastRepository.update(id, data);
    
    if (!orderForecast) {
      return res.status(500).json({
        success: false,
        message: '受発注データの更新に失敗しました',
      });
    }

    res.json({
      success: true,
      data: orderForecast,
      message: '受発注データが正常に更新されました',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力値が正しくありません',
        errors: error.errors,
      });
    }

    console.error('受発注データ更新エラー:', error);
    res.status(500).json({
      success: false,
      message: '受発注データの更新中にエラーが発生しました',
    });
  }
});

/**
 * 受発注データ削除API
 * DELETE /api/order-forecasts/:id
 */
router.delete('/:id', requireAuthIntegrated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 受発注データの存在チェック
    const existingOrderForecast = await orderForecastRepository.findById(id);
    if (!existingOrderForecast) {
      return res.status(404).json({
        success: false,
        message: '受発注データが見つかりません',
      });
    }

    const deleted = await orderForecastRepository.delete(id);
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: '受発注データの削除に失敗しました',
      });
    }

    res.json({
      success: true,
      message: '受発注データが正常に削除されました',
    });
  } catch (error) {
    console.error('受発注データ削除エラー:', error);
    res.status(500).json({
      success: false,
      message: '受発注データの削除中にエラーが発生しました',
    });
  }
});

/**
 * 突合ステータス更新API
 * PUT /api/order-forecasts/:id/reconciliation-status
 */
router.put('/:id/reconciliation-status', requireAuthIntegrated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, glMatchId } = req.body;
    
    if (!status || !['matched', 'fuzzy', 'unmatched'].includes(status)) {
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
