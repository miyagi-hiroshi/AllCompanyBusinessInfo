import type { DashboardResponse, DashboardServiceComparisonResponse } from '@shared/schema/budgetTarget/types';
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

// サービス毎の売上予実比較データ取得スキーマ
const getServiceComparisonSchema = z.object({
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

/**
 * サービス毎の売上予実比較データ取得API
 * GET /api/dashboard/service-comparison
 */
router.get('/service-comparison', requireAuth, async (req: Request, res: Response) => {
  try {
    const query = getServiceComparisonSchema.parse(req.query);
    const comparisonData = await dashboardService.getServiceRevenueComparison(query.fiscalYear);
    
    const response: DashboardServiceComparisonResponse = {
      success: true,
      data: comparisonData
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
    console.error('サービス毎の売上予実比較データ取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サービス毎の売上予実比較データの取得中にエラーが発生しました',
    });
  }
});

export default router;
