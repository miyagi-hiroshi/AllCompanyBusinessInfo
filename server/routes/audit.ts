import express, { type Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireOperationPermission } from '../middleware/auth';
import { auditLogRepository, type AuditLogFilter } from '../storage/auditLog';

const router = express.Router();

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
router.get('/', requireAuth, requireOperationPermission('read'), async (req: Request, res: Response) => {
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

    const limit = Math.min(query.limit || 100, 1000); // 最大1000件
    const offset = query.offset || 0;

    const [logs, totalCount] = await Promise.all([
      auditLogRepository.search(filter, limit, offset),
      auditLogRepository.count(filter),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '入力値が正しくありません',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: '監査ログの取得に失敗しました',
    });
  }
});

/**
 * 監査ログ詳細取得API
 * GET /api/audit-logs/:id
 */
router.get('/:id', requireAuth, requireOperationPermission('read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const log = await auditLogRepository.findById(id);
    
    if (!log) {
      return res.status(404).json({
        success: false,
        message: '監査ログが見つかりません',
      });
    }

    res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '監査ログの取得に失敗しました',
    });
  }
});

/**
 * リソース変更履歴取得API
 * GET /api/audit-logs/resource/:resource/:resourceId
 */
router.get('/resource/:resource/:resourceId', requireAuth, requireOperationPermission('read'), async (req: Request, res: Response) => {
  try {
    const { resource, resourceId } = req.params;
    
    const history = await auditLogRepository.getResourceHistory(resource, resourceId);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'リソース履歴の取得に失敗しました',
    });
  }
});

/**
 * ユーザー操作履歴取得API
 * GET /api/audit-logs/user/:userId
 */
router.get('/user/:userId', requireAuth, requireOperationPermission('read'), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    
    const history = await auditLogRepository.getUserHistory(userId, limit);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'ユーザー履歴の取得に失敗しました',
    });
  }
});

/**
 * 監査ログクリーンアップAPI
 * POST /api/audit-logs/cleanup
 */
router.post('/cleanup', requireAuth, requireOperationPermission('admin'), async (req: Request, res: Response) => {
  try {
    const { daysToKeep } = req.body;
    const keepDays = Math.max(daysToKeep || 365, 30); // 最低30日
    
    const deletedCount = await auditLogRepository.cleanupOldLogs(keepDays);

    res.json({
      success: true,
      data: {
        deletedCount,
        daysToKeep: keepDays,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '監査ログのクリーンアップに失敗しました',
    });
  }
});

/**
 * 監査ログ統計取得API
 * GET /api/audit-logs/stats
 */
router.get('/stats', requireAuth, requireOperationPermission('read'), async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter: AuditLogFilter = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    const [totalLogs, recentLogs] = await Promise.all([
      auditLogRepository.count(filter),
      auditLogRepository.search(filter, 10, 0),
    ]);

    // アクション別統計
    const actionStats = recentLogs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // リソース別統計
    const resourceStats = recentLogs.reduce((acc, log) => {
      acc[log.resource] = (acc[log.resource] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      data: {
        totalLogs,
        recentLogs: recentLogs.length,
        actionStats,
        resourceStats,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '監査ログ統計の取得に失敗しました',
    });
  }
});

export default router;
