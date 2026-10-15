import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);
const fields = {
  code: text(50).regex(/^[A-Za-z0-9_-]+$/),
  name: text(200),
  phone: text(20).regex(/^\+?[0-9]{8,15}$/),
  address: text(500),
  email: z.string().trim().email().max(254),
  districtId: text(100),
  tierId: text(100),
  receivedDate: z.string().datetime({ offset: true }).transform((value) => new Date(value)),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
};

export const createDealerSchema = z.object(fields).strict().extend({
  status: fields.status.default('ACTIVE'),
});
export const updateDealerSchema = z.object(fields).partial().strict()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field');
export const dealerIdSchema = z.object({ id: text(100) }).strict();
export const dealerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: text(200).optional(),
  districtId: fields.districtId.optional(),
  tierId: fields.tierId.optional(),
  status: fields.status.optional(),
  sortBy: z.enum(['name', 'code', 'receivedDate', 'createdAt', 'currentDebt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).strict();

export type CreateDealerInput = z.infer<typeof createDealerSchema>;
export type UpdateDealerInput = z.infer<typeof updateDealerSchema>;
export type DealerQuery = z.infer<typeof dealerQuerySchema>;
