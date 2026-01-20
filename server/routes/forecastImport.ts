/**
 * 受注見込み・角度B案件CSV取込API
 * 
 * 責務:
 * - CSVファイルのアップロード受付
 * - CSV取込処理の実行
 * - 取込結果の返却
 */

import express, { type Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import { ForecastImportService } from '../services/forecastImportService';
import { AccountingItemRepository } from '../storage/accountingItem';
import { AngleBForecastRepository } from '../storage/angleBForecast';
import { OrderForecastRepository } from '../storage/orderForecast';
import { ProjectRepository } from '../storage/project';

const router = express.Router();

// リポジトリとサービスの初期化
const orderForecastRepository = new OrderForecastRepository();
const angleBForecastRepository = new AngleBForecastRepository();
const projectRepository = new ProjectRepository();
const accountingItemRepository = new AccountingItemRepository();
const forecastImportService = new ForecastImportService(
  orderForecastRepository,
  angleBForecastRepository,
  projectRepository,
  accountingItemRepository
);

// CSVアップロード用のmulter設定
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    const allowedExtensions = ['.csv'];
    const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
    
    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('CSVファイルのみアップロード可能です'));
    }
  },
});

// CSV取込リクエストスキーマ
const importCSVSchema = z.object({
  fiscalYear: z.number().int().min(2000).max(2100),
});

/**
 * 受注見込み案件CSV取込API
 * POST /api/forecast-import/order-forecasts
 */
router.post('/order-forecasts', requireAuth, csvUpload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'CSVファイルがアップロードされていません',
      });
    }

    // リクエストボディから年度を取得
    const body = importCSVSchema.parse({
      fiscalYear: req.body.fiscalYear ? parseInt(req.body.fiscalYear, 10) : undefined,
    });

    if (!body.fiscalYear) {
      return res.status(400).json({
        success: false,
        message: '年度が指定されていません',
      });
    }

    // ユーザー情報を取得
    const user = (req as any).user;
    const userId = user?.id || '';
    const employeeId = user?.employee?.id?.toString();

    // CSV取込処理
    const result = await forecastImportService.importOrderForecastsFromCSV(
      req.file.buffer,
      body.fiscalYear,
      userId,
      employeeId
    );

    res.json({
      success: true,
      data: result,
      message: `CSV取込が完了しました（取込: ${result.importedRows}件、スキップ: ${result.skippedRows}件）`,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力データが正しくありません',
        errors: error.errors,
      });
    }
    console.error('受注見込み案件CSV取込エラー:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'CSV取込中にエラーが発生しました',
    });
  }
});

/**
 * 角度B案件CSV取込API
 * POST /api/forecast-import/angle-b-forecasts
 */
router.post('/angle-b-forecasts', requireAuth, csvUpload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'CSVファイルがアップロードされていません',
      });
    }

    // リクエストボディから年度を取得
    const body = importCSVSchema.parse({
      fiscalYear: req.body.fiscalYear ? parseInt(req.body.fiscalYear, 10) : undefined,
    });

    if (!body.fiscalYear) {
      return res.status(400).json({
        success: false,
        message: '年度が指定されていません',
      });
    }

    // ユーザー情報を取得
    const user = (req as any).user;
    const userId = user?.id || '';
    const employeeId = user?.employee?.id?.toString();

    // CSV取込処理
    const result = await forecastImportService.importAngleBForecastsFromCSV(
      req.file.buffer,
      body.fiscalYear,
      userId,
      employeeId
    );

    res.json({
      success: true,
      data: result,
      message: `CSV取込が完了しました（取込: ${result.importedRows}件、スキップ: ${result.skippedRows}件）`,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力データが正しくありません',
        errors: error.errors,
      });
    }
    console.error('角度B案件CSV取込エラー:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'CSV取込中にエラーが発生しました',
    });
  }
});

export default router;

