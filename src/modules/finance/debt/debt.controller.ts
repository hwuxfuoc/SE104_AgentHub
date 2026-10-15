import { Request, Response, NextFunction } from 'express';
import { DebtService } from './debt.service.js';

export class DebtController {
  public static async getDealerDebtSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const dealerId = req.params.id;

      if (req.user?.role === 'DEALER' && req.user.dealerId && req.user.dealerId !== dealerId) {
        res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          message: 'Không có quyền xem công nợ của đại lý khác',
        });
        return;
      }

      const summary = await DebtService.getDealerDebtSummary(dealerId);
      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getDealerLedger(req: Request, res: Response, next: NextFunction) {
    try {
      const dealerId = req.params.id;

      if (req.user?.role === 'DEALER' && req.user.dealerId && req.user.dealerId !== dealerId) {
        res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          message: 'Không có quyền xem sổ cái công nợ của đại lý khác',
        });
        return;
      }

      const ledger = await DebtService.getDealerLedger(dealerId, {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        transactionType: req.query.transactionType as string,
        page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
      });

      res.json({
        success: true,
        data: ledger.items,
        pagination: ledger.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getAllDealersDebt(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DebtService.getAllDealersDebt({
        districtId: req.query.districtId as string,
        tierId: req.query.tierId as string,
        hasDebt: req.query.hasDebt === 'true',
        search: req.query.search as string,
        page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
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

  public static async adjustDebt(req: Request, res: Response, next: NextFunction) {
    try {
      const dealerId = req.params.id;
      const { adjustmentAmount, reason } = req.body;
      const adminUserId = req.user!.id;

      const result = await DebtService.adjustDealerDebt(
        dealerId,
        { adjustmentAmount, reason },
        adminUserId
      );

      res.json({
        success: true,
        message: 'Điều chỉnh công nợ thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

