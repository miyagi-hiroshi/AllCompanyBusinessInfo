import { insertAccountingItemSchema } from '@shared/schema/integrated';
import express, { type Request, Response } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import { AccountingItemService } from '../services/accountingItemService';
import { AccountingItemRepository } from '../storage/accountingItem';

const router = express.Router();
const accountingItemRepository = new AccountingItemRepository();
const accountingItemService = new AccountingItemService(accountingItemRepository);

// 会計項目作成スキーマ
const createAccountingItemSchema = insertAccountingItemSchema;

// 会計項目更新スキーマ
const updateAccountingItemSchema = insertAccountingItemSchema.partial();

// 会計項目検索スキーマ
const searchAccountingItemSchema = z.object({
  search: z.string().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
  sortBy: z.enum(['code', 'name', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * 会計項目一覧取得API
 * GET /api/accounting-items
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const query = searchAccountingItemSchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const { accountingItems, totalCount } = await accountingItemService.getAccountingItems(
      {
        search: query.search,
        code: query.code,
        name: query.name,
      },
      query.limit,
      offset,
      query.sortBy,
      query.sortOrder
    );

    res.json({
      success: true,
      data: {
        items: accountingItems,
        total: totalCount,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(totalCount / query.limit),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '検索パラメータが正しくありません',
        errors: error.errors,
      });
    }
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || '会計項目一覧の取得中にエラーが発生しました',
    });
  }
});

/**
 * 会計項目詳細取得API
 * GET /api/accounting-items/:id
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const accountingItem = await accountingItemService.getAccountingItemById(id);
    res.json({
      success: true,
      data: accountingItem,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || '会計項目詳細の取得中にエラーが発生しました',
    });
  }
});

/**
 * 会計項目作成API
 * POST /api/accounting-items
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = createAccountingItemSchema.parse(req.body);
    const user = (req as any).user;
    const accountingItem = await accountingItemService.createAccountingItem(data, user);
    res.status(201).json({
      success: true,
      data: accountingItem,
      message: '会計項目が正常に作成されました',
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
      message: error.message || '会計項目の作成中にエラーが発生しました',
    });
  }
});

/**
 * 会計項目更新API
 * PUT /api/accounting-items/:id
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateAccountingItemSchema.parse(req.body);
    const user = (req as any).user;
    const updatedAccountingItem = await accountingItemService.updateAccountingItem(id, data, user);
    res.json({
      success: true,
      data: updatedAccountingItem,
      message: '会計項目が正常に更新されました',
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
      message: error.message || '会計項目の更新中にエラーが発生しました',
    });
  }
});

/**
 * 会計項目削除API
 * DELETE /api/accounting-items/:id
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await accountingItemService.deleteAccountingItem(id);
    res.json({
      success: true,
      message: '会計項目が正常に削除されました',
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || '会計項目の削除中にエラーが発生しました',
    });
  }
});

/**
 * 会計項目コード重複チェックAPI
 * GET /api/accounting-items/check-code/:code
 */
router.get('/check-code/:code', requireAuth, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { excludeId } = req.query;
    const exists = await accountingItemService.checkCodeExists(code, excludeId as string);
    res.json({
      success: true,
      data: { exists },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || '会計項目コードの重複チェック中にエラーが発生しました',
    });
  }
});

export default router;
