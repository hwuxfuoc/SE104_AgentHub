import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import prisma from '../../src/config/prisma.js';

describe('Integration Test: Finance & Integration API Endpoints', () => {
  const app = createApp();
  let adminToken: string;
  let accountantToken: string;
  let dealerToken: string;
  let sampleDealer: any;

  beforeAll(async () => {
    // Authenticate Admin
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@agenthub.vn', password: 'password123' });
    adminToken = adminLoginRes.body.data.token;

    // Authenticate Accountant
    const accLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'accountant@agenthub.vn', password: 'password123' });
    accountantToken = accLoginRes.body.data.token;

    // Authenticate Dealer
    const dealerLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'dealer1@agenthub.vn', password: 'password123' });
    dealerToken = dealerLoginRes.body.data.token;

    sampleDealer = await prisma.dealer.findFirst({
      where: { code: 'DL-001' },
    });
  });

  it('GET /health: Trả về trạng thái UP của service', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.service).toContain('Finance');
  });

  it('GET /api/v1/dealers/:id/debt: Tra cứu công nợ đại lý thành công', async () => {
    const res = await request(app)
      .get(`/api/v1/dealers/${sampleDealer.id}/debt`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.dealer.id).toBe(sampleDealer.id);
    expect(res.body.data.maxDebtAllowed).toBe(10000000);
    expect(res.body.data.currentDebt).toBeGreaterThanOrEqual(0);
  });

  it('POST /api/v1/payments: Kế toán lập phiếu thu thành công và cập nhật nợ', async () => {
    const debtBeforeRes = await request(app)
      .get(`/api/v1/dealers/${sampleDealer.id}/debt`)
      .set('Authorization', `Bearer ${accountantToken}`);
    const debtBefore = debtBeforeRes.body.data.currentDebt;

    if (debtBefore > 0) {
      const payAmount = Math.min(500000, debtBefore);
      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${accountantToken}`)
        .send({
          dealerId: sampleDealer.id,
          amount: payAmount,
          paymentMethod: 'CASH',
          notes: 'Khách nộp tiền mặt tại quầy',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payment.receiptNumber).toMatch(/^PT-\d{8}-\d{4}$/);
      expect(res.body.data.currentDebt).toBe(debtBefore - payAmount);
    }
  });

  it('POST /api/v1/payments: Chặn thu tiền khi số tiền lớn hơn nợ hiện tại (QĐ5)', async () => {
    const debtRes = await request(app)
      .get(`/api/v1/dealers/${sampleDealer.id}/debt`)
      .set('Authorization', `Bearer ${accountantToken}`);
    const currentDebt = debtRes.body.data.currentDebt;

    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        dealerId: sampleDealer.id,
        amount: currentDebt + 1000000,
        notes: 'Thu vượt nợ',
      });

    expect(res.status).toBe(422);
    expect(res.body.code).toContain('RULE_VIOLATION_QD5');
  });

  it('POST /api/v1/finance/check-credit-limit: API kiểm tra hạn mức cho P4 Order Approval', async () => {
    const res = await request(app)
      .post('/api/v1/finance/check-credit-limit')
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        dealerId: sampleDealer.id,
        orderAmount: 1000000,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.dealerId).toBe(sampleDealer.id);
    expect(typeof res.body.data.allowed).toBe('boolean');
  });

  it('GET /api/v1/reports/sales: Xuất báo cáo doanh số BM6.1 định dạng JSON & CSV', async () => {
    // JSON
    const jsonRes = await request(app)
      .get('/api/v1/reports/sales?month=9&year=2026')
      .set('Authorization', `Bearer ${accountantToken}`);

    expect(jsonRes.status).toBe(200);
    expect(jsonRes.body.data.title).toContain('BM6.1');
    expect(jsonRes.body.data.rows).toBeInstanceOf(Array);

    // CSV
    const csvRes = await request(app)
      .get('/api/v1/reports/sales?month=9&year=2026&format=csv')
      .set('Authorization', `Bearer ${accountantToken}`);

    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
  });

  it('GET /api/v1/reports/debt: Xuất báo cáo công nợ BM6.2 định dạng JSON & CSV', async () => {
    const jsonRes = await request(app)
      .get('/api/v1/reports/debt?month=9&year=2026')
      .set('Authorization', `Bearer ${accountantToken}`);

    expect(jsonRes.status).toBe(200);
    expect(jsonRes.body.data.title).toContain('BM6.2');
    expect(jsonRes.body.data.rows).toBeInstanceOf(Array);

    const csvRes = await request(app)
      .get('/api/v1/reports/debt?month=9&year=2026&format=csv')
      .set('Authorization', `Bearer ${accountantToken}`);

    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
  });

  it('GET /api/v1/business-rules: Xem danh sách quy định hệ thống (QĐ1-QĐ7)', async () => {
    const res = await request(app)
      .get('/api/v1/business-rules')
      .set('Authorization', `Bearer ${accountantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(5);
  });

  it('GET /api/v1/audit-logs: Truy vấn nhật ký hệ thống', async () => {
    const res = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
  });
});

