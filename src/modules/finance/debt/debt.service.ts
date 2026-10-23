import prisma from '../../../config/prisma.js';
import { NotFoundError, BusinessRuleViolationError, ValidationError } from '../../../middleware/error.middleware.js';
import { BusinessRulesService } from '../../rules/business-rules.service.js';
import { DebtTransactionType } from '../../../config/constants.js';
import { AuditService } from '../../audit/audit.service.js';

export class DebtService {
  /**
   * Lấy tổng quan công nợ của đại lý
   */
  public static async getDealerDebtSummary(dealerId: string) {
    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId },
      include: {
        district: true,
        tier: true,
      },
    });

    if (!dealer) {
      throw new NotFoundError('Đại lý', dealerId);
    }

    const maxDebtAllowed = await BusinessRulesService.getQD3DebtLimit(dealer.tier.name);
    const remainingCredit = Math.max(0, maxDebtAllowed - dealer.currentDebt);

    // Lấy thông tin thanh toán gần nhất & hóa đơn gần nhất
    const [lastPayment, lastInvoice, recentLedgerEntries] = await Promise.all([
      prisma.payment.findFirst({
        where: { dealerId },
        orderBy: { paymentDate: 'desc' },
      }),
      prisma.invoice.findFirst({
        where: { dealerId },
        orderBy: { issueDate: 'desc' },
      }),
      prisma.debtLedger.findMany({
        where: { dealerId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      dealer: {
        id: dealer.id,
        code: dealer.code,
        name: dealer.name,
        phone: dealer.phone,
        address: dealer.address,
        email: dealer.email,
        district: dealer.district.name,
        tier: dealer.tier.name,
        status: dealer.status,
      },
      currentDebt: dealer.currentDebt,
      maxDebtAllowed,
      remainingCredit,
      isDebtExceeded: dealer.currentDebt > maxDebtAllowed,
      lastPaymentDate: lastPayment ? lastPayment.paymentDate : null,
      lastPaymentAmount: lastPayment ? lastPayment.amount : null,
      lastInvoiceDate: lastInvoice ? lastInvoice.issueDate : null,
      lastInvoiceAmount: lastInvoice ? lastInvoice.totalAmount : null,
      recentTransactions: recentLedgerEntries,
    };
  }

  /**
   * Lấy lịch sử biến động sổ cái công nợ (DebtLedger) của đại lý
   */
  public static async getDealerLedger(dealerId: string, query: {
    startDate?: string;
    endDate?: string;
    transactionType?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { dealerId };
    if (query.transactionType) where.transactionType = query.transactionType;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [total, items] = await Promise.all([
      prisma.debtLedger.count({ where }),
      prisma.debtLedger.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Danh sách công nợ tất cả đại lý (Hỗ trợ tra cứu BM4)
   */
  public static async getAllDealersDebt(query: {
    districtId?: string;
    tierId?: string;
    hasDebt?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.districtId) where.districtId = query.districtId;
    if (query.tierId) where.tierId = query.tierId;
    if (query.hasDebt === true) where.currentDebt = { gt: 0 };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { code: { contains: query.search } },
        { phone: { contains: query.search } },
      ];
    }

    const [total, dealers] = await Promise.all([
      prisma.dealer.count({ where }),
      prisma.dealer.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ currentDebt: 'desc' }, { name: 'asc' }],
        include: {
          district: true,
          tier: true,
        },
      }),
    ]);

    const items = await Promise.all(
      dealers.map(async (d, index) => {
        const maxDebt = await BusinessRulesService.getQD3DebtLimit(d.tier.name);
        return {
          stt: skip + index + 1,
          id: d.id,
          code: d.code,
          name: d.name,
          tier: d.tier.name,
          district: d.district.name,
          currentDebt: d.currentDebt,
          maxDebtAllowed: maxDebt,
          status: d.status,
        };
      })
    );

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Điều chỉnh công nợ thủ công (Chỉ dành cho Admin trong trường hợp điều chỉnh kế toán)
   */
  public static async adjustDealerDebt(
    dealerId: string,
    params: {
      adjustmentAmount: number; // Dương: tăng nợ, Âm: giảm nợ
      reason: string;
    },
    adminUserId: string
  ) {
    if (params.adjustmentAmount === 0) {
      throw new ValidationError('Số tiền điều chỉnh phải khác 0');
    }
    if (!params.reason) {
      throw new ValidationError('Bắt buộc phải có lý do điều chỉnh công nợ');
    }

    const result = await prisma.$transaction(async (tx) => {
      const dealer = await tx.dealer.findUnique({
        where: { id: dealerId },
      });

      if (!dealer) throw new NotFoundError('Đại lý', dealerId);

      const previousBalance = dealer.currentDebt;
      const currentBalance = previousBalance + params.adjustmentAmount;

      if (currentBalance < 0) {
        throw new BusinessRuleViolationError('DEBT_NEGATIVE', 'Công nợ sau điều chỉnh không thể nhỏ hơn 0.');
      }

      const isDebit = params.adjustmentAmount > 0;
      const debitAmount = isDebit ? params.adjustmentAmount : 0;
      const creditAmount = isDebit ? 0 : Math.abs(params.adjustmentAmount);

      await tx.dealer.update({
        where: { id: dealerId },
        data: { currentDebt: currentBalance },
      });

      const ledgerEntry = await tx.debtLedger.create({
        data: {
          dealerId,
          transactionType: DebtTransactionType.ADJUSTMENT,
          referenceType: 'MANUAL_ADJUSTMENT',
          debitAmount,
          creditAmount,
          previousBalance,
          currentBalance,
          notes: `Điều chỉnh thủ công: ${params.reason}`,
        },
      });

      return {
        dealerId,
        previousDebt: previousBalance,
        currentDebt: currentBalance,
        adjustmentAmount: params.adjustmentAmount,
        ledgerEntry,
      };
    });

    await AuditService.log({
      userId: adminUserId,
      action: 'ADJUST_DEBT_MANUAL',
      entity: 'DEBT',
      entityId: dealerId,
      details: {
        dealerId,
        adjustmentAmount: params.adjustmentAmount,
        reason: params.reason,
        previousDebt: result.previousDebt,
        currentDebt: result.currentDebt,
      },
    });

    return result;
  }
}

