import { insertBudgetExpenseSchema } from '@shared/schema/integrated';
import express, { type Request, Response } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import { BudgetExpenseService } from '../services/budgetExpenseService';
import { BudgetExpenseRepository } from '../storage/budgetExpense';

const router = express.Router();
const budgetExpenseRepository = new BudgetExpenseRepository();
const budgetExpenseService = new BudgetExpenseService(budgetExpenseRepository);

// 販管費予算作成スキーマ
const createBudgetExpenseSchema = insertBudgetExpenseSchema;

// 販管費予算更新スキーマ
const updateBudgetExpenseSchema = insertBudgetExpenseSchema.partial();

// 販管費予算検索スキーマ
const searchBudgetExpenseSchema = z.object({
  fiscalYear: z.string().transform(Number).optional(),
  accountingItem: z.string().optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
  sortBy: z.enum(['fiscalYear', 'accountingItem', 'budgetAmount', 'createdAt']).optional().default('fiscalYear'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * 販管費予算一覧取得API
 * GET /api/budgets/expense
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const query = searchBudgetExpenseSchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;
    
    const [budgetsExpense, totalCount] = await Promise.all([
      budgetExpenseRepository.findAll({
        filter: {
          fiscalYear: query.fiscalYear,
          accountingItem: query.accountingItem,
        },
        limit: query.limit,
        offset,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }),
      budgetExpenseRepository.count({
        fiscalYear: query.fiscalYear,
        accountingItem: query.accountingItem,
      }),
    ]);

    res.json({
      success: true,
      data: {
        items: budgetsExpense,
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
    console.error('販管費予算一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '販管費予算一覧の取得中にエラーが発生しました',
    });
  }
});

/**
 * 販管費予算詳細取得API
 * GET /api/budgets/expense/:id
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const budgetExpense = await budgetExpenseService.getBudgetExpenseById(id);
    res.json({
      success: true,
      data: budgetExpense,
    });
  } catch (error: unknown) {
    console.error('販管費予算詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '販管費予算の取得中にエラーが発生しました',
    });
  }
});

/**
 * 販管費予算作成API
 * POST /api/budgets/expense
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = createBudgetExpenseSchema.parse(req.body);
    const budgetExpense = await budgetExpenseService.createBudgetExpense(data);
    res.status(201).json({
      success: true,
      data: budgetExpense,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力データが正しくありません',
        errors: error.errors,
      });
    }
    console.error('販管費予算作成エラー:', error);
    res.status(500).json({
      success: false,
      message: '販管費予算の作成中にエラーが発生しました',
    });
  }
});

/**
 * 販管費予算更新API
 * PUT /api/budgets/expense/:id
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateBudgetExpenseSchema.parse(req.body);
    const budgetExpense = await budgetExpenseService.updateBudgetExpense(id, data);
    res.json({
      success: true,
      data: budgetExpense,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力データが正しくありません',
        errors: error.errors,
      });
    }
    console.error('販管費予算更新エラー:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '販管費予算の更新中にエラーが発生しました',
    });
  }
});

/**
 * 販管費予算削除API
 * DELETE /api/budgets/expense/:id
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await budgetExpenseService.deleteBudgetExpense(id);
    res.status(204).send();
  } catch (error) {
    console.error('販管費予算削除エラー:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '販管費予算の削除中にエラーが発生しました',
    });
  }
});

export default router;

