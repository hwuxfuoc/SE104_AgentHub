import prisma from '../../config/prisma.js';
import { InvoiceService } from '../finance/invoice/invoice.service.js';
import { CreditService, CreditCheckResult } from '../finance/credit/credit.service.js';
import { NotFoundError, ValidationError } from '../../middleware/error.middleware.js';
import { DebtTransactionType } from '../../config/constants.js';
import { AuditService } from '../audit/audit.service.js';

export class OrderIntegrationService {
  /**
   * P4 Integration Point: Kiểm tra hạn mức nợ trước khi duyệt đơn hàng (SalesOrder approval)
   */
  public static async verifyOrderCreditBeforeApproval(salesOrderId: string): Promise<CreditCheckResult> {
    const order = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
    });

    if (!order) {
      throw new NotFoundError('Đơn hàng', salesOrderId);
    }

    return await CreditService.checkCreditLimit(order.dealerId, order.totalAmount);
  }

  /**
   * P4 Integration Point: Giao hàng thành công -> Tự động sinh Hóa đơn & ghi nhận tăng công nợ
   */
  public static async processShipmentDeliveryToInvoice(params: {
    salesOrderId: string;
    invoiceNumber?: string;
    notes?: string;
    userId?: string;
  }) {
    const order = await prisma.salesOrder.findUnique({
      where: { id: params.salesOrderId },
      include: {
        dealer: true,
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundError('Đơn hàng', params.salesOrderId);
    }

    // Check if invoice already created for this order
    const existingInvoice = await prisma.invoice.findFirst({
      where: { salesOrderId: params.salesOrderId },
    });

    if (existingInvoice) {
      return {
        alreadyExists: true,
        invoice: existingInvoice,
      };
    }

    // Create invoice via InvoiceService to trigger QD3 validation & debt ledger entry
    const result = await InvoiceService.createInvoice(
      {
        dealerId: order.dealerId,
        salesOrderId: order.id,
        totalAmount: order.totalAmount,
        invoiceNumber: params.invoiceNumber,
        notes: params.notes || `Xuất hóa đơn tự động từ đơn hàng ${order.orderNumber}`,
      },
      params.userId
    );

    return {
      alreadyExists: false,
      ...result,
    };
  }

  /**
   * P4 Integration Point: Xử lý trả hàng (Return) -> Giảm công nợ đại lý
   */
  public static async processOrderReturnRefund(params: {
    dealerId: string;
    salesOrderId?: string;
    returnAmount: number;
    reason: string;
    userId?: string;
  }) {
    if (params.returnAmount <= 0) {
      throw new ValidationError('Số tiền hoàn trả phải lớn hơn 0');
    }

    const result = await prisma.$transaction(async (tx) => {
      const dealer = await tx.dealer.findUnique({
        where: { id: params.dealerId },
      });

      if (!dealer) throw new NotFoundError('Đại lý', params.dealerId);

      const previousBalance = dealer.currentDebt;
      const currentBalance = Math.max(0, previousBalance - params.returnAmount);

      await tx.dealer.update({
        where: { id: params.dealerId },
        data: { currentDebt: currentBalance },
      });

      const ledgerEntry = await tx.debtLedger.create({
        data: {
          dealerId: params.dealerId,
          transactionType: DebtTransactionType.RETURN,
          referenceType: 'RETURN',
          referenceId: params.salesOrderId || null,
          debitAmount: 0,
          creditAmount: params.returnAmount,
          previousBalance,
          currentBalance,
          notes: `Trả hàng hoàn tiền: ${params.reason}`,
        },
      });

      return {
        dealerId: params.dealerId,
        previousDebt: previousBalance,
        currentDebt: currentBalance,
        refundAmount: params.returnAmount,
        ledgerEntry,
      };
    });

    await AuditService.log({
      userId: params.userId,
      action: 'PROCESS_RETURN_REFUND',
      entity: 'RETURN',
      entityId: params.salesOrderId,
      details: params,
    });

    return result;
  }
}

