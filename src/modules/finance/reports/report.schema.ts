import { z } from 'zod';

export const reportQuerySchema = z.object({
  month: z.string().regex(/^(1[0-2]|[1-9])$/, 'Tháng phải từ 1 đến 12').transform(Number),
  year: z.string().regex(/^\d{4}$/, 'Năm phải có 4 chữ số').transform(Number),
  format: z.enum(['json', 'csv']).default('json').optional(),
});

export type ReportQueryInput = z.infer<typeof reportQuerySchema>;

