import { Router, type RequestHandler } from 'express';
import prisma from '../../../config/prisma.js';
import { authenticate, requireRoles } from '../../../middleware/auth.middleware.js';
import { ForbiddenError } from '../../../middleware/error.middleware.js';
import { DealerService } from './dealer.service.js';
import { createDealerSchema, updateDealerSchema, dealerIdSchema, dealerQuerySchema } from './dealer.schema.js';

const read = requireRoles('ADMIN', 'SALES', 'ACCOUNTANT', 'WAREHOUSE', 'DEALER');
const edit = requireRoles('ADMIN', 'SALES');
const asyncRoute = (handler: RequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve().then(() => handler(req, res, next)).catch(next);
};

export const dealerRoutes = Router();
dealerRoutes.use(authenticate);
dealerRoutes.get('/', read, asyncRoute(async (req, res) => {
  const query = dealerQuerySchema.parse(req.query);
  if (req.user!.role === 'DEALER' && !req.user!.dealerId) throw new ForbiddenError('Tài khoản chưa gắn đại lý');
  const result = await DealerService.list(query, req.user!.role === 'DEALER' ? req.user!.dealerId! : undefined);
  res.json({ success: true, data: result.items, pagination: result.pagination });
}));
dealerRoutes.post('/', edit, asyncRoute(async (req, res) => {
  const result = await DealerService.create(createDealerSchema.parse(req.body), req.user!);
  res.status(201).json({ success: true, data: result });
}));
dealerRoutes.get('/:id', read, asyncRoute(async (req, res) => {
  const { id } = dealerIdSchema.parse(req.params);
  if (req.user!.role === 'DEALER' && req.user!.dealerId !== id) throw new ForbiddenError();
  res.json({ success: true, data: await DealerService.get(id) });
}));
dealerRoutes.patch('/:id', edit, asyncRoute(async (req, res) => {
  const { id } = dealerIdSchema.parse(req.params);
  const result = await DealerService.update(id, updateDealerSchema.parse(req.body), req.user!);
  res.json({ success: true, data: result });
}));

export const districtRoutes = Router();
districtRoutes.get('/', authenticate, read, asyncRoute(async (_req, res) => {
  res.json({ success: true, data: await prisma.district.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } }) });
}));
export const dealerTierRoutes = Router();
dealerTierRoutes.get('/', authenticate, read, asyncRoute(async (_req, res) => {
  res.json({ success: true, data: await prisma.dealerTier.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }) });
}));
