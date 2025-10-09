import { insertBudgetRevenueSchema } from '@shared/schema/integrated';
import express, { type Request, Response } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import { BudgetRevenueService } from '../services/budgetRevenueService';
import { BudgetRevenueRepository } from '../storage/budgetRevenue';

const router = express.Router();
const budgetRevenueRepository = new BudgetRevenueRepository();
const budgetRevenueService = new BudgetRevenueService(budgetRevenueRepository);

// 売上予算作成スキーマ
const createBudgetRevenueSchema = insertBudgetRevenueSchema;

// 売上予算更新スキーマ
const updateBudgetRevenueSchema = insertBudgetRevenueSchema.partial();

// 売上予算検索スキーマ
const searchBudgetRevenueSchema = z.object({
  fiscalYear: z.string().transform(Number).optional(),
  serviceType: z.string().optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
  sortBy: z.enum(['fiscalYear', 'serviceType', 'budgetAmount', 'createdAt']).optional().default('fiscalYear'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * 売上予算一覧取得API
 * GET /api/budgets/revenue
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const query = searchBudgetRevenueSchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;
    
    const [budgetsRevenue, totalCount] = await Promise.all([
      budgetRevenueRepository.findAll({
        filter: {
          fiscalYear: query.fiscalYear,
          serviceType: query.serviceType,
        },
        limit: query.limit,
        offset,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }),
      budgetRevenueRepository.count({
        fiscalYear: query.fiscalYear,
        serviceType: query.serviceType,
      }),
    ]);

    res.json({
      success: true,
      data: {
        items: budgetsRevenue,
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
    console.error('売上予算一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '売上予算一覧の取得中にエラーが発生しました',
    });
  }
});

/**
 * 売上予算詳細取得API
 * GET /api/budgets/revenue/:id
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const budgetRevenue = await budgetRevenueService.getBudgetRevenueById(id);
    res.json({
      success: true,
      data: budgetRevenue,
    });
  } catch (error: unknown) {
    console.error('売上予算詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '売上予算の取得中にエラーが発生しました',
    });
  }
});

/**
 * 売上予算作成API
 * POST /api/budgets/revenue
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = createBudgetRevenueSchema.parse(req.body);
    const budgetRevenue = await budgetRevenueService.createBudgetRevenue(data);
    res.status(201).json({
      success: true,
      data: budgetRevenue,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力データが正しくありません',
        errors: error.errors,
      });
    }
    console.error('売上予算作成エラー:', error);
    res.status(500).json({
      success: false,
      message: '売上予算の作成中にエラーが発生しました',
    });
  }
});

/**
 * 売上予算更新API
 * PUT /api/budgets/revenue/:id
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateBudgetRevenueSchema.parse(req.body);
    const budgetRevenue = await budgetRevenueService.updateBudgetRevenue(id, data);
    res.json({
      success: true,
      data: budgetRevenue,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力データが正しくありません',
        errors: error.errors,
      });
    }
    console.error('売上予算更新エラー:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '売上予算の更新中にエラーが発生しました',
    });
  }
});

/**
 * 売上予算削除API
 * DELETE /api/budgets/revenue/:id
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await budgetRevenueService.deleteBudgetRevenue(id);
    res.status(204).send();
  } catch (error) {
    console.error('売上予算削除エラー:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '売上予算の削除中にエラーが発生しました',
    });
  }
});

export default router;

