import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../src/config/prisma.js';
import { CreditService } from '../../src/modules/finance/credit/credit.service.js';
import { InvoiceService } from '../../src/modules/finance/invoice/invoice.service.js';
import { BusinessRuleViolationError } from '../../src/middleware/error.middleware.js';
import type { Dealer, DealerTier, District } from '@prisma/client';

describe('Unit Test: QD3 Credit Limit Check & Invoice Creation', () => {
  let district: District;
  let tier1: DealerTier;
  let tier2: DealerTier;
  let dealerTier1: Dealer;
  let dealerTier2: Dealer;

  beforeAll(async () => {
    district = await prisma.district.upsert({
      where: { code: 'QD3_DIST' },
      update: {},
      create: { code: 'QD3_DIST', name: 'Quận QD3', maxDealers: 4 },
    });

    tier1 = await prisma.dealerTier.upsert({
      where: { name: 'Loại 1' },
      update: { maxDebt: 10000000 },
      create: { name: 'Loại 1', maxDebt: 10000000 },
    });

    tier2 = await prisma.dealerTier.upsert({
      where: { name: 'Loại 2' },
      update: { maxDebt: 5000000 },
      create: { name: 'Loại 2', maxDebt: 5000000 },
    });

    dealerTier1 = await prisma.dealer.create({
      data: {
        code: `DL-T1-${Date.now()}`,
        name: 'Đại Lý Loại 1 QD3',
        phone: '0901111111',
        address: '101 Street',
        email: 't1@daily.vn',
        districtId: district.id,
        tierId: tier1.id,
        currentDebt: 8000000, // Đang nợ 8M / 10M
      },
    });

    dealerTier2 = await prisma.dealer.create({
      data: {
        code: `DL-T2-${Date.now()}`,
        name: 'Đại Lý Loại 2 QD3',
        phone: '0902222222',
        address: '102 Street',
        email: 't2@daily.vn',
        districtId: district.id,
        tierId: tier2.id,
        currentDebt: 4000000, // Đang nợ 4M / 5M
      },
    });
  });

  afterAll(async () => {
    for (const d of [dealerTier1, dealerTier2]) {
      if (d?.id) {
        await prisma.debtLedger.deleteMany({ where: { dealerId: d.id } });
        await prisma.invoice.deleteMany({ where: { dealerId: d.id } });
        await prisma.dealer.delete({ where: { id: d.id } });
      }
    }
  });

  it('QĐ3-01: Cho phép đơn hàng khi tổng nợ mới <= 10.000.000đ đối với Loại 1', async () => {
    // Current debt 8M + 1.5M = 9.5M <= 10M -> Allowed
    const check = await CreditService.checkCreditLimit(dealerTier1.id, 1500000);
    expect(check.allowed).toBe(true);
    expect(check.maxDebtAllowed).toBe(10000000);
    expect(check.remainingCredit).toBe(2000000);
  });

  it('QĐ3-02: Từ chối đơn hàng khi tổng nợ mới > 10.000.000đ đối với Loại 1', async () => {
    // Current debt 8M + 2.5M = 10.5M > 10M -> Rejected
    const check = await CreditService.checkCreditLimit(dealerTier1.id, 2500000);
    expect(check.allowed).toBe(false);
    expect(check.reason).toBeDefined();

    // Invoicing should also throw error
    await expect(
      InvoiceService.createInvoice({
        dealerId: dealerTier1.id,
        totalAmount: 2500000,
        notes: 'Test invoice vượt hạn mức',
      })
    ).rejects.toThrow(BusinessRuleViolationError);
  });

  it('QĐ3-03: Kiểm tra đúng hạn mức 5.000.000đ đối với Loại 2', async () => {
    // Current debt 4M + 1.5M = 5.5M > 5M -> Rejected
    const checkExceed = await CreditService.checkCreditLimit(dealerTier2.id, 1500000);
    expect(checkExceed.allowed).toBe(false);
    expect(checkExceed.maxDebtAllowed).toBe(5000000);

    // Current debt 4M + 500k = 4.5M <= 5M -> Allowed
    const checkAllowed = await CreditService.checkCreditLimit(dealerTier2.id, 500000);
    expect(checkAllowed.allowed).toBe(true);
  });
});

