import { insertBudgetTargetSchema } from '@shared/schema/integrated';
import express, { type Request, Response } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import { BudgetTargetService } from '../services/budgetTargetService';
import { BudgetTargetRepository } from '../storage/budgetTarget';

const router = express.Router();
const budgetTargetRepository = new BudgetTargetRepository();
const budgetTargetService = new BudgetTargetService(budgetTargetRepository);

// 目標値予算作成スキーマ
const createBudgetTargetSchema = insertBudgetTargetSchema;

// 目標値予算更新スキーマ
const updateBudgetTargetSchema = insertBudgetTargetSchema.partial();

// 目標値予算検索スキーマ
const searchBudgetTargetSchema = z.object({
  fiscalYear: z.string().transform(Number).optional(),
  serviceType: z.string().optional(),
  analysisType: z.string().optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
  sortBy: z.enum(['fiscalYear', 'serviceType', 'analysisType', 'targetValue', 'createdAt']).optional().default('fiscalYear'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * 目標値予算一覧取得API
 * GET /api/budgets/target
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const query = searchBudgetTargetSchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;
    
    const [budgetsTarget, totalCount] = await Promise.all([
      budgetTargetRepository.findAll({
        filter: {
          fiscalYear: query.fiscalYear,
          serviceType: query.serviceType,
          analysisType: query.analysisType,
        },
        limit: query.limit,
        offset,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }),
      budgetTargetRepository.count({
        fiscalYear: query.fiscalYear,
        serviceType: query.serviceType,
        analysisType: query.analysisType,
      }),
    ]);

    res.json({
      success: true,
      data: {
        items: budgetsTarget,
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
    console.error('目標値予算一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '目標値予算一覧の取得中にエラーが発生しました',
    });
  }
});

/**
 * 目標値予算詳細取得API
 * GET /api/budgets/target/:id
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const budgetTarget = await budgetTargetService.getBudgetTargetById(id);
    res.json({
      success: true,
      data: budgetTarget,
    });
  } catch (error: unknown) {
    console.error('目標値予算詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '目標値予算の取得中にエラーが発生しました',
    });
  }
});

/**
 * 目標値予算作成API
 * POST /api/budgets/target
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = createBudgetTargetSchema.parse(req.body);
    const budgetTarget = await budgetTargetService.createBudgetTarget(data);
    res.status(201).json({
      success: true,
      data: budgetTarget,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力データが正しくありません',
        errors: error.errors,
      });
    }

    // PostgreSQLの桁数制限エラーの場合
    if (error instanceof Error && error.message.includes('numeric field overflow')) {
      return res.status(400).json({
        success: false,
        message: '目標値が大きすぎます。整数部分は12桁、小数部分は2桁まで入力できます。',
      });
    }

    // PostgreSQLの一意制約違反エラーの場合
    if (error instanceof Error && error.message.includes('duplicate key value')) {
      const data = createBudgetTargetSchema.parse(req.body);
      return res.status(409).json({
        success: false,
        message: `${data.fiscalYear}年度の${data.serviceType}の${data.analysisType}目標値は既に登録されています。`,
      });
    }

    console.error('目標値予算作成エラー:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '目標値予算の作成中にエラーが発生しました',
    });
  }
});

/**
 * 目標値予算更新API
 * PUT /api/budgets/target/:id
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateBudgetTargetSchema.parse(req.body);
    const budgetTarget = await budgetTargetService.updateBudgetTarget(id, data);
    res.json({
      success: true,
      data: budgetTarget,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力データが正しくありません',
        errors: error.errors,
      });
    }

    // PostgreSQLの桁数制限エラーの場合
    if (error instanceof Error && error.message.includes('numeric field overflow')) {
      return res.status(400).json({
        success: false,
        message: '目標値が大きすぎます。整数部分は12桁、小数部分は2桁まで入力できます。',
      });
    }

    // PostgreSQLの一意制約違反エラーの場合
    if (error instanceof Error && error.message.includes('duplicate key value')) {
      const data = updateBudgetTargetSchema.parse(req.body);
      return res.status(409).json({
        success: false,
        message: `${data.fiscalYear}年度の${data.serviceType}の${data.analysisType}目標値は既に登録されています。`,
      });
    }

    console.error('目標値予算更新エラー:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '目標値予算の更新中にエラーが発生しました',
    });
  }
});

/**
 * 目標値予算削除API
 * DELETE /api/budgets/target/:id
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await budgetTargetService.deleteBudgetTarget(id);
    res.status(204).send();
  } catch (error) {
    console.error('目標値予算削除エラー:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '目標値予算の削除中にエラーが発生しました',
    });
  }
});

export default router;

