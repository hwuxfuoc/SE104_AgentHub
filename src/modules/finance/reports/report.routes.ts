import { Router } from 'express';
import { ReportController } from './report.controller.js';
import { authenticate, requireRoles } from '../../../middleware/auth.middleware.js';
import { validateRequest } from '../../../middleware/validate.middleware.js';
import { reportQuerySchema } from './report.schema.js';
import { UserRole } from '../../../config/constants.js';

const router = Router();

// GET /api/v1/reports/sales - BM6.1 Báo cáo doanh số tháng (Admin, Accountant, Sales)
router.get(
  '/sales',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALES),
  validateRequest({ query: reportQuerySchema }),
  ReportController.getSalesReport
);

// GET /api/v1/reports/debt - BM6.2 Báo cáo công nợ đại lý tháng (Admin, Accountant)
router.get(
  '/debt',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.ACCOUNTANT),
  validateRequest({ query: reportQuerySchema }),
  ReportController.getDebtReport
);

export default router;

