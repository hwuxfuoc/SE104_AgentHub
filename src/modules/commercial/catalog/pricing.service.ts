import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../config/prisma.js';
import { AppError, BusinessRuleViolationError, NotFoundError } from '../../../middleware/error.middleware.js';
import { BusinessRulesService } from '../../rules/business-rules.service.js';

const ratioSchema = z.object({ exportPriceRatio: z.number().finite().positive() });
export const activeAt = (at: Date) => ({
  effectiveFrom: { lte: at }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
});
export async function revisePrice(skuId: string, importPrice: number, currentId?: string) {
  return prisma.$transaction(async (tx) => {
    const sku = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql(['SELECT "id" FROM "Sku" WHERE "id" = ', ' FOR UPDATE'], skuId),
    );
    if (sku.length === 0) throw new NotFoundError('SKU', skuId);
    const rule = await tx.businessRule.findUnique({ where: { code: 'QD3' } });
    let config: unknown;
    try { config = rule ? JSON.parse(rule.value) : BusinessRulesService.getDefaultConfig('QD3'); }
    catch { throw new AppError('Cấu hình QĐ3 không hợp lệ', 500, 'INVALID_QD3_CONFIG'); }
    const ratio = ratioSchema.safeParse(config);
    if (!ratio.success) throw new AppError('Cấu hình QĐ3 không hợp lệ', 500, 'INVALID_QD3_CONFIG');
    const exportPrice = Number(new Prisma.Decimal(importPrice)
      .times(ratio.data.exportPriceRatio).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP));
    if (!Number.isSafeInteger(exportPrice) || exportPrice < 1 || exportPrice > 2_147_483_647) {
      throw new BusinessRuleViolationError('QD3', 'Đơn giá xuất sau khi làm tròn ngoài khoảng cho phép');
    }
    const latest = await tx.pricing.findFirst({
      where: { skuId }, orderBy: [{ effectiveFrom: 'desc' }, { id: 'desc' }],
    });
    if (currentId && latest?.id !== currentId) {
      throw new AppError('Phiên bản giá đã thay đổi', 409, 'PRICE_VERSION_CONFLICT');
    }
    const now = new Date(Math.max(Date.now(), (latest?.effectiveFrom.getTime() ?? 0) + 1));
    await tx.pricing.updateMany({
      where: { skuId, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
      data: { effectiveTo: now },
    });
    return tx.pricing.create({ data: { skuId, importPrice, exportPrice, effectiveFrom: now } });
  });
}
// P4 can pass its order transaction to resolve the version used for that order.
export async function getEffectivePrice(
  skuId: string,
  at = new Date(),
  db: Prisma.TransactionClient = prisma,
) {
  const price = await db.pricing.findFirst({
    where: { skuId, ...activeAt(at) },
    orderBy: [{ effectiveFrom: 'desc' }, { id: 'desc' }],
  });
  if (!price) throw new NotFoundError('Effective price for SKU', skuId);
  return price;
}
