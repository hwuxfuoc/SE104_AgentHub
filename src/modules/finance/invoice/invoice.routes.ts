import { Router } from 'express';
import { InvoiceController } from './invoice.controller.js';
import { authenticate, requireRoles } from '../../../middleware/auth.middleware.js';
import { validateRequest } from '../../../middleware/validate.middleware.js';
import { createInvoiceSchema, queryInvoiceSchema } from './invoice.schema.js';
import { UserRole } from '../../../config/constants.js';

const router = Router();

// POST /api/v1/invoices - Lập hóa đơn/phát sinh công nợ (Admin, Accountant, Sales)
router.post(
  '/',
  authenticate,
  requireRoles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALES),
  validateRequest({ body: createInvoiceSchema }),
  InvoiceController.createInvoice
);

// GET /api/v1/invoices - Danh sách hóa đơn
router.get(
  '/',
  authenticate,
  validateRequest({ query: queryInvoiceSchema }),
  InvoiceController.getInvoices
);

// GET /api/v1/invoices/:id - Chi tiết hóa đơn
router.get(
  '/:id',
  authenticate,
  InvoiceController.getInvoiceById
);

export default router;

