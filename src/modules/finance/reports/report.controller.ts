import { Request, Response, NextFunction } from 'express';
import { ReportService } from './report.service.js';

export class ReportController {
  public static async getSalesReport(req: Request, res: Response, next: NextFunction) {
    try {
      const month = parseInt(String(req.query.month), 10);
      const year = parseInt(String(req.query.year), 10);
      const format = req.query.format as string || 'json';

      const report = await ReportService.getSalesReport(month, year);

      if (format.toLowerCase() === 'csv') {
        const csvContent = ReportService.exportSalesReportToCsv(report);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="BM6.1_BaoCaoDoanhSo_${month}_${year}.csv"`);
        res.send(csvContent);
        return;
      }

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getDebtReport(req: Request, res: Response, next: NextFunction) {
    try {
      const month = parseInt(String(req.query.month), 10);
      const year = parseInt(String(req.query.year), 10);
      const format = req.query.format as string || 'json';

      const report = await ReportService.getDebtReport(month, year);

      if (format.toLowerCase() === 'csv') {
        const csvContent = ReportService.exportDebtReportToCsv(report);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="BM6.2_BaoCaoCongNo_${month}_${year}.csv"`);
        res.send(csvContent);
        return;
      }

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
}

