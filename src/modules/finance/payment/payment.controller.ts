import { Request, Response, NextFunction } from 'express';
import { PaymentService } from './payment.service.js';

export class PaymentController {
  public static async createPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const collectorId = req.user?.id || null;
      const result = await PaymentService.createPayment(req.body, collectorId);

      res.status(201).json({
        success: true,
        message: 'Lập phiếu thu tiền thành công (BM5)',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getPayments(req: Request, res: Response, next: NextFunction) {
    try {
      // If dealer role, only allow querying their own payments
      let dealerId = req.query.dealerId as string | undefined;
      if (req.user?.role === 'DEALER' && req.user.dealerId) {
        dealerId = req.user.dealerId;
      }

      const result = await PaymentService.getPayments({
        dealerId,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
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

  public static async getPaymentById(req: Request, res: Response, next: NextFunction) {
    try {
      const payment = await PaymentService.getPaymentById(req.params.id);

      // If dealer, ensure it belongs to them
      if (req.user?.role === 'DEALER' && req.user.dealerId && payment.dealerId !== req.user.dealerId) {
        res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          message: 'Không có quyền truy cập phiếu thu của đại lý khác',
        });
        return;
      }

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }
}

