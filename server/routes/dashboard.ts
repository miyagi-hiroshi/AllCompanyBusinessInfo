import type { DashboardResponse } from '@shared/schema/budgetTarget/types';
import express, { type Request, Response } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import { DashboardService } from '../services/dashboardService';

const router = express.Router();
const dashboardService = new DashboardService();

// ダッシュボードデータ取得スキーマ
const getDashboardDataSchema = z.object({
  fiscalYear: z.string().transform(Number).optional().default('2025'),
});

/**
 * ダッシュボードデータ取得API
 * GET /api/dashboard
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const query = getDashboardDataSchema.parse(req.query);
    const dashboardData = await dashboardService.getDashboardData(query.fiscalYear);
    
    const response: DashboardResponse = {
      success: true,
      data: dashboardData
    };
    
    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '検索パラメータが正しくありません',
        errors: error.errors,
      });
    }
    console.error('ダッシュボードデータ取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'ダッシュボードデータの取得中にエラーが発生しました',
    });
  }
});

export default router;
