import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service.js';

export class AuditController {
  public static async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, entity, action, startDate, endDate, page, limit } = req.query;

      const result = await AuditService.getLogs({
        userId: userId ? String(userId) : undefined,
        entity: entity ? String(entity) : undefined,
        action: action ? String(action) : undefined,
        startDate: startDate ? new Date(String(startDate)) : undefined,
        endDate: endDate ? new Date(String(endDate)) : undefined,
        page: page ? parseInt(String(page), 10) : 1,
        limit: limit ? parseInt(String(limit), 10) : 20,
      });

      res.json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
}

