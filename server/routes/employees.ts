/**
 * 従業員APIルート
 * 
 * 責務:
 * - 既存システムの従業員データの取得
 * - 営業担当者の選択肢提供
 */

import { Request, Response, Router } from 'express';

import { requireAuth } from '../middleware/auth';
import { getActiveExistingEmployees } from '../storage/existing/existingRepository';

const router = Router();

/**
 * アクティブな従業員一覧取得API
 * GET /api/employees
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const employees = await getActiveExistingEmployees();

    res.json({
      success: true,
      data: {
        items: employees,
        total: employees.length,
      },
    });
  } catch (error) {
    console.error('従業員一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '従業員一覧の取得中にエラーが発生しました',
    });
  }
});

export default router;

