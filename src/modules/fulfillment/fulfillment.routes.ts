import { Router, type RequestHandler } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth.middleware.js';
import { ForbiddenError } from '../../middleware/error.middleware.js';
import { UserRole } from '../../config/constants.js';
import { FulfillmentService } from './fulfillment.service.js';
import { idSchema, listQuerySchema, orderSchema, receiptSchema, returnSchema, warehouseSchema } from './fulfillment.schema.js';

const router = Router();
const asyncRoute: (handler: RequestHandler) => RequestHandler = (handler) => (req, res, next) => {
  Promise.resolve().then(() => handler(req, res, next)).catch(next);
};
const idFrom = (req: Parameters<RequestHandler>[0]) => idSchema.parse(req.params).id;
const parseList = (req: Parameters<RequestHandler>[0]) => listQuerySchema.parse(req.query);

router.use(authenticate);

router.get('/warehouses', requireRoles(UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTANT, UserRole.DEALER), asyncRoute(async (_req, res) => {
  res.json({ success: true, data: await FulfillmentService.listWarehouses() });
}));

router.post('/warehouses', requireRoles(UserRole.ADMIN), asyncRoute(async (req, res) => {
  res.status(201).json({ success: true, data: await FulfillmentService.createWarehouse(warehouseSchema.parse(req.body), req.user!.id) });
}));

router.get('/products', requireRoles(UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTANT), asyncRoute(async (req, res) => {
  const warehouseId = typeof req.query.warehouseId === 'string' ? req.query.warehouseId : undefined;
  res.json({ success: true, data: await FulfillmentService.listProducts(warehouseId) });
}));

router.get('/inventory', requireRoles(UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTANT), asyncRoute(async (req, res) => {
  const query = parseList(req);
  const result = await FulfillmentService.listInventory(query);
  res.json({ success: true, data: result.items, pagination: result.pagination });
}));

router.get('/inventory/movements', requireRoles(UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTANT), asyncRoute(async (req, res) => {
  const query = parseList(req);
  const result = await FulfillmentService.listMovements(query);
  res.json({ success: true, data: result.items, pagination: result.pagination });
}));

router.get('/purchase-receipts', requireRoles(UserRole.ADMIN, UserRole.WAREHOUSE, UserRole.ACCOUNTANT), asyncRoute(async (req, res) => {
  const query = parseList(req);
  const result = await FulfillmentService.listReceipts(query);
  res.json({ success: true, data: result.items, pagination: result.pagination });
}));

router.post('/purchase-receipts', requireRoles(UserRole.ADMIN, UserRole.WAREHOUSE), asyncRoute(async (req, res) => {
  const receipt = await FulfillmentService.receiveStock(receiptSchema.parse(req.body), req.user!.id);
  res.status(201).json({ success: true, data: receipt });
}));

router.get(['/sales-orders', '/sales-vouchers'], requireRoles(UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTANT, UserRole.DEALER), asyncRoute(async (req, res) => {
  const query = parseList(req);
  if (req.user!.role === UserRole.DEALER && !req.user!.dealerId) throw new ForbiddenError('Tài khoản đại lý chưa được liên kết hồ sơ');
  const result = await FulfillmentService.listOrders(query, req.user!.role === UserRole.DEALER ? req.user!.dealerId! : undefined);
  res.json({ success: true, data: result.items, pagination: result.pagination });
}));

router.post(['/sales-orders', '/sales-vouchers'], requireRoles(UserRole.ADMIN, UserRole.SALES, UserRole.DEALER), asyncRoute(async (req, res) => {
  const input = orderSchema.parse(req.body);
  if (req.user!.role === UserRole.DEALER && req.user!.dealerId !== input.dealerId) throw new ForbiddenError('Đại lý chỉ được tạo đơn cho chính mình');
  const order = await FulfillmentService.createOrder(input, req.user!.id);
  res.status(201).json({ success: true, data: order });
}));

router.get('/sales-orders/:id', requireRoles(UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTANT, UserRole.DEALER), asyncRoute(async (req, res) => {
  const order = await FulfillmentService.getOrder(idFrom(req), req.user!.role === UserRole.DEALER ? req.user!.dealerId ?? '' : undefined);
  res.json({ success: true, data: order });
}));

router.post('/sales-orders/:id/approve', requireRoles(UserRole.ADMIN, UserRole.SALES), asyncRoute(async (req, res) => {
  res.json({ success: true, data: await FulfillmentService.approveOrder(idFrom(req), req.user!.id) });
}));

router.post('/sales-orders/:id/cancel', requireRoles(UserRole.ADMIN, UserRole.SALES), asyncRoute(async (req, res) => {
  res.json({ success: true, data: await FulfillmentService.cancelOrder(idFrom(req), req.user!.id) });
}));

router.post('/shipments/:id/dispatch', requireRoles(UserRole.ADMIN, UserRole.WAREHOUSE), asyncRoute(async (req, res) => {
  res.json({ success: true, data: await FulfillmentService.dispatchShipment(idFrom(req), req.user!.id) });
}));

router.get('/shipments/:id', requireRoles(UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTANT), asyncRoute(async (req, res) => {
  res.json({ success: true, data: await FulfillmentService.getShipment(idFrom(req)) });
}));

router.post('/shipments/:id/deliver', requireRoles(UserRole.ADMIN, UserRole.WAREHOUSE), asyncRoute(async (req, res) => {
  res.json({ success: true, data: await FulfillmentService.deliverShipment(idFrom(req), req.user!.id) });
}));

router.get('/returns', requireRoles(UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTANT, UserRole.DEALER), asyncRoute(async (req, res) => {
  const query = parseList(req);
  if (req.user!.role === UserRole.DEALER && !req.user!.dealerId) throw new ForbiddenError('Tài khoản đại lý chưa được liên kết hồ sơ');
  const result = await FulfillmentService.listReturns(query, req.user!.role === UserRole.DEALER ? req.user!.dealerId! : undefined);
  res.json({ success: true, data: result.items, pagination: result.pagination });
}));

router.post('/returns', requireRoles(UserRole.ADMIN, UserRole.SALES, UserRole.DEALER), asyncRoute(async (req, res) => {
  const input = returnSchema.parse(req.body);
  if (req.user!.role === UserRole.DEALER) {
    const order = await FulfillmentService.getOrder(input.salesOrderId, req.user!.dealerId ?? '');
    if (!order) throw new ForbiddenError();
  }
  res.status(201).json({ success: true, data: await FulfillmentService.createReturn(input, req.user!.id) });
}));

router.post('/returns/:id/approve', requireRoles(UserRole.ADMIN, UserRole.SALES), asyncRoute(async (req, res) => {
  res.json({ success: true, data: await FulfillmentService.approveReturn(idFrom(req), req.user!.id) });
}));

router.post('/returns/:id/reject', requireRoles(UserRole.ADMIN, UserRole.SALES), asyncRoute(async (req, res) => {
  res.json({ success: true, data: await FulfillmentService.rejectReturn(idFrom(req), req.user!.id) });
}));

router.post('/returns/:id/receive', requireRoles(UserRole.ADMIN, UserRole.WAREHOUSE), asyncRoute(async (req, res) => {
  res.json({ success: true, data: await FulfillmentService.receiveReturn(idFrom(req), req.user!.id) });
}));

export default router;
