import { insertStaffingSchema } from '@shared/schema/integrated';
import express, { type Request, Response } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import { StaffingService } from '../services/staffingService';
import { StaffingRepository } from '../storage/staffing';

const router = express.Router();
const staffingRepository = new StaffingRepository();
const staffingService = new StaffingService(staffingRepository);

// 配員計画作成スキーマ
const createStaffingSchema = insertStaffingSchema;

// 配員計画更新スキーマ
const updateStaffingSchema = insertStaffingSchema.partial();

// 配員計画検索スキーマ
const searchStaffingSchema = z.object({
  projectId: z.string().optional().transform((val) => {
    // カンマ区切りの場合は配列に変換
    if (val && val.includes(',')) {
      return val.split(',').filter(Boolean);
    }
    return val;
  }),
  fiscalYear: z.string().transform(Number).optional(),
  month: z.string().transform(Number).optional(),
  employeeId: z.string().optional(),
  employeeName: z.string().optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('100'),
  sortBy: z.enum(['fiscalYear', 'month', 'employeeName', 'workHours', 'createdAt']).optional().default('month'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

/**
 * 配員計画一覧取得API
 * GET /api/staffing
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const query = searchStaffingSchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;
    
    const [staffing, totalCount] = await Promise.all([
      staffingRepository.findAll({
        filter: {
          projectId: query.projectId,
          fiscalYear: query.fiscalYear,
          month: query.month,
          employeeId: query.employeeId,
          employeeName: query.employeeName,
        },
        limit: query.limit,
        offset,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }),
      staffingRepository.count({
        projectId: query.projectId,
        fiscalYear: query.fiscalYear,
        month: query.month,
        employeeId: query.employeeId,
        employeeName: query.employeeName,
      }),
    ]);

    res.json({
      success: true,
      data: {
        items: staffing,
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
    console.error('配員計画一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '配員計画一覧の取得中にエラーが発生しました',
    });
  }
});

/**
 * 配員計画詳細取得API
 * GET /api/staffing/:id
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const staffing = await staffingService.getStaffingById(id);
    res.json({
      success: true,
      data: staffing,
    });
  } catch (error: unknown) {
    console.error('配員計画詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '配員計画の取得中にエラーが発生しました',
    });
  }
});

/**
 * 配員計画作成API
 * POST /api/staffing
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = createStaffingSchema.parse(req.body);
    const staffing = await staffingService.createStaffing(data);
    res.status(201).json({
      success: true,
      data: staffing,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力データが正しくありません',
        errors: error.errors,
      });
    }
    console.error('配員計画作成エラー:', error);
    res.status(500).json({
      success: false,
      message: '配員計画の作成中にエラーが発生しました',
    });
  }
});

/**
 * 配員計画更新API
 * PUT /api/staffing/:id
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateStaffingSchema.parse(req.body);
    const staffing = await staffingService.updateStaffing(id, data);
    res.json({
      success: true,
      data: staffing,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力データが正しくありません',
        errors: error.errors,
      });
    }
    console.error('配員計画更新エラー:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '配員計画の更新中にエラーが発生しました',
    });
  }
});

/**
 * 配員計画削除API
 * DELETE /api/staffing/:id
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await staffingService.deleteStaffing(id);
    res.status(204).send();
  } catch (error) {
    console.error('配員計画削除エラー:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '配員計画の削除中にエラーが発生しました',
    });
  }
});

export default router;

