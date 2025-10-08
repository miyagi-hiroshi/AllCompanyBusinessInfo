import express, { type Request, Response } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import { ReconciliationService } from '../services/reconciliationService';
import { GLEntryRepository } from '../storage/glEntry';
import { OrderForecastRepository } from '../storage/orderForecast';
import { ReconciliationLogRepository } from '../storage/reconciliationLog';

const router = express.Router();
const reconciliationLogRepository = new ReconciliationLogRepository();
const orderForecastRepository = new OrderForecastRepository();
const glEntryRepository = new GLEntryRepository();
const reconciliationService = new ReconciliationService(
  reconciliationLogRepository,
  orderForecastRepository,
  glEntryRepository
);

// 突合実行スキーマ
const executeReconciliationSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, '期間はYYYY-MM形式で入力してください'),
  fuzzyThreshold: z.number().min(0).max(100).optional().default(80), // ファジーマッチの閾値（%）
  dateTolerance: z.number().min(0).max(30).optional().default(7), // 日付許容範囲（日）
  amountTolerance: z.number().min(0).optional().default(1000), // 金額許容範囲（円）
});

// 突合ログ検索スキーマ
const searchReconciliationLogSchema = z.object({
  period: z.string().optional(),
  periodFrom: z.string().optional(),
  periodTo: z.string().optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
  sortBy: z.enum(['period', 'executedAt']).optional().default('executedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * 突合実行API
 * POST /api/reconciliation/execute
 */
router.post('/execute', requireAuth, async (req: Request, res: Response) => {
  try {
    const { period, fuzzyThreshold, dateTolerance, amountTolerance } = executeReconciliationSchema.parse(req.body);
    const _user = (req as any).user;

    // 突合処理の実行（サービス層を使用）
    const result = await reconciliationService.executeReconciliation(
      period,
      fuzzyThreshold,
      dateTolerance,
      amountTolerance
    );

    res.json({
      success: true,
      data: result,
      message: '突合処理が正常に完了しました',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力値が正しくありません',
        errors: error.errors,
      });
    }

    console.error('突合実行エラー:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || '突合処理の実行中にエラーが発生しました',
    });
  }
});

/**
 * 突合ログ一覧取得API
 * GET /api/reconciliation/logs
 */
router.get('/logs', requireAuth, async (req: Request, res: Response) => {
  try {
    const query = searchReconciliationLogSchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;
    
    const { logs, totalCount } = await reconciliationService.getReconciliationLogs(
      {
        period: query.period,
        periodFrom: query.periodFrom,
        periodTo: query.periodTo,
      },
      query.limit,
      offset,
      query.sortBy,
      query.sortOrder
    );

    res.json({
      success: true,
      data: {
        items: logs,
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

    console.error('突合ログ一覧取得エラー:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || '突合ログ一覧の取得中にエラーが発生しました',
    });
  }
});

/**
 * 突合ログ詳細取得API
 * GET /api/reconciliation/logs/:id
 */
router.get('/logs/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const reconciliationLog = await reconciliationService.getReconciliationLogById(id);

    res.json({
      success: true,
      data: reconciliationLog,
    });
  } catch (error: any) {
    console.error('突合ログ詳細取得エラー:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || '突合ログ詳細の取得中にエラーが発生しました',
    });
  }
});

/**
 * 最新突合ログ取得API
 * GET /api/reconciliation/logs/latest
 */
router.get('/logs/latest', requireAuth, async (req: Request, res: Response) => {
  try {
    const { period } = req.query;
    
    const reconciliationLog = await reconciliationService.getLatestReconciliationLog(period as string);

    res.json({
      success: true,
      data: reconciliationLog,
    });
  } catch (error: any) {
    console.error('最新突合ログ取得エラー:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || '最新突合ログの取得中にエラーが発生しました',
    });
  }
});

/**
 * 突合統計情報取得API
 * GET /api/reconciliation/statistics
 */
router.get('/statistics', requireAuth, async (req: Request, res: Response) => {
  try {
    const statistics = await reconciliationService.getReconciliationStatistics();

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error: any) {
    console.error('突合統計情報取得エラー:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || '突合統計情報の取得中にエラーが発生しました',
    });
  }
});


export default router;
