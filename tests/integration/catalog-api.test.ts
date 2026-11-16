import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import prisma from '../../src/config/prisma.js';
import { generateToken } from '../../src/middleware/auth.middleware.js';
import { BusinessRulesService } from '../../src/modules/rules/business-rules.service.js';

describe('P3 catalog, QD2 and versioned pricing', () => {
  const app = createApp();
  let sales: string;
  let dealer: string;
  let actorId: string;
  let categoryId: string;
  let productId: string;
  let unitId: string;
  let skuId: string;
  let originalQd2: string;
  const unitName = 'Đơn vị kiểm thử P3';
  const post = (path: string, body: object, token = sales) => request(app)
    .post(`/api/v1/${path}`).set('Authorization', `Bearer ${token}`).send(body);

  beforeAll(async () => {
    const actor = await prisma.user.findUniqueOrThrow({ where: { email: 'sales@agenthub.vn' } });
    actorId = actor.id;
    sales = generateToken(actor);
    dealer = generateToken(await prisma.user.findUniqueOrThrow({ where: { email: 'dealer1@agenthub.vn' } }));
    originalQd2 = (await prisma.businessRule.findUniqueOrThrow({ where: { code: 'QD2' } })).value;
    categoryId = (await prisma.category.create({ data: { code: 'P3-TEST', name: 'P3 catalog test' } })).id;
  });

  afterAll(async () => {
    if (skuId) {
      await prisma.promotion.deleteMany({ where: { skuId } });
      await prisma.pricing.deleteMany({ where: { skuId } });
      await prisma.sku.delete({ where: { id: skuId } });
    }
    if (productId) await prisma.product.delete({ where: { id: productId } });
    if (unitId) await prisma.unitOfMeasure.delete({ where: { id: unitId } });
    if (categoryId) await prisma.category.delete({ where: { id: categoryId } });
    if (originalQd2) await prisma.businessRule.update({ where: { code: 'QD2' }, data: { value: originalQd2 } });
    await prisma.$disconnect();
  });

  it('rejects anonymous access and dealer catalog writes', async () => {
    expect((await request(app).get('/api/v1/products')).status).toBe(401);
    expect((await post('categories', { code: 'FORBIDDEN', name: 'Forbidden' }, dealer)).status).toBe(403);
  });

  it('enforces seeded QD2 capacities and accepts a valid increase', async () => {
    const product = { code: 'P3-PRODUCT', name: 'P3 test product', categoryId };
    const unit = { code: 'P3-UNIT', name: unitName };
    expect((await post('products', product)).status).toBe(422);
    expect((await post('units', unit)).status).toBe(422);
    await BusinessRulesService.updateRuleConfig('QD2', { maxProductCount: 6, maxUnitCount: 4 }, actorId);
    const createdProduct = await post('products', product);
    expect(createdProduct.status).toBe(201);
    productId = createdProduct.body.data.id;
    const createdUnit = await post('units', unit);
    expect(createdUnit.status).toBe(201);
    unitId = createdUnit.body.data.id;
    const createdSku = await post('skus', { code: 'P3-SKU', productId, unit: unitName });
    expect(createdSku.status).toBe(201);
    skuId = createdSku.body.data.id;
    await expect(BusinessRulesService.updateRuleConfig('QD2', { maxProductCount: 5, maxUnitCount: 3 }, actorId))
      .rejects.toThrow('Giới hạn mới thấp hơn số lượng đang có');
    expect(JSON.parse((await prisma.businessRule.findUniqueOrThrow({ where: { code: 'QD2' } })).value))
      .toEqual({ maxProductCount: 6, maxUnitCount: 4 });
  });

  it('protects referenced units and rejects unsupported list fields', async () => {
    expect((await request(app).delete(`/api/v1/units/${unitId}`)
      .set('Authorization', `Bearer ${sales}`)).status).toBe(409);
    expect((await request(app).get('/api/v1/skus?sortBy=name')
      .set('Authorization', `Bearer ${sales}`)).status).toBe(400);
    const res = await request(app).get(`/api/v1/products?categoryId=${categoryId}`)
      .set('Authorization', `Bearer ${sales}`);
    expect(res.body.data.map((item: { id: string }) => item.id)).toEqual([productId]);
  });

  it('versions QD3 prices, rejects a stale update and hides import prices from dealers', async () => {
    const first = await post('pricing', { skuId, importPrice: 101 });
    expect(first.status).toBe(201);
    expect(first.body.data.exportPrice).toBe(103);
    const changed = await request(app).patch(`/api/v1/pricing/${first.body.data.id}`)
      .set('Authorization', `Bearer ${sales}`).send({ importPrice: 200 });
    expect(changed.status).toBe(200);
    expect(changed.body.data.exportPrice).toBe(204);
    expect(changed.body.data.id).not.toBe(first.body.data.id);
    const old = await prisma.pricing.findUniqueOrThrow({ where: { id: first.body.data.id } });
    expect(old.importPrice).toBe(101);
    expect(old.effectiveTo?.toISOString()).toBe(changed.body.data.effectiveFrom);
    expect((await request(app).patch(`/api/v1/pricing/${first.body.data.id}`)
      .set('Authorization', `Bearer ${sales}`).send({ importPrice: 300 })).status).toBe(409);
    const visible = await request(app).get(`/api/v1/pricing?skuId=${skuId}&activeOnly=false`)
      .set('Authorization', `Bearer ${dealer}`);
    expect(visible.status).toBe(200);
    expect(visible.body.data).toHaveLength(1);
    expect(visible.body.data[0]).not.toHaveProperty('importPrice');
    expect((await request(app).get(`/api/v1/pricing/${changed.body.data.id}`)
      .set('Authorization', `Bearer ${dealer}`)).status).toBe(403);
  });

  it('filters inactive promotions for dealers and rejects reversed validity windows', async () => {
    const now = Date.now();
    const body = { code: 'P3-PROMO', name: 'P3 promo', skuId, minimumQuantity: 2,
      discountPercent: 10, effectiveFrom: new Date(now - 60_000).toISOString(),
      effectiveTo: new Date(now + 60_000).toISOString(), isActive: false };
    expect((await post('promotions', { ...body, effectiveTo: body.effectiveFrom })).status).toBe(422);
    const created = await post('promotions', body);
    expect(created.status).toBe(201);
    const path = `/api/v1/promotions/${created.body.data.id}`;
    expect((await request(app).get(path).set('Authorization', `Bearer ${dealer}`)).status).toBe(404);
    expect((await request(app).patch(path).set('Authorization', `Bearer ${sales}`)
      .send({ isActive: true })).status).toBe(200);
    expect((await request(app).get(path).set('Authorization', `Bearer ${dealer}`)).status).toBe(200);
  });
});
