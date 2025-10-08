import { insertItemSchema } from '@shared/schema/integrated';
import express, { type Request, Response } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import { ItemService } from '../services/itemService';
import { ItemRepository } from '../storage/item';

const router = express.Router();
const itemRepository = new ItemRepository();
const itemService = new ItemService(itemRepository);

// アイテム作成スキーマ
const createItemSchema = insertItemSchema;

// アイテム更新スキーマ
const updateItemSchema = insertItemSchema.partial();

// アイテム検索スキーマ
const searchItemSchema = z.object({
  search: z.string().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  category: z.string().optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
  sortBy: z.enum(['code', 'name', 'category', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * アイテム一覧取得API
 * GET /api/items
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const query = searchItemSchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const { items, totalCount } = await itemService.getItems(
      {
        search: query.search,
        code: query.code,
        name: query.name,
        category: query.category,
      },
      query.limit,
      offset,
      query.sortBy,
      query.sortOrder
    );

    res.json({
      success: true,
      data: {
        items: items,
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
      message: error.message || 'アイテム一覧の取得中にエラーが発生しました',
    });
  }
});

/**
 * アイテム詳細取得API
 * GET /api/items/:id
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await itemService.getItemById(id);
    res.json({
      success: true,
      data: item,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'アイテム詳細の取得中にエラーが発生しました',
    });
  }
});

/**
 * アイテム作成API
 * POST /api/items
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = createItemSchema.parse(req.body);
    const user = (req as any).user;
    const item = await itemService.createItem(data, user);
    res.status(201).json({
      success: true,
      data: item,
      message: 'アイテムが正常に作成されました',
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
      message: error.message || 'アイテムの作成中にエラーが発生しました',
    });
  }
});

/**
 * アイテム更新API
 * PUT /api/items/:id
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateItemSchema.parse(req.body);
    const user = (req as any).user;
    const updatedItem = await itemService.updateItem(id, data, user);
    res.json({
      success: true,
      data: updatedItem,
      message: 'アイテムが正常に更新されました',
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
      message: error.message || 'アイテムの更新中にエラーが発生しました',
    });
  }
});

/**
 * アイテム削除API
 * DELETE /api/items/:id
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await itemService.deleteItem(id);
    res.json({
      success: true,
      message: 'アイテムが正常に削除されました',
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'アイテムの削除中にエラーが発生しました',
    });
  }
});

/**
 * アイテムコード重複チェックAPI
 * GET /api/items/check-code/:code
 */
router.get('/check-code/:code', requireAuth, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { excludeId } = req.query;
    const exists = await itemService.checkCodeExists(code, excludeId as string);
    res.json({
      success: true,
      data: { exists },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'アイテムコードの重複チェック中にエラーが発生しました',
    });
  }
});

export default router;
