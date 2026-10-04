import { z } from 'zod';
import { PaymentMethod } from '../../../config/constants.js';

export const createPaymentSchema = z.object({
  dealerId: z.string().min(1, 'dealerId is required'),
  amount: z.number().int().positive('Số tiền thu phải là số nguyên dương (> 0)'),
  paymentDate: z.string().datetime().optional().or(z.date().optional()),
  paymentMethod: z.enum([PaymentMethod.CASH, PaymentMethod.BANK_TRANSFER]).optional().default(PaymentMethod.CASH),
  notes: z.string().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
  receiptNumber: z.string().optional(), // If not provided, will be auto-generated: PT-YYYYMMDD-XXXX
});

export interface CreatePaymentInput {
  dealerId: string;
  amount: number;
  paymentDate?: string | Date;
  paymentMethod?: PaymentMethod;
  notes?: string;
  receiptNumber?: string;
}

export const queryPaymentSchema = z.object({
  dealerId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export interface QueryPaymentInput {
  dealerId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

