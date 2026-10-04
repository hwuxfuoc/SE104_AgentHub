import { Request, Response, NextFunction } from 'express';
import { InvoiceService } from './invoice.service.js';

export class InvoiceController {
  public static async createInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const createdById = req.user?.id || null;
      const result = await InvoiceService.createInvoice(req.body, createdById);

      res.status(201).json({
        success: true,
        message: 'Lập hóa đơn xuất hàng thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      let dealerId = req.query.dealerId as string | undefined;
      if (req.user?.role === 'DEALER' && req.user.dealerId) {
        dealerId = req.user.dealerId;
      }

      const result = await InvoiceService.getInvoices({
        dealerId,
        salesOrderId: req.query.salesOrderId as string,
        status: req.query.status as any,
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

  public static async getInvoiceById(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await InvoiceService.getInvoiceById(req.params.id);

      if (req.user?.role === 'DEALER' && req.user.dealerId && invoice.dealerId !== req.user.dealerId) {
        res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          message: 'Không có quyền truy cập hóa đơn của đại lý khác',
        });
        return;
      }

      res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }
}

