import { describe, it, expect } from 'vitest';
import { ReportService } from '../../src/modules/finance/reports/report.service.js';

describe('Unit Test: Financial Reports Logic (BM6.1 & BM6.2)', () => {
  it('BM6.1-01: Tính toán đúng tỷ lệ phần trăm doanh số và tổng cộng', async () => {
    const report = await ReportService.getSalesReport(9, 2026);

    expect(report.title).toContain('BM6.1 - BÁO CÁO DOANH SỐ THÁNG 9/2026');
    expect(report.month).toBe(9);
    expect(report.year).toBe(2026);
    expect(report.summary.totalRevenue).toBeGreaterThan(0);

    // Sum of percentages should be approx 100%
    if (report.rows.length > 0) {
      const sumPercentage = report.rows.reduce((sum, r) => sum + r.percentage, 0);
      expect(Math.round(sumPercentage)).toBe(100);

      const sumRevenue = report.rows.reduce((sum, r) => sum + r.totalRevenue, 0);
      expect(sumRevenue).toBe(report.summary.totalRevenue);
    }
  });

  it('BM6.1-02: Sinh file CSV doanh số có UTF-8 BOM và đầy đủ tiêu đề', async () => {
    const report = await ReportService.getSalesReport(9, 2026);
    const csv = ReportService.exportSalesReportToCsv(report);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Mã Đại Lý');
    expect(csv).toContain('Tổng Trị Giá (VND)');
    expect(csv).toContain('TỔNG CỘNG');
  });

  it('BM6.2-01: Kiểm tra tính toàn vẹn công nợ: Nợ cuối = Nợ đầu + Tăng - Giảm', async () => {
    const report = await ReportService.getDebtReport(9, 2026);

    expect(report.title).toContain('BM6.2 - BÁO CÁO CÔNG NỢ ĐẠI LÝ THÁNG 9/2026');
    expect(report.month).toBe(9);
    expect(report.year).toBe(2026);

    for (const row of report.rows) {
      const calculatedClosingDebt = row.openingDebt + row.incurredDebit - row.incurredCredit;
      expect(row.closingDebt).toBe(calculatedClosingDebt);
      expect(row.incurredDebt).toBe(row.incurredDebit - row.incurredCredit);
    }

    // Check system totals
    expect(report.summary.totalClosingDebt).toBe(
      report.summary.totalOpeningDebt + report.summary.totalIncurredDebit - report.summary.totalIncurredCredit
    );
  });

  it('BM6.2-02: Sinh file CSV công nợ hợp lệ', async () => {
    const report = await ReportService.getDebtReport(9, 2026);
    const csv = ReportService.exportDebtReportToCsv(report);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Nợ Đầu (VND)');
    expect(csv).toContain('Phát Sinh Tăng (VND)');
    expect(csv).toContain('Nợ Cuối (VND)');
    expect(csv).toContain('TỔNG CỘNG');
  });
});

