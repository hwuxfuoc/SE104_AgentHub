import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import prisma from '../../config/prisma.js';
import { AppError, BusinessRuleViolationError, NotFoundError, ValidationError } from '../../middleware/error.middleware.js';
import { AuditService } from '../audit/audit.service.js';
import type { OrderInput, ReceiptInput, ReturnInput } from './fulfillment.schema.js';

type Tx = Prisma.TransactionClient;
const MAX_DB_INT = 2_147_483_647;
const orderDetails = {
  items: { include: { sku: { include: { product: true } } } },
  dealer: { include: { tier: true } },
  warehouse: true,
  shipments: true,
  reservations: true,
};

const code = (prefix: string) => `${prefix}-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`;

async function readQD3Config(tx: Tx) {
  await tx.$queryRaw`SELECT "id" FROM "BusinessRule" WHERE "code" = 'QD3' FOR SHARE`;
  const rule = await tx.businessRule.findUnique({ where: { code: 'QD3' } });
  if (!rule) return { tierDebtLimits: { 'Loại 1': 10_000_000, 'Loại 2': 5_000_000 }, exportPriceRatio: 1.02 };
  let config: unknown;
  try {
    config = JSON.parse(rule.value);
  } catch {
    throw new ValidationError('Cấu hình QĐ3 không phải JSON hợp lệ');
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new ValidationError('Cấu hình QĐ3 không hợp lệ');
  const values = Object.fromEntries(Object.entries(config));
  const defaults = { 'Loại 1': 10_000_000, 'Loại 2': 5_000_000 };
  const rawLimits = values.tierDebtLimits;
  const tierDebtLimits: Record<string, number> = { ...defaults };
  if (rawLimits !== undefined) {
    if (!rawLimits || typeof rawLimits !== 'object' || Array.isArray(rawLimits)) {
      throw new ValidationError('Cấu hình hạn mức nợ QĐ3 không hợp lệ');
    }
    for (const [tier, limit] of Object.entries(rawLimits)) {
      if (typeof limit !== 'number' || !Number.isSafeInteger(limit) || limit <= 0) {
        throw new ValidationError(`Hạn mức nợ QĐ3 của ${tier} phải là số nguyên dương`);
      }
      tierDebtLimits[tier] = limit;
    }
  }
  const exportPriceRatio = values.exportPriceRatio ?? 1.02;
  if (typeof exportPriceRatio !== 'number' || !Number.isFinite(exportPriceRatio) || exportPriceRatio <= 0) {
    throw new ValidationError('Cấu hình tỷ lệ giá xuất QĐ3 không hợp lệ');
  }
  return { tierDebtLimits, exportPriceRatio };
}

async function lockInventory(tx: Tx, warehouseId: string, skuId: string) {
  await tx.inventory.upsert({
    where: { warehouseId_skuId: { warehouseId, skuId } },
    update: {},
    create: { warehouseId, skuId, onHand: 0, reserved: 0 },
  });
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Inventory"
    WHERE "warehouseId" = ${warehouseId} AND "skuId" = ${skuId}
    FOR UPDATE
  `;
  if (!rows.length) throw new Error('Inventory row disappeared while acquiring lock');
  return tx.inventory.findUniqueOrThrow({ where: { id: rows[0].id } });
}

async function audit(userId: string, action: string, entity: string, entityId: string, details: object) {
  await AuditService.log({ userId, action, entity, entityId, details });
}

export class FulfillmentService {
  static async createWarehouse(input: { code: string; name: string; address?: string }, userId: string) {
    const warehouse = await prisma.warehouse.create({ data: input });
    await audit(userId, 'CREATE_WAREHOUSE', 'WAREHOUSE', warehouse.id, { code: warehouse.code, name: warehouse.name });
    return warehouse;
  }

  static async listWarehouses() {
    return prisma.warehouse.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  static async listProducts(warehouseId?: string) {
    const skus = await prisma.sku.findMany({
      orderBy: [{ product: { name: 'asc' } }, { code: 'asc' }],
      include: {
        product: { include: { category: true } },
        pricings: {
          where: { effectiveFrom: { lte: new Date() }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
        },
        inventories: warehouseId ? { where: { warehouseId } } : true,
      },
    });
    return skus.map((sku) => ({
      id: sku.id,
      skuId: sku.id,
      code: sku.product.code,
      name: sku.product.name,
      category: sku.product.category.name,
      unit: sku.unit,
      importPrice: sku.pricings[0]?.importPrice ?? 0,
      exportPrice: sku.pricings[0]?.exportPrice ?? 0,
      stock: sku.inventories.reduce((total, inventory) => total + inventory.onHand - inventory.reserved, 0),
      reserved: sku.inventories.reduce((total, inventory) => total + inventory.reserved, 0),
    }));
  }

  static async listInventory(query: { warehouseId?: string; page: number; limit: number }) {
    const where: Prisma.InventoryWhereInput = {
      warehouse: { isActive: true },
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
    };
    const [total, items] = await prisma.$transaction([
      prisma.inventory.count({ where }),
      prisma.inventory.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ warehouse: { name: 'asc' } }, { sku: { code: 'asc' } }],
        include: { warehouse: true, sku: { include: { product: true } } },
      }),
    ]);
    return { items, pagination: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) } };
  }

  static async listMovements(query: { warehouseId?: string; skuId?: string; page: number; limit: number }) {
    const where: Prisma.InventoryMovementWhereInput = {
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.skuId ? { skuId: query.skuId } : {}),
    };
    const [total, items] = await prisma.$transaction([
      prisma.inventoryMovement.count({ where }),
      prisma.inventoryMovement.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { warehouse: true, sku: { include: { product: true } } },
      }),
    ]);
    return { items, pagination: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) } };
  }

  static async listReceipts(query: { warehouseId?: string; page: number; limit: number }) {
    const where: Prisma.PurchaseReceiptWhereInput = query.warehouseId ? { warehouseId: query.warehouseId } : {};
    const [total, items] = await prisma.$transaction([
      prisma.purchaseReceipt.count({ where }),
      prisma.purchaseReceipt.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { receivedAt: 'desc' },
        include: { warehouse: true, lines: { include: { sku: { include: { product: true } } } } },
      }),
    ]);
    return { items, pagination: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) } };
  }

  static async receiveStock(input: ReceiptInput, userId: string) {
    const receipt = await prisma.$transaction(async (tx) => {
      const warehouse = await tx.warehouse.findFirst({ where: { id: input.warehouseId, isActive: true } });
      if (!warehouse) throw new NotFoundError('Kho hàng', input.warehouseId);
      const lines = [];
      const pricingBySku = new Map<string, { unitCost: number; exportPrice: number }>();
      const config = await readQD3Config(tx);
      const ratio = config.exportPriceRatio ?? 1.02;
      if (!Number.isFinite(ratio) || ratio <= 0) throw new ValidationError('Cấu hình tỷ lệ giá xuất QĐ3 không hợp lệ');
      for (const line of input.lines) {
        const sku = await tx.sku.findUnique({
          where: { id: line.skuId },
          include: { pricings: { where: { effectiveFrom: { lte: input.receivedAt ? new Date(input.receivedAt) : new Date() }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: input.receivedAt ? new Date(input.receivedAt) : new Date() } }] }, orderBy: { effectiveFrom: 'desc' }, take: 1 } },
        });
        if (!sku) throw new NotFoundError('SKU', line.skuId);
        const unitCost = line.unitCost ?? sku.pricings[0]?.importPrice;
        if (unitCost === undefined) throw new ValidationError(`SKU ${sku.code} chưa có giá nhập và chưa chỉ định unitCost`);
        const amount = unitCost * line.quantity;
        if (!Number.isSafeInteger(amount) || amount > MAX_DB_INT) throw new ValidationError('Giá trị dòng phiếu nhập vượt giới hạn lưu trữ');
        const exportPrice = Math.round(unitCost * ratio);
        if (!Number.isSafeInteger(exportPrice) || exportPrice > MAX_DB_INT) throw new ValidationError('Giá xuất tính từ QĐ3 vượt giới hạn lưu trữ');
        pricingBySku.set(sku.id, { unitCost, exportPrice });
        lines.push({ ...line, unitCost, amount });
      }

      const result = await tx.purchaseReceipt.create({
        data: {
          receiptNumber: code('PN'),
          warehouseId: input.warehouseId,
          receivedAt: input.receivedAt ? new Date(input.receivedAt) : new Date(),
          notes: input.notes,
          createdById: userId,
          lines: { create: lines.map(({ skuId, quantity, unitCost, amount }) => ({ skuId, quantity, unitCost, amount })) },
        },
        include: { warehouse: true, lines: { include: { sku: { include: { product: true } } } } },
      });

      for (const line of lines) {
        const inventory = await lockInventory(tx, input.warehouseId, line.skuId);
        if (inventory.onHand + line.quantity > MAX_DB_INT) throw new ValidationError('Tồn kho vượt giới hạn lưu trữ');
        await tx.inventory.update({
          where: { warehouseId_skuId: { warehouseId: input.warehouseId, skuId: line.skuId } },
          data: { onHand: { increment: line.quantity } },
        });
        await tx.inventoryMovement.create({
          data: { warehouseId: input.warehouseId, skuId: line.skuId, type: 'RECEIPT', quantity: line.quantity, referenceType: 'PURCHASE_RECEIPT', referenceId: result.id, notes: input.notes },
        });
      }
      const effectiveFrom = new Date();
      for (const [skuId, pricing] of pricingBySku) {
        await tx.pricing.updateMany({
          where: { skuId, effectiveFrom: { lte: effectiveFrom }, effectiveTo: null },
          data: { effectiveTo: effectiveFrom },
        });
        await tx.pricing.create({ data: { skuId, importPrice: pricing.unitCost, exportPrice: pricing.exportPrice, effectiveFrom } });
      }
      return result;
    });
    await audit(userId, 'RECEIVE_STOCK', 'PURCHASE_RECEIPT', receipt.id, { receiptNumber: receipt.receiptNumber });
    return receipt;
  }

  static async listOrders(query: { dealerId?: string; status?: string; page: number; limit: number }, scopedDealerId?: string) {
    const dealerId = scopedDealerId ?? query.dealerId;
    const where: Prisma.SalesOrderWhereInput = {
      ...(dealerId ? { dealerId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [total, items] = await prisma.$transaction([
      prisma.salesOrder.count({ where }),
      prisma.salesOrder.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: orderDetails,
      }),
    ]);
    return { items, pagination: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) } };
  }

  static async getOrder(id: string, scopedDealerId?: string) {
    const order = await prisma.salesOrder.findUnique({ where: { id }, include: orderDetails });
    if (!order || (scopedDealerId && scopedDealerId !== order.dealerId)) throw new NotFoundError('Đơn hàng', id);
    return order;
  }

  static async createOrder(input: OrderInput, userId: string) {
    const dealer = await prisma.dealer.findUnique({ where: { id: input.dealerId } });
    if (!dealer) throw new NotFoundError('Đại lý', input.dealerId);
    if (dealer.status !== 'ACTIVE') throw new ValidationError('Chỉ đại lý đang hoạt động mới được tạo đơn');
    const warehouse = await prisma.warehouse.findFirst({ where: { id: input.warehouseId, isActive: true } });
    if (!warehouse) throw new NotFoundError('Kho hàng', input.warehouseId);

    const order = await prisma.$transaction(async (tx) => {
      const items = [];
      for (const item of input.items) {
        const sku = await tx.sku.findUnique({
          where: { id: item.skuId },
          include: {
            pricings: {
              where: { effectiveFrom: { lte: new Date() }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
              orderBy: { effectiveFrom: 'desc' },
              take: 1,
            },
          },
        });
        const price = sku?.pricings[0]?.exportPrice;
        if (!sku || price === undefined) throw new ValidationError(`SKU ${item.skuId} không tồn tại hoặc chưa có giá bán hiệu lực`);
        const amount = price * item.quantity;
        if (!Number.isSafeInteger(amount) || amount > MAX_DB_INT) throw new ValidationError('Giá trị dòng hàng vượt giới hạn lưu trữ');
        items.push({ skuId: sku.id, unit: sku.unit, quantity: item.quantity, unitPrice: price, amount });
      }
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
      if (!Number.isSafeInteger(totalAmount) || totalAmount <= 0 || totalAmount > MAX_DB_INT) throw new ValidationError('Tổng đơn hàng vượt giới hạn lưu trữ');
      return tx.salesOrder.create({
        data: {
          orderNumber: code('DH'),
          dealerId: input.dealerId,
          warehouseId: input.warehouseId,
          status: 'PENDING_APPROVAL',
          totalAmount,
          notes: input.notes,
          createdById: userId,
          items: { create: items },
        },
        include: orderDetails,
      });
    });
    await audit(userId, 'CREATE_ORDER', 'SALES_ORDER', order.id, { orderNumber: order.orderNumber, totalAmount: order.totalAmount });
    return order;
  }

  static async approveOrder(id: string, userId: string) {
    const order = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "SalesOrder" WHERE "id" = ${id} FOR UPDATE`;
      const initial = await tx.salesOrder.findUnique({ where: { id }, include: { items: true } });
      if (!initial) throw new NotFoundError('Đơn hàng', id);
      await tx.$queryRaw`SELECT "id" FROM "Dealer" WHERE "id" = ${initial.dealerId} FOR UPDATE`;
      const fresh = await tx.salesOrder.findUnique({ where: { id }, include: { items: true } });
      if (!fresh) throw new NotFoundError('Đơn hàng', id);
      if (fresh.status !== 'PENDING_APPROVAL') throw new ValidationError(`Không thể duyệt đơn ở trạng thái ${fresh.status}`);
      if (!fresh.warehouseId) throw new ValidationError('Đơn hàng chưa được gán kho');

      const dealer = await tx.dealer.findUnique({ where: { id: fresh.dealerId }, include: { tier: true } });
      if (!dealer || dealer.status !== 'ACTIVE') throw new ValidationError('Đại lý không tồn tại hoặc không hoạt động');
      const config = await readQD3Config(tx);
      const maxDebt = config.tierDebtLimits?.[dealer.tier.name]
        ?? (dealer.tier.name.toLowerCase().includes('2') ? 5_000_000 : 10_000_000);
      if (!Number.isSafeInteger(maxDebt) || maxDebt <= 0) throw new ValidationError('Cấu hình hạn mức nợ QĐ3 không hợp lệ');
      const committed = await tx.salesOrder.aggregate({
        where: { dealerId: dealer.id, status: { in: ['APPROVED', 'PROCESSING', 'SHIPPED'] }, id: { not: id } },
        _sum: { totalAmount: true },
      });
      const expectedDebt = dealer.currentDebt + (committed._sum.totalAmount ?? 0) + fresh.totalAmount;
      if (expectedDebt > maxDebt) {
        throw new BusinessRuleViolationError('QD3', 'Đơn hàng vượt hạn mức nợ sau khi tính các đơn đã duyệt chưa lập hóa đơn', {
          currentDebt: dealer.currentDebt, pendingApprovedOrders: committed._sum.totalAmount ?? 0, orderAmount: fresh.totalAmount, maxDebtAllowed: maxDebt,
        });
      }

      for (const item of fresh.items) {
        const inventory = await lockInventory(tx, fresh.warehouseId, item.skuId);
        const available = inventory.onHand - inventory.reserved;
        if (available < item.quantity) {
          throw new AppError(`Tồn kho không đủ cho SKU ${item.skuId}`, 409, 'INSUFFICIENT_STOCK', { available, requested: item.quantity });
        }
        await tx.inventory.update({ where: { id: inventory.id }, data: { reserved: { increment: item.quantity } } });
        await tx.stockReservation.create({
          data: { salesOrderId: id, orderItemId: item.id, warehouseId: fresh.warehouseId, skuId: item.skuId, quantity: item.quantity },
        });
      }
      await tx.shipment.create({ data: { shipmentNumber: code('GH'), salesOrderId: id, status: 'PREPARING' } });
      return tx.salesOrder.update({
        where: { id },
        data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
        include: orderDetails,
      });
    });
    await audit(userId, 'APPROVE_ORDER', 'SALES_ORDER', order.id, { orderNumber: order.orderNumber, totalAmount: order.totalAmount });
    return order;
  }

  static async cancelOrder(id: string, userId: string) {
    const order = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "SalesOrder" WHERE "id" = ${id} FOR UPDATE`;
      const current = await tx.salesOrder.findUnique({ where: { id }, include: { reservations: true } });
      if (!current) throw new NotFoundError('Đơn hàng', id);
      if (!['PENDING_APPROVAL', 'APPROVED', 'PROCESSING'].includes(current.status)) {
        throw new ValidationError(`Không thể hủy đơn ở trạng thái ${current.status}`);
      }
      for (const reservation of current.reservations.filter((item) => item.status === 'ACTIVE')) {
        await lockInventory(tx, reservation.warehouseId, reservation.skuId);
        await tx.inventory.update({
          where: { warehouseId_skuId: { warehouseId: reservation.warehouseId, skuId: reservation.skuId } },
          data: { reserved: { decrement: reservation.quantity } },
        });
        await tx.stockReservation.update({ where: { id: reservation.id }, data: { status: 'RELEASED' } });
      }
      await tx.shipment.updateMany({ where: { salesOrderId: id, status: 'PREPARING' }, data: { status: 'CANCELLED' } });
      return tx.salesOrder.update({ where: { id }, data: { status: 'CANCELLED' }, include: orderDetails });
    });
    await audit(userId, 'CANCEL_ORDER', 'SALES_ORDER', order.id, { orderNumber: order.orderNumber });
    return order;
  }

  static async dispatchShipment(id: string, userId: string) {
    const shipment = await prisma.$transaction(async (tx) => {
      const shipmentRef = await tx.shipment.findUnique({ where: { id }, select: { salesOrderId: true } });
      if (!shipmentRef) throw new NotFoundError('Phiếu giao hàng', id);
      await tx.$queryRaw`SELECT "id" FROM "SalesOrder" WHERE "id" = ${shipmentRef.salesOrderId} FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "Shipment" WHERE "id" = ${id} FOR UPDATE`;
      const current = await tx.shipment.findUnique({ where: { id }, include: { salesOrder: { include: { reservations: true } } } });
      if (!current) throw new NotFoundError('Phiếu giao hàng', id);
      if (current.status !== 'PREPARING' || current.salesOrder.status !== 'APPROVED') {
        throw new ValidationError(`Không thể xuất kho ở trạng thái giao hàng ${current.status}`);
      }
      for (const reservation of current.salesOrder.reservations.filter((item) => item.status === 'ACTIVE')) {
        const inventory = await lockInventory(tx, reservation.warehouseId, reservation.skuId);
        if (inventory.onHand < reservation.quantity || inventory.reserved < reservation.quantity) {
          throw new AppError('Tồn kho đã thay đổi; không thể xác nhận xuất kho', 409, 'INSUFFICIENT_STOCK');
        }
        await tx.inventory.update({
          where: { id: inventory.id },
          data: { onHand: { decrement: reservation.quantity }, reserved: { decrement: reservation.quantity } },
        });
        await tx.inventoryMovement.create({
          data: { warehouseId: reservation.warehouseId, skuId: reservation.skuId, type: 'SHIPMENT', quantity: -reservation.quantity, referenceType: 'SHIPMENT', referenceId: id },
        });
        await tx.stockReservation.update({ where: { id: reservation.id }, data: { status: 'FULFILLED' } });
      }
      const updated = await tx.shipment.update({ where: { id }, data: { status: 'SHIPPED', shippedDate: new Date() } });
      await tx.salesOrder.update({ where: { id: current.salesOrderId }, data: { status: 'SHIPPED' } });
      return updated;
    });
    await audit(userId, 'DISPATCH_SHIPMENT', 'SHIPMENT', shipment.id, { shipmentNumber: shipment.shipmentNumber });
    return shipment;
  }

  static async getShipment(id: string) {
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: { salesOrder: { include: orderDetails } },
    });
    if (!shipment) throw new NotFoundError('Phiếu giao hàng', id);
    return shipment;
  }

  static async deliverShipment(id: string, userId: string) {
    const shipment = await prisma.$transaction(async (tx) => {
      const shipmentRef = await tx.shipment.findUnique({ where: { id }, select: { salesOrderId: true } });
      if (!shipmentRef) throw new NotFoundError('Phiếu giao hàng', id);
      await tx.$queryRaw`SELECT "id" FROM "SalesOrder" WHERE "id" = ${shipmentRef.salesOrderId} FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "Shipment" WHERE "id" = ${id} FOR UPDATE`;
      const current = await tx.shipment.findUnique({ where: { id } });
      if (!current) throw new NotFoundError('Phiếu giao hàng', id);
      if (current.status === 'DELIVERED') return current;
      if (current.status !== 'SHIPPED') throw new ValidationError(`Không thể xác nhận giao ở trạng thái ${current.status}`);
      const updated = await tx.shipment.update({ where: { id }, data: { status: 'DELIVERED', deliveredAt: new Date() } });
      return updated;
    });

    const { OrderIntegrationService } = await import('../integration/order-integration.service.js');
    const invoicing = await OrderIntegrationService.processShipmentDeliveryToInvoice({ salesOrderId: shipment.salesOrderId, userId });
    await prisma.salesOrder.update({ where: { id: shipment.salesOrderId }, data: { status: 'COMPLETED' } });
    await audit(userId, 'DELIVER_SHIPMENT', 'SHIPMENT', shipment.id, { invoiceId: invoicing.invoice?.id });
    return { shipment, invoicing };
  }

  static async createReturn(input: ReturnInput, userId: string) {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "SalesOrder" WHERE "id" = ${input.salesOrderId} FOR UPDATE`;
      const order = await tx.salesOrder.findUnique({ where: { id: input.salesOrderId }, include: { items: true, shipments: true } });
      if (!order) throw new NotFoundError('Đơn hàng', input.salesOrderId);
      if (!['SHIPPED', 'COMPLETED'].includes(order.status) || !order.shipments.some((shipment) => shipment.status === 'SHIPPED' || shipment.status === 'DELIVERED')) {
        throw new ValidationError('Chỉ được trả hàng thuộc đơn đã xuất kho');
      }
      const seen = new Set<string>();
      const returnItems = [];
      for (const line of input.items) {
        if (seen.has(line.orderItemId)) throw new ValidationError('Không được lặp dòng hàng trong yêu cầu trả');
        seen.add(line.orderItemId);
        const orderItem = order.items.find((item) => item.id === line.orderItemId);
        if (!orderItem) throw new ValidationError('Dòng trả hàng không thuộc đơn hàng');
        const previous = await tx.salesReturnItem.aggregate({
          where: { orderItemId: line.orderItemId, salesReturn: { status: { not: 'REJECTED' } } },
          _sum: { quantity: true },
        });
        const shippedQuantity = order.shipments.some((shipment) => shipment.status === 'SHIPPED' || shipment.status === 'DELIVERED') ? orderItem.quantity : 0;
        if ((previous._sum.quantity ?? 0) + line.quantity > shippedQuantity) {
          throw new AppError('Số lượng trả vượt quá số lượng đã giao còn lại', 422, 'RETURN_QUANTITY_EXCEEDED', {
            orderItemId: line.orderItemId, shippedQuantity, previouslyReturned: previous._sum.quantity ?? 0,
          });
        }
        returnItems.push({
          orderItemId: orderItem.id,
          skuId: orderItem.skuId,
          quantity: line.quantity,
          unitPrice: orderItem.unitPrice,
          amount: line.quantity * orderItem.unitPrice,
        });
      }
      const debtCreditAmount = returnItems.reduce((sum, item) => sum + item.amount, 0);
      if (!Number.isSafeInteger(debtCreditAmount) || debtCreditAmount > MAX_DB_INT) throw new ValidationError('Giá trị trả hàng vượt giới hạn lưu trữ');
      return tx.salesReturn.create({
        data: {
          returnNumber: code('TH'),
          salesOrderId: order.id,
          reason: input.reason,
          notes: input.notes,
          items: { create: returnItems },
        },
        include: { items: { include: { sku: { include: { product: true } } } } },
      });
    });
    await audit(userId, 'CREATE_RETURN', 'RETURN', result.id, { returnNumber: result.returnNumber });
    return result;
  }

  static async approveReturn(id: string, userId: string) {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Return" WHERE "id" = ${id} FOR UPDATE`;
      const salesReturn = await tx.salesReturn.findUnique({ where: { id } });
      if (!salesReturn) throw new NotFoundError('Phiếu trả hàng', id);
      if (salesReturn.status !== 'REQUESTED') throw new ValidationError(`Không thể duyệt phiếu trả ở trạng thái ${salesReturn.status}`);
      return tx.salesReturn.update({ where: { id }, data: { status: 'APPROVED' }, include: { items: true } });
    });
    await audit(userId, 'APPROVE_RETURN', 'RETURN', id, { returnNumber: updated.returnNumber });
    return updated;
  }

  static async rejectReturn(id: string, userId: string) {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Return" WHERE "id" = ${id} FOR UPDATE`;
      const salesReturn = await tx.salesReturn.findUnique({ where: { id } });
      if (!salesReturn) throw new NotFoundError('Phiếu trả hàng', id);
      if (salesReturn.status !== 'REQUESTED') throw new ValidationError(`Không thể từ chối phiếu trả ở trạng thái ${salesReturn.status}`);
      return tx.salesReturn.update({ where: { id }, data: { status: 'REJECTED' }, include: { items: true } });
    });
    await audit(userId, 'REJECT_RETURN', 'RETURN', id, { returnNumber: updated.returnNumber });
    return updated;
  }

  static async receiveReturn(id: string, userId: string) {
    const returned = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Return" WHERE "id" = ${id} FOR UPDATE`;
      const current = await tx.salesReturn.findUnique({
        where: { id },
        include: { salesOrder: { include: { items: true } }, items: true },
      });
      if (!current) throw new NotFoundError('Phiếu trả hàng', id);
      if (current.status !== 'APPROVED') throw new ValidationError(`Không thể nhận hàng trả ở trạng thái ${current.status}`);
      const dealer = await tx.dealer.findUnique({ where: { id: current.salesOrder.dealerId } });
      if (!dealer) throw new NotFoundError('Đại lý', current.salesOrder.dealerId);
      if (!current.salesOrder.warehouseId) throw new ValidationError('Đơn hàng chưa được gán kho');
      await tx.$queryRaw`SELECT "id" FROM "Dealer" WHERE "id" = ${dealer.id} FOR UPDATE`;
      const freshDealer = await tx.dealer.findUniqueOrThrow({ where: { id: dealer.id } });
      const amount = current.items.reduce((sum, item) => sum + item.amount, 0);
      if (amount > freshDealer.currentDebt) {
        throw new AppError('Giá trị trả hàng lớn hơn công nợ hiện tại; cần xử lý hoàn tiền riêng', 422, 'RETURN_CREDIT_EXCEEDED', {
          returnAmount: amount, currentDebt: freshDealer.currentDebt,
        });
      }
      const invoice = await tx.invoice.findFirst({ where: { salesOrderId: current.salesOrderId }, orderBy: { issueDate: 'asc' } });
      if (!invoice || invoice.remainingAmount < amount) {
        throw new AppError('Không đủ số dư hóa đơn chưa thanh toán để cấn trừ phiếu trả', 422, 'RETURN_CREDIT_EXCEEDED', {
          returnAmount: amount, outstandingInvoiceAmount: invoice?.remainingAmount ?? 0,
        });
      }
      const remainingAmount = invoice.remainingAmount - amount;
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          remainingAmount,
          status: remainingAmount === 0 ? 'PAID' : invoice.paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
        },
      });
      const currentDebt = freshDealer.currentDebt - amount;
      await tx.dealer.update({ where: { id: dealer.id }, data: { currentDebt } });
      await tx.debtLedger.create({
        data: {
          dealerId: dealer.id, transactionType: 'RETURN', referenceType: 'RETURN', referenceId: id,
          referenceCode: current.returnNumber, debitAmount: 0, creditAmount: amount,
          previousBalance: freshDealer.currentDebt, currentBalance: currentDebt,
          notes: `Cấn trừ công nợ do nhận hàng trả ${current.returnNumber}`,
        },
      });
      for (const item of current.items) {
        const inventory = await lockInventory(tx, current.salesOrder.warehouseId!, item.skuId);
        if (inventory.onHand + item.quantity > MAX_DB_INT) throw new ValidationError('Tồn kho sau khi nhận hàng trả vượt giới hạn lưu trữ');
        await tx.inventory.update({ where: { id: inventory.id }, data: { onHand: { increment: item.quantity } } });
        await tx.inventoryMovement.create({
          data: { warehouseId: current.salesOrder.warehouseId!, skuId: item.skuId, type: 'RETURN', quantity: item.quantity, referenceType: 'RETURN', referenceId: id, notes: current.reason },
        });
      }
      return tx.salesReturn.update({
        where: { id },
        data: { status: 'RECEIVED', receivedAt: new Date(), debtCreditAmount: amount },
        include: { items: true },
      });
    });
    await audit(userId, 'RECEIVE_RETURN', 'RETURN', returned.id, { returnNumber: returned.returnNumber, debtCreditAmount: returned.debtCreditAmount });
    return returned;
  }

  static async listReturns(query: { status?: string; page: number; limit: number }, scopedDealerId?: string) {
    const where: Prisma.SalesReturnWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(scopedDealerId ? { salesOrder: { dealerId: scopedDealerId } } : {}),
    };
    const [total, items] = await prisma.$transaction([
      prisma.salesReturn.count({ where }),
      prisma.salesReturn.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { salesOrder: { include: { dealer: true } }, items: { include: { sku: { include: { product: true } } } } },
      }),
    ]);
    return { items, pagination: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) } };
  }
}
