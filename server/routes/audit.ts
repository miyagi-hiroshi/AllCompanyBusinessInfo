import express, { type Request, Response } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import { AuditLogService } from '../services/auditLogService';
import { type AuditLogFilter,AuditLogRepository } from '../storage/auditLog';

const router = express.Router();
const auditLogRepository = new AuditLogRepository();
const auditLogService = new AuditLogService(auditLogRepository);

// 監査ログ検索スキーマ
const auditLogSearchSchema = z.object({
  userId: z.string().optional(),
  employeeId: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  resourceId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  ipAddress: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
});

/**
 * 監査ログ検索API
 * GET /api/audit-logs
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const query = auditLogSearchSchema.parse(req.query);
    
    const filter: AuditLogFilter = {
      userId: query.userId,
      employeeId: query.employeeId,
      action: query.action,
      resource: query.resource,
      resourceId: query.resourceId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      ipAddress: query.ipAddress,
    };

    const limit = query.limit || 100;
    const offset = query.offset || 0;

    const { logs, totalCount } = await auditLogService.searchAuditLogs(filter, limit, offset);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total: totalCount,
          limit: Math.min(limit, 1000),
          offset,
          hasMore: offset + limit < totalCount,
        },
      },
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
      message: error.message || '監査ログの取得に失敗しました',
    });
  }
});

/**
 * 監査ログ詳細取得API
 * GET /api/audit-logs/:id
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const log = await auditLogService.getAuditLogById(id);

    res.json({
      success: true,
      data: log,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || '監査ログの取得に失敗しました',
    });
  }
});

/**
 * リソース変更履歴取得API
 * GET /api/audit-logs/resource/:resource/:resourceId
 */
router.get('/resource/:resource/:resourceId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { resource, resourceId } = req.params;
    
    const history = await auditLogService.getResourceHistory(resource, resourceId);

    res.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'リソース履歴の取得に失敗しました',
    });
  }
});

/**
 * ユーザー操作履歴取得API
 * GET /api/audit-logs/user/:userId
 */
router.get('/user/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const history = await auditLogService.getUserHistory(userId, limit);

    res.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'ユーザー履歴の取得に失敗しました',
    });
  }
});

/**
 * 監査ログクリーンアップAPI
 * POST /api/audit-logs/cleanup
 */
router.post('/cleanup', requireAuth, async (req: Request, res: Response) => {
  try {
    const { daysToKeep } = req.body;
    
    const deletedCount = await auditLogService.cleanupOldLogs(daysToKeep || 365);

    res.json({
      success: true,
      data: {
        deletedCount,
        daysToKeep: Math.max(daysToKeep || 365, 30),
      },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || '監査ログのクリーンアップに失敗しました',
    });
  }
});

/**
 * 監査ログ統計取得API
 * GET /api/audit-logs/stats
 */
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter: AuditLogFilter = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    const statistics = await auditLogService.getAuditLogStatistics(filter);

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || '監査ログ統計の取得に失敗しました',
    });
  }
});

export default router;
