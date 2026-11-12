import { z } from 'zod';

const pageQuery = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
};

const lineSchema = z.object({
  skuId: z.string().min(1),
  quantity: z.number().int().positive().max(1_000_000),
  unitCost: z.number().int().positive().max(2_147_483_647).optional(),
});

export const receiptSchema = z.object({
  warehouseId: z.string().min(1),
  receivedAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  lines: z.array(lineSchema).min(1).max(100),
});

export const warehouseSchema = z.object({
  code: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(120),
  address: z.string().max(250).optional(),
});

export const orderSchema = z.object({
  dealerId: z.string().min(1),
  warehouseId: z.string().min(1),
  notes: z.string().max(500).optional(),
  items: z.array(z.object({
    skuId: z.string().min(1),
    quantity: z.number().int().positive().max(1_000_000),
  })).min(1).max(100),
});

export const returnSchema = z.object({
  salesOrderId: z.string().min(1),
  reason: z.string().trim().min(1).max(500),
  notes: z.string().max(500).optional(),
  items: z.array(z.object({
    orderItemId: z.string().min(1),
    quantity: z.number().int().positive().max(1_000_000),
  })).min(1).max(100),
});

export const listQuerySchema = z.object({
  ...pageQuery,
  warehouseId: z.string().optional(),
  skuId: z.string().optional(),
  dealerId: z.string().optional(),
  status: z.string().optional(),
});

export const idSchema = z.object({ id: z.string().min(1) });

export type ReceiptInput = z.infer<typeof receiptSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type ReturnInput = z.infer<typeof returnSchema>;
