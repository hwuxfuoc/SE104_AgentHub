import prisma from '../../../config/prisma.js';
import { CreatePaymentInput, QueryPaymentInput } from './payment.schema.js';
import { BusinessRuleViolationError, NotFoundError, ValidationError } from '../../../middleware/error.middleware.js';
import { DebtTransactionType, InvoiceStatus } from '../../../config/constants.js';
import { AuditService } from '../../audit/audit.service.js';
import { BusinessRulesService } from '../../rules/business-rules.service.js';

export class PaymentService {
  /**
   * Tạo phiếu thu tiền (BM5) và kiểm tra quy định QĐ5 (Số tiền thu không vượt quá số nợ)
   */
  public static async createPayment(data: CreatePaymentInput, collectorId?: string | null) {
    // 1. Kiểm tra đại lý tồn tại
    const dealer = await prisma.dealer.findUnique({
      where: { id: data.dealerId },
      include: {
        district: true,
        tier: true,
      },
    });

    if (!dealer) {
      throw new NotFoundError('Đại lý', data.dealerId);
    }

    if (dealer.status !== 'ACTIVE') {
      throw new ValidationError(`Đại lý đang ở trạng thái ${dealer.status}, không thể thực hiện giao dịch thu tiền.`);
    }

    // 2. Kiểm tra quy định QĐ5: Số tiền thu không vượt quá số tiền đại lý đang nợ
    if (dealer.currentDebt <= 0) {
      throw new BusinessRuleViolationError(
        'QD5',
        `Đại lý "${dealer.name}" hiện không có công nợ (Nợ hiện tại: 0 đ). Không thể lập phiếu thu.`,
        { dealerId: dealer.id, currentDebt: 0, requestedAmount: data.amount }
      );
    }

    if (data.amount > dealer.currentDebt) {
      throw new BusinessRuleViolationError(
        'QD5',
        `Số tiền thu (${data.amount.toLocaleString('vi-VN')} đ) vượt quá số tiền đại lý đang nợ (${dealer.currentDebt.toLocaleString('vi-VN')} đ) theo quy định QĐ5.`,
        {
          dealerId: dealer.id,
          currentDebt: dealer.currentDebt,
          requestedAmount: data.amount,
          excessAmount: data.amount - dealer.currentDebt,
        }
      );
    }

    // 3. Thực hiện giao dịch nguyên tử trong Database Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Re-fetch dealer inside transaction for isolation
      const freshDealer = await tx.dealer.findUnique({
        where: { id: data.dealerId },
      });

      if (!freshDealer) {
        throw new NotFoundError('Đại lý', data.dealerId);
      }

      if (data.amount > freshDealer.currentDebt) {
        throw new BusinessRuleViolationError(
          'QD5',
          `Số tiền thu vượt quá số tiền nợ hiện tại (${freshDealer.currentDebt.toLocaleString('vi-VN')} đ).`,
          { currentDebt: freshDealer.currentDebt, requestedAmount: data.amount }
        );
      }

      // Sinh mã phiếu thu (PT-YYYYMMDD-XXXX)
      const receiptNumber = data.receiptNumber || (await this.generateReceiptNumber(tx));
      const paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();

      // Tạo bản ghi Payment
      const payment = await tx.payment.create({
        data: {
          receiptNumber,
          dealerId: data.dealerId,
          amount: data.amount,
          paymentDate,
          paymentMethod: data.paymentMethod,
          notes: data.notes || `Thu tiền theo BM5 - Phiếu thu ${receiptNumber}`,
          collectorId: collectorId || null,
        },
      });

      // Phân bổ thanh toán cho các hóa đơn chưa thanh toán theo FIFO (hóa đơn cũ nhất trước)
      const unpaidInvoices = await tx.invoice.findMany({
        where: {
          dealerId: data.dealerId,
          status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID] },
        },
        orderBy: { issueDate: 'asc' },
      });

      let remainingPayment = data.amount;
      const allocations: any[] = [];

      for (const invoice of unpaidInvoices) {
        if (remainingPayment <= 0) break;

        const payableAmount = invoice.remainingAmount;
        const allocationAmount = Math.min(remainingPayment, payableAmount);

        const newPaidAmount = invoice.paidAmount + allocationAmount;
        const newRemainingAmount = invoice.totalAmount - newPaidAmount;
        const newStatus = newRemainingAmount === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

        // Cập nhật hóa đơn
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: newPaidAmount,
            remainingAmount: newRemainingAmount,
            status: newStatus,
          },
        });

        // Tạo bản ghi phân bổ
        const allocation = await tx.paymentInvoiceAllocation.create({
          data: {
            paymentId: payment.id,
            invoiceId: invoice.id,
            amount: allocationAmount,
          },
        });

        allocations.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          allocatedAmount: allocationAmount,
          invoiceRemaining: newRemainingAmount,
          invoiceStatus: newStatus,
        });

        remainingPayment -= allocationAmount;
      }

      // Cập nhật nợ đại lý
      const previousBalance = freshDealer.currentDebt;
      const currentBalance = previousBalance - data.amount;

      const updatedDealer = await tx.dealer.update({
        where: { id: data.dealerId },
        data: {
          currentDebt: currentBalance,
        },
      });

      // Ghi vào sổ cái công nợ (DebtLedger)
      const ledgerEntry = await tx.debtLedger.create({
        data: {
          dealerId: data.dealerId,
          transactionType: DebtTransactionType.PAYMENT,
          referenceType: 'PAYMENT',
          referenceId: payment.id,
          referenceCode: receiptNumber,
          debitAmount: 0,
          creditAmount: data.amount,
          previousBalance,
          currentBalance,
          notes: data.notes || `Thu tiền theo phiếu thu ${receiptNumber}`,
          createdAt: paymentDate,
        },
      });

      return {
        payment,
        allocations,
        previousDebt: previousBalance,
        currentDebt: currentBalance,
        ledgerEntry,
        dealer: {
          id: updatedDealer.id,
          code: updatedDealer.code,
          name: updatedDealer.name,
          phone: updatedDealer.phone,
          address: updatedDealer.address,
          email: updatedDealer.email,
        },
      };
    });

    // 4. Ghi Audit Log ngoài transaction chính
    await AuditService.log({
      userId: collectorId,
      action: 'CREATE_PAYMENT',
      entity: 'PAYMENT',
      entityId: result.payment.id,
      details: {
        receiptNumber: result.payment.receiptNumber,
        dealerId: data.dealerId,
        amount: data.amount,
        previousDebt: result.previousDebt,
        currentDebt: result.currentDebt,
      },
    });

    return result;
  }

  public static async getPayments(query: QueryPaymentInput) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.dealerId) where.dealerId = query.dealerId;
    if (query.startDate || query.endDate) {
      where.paymentDate = {};
      if (query.startDate) where.paymentDate.gte = new Date(query.startDate);
      if (query.endDate) where.paymentDate.lte = new Date(query.endDate);
    }

    const [total, items] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: 'desc' },
        include: {
          dealer: {
            select: {
              id: true,
              code: true,
              name: true,
              phone: true,
              address: true,
              email: true,
              district: { select: { name: true } },
              tier: { select: { name: true } },
            },
          },
          collector: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          allocations: {
            include: {
              invoice: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  totalAmount: true,
                  status: true,
                },
              },
            },
          },
        },
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

  public static async getPaymentById(id: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        dealer: {
          include: {
            district: true,
            tier: true,
          },
        },
        collector: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        allocations: {
          include: {
            invoice: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError('Phiếu thu', id);
    }

    return payment;
  }

  private static async generateReceiptNumber(tx: any): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PT-${dateStr}-`;

    const count = await tx.payment.count({
      where: {
        receiptNumber: { startsWith: prefix },
      },
    });

    const sequence = (count + 1).toString().padStart(4, '0');
    return `${prefix}${sequence}`;
  }
}

