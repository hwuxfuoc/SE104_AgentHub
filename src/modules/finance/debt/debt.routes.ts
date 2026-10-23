import { Router } from 'express';
import { DebtController } from './debt.controller.js';
import { authenticate, requireRoles } from '../../../middleware/auth.middleware.js';
import { UserRole } from '../../../config/constants.js';

const router = Router();

// GET /api/v1/dealers/debt-overview - Tra cứu công nợ tất cả đại lý (BM4)
router.get('/overview', authenticate, DebtController.getAllDealersDebt);

// GET /api/v1/dealers/:id/debt - Tra cứu chi tiết công nợ 1 đại lý
router.get('/:id/debt', authenticate, DebtController.getDealerDebtSummary);

// GET /api/v1/dealers/:id/debt-ledger - Lịch sử sổ cái công nợ
router.get('/:id/debt-ledger', authenticate, DebtController.getDealerLedger);

// POST /api/v1/dealers/:id/debt/adjust - Điều chỉnh nợ thủ công (Admin only)
router.post(
  '/:id/debt/adjust',
  authenticate,
  requireRoles(UserRole.ADMIN),
  DebtController.adjustDebt
);

export default router;

