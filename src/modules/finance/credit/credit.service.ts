import prisma from '../../../config/prisma.js';
import { NotFoundError } from '../../../middleware/error.middleware.js';
import { BusinessRulesService } from '../../rules/business-rules.service.js';

export interface CreditCheckResult {
  allowed: boolean;
  dealerId: string;
  dealerName: string;
  tierName: string;
  currentDebt: number;
  orderAmount: number;
  expectedDebt: number;
  maxDebtAllowed: number;
  remainingCredit: number;
  reason?: string;
}

export class CreditService {
  /**
   * Kiểm tra hạn mức công nợ (QĐ3) cho đơn hàng mới hoặc phiếu xuất BM3
   */
  public static async checkCreditLimit(dealerId: string, orderAmount: number): Promise<CreditCheckResult> {
    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId },
      include: { tier: true },
    });

    if (!dealer) {
      throw new NotFoundError('Đại lý', dealerId);
    }

    const maxDebtAllowed = await BusinessRulesService.getQD3DebtLimit(dealer.tier.name);
    const expectedDebt = dealer.currentDebt + orderAmount;
    const remainingCredit = Math.max(0, maxDebtAllowed - dealer.currentDebt);
    const allowed = expectedDebt <= maxDebtAllowed;

    let reason: string | undefined;
    if (!allowed) {
      reason = `Đơn hàng (${orderAmount.toLocaleString('vi-VN')} đ) làm tổng nợ (${expectedDebt.toLocaleString('vi-VN')} đ) vượt hạn mức (${maxDebtAllowed.toLocaleString('vi-VN')} đ) của ${dealer.tier.name}.`;
    }

    return {
      allowed,
      dealerId: dealer.id,
      dealerName: dealer.name,
      tierName: dealer.tier.name,
      currentDebt: dealer.currentDebt,
      orderAmount,
      expectedDebt,
      maxDebtAllowed,
      remainingCredit,
      reason,
    };
  }
}

