import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../src/config/prisma.js';
import { PaymentService } from '../../src/modules/finance/payment/payment.service.js';
import { BusinessRuleViolationError } from '../../src/middleware/error.middleware.js';
import type { Dealer, DealerTier, District } from '@prisma/client';

describe('Unit Test: BM5 & QD5 Payment Enforcement', () => {
  let testDistrict: District;
  let testTier: DealerTier;
  let testDealer: Dealer;

  beforeAll(async () => {
    testDistrict = await prisma.district.upsert({
      where: { code: 'QTEST' },
      update: {},
      create: { code: 'QTEST', name: 'Quận Test', maxDealers: 4 },
    });

    testTier = await prisma.dealerTier.upsert({
      where: { name: 'Tier Test 1' },
      update: { maxDebt: 10000000 },
      create: { name: 'Tier Test 1', maxDebt: 10000000 },
    });

    testDealer = await prisma.dealer.create({
      data: {
        code: `DL-TEST-${Date.now()}`,
        name: 'Đại Lý Kiểm Thử QD5',
        phone: '0988776655',
        address: '100 Test St',
        email: 'testqd5@daily.vn',
        districtId: testDistrict.id,
        tierId: testTier.id,
        currentDebt: 3000000, // 3,000,000 VND
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testDealer?.id) {
      await prisma.paymentInvoiceAllocation.deleteMany({
        where: { payment: { dealerId: testDealer.id } },
      });
      await prisma.payment.deleteMany({ where: { dealerId: testDealer.id } });
      await prisma.debtLedger.deleteMany({ where: { dealerId: testDealer.id } });
      await prisma.invoice.deleteMany({ where: { dealerId: testDealer.id } });
      await prisma.dealer.delete({ where: { id: testDealer.id } });
    }
  });

  it('QĐ5-01: Chặn lập phiếu thu khi số tiền thu lớn hơn số tiền đại lý đang nợ', async () => {
    const invalidAmount = 3500000; // Debt is 3,000,000

    await expect(
      PaymentService.createPayment({
        dealerId: testDealer.id,
        amount: invalidAmount,
        notes: 'Test thu vượt nợ',
      })
    ).rejects.toThrow(BusinessRuleViolationError);
  });

  it('QĐ5-02: Cho phép thu một phần nợ và cập nhật số nợ còn lại chính xác', async () => {
    const paymentAmount = 1000000;

    const result = await PaymentService.createPayment({
      dealerId: testDealer.id,
      amount: paymentAmount,
      notes: 'Test thu 1 triệu',
    });

    expect(result.payment).toBeDefined();
    expect(result.payment.amount).toBe(1000000);
    expect(result.previousDebt).toBe(3000000);
    expect(result.currentDebt).toBe(2000000);
    expect(result.ledgerEntry.creditAmount).toBe(1000000);
    expect(result.ledgerEntry.currentBalance).toBe(2000000);

    // Verify in DB
    const freshDealer = await prisma.dealer.findUnique({ where: { id: testDealer.id } });
    expect(freshDealer?.currentDebt).toBe(2000000);
  });

  it('QĐ5-03: Cho phép thu đúng bằng toàn bộ số nợ còn lại (nợ về 0)', async () => {
    const paymentAmount = 2000000; // Remaining debt is 2,000,000

    const result = await PaymentService.createPayment({
      dealerId: testDealer.id,
      amount: paymentAmount,
      notes: 'Test tất toán nợ',
    });

    expect(result.currentDebt).toBe(0);

    const freshDealer = await prisma.dealer.findUnique({ where: { id: testDealer.id } });
    expect(freshDealer?.currentDebt).toBe(0);
  });

  it('QĐ5-04: Chặn lập phiếu thu khi đại lý đã hết nợ (nợ = 0)', async () => {
    await expect(
      PaymentService.createPayment({
        dealerId: testDealer.id,
        amount: 500000,
        notes: 'Test thu khi nợ = 0',
      })
    ).rejects.toThrow(BusinessRuleViolationError);
  });
});
