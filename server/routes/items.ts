import express, { type Request, Response } from 'express';
import { z } from 'zod';
import { requireAuthIntegrated } from '../middleware/authIntegrated';
import { insertItemSchema } from '@shared/schema/integrated';
import { db } from '../db';
import { items } from '@shared/schema/integrated';
import { eq, like, or } from 'drizzle-orm';

const router = express.Router();

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
  page: z.string().transform(Number).optional().default(1),
  limit: z.string().transform(Number).optional().default(20),
  sortBy: z.enum(['code', 'name', 'category', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * アイテム一覧取得API
 * GET /api/items
 */
router.get('/', requireAuthIntegrated, async (req: Request, res: Response) => {
  try {
    const query = searchItemSchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;
    
    // 検索条件の構築
    const whereConditions = [];
    if (query.search) {
      whereConditions.push(
        or(
          like(items.code, `%${query.search}%`),
          like(items.name, `%${query.search}%`),
          like(items.category, `%${query.search}%`)
        )
      );
    }
    if (query.code) {
      whereConditions.push(like(items.code, `%${query.code}%`));
    }
    if (query.name) {
      whereConditions.push(like(items.name, `%${query.name}%`));
    }
    if (query.category) {
      whereConditions.push(like(items.category, `%${query.category}%`));
    }

    const whereClause = whereConditions.length > 0 ? whereConditions[0] : undefined;

    // ソート条件の構築
    let orderBy;
    if (query.sortBy === 'code') {
      orderBy = query.sortOrder === 'asc' ? items.code : items.code.desc();
    } else if (query.sortBy === 'name') {
      orderBy = query.sortOrder === 'asc' ? items.name : items.name.desc();
    } else if (query.sortBy === 'category') {
      orderBy = query.sortOrder === 'asc' ? items.category : items.category.desc();
    } else {
      orderBy = query.sortOrder === 'asc' ? items.createdAt : items.createdAt.desc();
    }

    const [itemsList, totalCount] = await Promise.all([
      db.select()
        .from(items)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(query.limit)
        .offset(offset),
      db.select({ count: db.count() })
        .from(items)
        .where(whereClause)
        .then(result => result[0].count),
    ]);

    res.json({
      success: true,
      data: {
        items: itemsList,
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

    console.error('アイテム一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'アイテム一覧の取得中にエラーが発生しました',
    });
  }
});

/**
 * アイテム詳細取得API
 * GET /api/items/:id
 */
router.get('/:id', requireAuthIntegrated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const item = await db.select()
      .from(items)
      .where(eq(items.id, id))
      .then(result => result[0] || null);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'アイテムが見つかりません',
      });
    }

    res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('アイテム詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'アイテム詳細の取得中にエラーが発生しました',
    });
  }
});

/**
 * アイテム作成API
 * POST /api/items
 */
router.post('/', requireAuthIntegrated, async (req: Request, res: Response) => {
  try {
    const data = createItemSchema.parse(req.body);
    
    // アイテムコードの重複チェック
    const existingItem = await db.select()
      .from(items)
      .where(eq(items.code, data.code))
      .then(result => result[0] || null);

    if (existingItem) {
      return res.status(409).json({
        success: false,
        message: 'アイテムコードが既に存在します',
      });
    }

    const item = await db.insert(items)
      .values(data)
      .returning()
      .then(result => result[0]);

    res.status(201).json({
      success: true,
      data: item,
      message: 'アイテムが正常に作成されました',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力値が正しくありません',
        errors: error.errors,
      });
    }

    console.error('アイテム作成エラー:', error);
    res.status(500).json({
      success: false,
      message: 'アイテムの作成中にエラーが発生しました',
    });
  }
});

/**
 * アイテム更新API
 * PUT /api/items/:id
 */
router.put('/:id', requireAuthIntegrated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateItemSchema.parse(req.body);
    
    // アイテムの存在チェック
    const existingItem = await db.select()
      .from(items)
      .where(eq(items.id, id))
      .then(result => result[0] || null);

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'アイテムが見つかりません',
      });
    }

    // アイテムコードの重複チェック（更新時）
    if (data.code && data.code !== existingItem.code) {
      const duplicateItem = await db.select()
        .from(items)
        .where(eq(items.code, data.code))
        .then(result => result[0] || null);

      if (duplicateItem) {
        return res.status(409).json({
          success: false,
          message: 'アイテムコードが既に存在します',
        });
      }
    }

    const item = await db.update(items)
      .set(data)
      .where(eq(items.id, id))
      .returning()
      .then(result => result[0] || null);
    
    if (!item) {
      return res.status(500).json({
        success: false,
        message: 'アイテムの更新に失敗しました',
      });
    }

    res.json({
      success: true,
      data: item,
      message: 'アイテムが正常に更新されました',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力値が正しくありません',
        errors: error.errors,
      });
    }

    console.error('アイテム更新エラー:', error);
    res.status(500).json({
      success: false,
      message: 'アイテムの更新中にエラーが発生しました',
    });
  }
});

/**
 * アイテム削除API
 * DELETE /api/items/:id
 */
router.delete('/:id', requireAuthIntegrated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // アイテムの存在チェック
    const existingItem = await db.select()
      .from(items)
      .where(eq(items.id, id))
      .then(result => result[0] || null);

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'アイテムが見つかりません',
      });
    }

    const deleted = await db.delete(items)
      .where(eq(items.id, id))
      .returning()
      .then(result => result.length > 0);
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'アイテムの削除に失敗しました',
      });
    }

    res.json({
      success: true,
      message: 'アイテムが正常に削除されました',
    });
  } catch (error) {
    console.error('アイテム削除エラー:', error);
    res.status(500).json({
      success: false,
      message: 'アイテムの削除中にエラーが発生しました',
    });
  }
});

export default router;
