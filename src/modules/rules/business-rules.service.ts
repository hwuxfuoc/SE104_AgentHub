import prisma from '../../config/prisma.js';
import { BusinessRuleCodes } from '../../config/constants.js';
import { AuditService } from '../audit/audit.service.js';
import { AppError, NotFoundError } from '../../middleware/error.middleware.js';

export interface QD1Config {
  maxDealerTypes: number;
  totalDistricts: number;
  maxDealersPerDistrict: number;
}

export interface QD2Config {
  maxProductCount: number;
  maxUnitCount: number;
}

export interface QD3Config {
  tierDebtLimits: Record<string, number>; // e.g. { "Loại 1": 10000000, "Loại 2": 5000000 }
  exportPriceRatio: number; // e.g. 1.02 for 102%
}

export interface QD5Config {
  strictPaymentLessThanDebt: boolean; // default true
}

export class BusinessRulesService {
  private static cache: Map<string, { value: any; expiresAt: number }> = new Map();
  private static CACHE_TTL_MS = 60 * 1000; // 1 minute

  public static async getRuleConfig<T>(ruleCode: string): Promise<T> {
    const cached = this.cache.get(ruleCode);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    const rule = await prisma.businessRule.findUnique({
      where: { code: ruleCode },
    });

    if (!rule) {
      // Return sensible defaults if database record does not exist yet
      const defaultConfig = this.getDefaultConfig(ruleCode);
      return defaultConfig as T;
    }

    try {
      const parsed = JSON.parse(rule.value) as T;
      this.cache.set(ruleCode, { value: parsed, expiresAt: Date.now() + this.CACHE_TTL_MS });
      return parsed;
    } catch {
      return this.getDefaultConfig(ruleCode) as T;
    }
  }

  public static async updateRuleConfig(
    ruleCode: string,
    newValue: any,
    userId: string,
    changeReason?: string
  ) {
    const rule = await prisma.businessRule.findUnique({
      where: { code: ruleCode },
    });

    if (!rule) {
      throw new NotFoundError(`Business rule ${ruleCode}`);
    }

    const oldValue = rule.value;
    const newValueStr = JSON.stringify(newValue);

    const updated = await prisma.$transaction(async (tx) => {
      const updatedRule = await tx.businessRule.update({
        where: { code: ruleCode },
        data: {
          value: newValueStr,
        },
      });

      await tx.businessRuleHistory.create({
        data: {
          ruleId: rule.id,
          changedById: userId,
          oldValue,
          newValue: newValueStr,
          changeReason: changeReason || 'Cập nhật theo QĐ7',
        },
      });

      return updatedRule;
    });

    // Invalidate cache
    this.cache.delete(ruleCode);

    // Audit log
    await AuditService.log({
      userId,
      action: 'UPDATE_BUSINESS_RULE',
      entity: 'BUSINESS_RULE',
      entityId: rule.id,
      details: {
        ruleCode,
        oldValue: JSON.parse(oldValue),
        newValue,
        changeReason,
      },
    });

    return updated;
  }

  public static async getAllRules() {
    const rules = await prisma.businessRule.findMany({
      include: {
        histories: {
          orderBy: { changedAt: 'desc' },
          take: 5,
          include: {
            changedBy: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    return rules.map((r) => ({
      ...r,
      value: this.safeParse(r.value),
      histories: r.histories.map((h) => ({
        ...h,
        oldValue: this.safeParse(h.oldValue),
        newValue: this.safeParse(h.newValue),
      })),
    }));
  }

  public static async getQD3DebtLimit(tierName: string): Promise<number> {
    const config = await this.getRuleConfig<QD3Config>(BusinessRuleCodes.QD3);
    if (config.tierDebtLimits && config.tierDebtLimits[tierName] !== undefined) {
      return config.tierDebtLimits[tierName];
    }
    // Default fallback
    if (tierName.toLowerCase().includes('1')) return 10_000_000;
    if (tierName.toLowerCase().includes('2')) return 5_000_000;
    return 10_000_000;
  }

  public static async getQD3ExportRatio(): Promise<number> {
    const config = await this.getRuleConfig<QD3Config>(BusinessRuleCodes.QD3);
    return config.exportPriceRatio ?? 1.02;
  }

  public static getDefaultConfig(ruleCode: string): any {
    switch (ruleCode) {
      case BusinessRuleCodes.QD1:
        return {
          maxDealerTypes: 2,
          totalDistricts: 20,
          maxDealersPerDistrict: 4,
        };
      case BusinessRuleCodes.QD2:
        return {
          maxProductCount: 5,
          maxUnitCount: 3,
        };
      case BusinessRuleCodes.QD3:
        return {
          tierDebtLimits: {
            'Loại 1': 10000000,
            'Loại 2': 5000000,
          },
          exportPriceRatio: 1.02,
        };
      case BusinessRuleCodes.QD5:
        return {
          strictPaymentLessThanDebt: true,
        };
      default:
        return {};
    }
  }

  private static safeParse(str: string) {
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  }
}

