import { insertGLEntrySchema } from '@shared/schema/integrated';
import express, { type Request, Response } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import { GLEntryService } from '../services/glEntryService';
import { GLEntryRepository } from '../storage/glEntry';
import { OrderForecastRepository } from '../storage/orderForecast';

const router = express.Router();
const glEntryRepository = new GLEntryRepository();
const orderForecastRepository = new OrderForecastRepository();
const glEntryService = new GLEntryService(glEntryRepository, orderForecastRepository);

// GLデータ作成スキーマ
const createGLEntrySchema = insertGLEntrySchema;

// GLデータ更新スキーマ
const updateGLEntrySchema = insertGLEntrySchema.partial();

// GLデータ検索スキーマ
const searchGLEntrySchema = z.object({
  search: z.string().optional(),
  voucherNo: z.string().optional(),
  transactionDateFrom: z.string().optional(),
  transactionDateTo: z.string().optional(),
  accountCode: z.string().optional(),
  accountName: z.string().optional(),
  debitCredit: z.enum(['debit', 'credit']).optional(),
  period: z.string().optional(),
  reconciliationStatus: z.enum(['matched', 'fuzzy', 'unmatched']).optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
  sortBy: z.enum(['voucherNo', 'transactionDate', 'accountCode', 'amount', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * GLデータ一覧取得API
 * GET /api/gl-entries
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const query = searchGLEntrySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;
    
    const [glEntries, totalCount] = await Promise.all([
      glEntryRepository.findAll({
        filter: {
          search: query.search,
          voucherNo: query.voucherNo,
          transactionDateFrom: query.transactionDateFrom,
          transactionDateTo: query.transactionDateTo,
          accountCode: query.accountCode,
          accountName: query.accountName,
          debitCredit: query.debitCredit,
          period: query.period,
          reconciliationStatus: query.reconciliationStatus,
        },
        limit: query.limit,
        offset,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }),
      glEntryRepository.count({
        search: query.search,
        voucherNo: query.voucherNo,
        transactionDateFrom: query.transactionDateFrom,
        transactionDateTo: query.transactionDateTo,
        accountCode: query.accountCode,
        accountName: query.accountName,
        debitCredit: query.debitCredit,
        period: query.period,
        reconciliationStatus: query.reconciliationStatus,
      }),
    ]);

    res.json({
      success: true,
      data: {
        items: glEntries,
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

    console.error('GLデータ一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'GLデータ一覧の取得中にエラーが発生しました',
    });
  }
});

/**
 * GLデータ詳細取得API
 * GET /api/gl-entries/:id
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const glEntry = await glEntryRepository.findById(id);
    
    if (!glEntry) {
      return res.status(404).json({
        success: false,
        message: 'GLデータが見つかりません',
      });
    }

    res.json({
      success: true,
      data: glEntry,
    });
  } catch (error) {
    console.error('GLデータ詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'GLデータ詳細の取得中にエラーが発生しました',
    });
  }
});

/**
 * 伝票番号別GLデータ取得API
 * GET /api/gl-entries/voucher/:voucherNo
 */
router.get('/voucher/:voucherNo', requireAuth, async (req: Request, res: Response) => {
  try {
    const { voucherNo } = req.params;
    
    const glEntries = await glEntryRepository.findByVoucherNo(voucherNo);

    res.json({
      success: true,
      data: glEntries,
    });
  } catch (error) {
    console.error('伝票番号別GLデータ取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '伝票番号別GLデータの取得中にエラーが発生しました',
    });
  }
});

/**
 * 期間別GLデータ取得API
 * GET /api/gl-entries/period/:period
 */
router.get('/period/:period', requireAuth, async (req: Request, res: Response) => {
  try {
    const { period } = req.params;
    
    const glEntries = await glEntryRepository.findByPeriod(period);

    res.json({
      success: true,
      data: glEntries,
    });
  } catch (error) {
    console.error('期間別GLデータ取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '期間別GLデータの取得中にエラーが発生しました',
    });
  }
});

/**
 * 突合されていないGLデータ取得API
 * GET /api/gl-entries/unmatched
 */
router.get('/unmatched', requireAuth, async (req: Request, res: Response) => {
  try {
    const { period } = req.query;
    
    const glEntries = await glEntryRepository.findUnmatched(period as string);

    res.json({
      success: true,
      data: glEntries,
    });
  } catch (error) {
    console.error('未突合GLデータ取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '未突合GLデータの取得中にエラーが発生しました',
    });
  }
});

/**
 * 突合済みGLデータ取得API
 * GET /api/gl-entries/matched
 */
router.get('/matched', requireAuth, async (req: Request, res: Response) => {
  try {
    const { period } = req.query;
    
    const glEntries = await glEntryRepository.findMatched(period as string);

    res.json({
      success: true,
      data: glEntries,
    });
  } catch (error) {
    console.error('突合済みGLデータ取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '突合済みGLデータの取得中にエラーが発生しました',
    });
  }
});

/**
 * GLデータ作成API
 * POST /api/gl-entries
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = createGLEntrySchema.parse(req.body);

    const glEntry = await glEntryRepository.create(data);

    res.status(201).json({
      success: true,
      data: glEntry,
      message: 'GLデータが正常に作成されました',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力値が正しくありません',
        errors: error.errors,
      });
    }

    console.error('GLデータ作成エラー:', error);
    res.status(500).json({
      success: false,
      message: 'GLデータの作成中にエラーが発生しました',
    });
  }
});

/**
 * GLデータ更新API
 * PUT /api/gl-entries/:id
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateGLEntrySchema.parse(req.body);
    
    const glEntry = await glEntryService.updateGLEntry(id, data);

    res.json({
      success: true,
      data: glEntry,
      message: 'GLデータが正常に更新されました',
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
      message: error.message || 'GLデータの更新中にエラーが発生しました',
    });
  }
});

/**
 * GLデータ削除API
 * DELETE /api/gl-entries/:id
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await glEntryService.deleteGLEntry(id);

    res.json({
      success: true,
      message: 'GLデータが正常に削除されました',
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'GLデータの削除中にエラーが発生しました',
    });
  }
});

/**
 * 突合ステータス更新API
 * PUT /api/gl-entries/:id/reconciliation-status
 */
router.put('/:id/reconciliation-status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, orderMatchId } = req.body;
    
    if (!status || !['matched', 'fuzzy', 'unmatched'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '突合ステータスが正しくありません',
      });
    }

    const glEntry = await glEntryRepository.updateReconciliationStatus(
      id,
      status,
      orderMatchId
    );
    
    if (!glEntry) {
      return res.status(404).json({
        success: false,
        message: 'GLデータが見つからないか、更新に失敗しました',
      });
    }

    res.json({
      success: true,
      data: glEntry,
      message: '突合ステータスが正常に更新されました',
    });
  } catch (error) {
    console.error('突合ステータス更新エラー:', error);
    res.status(500).json({
      success: false,
      message: '突合ステータスの更新中にエラーが発生しました',
    });
  }
});

export default router;
