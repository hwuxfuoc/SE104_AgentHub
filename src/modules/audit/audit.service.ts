import prisma from '../../config/prisma.js';

export interface CreateAuditLogParams {
  userId?: string | null;
  userRole?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, any> | string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditService {
  public static async log(params: CreateAuditLogParams) {
    try {
      const detailsStr = typeof params.details === 'object' && params.details !== null
        ? JSON.stringify(params.details)
        : params.details;

      return await prisma.auditLog.create({
        data: {
          userId: params.userId || null,
          userRole: params.userRole || null,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId || null,
          details: detailsStr || null,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch (error) {
      console.error('[AuditService Error]: Failed to create audit log', error);
      // Fail-safe: don't break the main business transaction if logging fails
      return null;
    }
  }

  public static async getLogs(query: {
    userId?: string;
    entity?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.userId) where.userId = query.userId;
    if (query.entity) where.entity = query.entity;
    if (query.action) where.action = query.action;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = query.startDate;
      if (query.endDate) where.createdAt.lte = query.endDate;
    }

    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      items: items.map((log) => ({
        ...log,
        details: log.details ? (this.safeParseJson(log.details)) : null,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private static safeParseJson(str: string) {
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  }
}

