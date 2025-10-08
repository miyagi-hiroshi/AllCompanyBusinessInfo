import { insertCustomerSchema } from '@shared/schema/integrated';
import express, { type Request, Response } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import { CustomerService } from '../services/customerService';
import { CustomerRepository } from '../storage/customer';
import { ProjectRepository } from '../storage/project';

const router = express.Router();
const customerRepository = new CustomerRepository();
const projectRepository = new ProjectRepository();
const customerService = new CustomerService(customerRepository, projectRepository);

// 顧客作成スキーマ
const createCustomerSchema = insertCustomerSchema;

// 顧客更新スキーマ
const updateCustomerSchema = insertCustomerSchema.partial();

// 顧客検索スキーマ
const searchCustomerSchema = z.object({
  search: z.string().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
  sortBy: z.enum(['code', 'name', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * 顧客一覧取得API
 * GET /api/customers
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const query = searchCustomerSchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;
    
    const { customers, totalCount } = await customerService.getCustomers(
      {
        search: query.search,
        code: query.code,
        name: query.name,
      },
      query.limit,
      offset,
      query.sortBy,
      query.sortOrder
    );

    res.json({
      success: true,
      data: {
        items: customers,
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

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || '顧客一覧の取得中にエラーが発生しました',
    });
  }
});

/**
 * 顧客詳細取得API
 * GET /api/customers/:id
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const customer = await customerService.getCustomerById(id);

    res.json({
      success: true,
      data: customer,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || '顧客詳細の取得中にエラーが発生しました',
    });
  }
});

/**
 * 顧客作成API
 * POST /api/customers
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = createCustomerSchema.parse(req.body);
    const user = (req as any).user;
    
    const customer = await customerService.createCustomer(data, user);

    res.status(201).json({
      success: true,
      data: customer,
      message: '顧客が正常に作成されました',
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
      message: error.message || '顧客の作成中にエラーが発生しました',
    });
  }
});

/**
 * 顧客更新API
 * PUT /api/customers/:id
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateCustomerSchema.parse(req.body);
    
    const customer = await customerService.updateCustomer(id, data);

    res.json({
      success: true,
      data: customer,
      message: '顧客が正常に更新されました',
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
      message: error.message || '顧客の更新中にエラーが発生しました',
    });
  }
});

/**
 * 顧客削除API
 * DELETE /api/customers/:id
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await customerService.deleteCustomer(id);

    res.json({
      success: true,
      message: '顧客が正常に削除されました',
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || '顧客の削除中にエラーが発生しました',
    });
  }
});

/**
 * 顧客コード重複チェックAPI
 * GET /api/customers/check-code/:code
 */
router.get('/check-code/:code', requireAuth, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { excludeId } = req.query;
    
    const exists = await customerService.checkCodeExists(code, excludeId as string);
    
    res.json({
      success: true,
      data: {
        code,
        exists,
      },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || '顧客コードの重複チェック中にエラーが発生しました',
    });
  }
});

export default router;
