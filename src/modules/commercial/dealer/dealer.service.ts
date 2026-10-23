import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../config/prisma.js';
import { AppError, BusinessRuleViolationError, NotFoundError } from '../../../middleware/error.middleware.js';
import { BusinessRulesService } from '../../rules/business-rules.service.js';
import type { AuthUser } from '../../../middleware/auth.middleware.js';
import type { CreateDealerInput, UpdateDealerInput, DealerQuery } from './dealer.schema.js';

const include = { district: true, tier: true } satisfies Prisma.DealerInclude;
const qd1Schema = z.object({ maxDealersPerDistrict: z.number().int().positive() });

export function assertDealerCapacity(count: number, limit: number) {
  if (count >= limit) {
    throw new BusinessRuleViolationError('QD1', 'Quận đã đạt số đại lý tối đa', { limit });
  }
}

function translateError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('QD1_CAPACITY') || message.includes('QD1_REFERENCE_INACTIVE')) {
    throw new BusinessRuleViolationError('QD1', 'Quận đã đầy hoặc quận/loại đại lý không hoạt động');
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new AppError('Mã đại lý đã tồn tại', 409, 'DEALER_CODE_EXISTS');
    if (error.code === 'P2003') throw new AppError('Quận hoặc loại đại lý không hợp lệ', 422, 'INVALID_REFERENCE');
    if (error.code === 'P2025') throw new NotFoundError('Dealer');
    if (['P1008', 'P2028', 'P2034'].includes(error.code)) {
      throw new AppError('Dữ liệu đang được cập nhật, vui lòng thử lại', 409, 'WRITE_CONFLICT');
    }
  }
  throw error;
}

async function write<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(operation, { maxWait: 5000, timeout: 5000 });
    } catch (error) {
      if (attempt < 2 && error instanceof Prisma.PrismaClientKnownRequestError &&
          ['P1008', 'P2028', 'P2034'].includes(error.code)) {
        await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
        continue;
      }
      translateError(error);
    }
  }
}

async function validateReferences(tx: Prisma.TransactionClient, districtId: string, tierId: string) {
  // Serialize admissions to this district across all backend instances.
  // NO KEY UPDATE remains compatible with the foreign key's KEY SHARE locks.
  await tx.$queryRaw`SELECT "id" FROM "District" WHERE "id" = ${districtId} FOR NO KEY UPDATE`;
  const district = await tx.district.findUnique({ where: { id: districtId } });
  const tier = await tx.dealerTier.findUnique({ where: { id: tierId } });
  if (!district) throw new NotFoundError('District', districtId);
  if (!tier) throw new NotFoundError('DealerTier', tierId);
  if (!district.isActive || !tier.isActive) {
    throw new BusinessRuleViolationError('QD1', 'Quận hoặc loại đại lý đã ngưng hoạt động');
  }
}

async function checkCapacity(tx: Prisma.TransactionClient, districtId: string, excludeId?: string) {
  // Read configuration in the same transaction, bypassing the shared 60-second cache.
  const rule = await tx.businessRule.findUnique({ where: { code: 'QD1' } });
  let config: unknown;
  try {
    config = rule ? JSON.parse(rule.value) : BusinessRulesService.getDefaultConfig('QD1');
  } catch {
    throw new AppError('Cấu hình QĐ1 không hợp lệ', 500, 'INVALID_QD1_CONFIG');
  }
  const parsed = qd1Schema.safeParse(config);
  if (!parsed.success) throw new AppError('Cấu hình QĐ1 không hợp lệ', 500, 'INVALID_QD1_CONFIG');
  const count = await tx.dealer.count({
    where: { districtId, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  assertDealerCapacity(count, parsed.data.maxDealersPerDistrict);
}

async function audit(tx: Prisma.TransactionClient, actor: AuthUser, action: string, id: string) {
  await tx.auditLog.create({
    data: { userId: actor.id, userRole: actor.role, action, entity: 'DEALER', entityId: id },
  });
}

export class DealerService {
  static create(input: CreateDealerInput, actor: AuthUser) {
    return write(async (tx) => {
      await validateReferences(tx, input.districtId, input.tierId);
      await checkCapacity(tx, input.districtId);
      const dealer = await tx.dealer.create({ data: input, include });
      await audit(tx, actor, 'CREATE_DEALER', dealer.id);
      return dealer;
    });
  }

  static update(id: string, input: UpdateDealerInput, actor: AuthUser) {
    return write(async (tx) => {
      const existing = await tx.dealer.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError('Dealer', id);
      if (input.districtId !== undefined || input.tierId !== undefined) {
        await validateReferences(tx, input.districtId ?? existing.districtId, input.tierId ?? existing.tierId);
      }
      // Existing records may still be edited if the configured cap was lowered.
      if (input.districtId !== undefined && input.districtId !== existing.districtId) {
        await checkCapacity(tx, input.districtId, id);
      }
      const dealer = await tx.dealer.update({ where: { id }, data: input, include });
      await audit(tx, actor, 'UPDATE_DEALER', id);
      return dealer;
    });
  }

  static async get(id: string) {
    const dealer = await prisma.dealer.findUnique({ where: { id }, include });
    if (!dealer) throw new NotFoundError('Dealer', id);
    return dealer;
  }

  static async list(query: DealerQuery, ownId?: string) {
    const where: Prisma.DealerWhereInput = {
      id: ownId,
      districtId: query.districtId,
      tierId: query.tierId,
      status: query.status,
      ...(query.search ? { OR: ['name', 'code', 'phone', 'email'].map((key) => ({
        [key]: { contains: query.search },
      })) } : {}),
    };
    const [total, items] = await prisma.$transaction([
      prisma.dealer.count({ where }),
      prisma.dealer.findMany({ where, include, skip: (query.page - 1) * query.limit, take: query.limit,
        orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }] }),
    ]);
    return { items, pagination: { total, page: query.page, limit: query.limit,
      totalPages: Math.ceil(total / query.limit) } };
  }
}
