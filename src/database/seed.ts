import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seeding for SE104_AgentHub...');

  // 1. Seed Business Rules (QĐ1, QĐ2, QĐ3, QĐ5, QĐ7)
  console.log('Seeding Business Rules...');
  const rules = [
    {
      code: 'QD1',
      name: 'Quy định về số lượng loại đại lý và số lượng đại lý tối đa trong quận',
      value: JSON.stringify({
        maxDealerTypes: 2,
        totalDistricts: 20,
        maxDealersPerDistrict: 4,
      }),
      description: 'Có 2 loại đại lý (1, 2). Có 20 quận. Trong mỗi quận có tối đa 4 đại lý.',
    },
    {
      code: 'QD2',
      name: 'Quy định về số lượng mặt hàng và đơn vị tính',
      value: JSON.stringify({
        maxProductCount: 5,
        maxUnitCount: 3,
      }),
      description: 'Có 5 mặt hàng, 3 đơn vị tính.',
    },
    {
      code: 'QD3',
      name: 'Quy định về hạn mức nợ và đơn giá xuất',
      value: JSON.stringify({
        tierDebtLimits: {
          'Loại 1': 10000000,
          'Loại 2': 5000000,
        },
        exportPriceRatio: 1.02,
      }),
      description: 'Đại lý loại 1 có tiền nợ tối đa 10.000.000đ, loại 2 là 5.000.000đ. Đơn giá xuất = 102% Đơn giá nhập.',
    },
    {
      code: 'QD5',
      name: 'Quy định về thu tiền',
      value: JSON.stringify({
        strictPaymentLessThanDebt: true,
      }),
      description: 'Số tiền thu không vượt quá số tiền đại lý đang nợ.',
    },
    {
      code: 'QD7',
      name: 'Quy định về thay đổi quy định hệ thống',
      value: JSON.stringify({
        allowAdminConfig: true,
      }),
      description: 'Admin có thể thay đổi số loại đại lý, số đại lý tối đa trong quận, số mặt hàng, đơn vị tính, hạn mức nợ và tỉ lệ đơn giá xuất.',
    },
  ];

  for (const rule of rules) {
    await prisma.businessRule.upsert({
      where: { code: rule.code },
      update: { value: rule.value, description: rule.description },
      create: rule,
    });
  }

  // 2. Seed Districts (20 Quận)
  console.log('Seeding 20 Districts (QĐ1)...');
  for (let i = 1; i <= 20; i++) {
    const code = `Q${i.toString().padStart(2, '0')}`;
    const name = `Quận ${i}`;
    await prisma.district.upsert({
      where: { code },
      update: { name, maxDealers: 4 },
      create: { code, name, maxDealers: 4 },
    });
  }

  // 3. Seed Dealer Tiers (Loại 1, Loại 2)
  console.log('Seeding Dealer Tiers (QĐ1 & QĐ3)...');
  const tier1 = await prisma.dealerTier.upsert({
    where: { name: 'Loại 1' },
    update: { maxDebt: 10000000 },
    create: { name: 'Loại 1', maxDebt: 10000000 },
  });

  const tier2 = await prisma.dealerTier.upsert({
    where: { name: 'Loại 2' },
    update: { maxDebt: 5000000 },
    create: { name: 'Loại 2', maxDebt: 5000000 },
  });

  // 4. Seed Category, Products, SKUs (5 mặt hàng, 3 đơn vị tính theo QĐ2)
  console.log('Seeding Category, Products & SKUs (QĐ2)...');
  const category = await prisma.category.upsert({
    where: { code: 'CAT-DIENGD' },
    update: { name: 'Thiết bị điện gia dụng' },
    create: { code: 'CAT-DIENGD', name: 'Thiết bị điện gia dụng' },
  });

  const productData = [
    { code: 'SP001', name: 'Quạt đứng điện cơ', importPrice: 300000, unit: 'Cái' },
    { code: 'SP002', name: 'Nồi cơm điện tử', importPrice: 800000, unit: 'Cái' },
    { code: 'SP003', name: 'Bóng đèn LED 20W', importPrice: 50000, unit: 'Hộp' },
    { code: 'SP004', name: 'Ổ cắm điện đa năng', importPrice: 120000, unit: 'Hộp' },
    { code: 'SP005', name: 'Bình đun siêu tốc', importPrice: 250000, unit: 'Thùng' },
  ];

  for (const p of productData) {
    const product = await prisma.product.upsert({
      where: { code: p.code },
      update: { name: p.name, categoryId: category.id },
      create: { code: p.code, name: p.name, categoryId: category.id },
    });

    const sku = await prisma.sku.upsert({
      where: { code: `SKU-${p.code}` },
      update: { productId: product.id, unit: p.unit },
      create: { code: `SKU-${p.code}`, productId: product.id, unit: p.unit },
    });

    const exportPrice = Math.round(p.importPrice * 1.02); // 102% theo QĐ3
    const existingPricing = await prisma.pricing.findFirst({ where: { skuId: sku.id } });
    if (!existingPricing) {
      await prisma.pricing.create({
        data: {
          skuId: sku.id,
          importPrice: p.importPrice,
          exportPrice,
        },
      });
    }
  }

  // 5. Seed Users
  console.log('Seeding System Users (Roles: Admin, Accountant, Sales, Warehouse)...');
  const defaultPassword = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@agenthub.vn' },
    update: { fullName: 'Hệ Thống Admin', role: 'ADMIN' },
    create: {
      email: 'admin@agenthub.vn',
      passwordHash: defaultPassword,
      fullName: 'Hệ Thống Admin',
      role: 'ADMIN',
    },
  });

  const accountantUser = await prisma.user.upsert({
    where: { email: 'accountant@agenthub.vn' },
    update: { fullName: 'Kế Toán Trưởng', role: 'ACCOUNTANT' },
    create: {
      email: 'accountant@agenthub.vn',
      passwordHash: defaultPassword,
      fullName: 'Kế Toán Trưởng',
      role: 'ACCOUNTANT',
    },
  });

  await prisma.user.upsert({
    where: { email: 'sales@agenthub.vn' },
    update: { fullName: 'Nhân Viên Kinh Doanh', role: 'SALES' },
    create: {
      email: 'sales@agenthub.vn',
      passwordHash: defaultPassword,
      fullName: 'Nhân Viên Kinh Doanh',
      role: 'SALES',
    },
  });

  await prisma.user.upsert({
    where: { email: 'warehouse@agenthub.vn' },
    update: { fullName: 'Thủ Kho', role: 'WAREHOUSE' },
    create: {
      email: 'warehouse@agenthub.vn',
      passwordHash: defaultPassword,
      fullName: 'Thủ Kho',
      role: 'WAREHOUSE',
    },
  });

  // 6. Seed Sample Dealers (BM1)
  console.log('Seeding Sample Dealers & Accounts (BM1, BM4)...');
  const district1 = await prisma.district.findUnique({ where: { code: 'Q01' } });
  const district2 = await prisma.district.findUnique({ where: { code: 'Q02' } });
  const district3 = await prisma.district.findUnique({ where: { code: 'Q03' } });

  const dealerA = await prisma.dealer.upsert({
    where: { code: 'DL-001' },
    update: {
      name: 'Đại Lý Ánh Dương',
      phone: '0901234567',
      address: '123 Lê Lợi, Bến Nghé',
      email: 'anhduong@daily.vn',
      districtId: district1!.id,
      tierId: tier1.id,
      currentDebt: 4500000,
    },
    create: {
      code: 'DL-001',
      name: 'Đại Lý Ánh Dương',
      phone: '0901234567',
      address: '123 Lê Lợi, Bến Nghé',
      email: 'anhduong@daily.vn',
      districtId: district1!.id,
      tierId: tier1.id,
      currentDebt: 4500000,
      receivedDate: new Date('2026-01-15'),
    },
  });

  const dealerB = await prisma.dealer.upsert({
    where: { code: 'DL-002' },
    update: {
      name: 'Đại Lý Bình Minh',
      phone: '0907654321',
      address: '45 Trần Não, An Phú',
      email: 'binhminh@daily.vn',
      districtId: district2!.id,
      tierId: tier2.id,
      currentDebt: 2000000,
    },
    create: {
      code: 'DL-002',
      name: 'Đại Lý Bình Minh',
      phone: '0907654321',
      address: '45 Trần Não, An Phú',
      email: 'binhminh@daily.vn',
      districtId: district2!.id,
      tierId: tier2.id,
      currentDebt: 2000000,
      receivedDate: new Date('2026-02-10'),
    },
  });

  const dealerC = await prisma.dealer.upsert({
    where: { code: 'DL-003' },
    update: {
      name: 'Đại Lý Cẩm Tú',
      phone: '0918889999',
      address: '78 Nguyễn Đình Chiểu',
      email: 'camtu@daily.vn',
      districtId: district3!.id,
      tierId: tier1.id,
      currentDebt: 0,
    },
    create: {
      code: 'DL-003',
      name: 'Đại Lý Cẩm Tú',
      phone: '0918889999',
      address: '78 Nguyễn Đình Chiểu',
      email: 'camtu@daily.vn',
      districtId: district3!.id,
      tierId: tier1.id,
      currentDebt: 0,
      receivedDate: new Date('2026-03-01'),
    },
  });

  // Dealer User login account
  await prisma.user.upsert({
    where: { email: 'dealer1@agenthub.vn' },
    update: { fullName: 'Đại Diện Ánh Dương', role: 'DEALER', dealerId: dealerA.id },
    create: {
      email: 'dealer1@agenthub.vn',
      passwordHash: defaultPassword,
      fullName: 'Đại Diện Ánh Dương',
      role: 'DEALER',
      dealerId: dealerA.id,
    },
  });

  // 7. Seed Sample Invoices & DebtLedger for Financial Reports (BM6.1 & BM6.2)
  console.log('Seeding Sample Financial Transactions (Invoices, Payments, DebtLedger)...');

  // Clean existing transactions for clean deterministic demo state
  await prisma.paymentInvoiceAllocation.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.debtLedger.deleteMany({});
  await prisma.invoice.deleteMany({});

  // Month 9/2026 Transactions
  // Invoice 1 for Dealer A (3,000,000 VND) on Sep 5
  const inv1 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'HD-20260905-0001',
      dealerId: dealerA.id,
      totalAmount: 3000000,
      paidAmount: 0,
      remainingAmount: 3000000,
      status: 'UNPAID',
      issueDate: new Date('2026-09-05T08:30:00Z'),
      notes: 'Phiếu xuất hàng đợt 1 tháng 9',
    },
  });

  await prisma.debtLedger.create({
    data: {
      dealerId: dealerA.id,
      transactionType: 'INVOICE',
      referenceType: 'INVOICE',
      referenceId: inv1.id,
      referenceCode: inv1.invoiceNumber,
      debitAmount: 3000000,
      creditAmount: 0,
      previousBalance: 0,
      currentBalance: 3000000,
      notes: 'Phát sinh công nợ từ hóa đơn HD-20260905-0001',
      createdAt: new Date('2026-09-05T08:30:00Z'),
    },
  });

  // Invoice 2 for Dealer A (2,500,000 VND) on Sep 15
  const inv2 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'HD-20260915-0002',
      dealerId: dealerA.id,
      totalAmount: 2500000,
      paidAmount: 0,
      remainingAmount: 2500000,
      status: 'UNPAID',
      issueDate: new Date('2026-09-15T10:00:00Z'),
      notes: 'Phiếu xuất hàng đợt 2 tháng 9',
    },
  });

  await prisma.debtLedger.create({
    data: {
      dealerId: dealerA.id,
      transactionType: 'INVOICE',
      referenceType: 'INVOICE',
      referenceId: inv2.id,
      referenceCode: inv2.invoiceNumber,
      debitAmount: 2500000,
      creditAmount: 0,
      previousBalance: 3000000,
      currentBalance: 5500000,
      notes: 'Phát sinh công nợ từ hóa đơn HD-20260915-0002',
      createdAt: new Date('2026-09-15T10:00:00Z'),
    },
  });

  // Payment 1 from Dealer A (1,000,000 VND) on Sep 20
  const pay1 = await prisma.payment.create({
    data: {
      receiptNumber: 'PT-20260920-0001',
      dealerId: dealerA.id,
      amount: 1000000,
      paymentDate: new Date('2026-09-20T14:00:00Z'),
      paymentMethod: 'BANK_TRANSFER',
      notes: 'Thu tiền khách chuyển khoản qua Vietcombank',
      collectorId: accountantUser.id,
    },
  });

  await prisma.invoice.update({
    where: { id: inv1.id },
    data: {
      paidAmount: 1000000,
      remainingAmount: 2000000,
      status: 'PARTIALLY_PAID',
    },
  });

  await prisma.paymentInvoiceAllocation.create({
    data: {
      paymentId: pay1.id,
      invoiceId: inv1.id,
      amount: 1000000,
    },
  });

  await prisma.debtLedger.create({
    data: {
      dealerId: dealerA.id,
      transactionType: 'PAYMENT',
      referenceType: 'PAYMENT',
      referenceId: pay1.id,
      referenceCode: pay1.receiptNumber,
      debitAmount: 0,
      creditAmount: 1000000,
      previousBalance: 5500000,
      currentBalance: 4500000,
      notes: 'Thu tiền theo phiếu thu PT-20260920-0001',
      createdAt: new Date('2026-09-20T14:00:00Z'),
    },
  });

  // Update dealer A currentDebt to 4,500,000
  await prisma.dealer.update({
    where: { id: dealerA.id },
    data: { currentDebt: 4500000 },
  });

  // Invoice for Dealer B (2,000,000 VND) on Sep 18
  const inv3 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'HD-20260918-0003',
      dealerId: dealerB.id,
      totalAmount: 2000000,
      paidAmount: 0,
      remainingAmount: 2000000,
      status: 'UNPAID',
      issueDate: new Date('2026-09-18T09:15:00Z'),
      notes: 'Phiếu xuất hàng đợt 1',
    },
  });

  await prisma.debtLedger.create({
    data: {
      dealerId: dealerB.id,
      transactionType: 'INVOICE',
      referenceType: 'INVOICE',
      referenceId: inv3.id,
      referenceCode: inv3.invoiceNumber,
      debitAmount: 2000000,
      creditAmount: 0,
      previousBalance: 0,
      currentBalance: 2000000,
      notes: 'Phát sinh công nợ từ hóa đơn HD-20260918-0003',
      createdAt: new Date('2026-09-18T09:15:00Z'),
    },
  });

  await prisma.dealer.update({
    where: { id: dealerB.id },
    data: { currentDebt: 2000000 },
  });

  console.log('✅ Database Seed completed successfully!');
  console.log('----------------------------------------------------');
  console.log('Demo Accounts for Testing:');
  console.log('  👑 Admin:       admin@agenthub.vn       / password123');
  console.log('  💼 Accountant:  accountant@agenthub.vn  / password123');
  console.log('  📈 Sales:       sales@agenthub.vn       / password123');
  console.log('  📦 Warehouse:   warehouse@agenthub.vn   / password123');
  console.log('  🏪 Dealer User: dealer1@agenthub.vn     / password123');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

