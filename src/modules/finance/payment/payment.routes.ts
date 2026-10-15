import { Router } from 'express';
import { PaymentController } from './payment.controller.js';
import { authenticate, requireRoles } from '../../../middleware/auth.middleware.js';
import { validateRequest } from '../../../middleware/validate.middleware.js';
import { createPaymentSchema, queryPaymentSchema } from './payment.schema.js';
import { UserRole } from '../../../config/constants.js';

const router = Router();

// POST /api/v1/payments - Lập phiếu thu tiền (BM5). Only Admin and Accountant can create
router.post(
  '/',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.ACCOUNTANT),
  validateRequest({ body: createPaymentSchema }),
  PaymentController.createPayment
);

// GET /api/v1/payments - Danh sách phiếu thu. Admin, Accountant, Sales, Dealer (own)
router.get(
  '/',
  authenticate,
  validateRequest({ query: queryPaymentSchema }),
  PaymentController.getPayments
);

// GET /api/v1/payments/:id - Chi tiết phiếu thu
router.get(
  '/:id',
  authenticate,
  PaymentController.getPaymentById
);

export default router;

