import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import prisma from '../../src/config/prisma.js';

describe('P4 order, inventory and fulfillment workflow', () => {
  const app = createApp();
  let token: string;
  let warehouseId: string;
  let dealerId: string;
  let skuId: string;

  beforeAll(async () => {
    const login = await request(app).post('/api/v1/auth/login')
      .send({ email: 'admin@agenthub.vn', password: 'password123' });
    token = login.body.data.token;
    warehouseId = (await prisma.warehouse.findUniqueOrThrow({ where: { code: 'KHO-CHINH' } })).id;
    dealerId = (await prisma.dealer.findUniqueOrThrow({ where: { code: 'DL-002' } })).id;
    skuId = (await prisma.sku.findUniqueOrThrow({ where: { code: 'SKU-SP001' } })).id;
  });

  it('receives stock, reserves and ships an approved order, invoices once, and accepts a bounded return', async () => {
    const receipt = await request(app).post('/api/v1/purchase-receipts')
      .set('Authorization', `Bearer ${token}`)
      .send({ warehouseId, lines: [{ skuId, quantity: 3, unitCost: 320000 }] });
    expect(receipt.status).toBe(201);
    expect(receipt.body.data.lines[0].amount).toBe(960000);

    const orderResponse = await request(app).post('/api/v1/sales-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ dealerId, warehouseId, items: [{ skuId, quantity: 2 }] });
    expect(orderResponse.status).toBe(201);
    const order = orderResponse.body.data;
    expect(order.status).toBe('PENDING_APPROVAL');
    expect(order.totalAmount).toBe(652800);

    const approved = await request(app).post(`/api/v1/sales-orders/${order.id}/approve`)
      .set('Authorization', `Bearer ${token}`);
    expect(approved.status).toBe(200);
    expect(approved.body.data.reservations).toHaveLength(1);
    expect(approved.body.data.shipments).toHaveLength(1);

    const shipmentId = approved.body.data.shipments[0].id;
    const dispatched = await request(app).post(`/api/v1/shipments/${shipmentId}/dispatch`)
      .set('Authorization', `Bearer ${token}`);
    expect(dispatched.status).toBe(200);
    expect(dispatched.body.data.status).toBe('SHIPPED');

    const delivery = await request(app).post(`/api/v1/shipments/${shipmentId}/deliver`)
      .set('Authorization', `Bearer ${token}`);
    expect(delivery.status).toBe(200);
    expect(delivery.body.data.invoicing.invoice.salesOrderId).toBe(order.id);

    const invoiceCount = await prisma.invoice.count({ where: { salesOrderId: order.id } });
    expect(invoiceCount).toBe(1);
    const retryDelivery = await request(app).post(`/api/v1/shipments/${shipmentId}/deliver`)
      .set('Authorization', `Bearer ${token}`);
    expect(retryDelivery.status).toBe(200);
    expect(await prisma.invoice.count({ where: { salesOrderId: order.id } })).toBe(1);

    const returnResponse = await request(app).post('/api/v1/returns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        salesOrderId: order.id,
        reason: 'Hàng lỗi',
        items: [{ orderItemId: order.items[0].id, quantity: 1 }],
      });
    expect(returnResponse.status).toBe(201);
    const returnId = returnResponse.body.data.id;

    expect((await request(app).post(`/api/v1/returns/${returnId}/approve`).set('Authorization', `Bearer ${token}`)).status).toBe(200);
    const returned = await request(app).post(`/api/v1/returns/${returnId}/receive`)
      .set('Authorization', `Bearer ${token}`);
    expect(returned.status).toBe(200);
    expect(returned.body.data.status).toBe('RECEIVED');
    expect(returned.body.data.debtCreditAmount).toBe(326400);

    const duplicateReceive = await request(app).post(`/api/v1/returns/${returnId}/receive`)
      .set('Authorization', `Bearer ${token}`);
    expect(duplicateReceive.status).toBe(400);

    const inventory = await prisma.inventory.findUniqueOrThrow({ where: { warehouseId_skuId: { warehouseId, skuId } } });
    expect(inventory.onHand).toBe(2);
    expect(inventory.reserved).toBe(0);
    const finalOrder = await prisma.salesOrder.findUniqueOrThrow({ where: { id: order.id } });
    expect(finalOrder.status).toBe('COMPLETED');
  });

  it('rolls back an over-stock approval and serializes repeated approval requests', async () => {
    const tooLarge = await request(app).post('/api/v1/sales-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ dealerId, warehouseId, items: [{ skuId, quantity: 3 }] });
    expect(tooLarge.status).toBe(201);
    const failedApproval = await request(app).post(`/api/v1/sales-orders/${tooLarge.body.data.id}/approve`)
      .set('Authorization', `Bearer ${token}`);
    expect(failedApproval.status).toBe(409);
    expect(failedApproval.body.code).toBe('INSUFFICIENT_STOCK');
    expect(await prisma.stockReservation.count({ where: { salesOrderId: tooLarge.body.data.id } })).toBe(0);

    const order = await request(app).post('/api/v1/sales-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ dealerId, warehouseId, items: [{ skuId, quantity: 1 }] });
    expect(order.status).toBe(201);
    const approvals = await Promise.all([
      request(app).post(`/api/v1/sales-orders/${order.body.data.id}/approve`).set('Authorization', `Bearer ${token}`),
      request(app).post(`/api/v1/sales-orders/${order.body.data.id}/approve`).set('Authorization', `Bearer ${token}`),
    ]);
    expect(approvals.map((response) => response.status).sort()).toEqual([200, 400]);
    const approved = approvals.find((response) => response.status === 200)!;

    const cancel = await request(app).post(`/api/v1/sales-orders/${order.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(cancel.status).toBe(200);
    const shipmentId = approved.body.data.shipments[0].id;
    const dispatch = await request(app).post(`/api/v1/shipments/${shipmentId}/dispatch`)
      .set('Authorization', `Bearer ${token}`);
    expect(dispatch.status).toBe(400);
  });
});
