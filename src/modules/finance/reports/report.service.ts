import prisma from '../../../config/prisma.js';
import { stringify } from 'csv-stringify/sync';

export interface SalesReportRow {
  stt: number;
  dealerId: string;
  dealerCode: string;
  dealerName: string;
  district: string;
  tier: string;
  exportCount: number; // Số phiếu xuất
  totalRevenue: number; // Tổng trị giá
  percentage: number; // Tỷ lệ %
}

export interface SalesReportResult {
  title: string;
  month: number;
  year: number;
  generatedAt: string;
  summary: {
    totalRevenue: number;
    totalExportCount: number;
    activeDealersCount: number;
  };
  rows: SalesReportRow[];
}

export interface DebtReportRow {
  stt: number;
  dealerId: string;
  dealerCode: string;
  dealerName: string;
  district: string;
  tier: string;
  openingDebt: number; // Nợ đầu
  incurredDebit: number; // Phát sinh tăng (mua hàng)
  incurredCredit: number; // Phát sinh giảm (thu tiền)
  incurredDebt: number; // Phát sinh ròng (Tăng - Giảm)
  closingDebt: number; // Nợ cuối
}

export interface DebtReportResult {
  title: string;
  month: number;
  year: number;
  generatedAt: string;
  summary: {
    totalOpeningDebt: number;
    totalIncurredDebit: number;
    totalIncurredCredit: number;
    totalIncurredDebt: number;
    totalClosingDebt: number;
    totalDealersCount: number;
  };
  rows: DebtReportRow[];
}

export class ReportService {
  /**
   * BM6.1: Lập báo cáo doanh số theo tháng
   */
  public static async getSalesReport(month: number, year: number): Promise<SalesReportResult> {
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // Lấy tất cả các hóa đơn (phiếu xuất) trong tháng
    const invoices = await prisma.invoice.findMany({
      where: {
        issueDate: {
          gte: startDate,
          lte: endDate,
        },
        status: { not: 'CANCELLED' },
      },
      include: {
        dealer: {
          include: {
            district: true,
            tier: true,
          },
        },
      },
    });

    // Gom nhóm theo đại lý
    const dealerMap = new Map<string, {
      dealerId: string;
      dealerCode: string;
      dealerName: string;
      district: string;
      tier: string;
      exportCount: number;
      totalRevenue: number;
    }>();

    let grandTotalRevenue = 0;
    let grandTotalExportCount = 0;

    for (const inv of invoices) {
      grandTotalRevenue += inv.totalAmount;
      grandTotalExportCount += 1;

      const existing = dealerMap.get(inv.dealerId);
      if (existing) {
        existing.exportCount += 1;
        existing.totalRevenue += inv.totalAmount;
      } else {
        dealerMap.set(inv.dealerId, {
          dealerId: inv.dealerId,
          dealerCode: inv.dealer.code,
          dealerName: inv.dealer.name,
          district: inv.dealer.district.name,
          tier: inv.dealer.tier.name,
          exportCount: 1,
          totalRevenue: inv.totalAmount,
        });
      }
    }

    // Chuyển thành danh sách và tính tỷ lệ
    const rawRows = Array.from(dealerMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);

    const rows: SalesReportRow[] = rawRows.map((item, index) => {
      const percentage = grandTotalRevenue > 0
        ? Number(((item.totalRevenue / grandTotalRevenue) * 100).toFixed(2))
        : 0;

      return {
        stt: index + 1,
        dealerId: item.dealerId,
        dealerCode: item.dealerCode,
        dealerName: item.dealerName,
        district: item.district,
        tier: item.tier,
        exportCount: item.exportCount,
        totalRevenue: item.totalRevenue,
        percentage,
      };
    });

    return {
      title: `BM6.1 - BÁO CÁO DOANH SỐ THÁNG ${month}/${year}`,
      month,
      year,
      generatedAt: new Date().toISOString(),
      summary: {
        totalRevenue: grandTotalRevenue,
        totalExportCount: grandTotalExportCount,
        activeDealersCount: rows.length,
      },
      rows,
    };
  }

  /**
   * BM6.2: Lập báo cáo công nợ đại lý theo tháng
   */
  public static async getDebtReport(month: number, year: number): Promise<DebtReportResult> {
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // Lấy tất cả đại lý
    const dealers = await prisma.dealer.findMany({
      include: {
        district: true,
        tier: true,
      },
      orderBy: { name: 'asc' },
    });

    let totalOpeningDebt = 0;
    let totalIncurredDebit = 0;
    let totalIncurredCredit = 0;
    let totalClosingDebt = 0;

    const rawRows: Array<Omit<DebtReportRow, 'stt'>> = [];

    for (const dealer of dealers) {
      // 1. Tính Nợ đầu kỳ: Lấy số dư của giao dịch cuối cùng trước ngày bắt đầu tháng
      const lastEntryBeforeStart = await prisma.debtLedger.findFirst({
        where: {
          dealerId: dealer.id,
          createdAt: { lt: startDate },
        },
        orderBy: { createdAt: 'desc' },
      });

      const openingDebt = lastEntryBeforeStart ? lastEntryBeforeStart.currentBalance : 0;

      // 2. Tính Phát sinh trong tháng: Tổng debit (tăng nợ) và tổng credit (giảm nợ)
      const ledgerEntriesInMonth = await prisma.debtLedger.findMany({
        where: {
          dealerId: dealer.id,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      let incurredDebit = 0;
      let incurredCredit = 0;
      for (const entry of ledgerEntriesInMonth) {
        incurredDebit += entry.debitAmount;
        incurredCredit += entry.creditAmount;
      }

      const incurredDebt = incurredDebit - incurredCredit;
      const closingDebt = openingDebt + incurredDebit - incurredCredit;

      // Chỉ đưa vào báo cáo nếu đại lý có nợ đầu > 0, phát sinh > 0 hoặc nợ cuối > 0 (hoặc tất cả đại lý)
      if (openingDebt > 0 || incurredDebit > 0 || incurredCredit > 0 || closingDebt > 0 || dealer.status === 'ACTIVE') {
        totalOpeningDebt += openingDebt;
        totalIncurredDebit += incurredDebit;
        totalIncurredCredit += incurredCredit;
        totalClosingDebt += closingDebt;

        rawRows.push({
          dealerId: dealer.id,
          dealerCode: dealer.code,
          dealerName: dealer.name,
          district: dealer.district.name,
          tier: dealer.tier.name,
          openingDebt,
          incurredDebit,
          incurredCredit,
          incurredDebt,
          closingDebt,
        });
      }
    }

    const rows: DebtReportRow[] = rawRows.map((r, index) => ({
      stt: index + 1,
      ...r,
    }));

    return {
      title: `BM6.2 - BÁO CÁO CÔNG NỢ ĐẠI LÝ THÁNG ${month}/${year}`,
      month,
      year,
      generatedAt: new Date().toISOString(),
      summary: {
        totalOpeningDebt,
        totalIncurredDebit,
        totalIncurredCredit,
        totalIncurredDebt: totalIncurredDebit - totalIncurredCredit,
        totalClosingDebt,
        totalDealersCount: rows.length,
      },
      rows,
    };
  }

  /**
   * Xuất CSV cho báo cáo doanh số BM6.1
   */
  public static exportSalesReportToCsv(report: SalesReportResult): string {
    const headers = ['STT', 'Mã Đại Lý', 'Tên Đại Lý', 'Quận', 'Loại Đại Lý', 'Số Phiếu Xuất', 'Tổng Trị Giá (VND)', 'Tỷ Lệ (%)'];
    const data = report.rows.map((r) => [
      r.stt,
      r.dealerCode,
      r.dealerName,
      r.district,
      r.tier,
      r.exportCount,
      r.totalRevenue,
      `${r.percentage}%`,
    ]);

    // Thêm dòng tổng cộng
    data.push([
      '',
      '',
      'TỔNG CỘNG',
      '',
      '',
      report.summary.totalExportCount,
      report.summary.totalRevenue,
      '100%',
    ]);

    return '\uFEFF' + stringify([headers, ...data]); // UTF-8 BOM for Excel compatibility
  }

  /**
   * Xuất CSV cho báo cáo công nợ BM6.2
   */
  public static exportDebtReportToCsv(report: DebtReportResult): string {
    const headers = [
      'STT',
      'Mã Đại Lý',
      'Tên Đại Lý',
      'Quận',
      'Loại Đại Lý',
      'Nợ Đầu (VND)',
      'Phát Sinh Tăng (VND)',
      'Phát Sinh Giảm (VND)',
      'Phát Sinh Ròng (VND)',
      'Nợ Cuối (VND)',
    ];

    const data = report.rows.map((r) => [
      r.stt,
      r.dealerCode,
      r.dealerName,
      r.district,
      r.tier,
      r.openingDebt,
      r.incurredDebit,
      r.incurredCredit,
      r.incurredDebt,
      r.closingDebt,
    ]);

    // Thêm dòng tổng cộng
    data.push([
      '',
      '',
      'TỔNG CỘNG',
      '',
      '',
      report.summary.totalOpeningDebt,
      report.summary.totalIncurredDebit,
      report.summary.totalIncurredCredit,
      report.summary.totalIncurredDebt,
      report.summary.totalClosingDebt,
    ]);

    return '\uFEFF' + stringify([headers, ...data]);
  }
}

