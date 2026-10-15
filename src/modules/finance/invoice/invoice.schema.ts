import { z } from 'zod';

export const createInvoiceSchema = z.object({
  dealerId: z.string().min(1, 'dealerId is required'),
  salesOrderId: z.string().optional(),
  totalAmount: z.number().int().positive('Tổng tiền hóa đơn phải là số nguyên dương (> 0)'),
  issueDate: z.string().datetime().optional().or(z.date().optional()),
  dueDate: z.string().datetime().optional().or(z.date().optional()),
  notes: z.string().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
  invoiceNumber: z.string().optional(),
});

export const queryInvoiceSchema = z.object({
  dealerId: z.string().optional(),
  salesOrderId: z.string().optional(),
  status: z.enum(['UNPAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type QueryInvoiceInput = z.infer<typeof queryInvoiceSchema>;

