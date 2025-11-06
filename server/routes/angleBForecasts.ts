import { insertAngleBForecastSchema } from '@shared/schema/integrated';
import express, { type Request, Response } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import { AngleBForecastService } from '../services/angleBForecastService';
import { AngleBForecastRepository } from '../storage/angleBForecast';
import { OrderForecastRepository } from '../storage/orderForecast';

const router = express.Router();
const angleBForecastRepository = new AngleBForecastRepository();
const orderForecastRepository = new OrderForecastRepository();
const angleBForecastService = new AngleBForecastService(angleBForecastRepository, orderForecastRepository);

// 角度B案件作成スキーマ
// 取引先フィールドをoptionalにする
const createAngleBForecastSchema = insertAngleBForecastSchema.extend({
  customerId: z.string().optional().nullable(),
  customerCode: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
});

// 角度B案件更新スキーマ
// 取引先フィールドをoptionalにする
const updateAngleBForecastSchema = insertAngleBForecastSchema.partial().extend({
  customerId: z.string().optional().nullable(),
  customerCode: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
});

// 角度B案件検索スキーマ
const searchAngleBForecastSchema = z.object({
  search: z.string().optional(),
  projectId: z.string().optional(),
  projectCode: z.string().optional(),
  customerId: z.string().optional(),
  customerCode: z.string().optional(),
  accountingPeriod: z.string().optional(),
  accountingItem: z.string().optional(),
  period: z.string().optional(),
  probability: z.string().transform(Number).optional(),
  fiscalYear: z.string().transform(Number).optional(),
  month: z.string().transform(Number).optional(),
  createdByUserId: z.string().optional(),
  createdByEmployeeId: z.string().optional(),
  salesPerson: z.string().optional(),
  searchText: z.string().optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
  sortBy: z.enum(['accountingPeriod', 'amount', 'probability', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * 角度B案件一覧取得API
 * GET /api/angle-b-forecasts
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const query = searchAngleBForecastSchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;
    
    const [angleBForecasts, totalCount] = await Promise.all([
      angleBForecastRepository.findAll({
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
          probability: query.probability,
          createdByUserId: query.createdByUserId,
          createdByEmployeeId: query.createdByEmployeeId,
          salesPerson: query.salesPerson,
          searchText: query.searchText,
        },
        limit: query.limit,
        offset,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }),
      angleBForecastRepository.count({
        fiscalYear: query.fiscalYear,
        search: query.search,
        projectId: query.projectId,
        projectCode: query.projectCode,
        customerId: query.customerId,
        customerCode: query.customerCode,
        accountingPeriod: query.accountingPeriod,
        accountingItem: query.accountingItem,
        period: query.period,
        probability: query.probability,
        createdByUserId: query.createdByUserId,
        createdByEmployeeId: query.createdByEmployeeId,
        salesPerson: query.salesPerson,
        searchText: query.searchText,
      }),
    ]);

    res.json({
      success: true,
      data: {
        items: angleBForecasts,
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
    console.error('角度B案件一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '角度B案件一覧の取得中にエラーが発生しました',
    });
  }
});

/**
 * 角度B案件詳細取得API
 * GET /api/angle-b-forecasts/:id
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const angleBForecast = await angleBForecastService.getAngleBForecastById(id);
    res.json({
      success: true,
      data: angleBForecast,
    });
  } catch (error: unknown) {
    console.error('角度B案件詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '角度B案件の取得中にエラーが発生しました',
    });
  }
});

/**
 * 角度B案件作成API
 * POST /api/angle-b-forecasts
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = createAngleBForecastSchema.parse(req.body);
    const angleBForecast = await angleBForecastService.createAngleBForecast(data);
    res.status(201).json({
      success: true,
      data: angleBForecast,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力データが正しくありません',
        errors: error.errors,
      });
    }
    console.error('角度B案件作成エラー:', error);
    res.status(500).json({
      success: false,
      message: '角度B案件の作成中にエラーが発生しました',
    });
  }
});

/**
 * 角度B案件更新API
 * PUT /api/angle-b-forecasts/:id
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateAngleBForecastSchema.parse(req.body);
    const angleBForecast = await angleBForecastService.updateAngleBForecast(id, data);
    res.json({
      success: true,
      data: angleBForecast,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力データが正しくありません',
        errors: error.errors,
      });
    }
    console.error('角度B案件更新エラー:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '角度B案件の更新中にエラーが発生しました',
    });
  }
});

/**
 * 角度B案件削除API
 * DELETE /api/angle-b-forecasts/:id
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await angleBForecastService.deleteAngleBForecast(id);
    res.status(204).send();
  } catch (error) {
    console.error('角度B案件削除エラー:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '角度B案件の削除中にエラーが発生しました',
    });
  }
});

/**
 * 角度B案件を受発注見込に昇格API
 * POST /api/angle-b-forecasts/:id/promote
 */
router.post('/:id/promote', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await angleBForecastService.promoteToOrderForecast(id);
    res.json({
      success: true,
      data: result,
      message: '角度B案件を受発注見込に昇格しました',
    });
  } catch (error) {
    console.error('角度B案件昇格エラー:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '角度B案件の昇格中にエラーが発生しました',
    });
  }
});

export default router;

