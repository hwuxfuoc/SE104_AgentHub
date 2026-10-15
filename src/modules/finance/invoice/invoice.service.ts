import prisma from '../../../config/prisma.js';
import { CreateInvoiceInput, QueryInvoiceInput } from './invoice.schema.js';
import { BusinessRuleViolationError, NotFoundError, ValidationError } from '../../../middleware/error.middleware.js';
import { DebtTransactionType, InvoiceStatus } from '../../../config/constants.js';
import { BusinessRulesService } from '../../rules/business-rules.service.js';
import { AuditService } from '../../audit/audit.service.js';

export class InvoiceService {
  /**
   * Tạo hóa đơn / Phiếu xuất phát sinh công nợ (BM3 -> Invoice)
   * Kiểm tra hạn mức công nợ theo QĐ3 trước khi ghi nhận nợ
   */
  public static async createInvoice(data: CreateInvoiceInput, createdById?: string | null) {
    const dealer = await prisma.dealer.findUnique({
      where: { id: data.dealerId },
      include: {
        tier: true,
      },
    });

    if (!dealer) {
      throw new NotFoundError('Đại lý', data.dealerId);
    }

    if (dealer.status !== 'ACTIVE') {
      throw new ValidationError(`Đại lý đang ở trạng thái ${dealer.status}, không thể phát sinh hóa đơn mới.`);
    }

    // Kiểm tra quy định QĐ3: Hạn mức nợ tối đa
    const maxDebtAllowed = await BusinessRulesService.getQD3DebtLimit(dealer.tier.name);
    const expectedDebtAfterInvoice = dealer.currentDebt + data.totalAmount;

    if (expectedDebtAfterInvoice > maxDebtAllowed) {
      throw new BusinessRuleViolationError(
        'QD3',
        `Đơn hàng/Hóa đơn trị giá ${data.totalAmount.toLocaleString('vi-VN')} đ sẽ làm nợ đại lý (${expectedDebtAfterInvoice.toLocaleString('vi-VN')} đ) vượt quá hạn mức nợ cho phép (${maxDebtAllowed.toLocaleString('vi-VN')} đ của ${dealer.tier.name}).`,
        {
          dealerId: dealer.id,
          tierName: dealer.tier.name,
          currentDebt: dealer.currentDebt,
          invoiceAmount: data.totalAmount,
          expectedDebt: expectedDebtAfterInvoice,
          maxDebtAllowed,
          excessAmount: expectedDebtAfterInvoice - maxDebtAllowed,
        }
      );
    }

    // Thực hiện trong Database Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Re-verify inside tx
      const freshDealer = await tx.dealer.findUnique({
        where: { id: data.dealerId },
        include: { tier: true },
      });

      if (!freshDealer) throw new NotFoundError('Đại lý', data.dealerId);

      const freshExpectedDebt = freshDealer.currentDebt + data.totalAmount;
      if (freshExpectedDebt > maxDebtAllowed) {
        throw new BusinessRuleViolationError(
          'QD3',
          `Vượt hạn mức nợ cho phép trong giao dịch đồng thời.`,
          { currentDebt: freshDealer.currentDebt, invoiceAmount: data.totalAmount, maxDebtAllowed }
        );
      }

      const invoiceNumber = data.invoiceNumber || (await this.generateInvoiceNumber(tx));
      const issueDate = data.issueDate ? new Date(data.issueDate) : new Date();
      const dueDate = data.dueDate ? new Date(data.dueDate) : new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days default

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          salesOrderId: data.salesOrderId || null,
          dealerId: data.dealerId,
          totalAmount: data.totalAmount,
          paidAmount: 0,
          remainingAmount: data.totalAmount,
          status: InvoiceStatus.UNPAID,
          issueDate,
          dueDate,
          notes: data.notes || `Hóa đơn xuất hàng ${invoiceNumber}`,
        },
      });

      const previousBalance = freshDealer.currentDebt;
      const currentBalance = previousBalance + data.totalAmount;

      await tx.dealer.update({
        where: { id: data.dealerId },
        data: { currentDebt: currentBalance },
      });

      const ledgerEntry = await tx.debtLedger.create({
        data: {
          dealerId: data.dealerId,
          transactionType: DebtTransactionType.INVOICE,
          referenceType: 'INVOICE',
          referenceId: invoice.id,
          referenceCode: invoiceNumber,
          debitAmount: data.totalAmount,
          creditAmount: 0,
          previousBalance,
          currentBalance,
          notes: data.notes || `Phát sinh công nợ từ hóa đơn ${invoiceNumber}`,
          createdAt: issueDate,
        },
      });

      return {
        invoice,
        previousDebt: previousBalance,
        currentDebt: currentBalance,
        ledgerEntry,
      };
    });

    await AuditService.log({
      userId: createdById,
      action: 'ISSUE_INVOICE',
      entity: 'INVOICE',
      entityId: result.invoice.id,
      details: {
        invoiceNumber: result.invoice.invoiceNumber,
        dealerId: data.dealerId,
        totalAmount: data.totalAmount,
        previousDebt: result.previousDebt,
        currentDebt: result.currentDebt,
      },
    });

    return result;
  }

  public static async getInvoices(query: QueryInvoiceInput) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.dealerId) where.dealerId = query.dealerId;
    if (query.salesOrderId) where.salesOrderId = query.salesOrderId;
    if (query.status) where.status = query.status;
    if (query.startDate || query.endDate) {
      where.issueDate = {};
      if (query.startDate) where.issueDate.gte = new Date(query.startDate);
      if (query.endDate) where.issueDate.lte = new Date(query.endDate);
    }

    const [total, items] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { issueDate: 'desc' },
        include: {
          dealer: {
            select: {
              id: true,
              code: true,
              name: true,
              phone: true,
              address: true,
              district: { select: { name: true } },
              tier: { select: { name: true } },
            },
          },
          salesOrder: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
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

  public static async getInvoiceById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        dealer: {
          include: {
            district: true,
            tier: true,
          },
        },
        salesOrder: {
          include: {
            items: {
              include: { sku: { include: { product: true } } },
            },
          },
        },
        allocations: {
          include: {
            payment: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundError('Hóa đơn', id);
    }

    return invoice;
  }

  private static async generateInvoiceNumber(tx: any): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `HD-${dateStr}-`;

    const count = await tx.invoice.count({
      where: {
        invoiceNumber: { startsWith: prefix },
      },
    });

    const sequence = (count + 1).toString().padStart(4, '0');
    return `${prefix}${sequence}`;
  }
}

