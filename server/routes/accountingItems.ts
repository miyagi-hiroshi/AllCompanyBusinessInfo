import express, { type Request, Response } from 'express';
import { z } from 'zod';
import { requireAuthIntegrated } from '../middleware/authIntegrated';
import { insertAccountingItemSchema } from '@shared/schema/integrated';
import { db } from '../db';
import { accountingItems } from '@shared/schema/integrated';
import { eq, like, or } from 'drizzle-orm';

const router = express.Router();

// 勘定科目作成スキーマ
const createAccountingItemSchema = insertAccountingItemSchema;

// 勘定科目更新スキーマ
const updateAccountingItemSchema = insertAccountingItemSchema.partial();

// 勘定科目検索スキーマ
const searchAccountingItemSchema = z.object({
  search: z.string().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  page: z.string().transform(Number).optional().default(1),
  limit: z.string().transform(Number).optional().default(20),
  sortBy: z.enum(['code', 'name', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * 勘定科目一覧取得API
 * GET /api/accounting-items
 */
router.get('/', requireAuthIntegrated, async (req: Request, res: Response) => {
  try {
    const query = searchAccountingItemSchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;
    
    // 検索条件の構築
    const whereConditions = [];
    if (query.search) {
      whereConditions.push(
        or(
          like(accountingItems.code, `%${query.search}%`),
          like(accountingItems.name, `%${query.search}%`)
        )
      );
    }
    if (query.code) {
      whereConditions.push(like(accountingItems.code, `%${query.code}%`));
    }
    if (query.name) {
      whereConditions.push(like(accountingItems.name, `%${query.name}%`));
    }

    const whereClause = whereConditions.length > 0 ? whereConditions[0] : undefined;

    // ソート条件の構築
    let orderBy;
    if (query.sortBy === 'code') {
      orderBy = query.sortOrder === 'asc' ? accountingItems.code : accountingItems.code.desc();
    } else if (query.sortBy === 'name') {
      orderBy = query.sortOrder === 'asc' ? accountingItems.name : accountingItems.name.desc();
    } else {
      orderBy = query.sortOrder === 'asc' ? accountingItems.createdAt : accountingItems.createdAt.desc();
    }

    const [items, totalCount] = await Promise.all([
      db.select()
        .from(accountingItems)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(query.limit)
        .offset(offset),
      db.select({ count: db.count() })
        .from(accountingItems)
        .where(whereClause)
        .then(result => result[0].count),
    ]);

    res.json({
      success: true,
      data: {
        items,
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

    console.error('勘定科目一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '勘定科目一覧の取得中にエラーが発生しました',
    });
  }
});

/**
 * 勘定科目詳細取得API
 * GET /api/accounting-items/:id
 */
router.get('/:id', requireAuthIntegrated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const item = await db.select()
      .from(accountingItems)
      .where(eq(accountingItems.id, id))
      .then(result => result[0] || null);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: '勘定科目が見つかりません',
      });
    }

    res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('勘定科目詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '勘定科目詳細の取得中にエラーが発生しました',
    });
  }
});

/**
 * 勘定科目作成API
 * POST /api/accounting-items
 */
router.post('/', requireAuthIntegrated, async (req: Request, res: Response) => {
  try {
    const data = createAccountingItemSchema.parse(req.body);
    
    // 勘定科目コードの重複チェック
    const existingItem = await db.select()
      .from(accountingItems)
      .where(eq(accountingItems.code, data.code))
      .then(result => result[0] || null);

    if (existingItem) {
      return res.status(409).json({
        success: false,
        message: '勘定科目コードが既に存在します',
      });
    }

    const item = await db.insert(accountingItems)
      .values(data)
      .returning()
      .then(result => result[0]);

    res.status(201).json({
      success: true,
      data: item,
      message: '勘定科目が正常に作成されました',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力値が正しくありません',
        errors: error.errors,
      });
    }

    console.error('勘定科目作成エラー:', error);
    res.status(500).json({
      success: false,
      message: '勘定科目の作成中にエラーが発生しました',
    });
  }
});

/**
 * 勘定科目更新API
 * PUT /api/accounting-items/:id
 */
router.put('/:id', requireAuthIntegrated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateAccountingItemSchema.parse(req.body);
    
    // 勘定科目の存在チェック
    const existingItem = await db.select()
      .from(accountingItems)
      .where(eq(accountingItems.id, id))
      .then(result => result[0] || null);

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: '勘定科目が見つかりません',
      });
    }

    // 勘定科目コードの重複チェック（更新時）
    if (data.code && data.code !== existingItem.code) {
      const duplicateItem = await db.select()
        .from(accountingItems)
        .where(eq(accountingItems.code, data.code))
        .then(result => result[0] || null);

      if (duplicateItem) {
        return res.status(409).json({
          success: false,
          message: '勘定科目コードが既に存在します',
        });
      }
    }

    const item = await db.update(accountingItems)
      .set(data)
      .where(eq(accountingItems.id, id))
      .returning()
      .then(result => result[0] || null);
    
    if (!item) {
      return res.status(500).json({
        success: false,
        message: '勘定科目の更新に失敗しました',
      });
    }

    res.json({
      success: true,
      data: item,
      message: '勘定科目が正常に更新されました',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力値が正しくありません',
        errors: error.errors,
      });
    }

    console.error('勘定科目更新エラー:', error);
    res.status(500).json({
      success: false,
      message: '勘定科目の更新中にエラーが発生しました',
    });
  }
});

/**
 * 勘定科目削除API
 * DELETE /api/accounting-items/:id
 */
router.delete('/:id', requireAuthIntegrated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 勘定科目の存在チェック
    const existingItem = await db.select()
      .from(accountingItems)
      .where(eq(accountingItems.id, id))
      .then(result => result[0] || null);

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: '勘定科目が見つかりません',
      });
    }

    const deleted = await db.delete(accountingItems)
      .where(eq(accountingItems.id, id))
      .returning()
      .then(result => result.length > 0);
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: '勘定科目の削除に失敗しました',
      });
    }

    res.json({
      success: true,
      message: '勘定科目が正常に削除されました',
    });
  } catch (error) {
    console.error('勘定科目削除エラー:', error);
    res.status(500).json({
      success: false,
      message: '勘定科目の削除中にエラーが発生しました',
    });
  }
});

export default router;
