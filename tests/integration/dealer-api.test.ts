import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';
import prisma from '../../src/config/prisma.js';
import { generateToken } from '../../src/middleware/auth.middleware.js';

describe('P3 BM1/BM4 dealer API with migrated PostgreSQL', () => {
  const app = createApp();
  let token: string;
  let tierId: string;
  let districtId: string;
  let dealerId: string;
  let actorId: string;
  const input = (code: string, target = districtId) => ({ code, name: `Đại lý ${code}`, phone: '0901234567',
    address: '123 Nguyễn Trãi', email: `${code}@example.com`, tierId, districtId: target,
    receivedDate: '2026-10-13T00:00:00+07:00' });
  const post = (code: string, target = districtId) => request(app).post('/api/v1/dealers')
    .set('Authorization', `Bearer ${token}`).send(input(code, target));
  beforeAll(async () => {
    const actor = await prisma.user.findUniqueOrThrow({ where: { email: 'sales@agenthub.vn' } });
    actorId = actor.id;
    token = generateToken(actor);
    tierId = (await prisma.dealerTier.findUniqueOrThrow({ where: { name: 'Loại 1' } })).id;
    districtId = (await prisma.district.create({ data: { code: 'P3-Q1', name: 'Quận P3' } })).id;
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it('creates a dealer with zero debt and an atomic audit log', async () => {
    const res = await post('P3-A');
    expect(res.status).toBe(201);
    expect(res.body.data.currentDebt).toBe(0);
    expect(res.body.data.tier.id).toBe(tierId);
    expect(res.body.data.receivedDate).toBe('2026-10-12T17:00:00.000Z');
    dealerId = res.body.data.id;
    expect(await prisma.auditLog.count({ where: { entityId: dealerId, action: 'CREATE_DEALER' } })).toBe(1);
  });
  it('returns a duplicate-code conflict and rejects invalid references', async () => {
    expect((await post('P3-A')).status).toBe(409);
    expect((await post('P3-NOREF', 'missing')).status).toBe(404);
  });
  it('validates pagination, payload fields and immutable finance fields', async () => {
    const res = await request(app).get('/api/v1/dealers?limit=101').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    const update = await request(app).patch(`/api/v1/dealers/${dealerId}`).set('Authorization', `Bearer ${token}`)
      .send({ currentDebt: 999 });
    expect(update.status).toBe(400);
    expect((await post('P3-BAD')).status).toBe(201);
  });
  it('filters, paginates and sorts BM4 including current debt from P5', async () => {
    const res = await request(app).get(`/api/v1/dealers?districtId=${districtId}&sortBy=code&sortOrder=asc&limit=1`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(2);
    expect(res.body.data[0].code).toBe('P3-A');
    expect(res.body.data[0].currentDebt).toBe(0);
    const search = await request(app).get('/api/v1/dealers?search=P3-A').set('Authorization', `Bearer ${token}`);
    expect(search.body.data.map((item: { id: string }) => item.id)).toEqual([dealerId]);
  });
  it('allows the fourth dealer, rejects the fifth and prevents moves into a full district', async () => {
    expect((await post('P3-C')).status).toBe(201);
    expect((await post('P3-D')).status).toBe(201);
    const fifth = await post('P3-E');
    expect(fifth.status).toBe(422);
    expect(fifth.body.code).toBe('RULE_VIOLATION_QD1');
    const other = await prisma.district.create({ data: { code: 'P3-Q2', name: 'Quận khác' } });
    const moving = await post('P3-MOVE', other.id);
    expect(moving.status).toBe(201);
    const moved = await request(app).patch(`/api/v1/dealers/${moving.body.data.id}`)
      .set('Authorization', `Bearer ${token}`).send({ districtId });
    expect(moved.status).toBe(422);
    expect((await prisma.dealer.findUniqueOrThrow({ where: { id: moving.body.data.id } })).districtId).toBe(other.id);
    // Editing a dealer already in the full district does not consume another slot.
    expect((await request(app).patch(`/api/v1/dealers/${dealerId}`).set('Authorization', `Bearer ${token}`)
      .send({ name: 'Tên mới', districtId })).status).toBe(200);
  });
  it('applies updated QD1 immediately and preserves existing records when the cap decreases', async () => {
    const rule = await prisma.businessRule.findUniqueOrThrow({ where: { code: 'QD1' } });
    try {
      await prisma.businessRule.update({ where: { id: rule.id }, data: {
        value: JSON.stringify({ maxDealerTypes: 2, totalDistricts: 20, maxDealersPerDistrict: 5 }) } });
      expect((await post('P3-NEWCAP')).status).toBe(201);
      await prisma.businessRule.update({ where: { id: rule.id }, data: {
        value: JSON.stringify({ maxDealerTypes: 2, totalDistricts: 20, maxDealersPerDistrict: 3 }) } });
      expect((await post('P3-LOWCAP')).status).toBe(422);
      expect((await request(app).patch(`/api/v1/dealers/${dealerId}`).set('Authorization', `Bearer ${token}`)
        .send({ phone: '0907654321' })).status).toBe(200);
    } finally {
      await prisma.businessRule.update({ where: { id: rule.id }, data: { value: rule.value } });
    }
  });
  it('rejects inactive districts/tiers and omits them from form lookups', async () => {
    const off = await prisma.district.create({ data: { code: 'P3-OFF', name: 'Ngưng hoạt động', isActive: false } });
    expect((await post('P3-OFF', off.id)).status).toBe(422);
    const disabled = await prisma.dealerTier.create({ data: { name: 'P3-OFF', isActive: false } });
    const q = await prisma.district.create({ data: { code: 'P3-EMPTY', name: 'Trống' } });
    expect((await request(app).post('/api/v1/dealers').set('Authorization', `Bearer ${token}`)
      .send({ ...input('P3-OFFTIER', q.id), tierId: disabled.id })).status).toBe(422);
    const districts = await request(app).get('/api/v1/districts').set('Authorization', `Bearer ${token}`);
    expect(districts.body.data.some((item: { id: string }) => item.id === off.id)).toBe(false);
    const tiers = await request(app).get('/api/v1/dealer-tiers').set('Authorization', `Bearer ${token}`);
    expect(tiers.body.data.some((item: { id: string }) => item.id === disabled.id)).toBe(false);
  });
  it('requires JWT, rejects role spoofing, and scopes dealers to their own records', async () => {
    expect((await request(app).get('/api/v1/dealers')).status).toBe(401);
    expect((await request(app).get('/api/v1/dealers').set('x-user-id', actorId).set('x-user-role', 'ADMIN')).status).toBe(401);
    const own = generateToken({ id: actorId, email: 'own@example.com', fullName: 'Own', role: 'DEALER', dealerId });
    const list = await request(app).get('/api/v1/dealers').set('Authorization', `Bearer ${own}`);
    expect(list.body.data.map((item: { id: string }) => item.id)).toEqual([dealerId]);
    expect((await request(app).get(`/api/v1/dealers/${dealerId}`).set('Authorization', `Bearer ${own}`)).status).toBe(200);
    expect((await request(app).get('/api/v1/dealers/other').set('Authorization', `Bearer ${own}`)).status).toBe(403);
    expect((await request(app).post('/api/v1/dealers').set('Authorization', `Bearer ${own}`).send(input('P3-FORBID'))).status).toBe(403);
    const unlinked = generateToken({ id: actorId, email: 'none@example.com', fullName: 'None', role: 'DEALER' });
    expect((await request(app).get('/api/v1/dealers').set('Authorization', `Bearer ${unlinked}`)).status).toBe(403);
  });
  it('keeps the finance overview and debt routes reachable', async () => {
    expect((await request(app).get('/api/v1/dealers/overview').set('Authorization', `Bearer ${token}`)).status).toBe(200);
    expect((await request(app).get(`/api/v1/dealers/${dealerId}/debt`).set('Authorization', `Bearer ${token}`)).status).toBe(200);
  });
  it('database constraints stop concurrent writers from taking the same final slot', async () => {
    const q = await prisma.district.create({ data: { code: 'P3-RACE', name: 'Đồng thời' } });
    for (let i = 0; i < 3; i++) expect((await post(`P3-RACE-${i}`, q.id)).status).toBe(201);
    const second = new PrismaClient();
    try {
      // Independent connections, bypassing application validation on purpose.
      const data = (code: string) => ({ ...input(code, q.id), receivedDate: new Date() });
      const writes = await Promise.allSettled([
        prisma.dealer.create({ data: data('P3-RACE-A') }),
        second.dealer.create({ data: data('P3-RACE-B') }),
      ]);
      expect(writes.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
      expect(await prisma.dealer.count({ where: { districtId: q.id } })).toBe(4);
      await expect(second.dealer.create({ data: data('P3-RACE-C') })).rejects.toThrow();
    } finally { await second.$disconnect(); }
  });
  it('concurrent API admission returns one success and one QD1 rejection', async () => {
    const q = await prisma.district.create({ data: { code: 'P3-API-RACE', name: 'API đồng thời' } });
    for (let i = 0; i < 3; i++) expect((await post(`P3-API-${i}`, q.id)).status).toBe(201);
    const results = await Promise.all([post('P3-API-A', q.id), post('P3-API-B', q.id)]);
    expect(results.map((res) => res.status).sort()).toEqual([201, 422]);
    expect(results.find((res) => res.status === 422)?.body.code).toBe('RULE_VIOLATION_QD1');
    expect(await prisma.dealer.count({ where: { districtId: q.id } })).toBe(4);
  });
  it('moves to an available district, returns 404 for missing records, and denies accountant writes', async () => {
    const q = await prisma.district.create({ data: { code: 'P3-MOVE-OK', name: 'Còn suất' } });
    const res = await request(app).patch(`/api/v1/dealers/${dealerId}`)
      .set('Authorization', `Bearer ${token}`).send({ districtId: q.id });
    expect(res.status).toBe(200);
    expect(res.body.data.districtId).toBe(q.id);
    expect((await request(app).get('/api/v1/dealers/missing').set('Authorization', `Bearer ${token}`)).status).toBe(404);
    const acc = await prisma.user.findUniqueOrThrow({ where: { email: 'accountant@agenthub.vn' } });
    const accToken = generateToken(acc);
    expect((await request(app).get('/api/v1/dealers').set('Authorization', `Bearer ${accToken}`)).status).toBe(200);
    expect((await request(app).patch(`/api/v1/dealers/${dealerId}`).set('Authorization', `Bearer ${accToken}`)
      .send({ name: 'Unauthorized' })).status).toBe(403);
  });
});
