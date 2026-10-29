import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Printer } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { can } from '@/auth/permissions';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Select } from '@/components/ui/Fields';
import { useToast } from '@/components/ui/Toast';
import { api, downloadCsv } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import type { DebtReport, SalesReport } from '@/lib/api/types';
import { cn } from '@/lib/cn';
import { formatDateTime, formatNumber, formatPercent, formatVnd } from '@/lib/format';

type Tab = 'sales' | 'debt';
type SalesRow = SalesReport['rows'][number];
type DebtRow = DebtReport['rows'][number];

const now = new Date();
const YEARS = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

/** BM6.1 Báo cáo doanh số & BM6.2 Báo cáo công nợ đại lý theo tháng. */
export default function ReportsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canDebt = can(user?.role, 'reports.debt');
  const [tab, setTab] = useState<Tab>('sales');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const future = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1);
  const active: Tab = tab === 'debt' && !canDebt ? 'sales' : tab;

  const sales = useQuery({
    queryKey: ['reports', 'sales', month, year],
    enabled: active === 'sales' && !future,
    queryFn: async () => (await api.get<SalesReport>('/reports/sales', { month, year })).data,
  });
  const debt = useQuery({
    queryKey: ['reports', 'debt', month, year],
    enabled: active === 'debt' && !future,
    queryFn: async () => (await api.get<DebtReport>('/reports/debt', { month, year })).data,
  });
  const current = active === 'sales' ? sales : debt;

  const salesCols: Column<SalesRow>[] = [
    { key: 'stt', header: 'STT', cell: (r) => <span className="text-muted tabular">{r.stt}</span>, className: 'w-14' },
    { key: 'dealer', header: 'Đại lý', cell: (r) => <div><p className="font-medium">{r.dealerName}</p><p className="text-xs text-muted">{r.dealerCode} · {r.tier} · {r.district}</p></div> },
    { key: 'count', header: 'Số phiếu xuất', align: 'right', cell: (r) => <span className="tabular">{r.exportCount}</span> },
    { key: 'total', header: 'Tổng trị giá', align: 'right', cell: (r) => <b className="tabular">{formatVnd(r.totalRevenue)}</b> },
    {
      key: 'pct',
      header: 'Tỷ lệ',
      align: 'right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-3">
          <div className="hidden h-1.5 w-24 overflow-hidden bg-surface-2 sm:block"><div className="h-full bg-brand" style={{ width: `${r.percentage}%` }} /></div>
          <span className="w-14 text-right tabular">{formatPercent(r.percentage)}</span>
        </div>
      ),
    },
  ];
  const debtCols: Column<DebtRow>[] = [
    { key: 'stt', header: 'STT', cell: (r) => <span className="text-muted tabular">{r.stt}</span>, className: 'w-14' },
    { key: 'dealer', header: 'Đại lý', cell: (r) => <div><p className="font-medium">{r.dealerName}</p><p className="text-xs text-muted">{r.dealerCode} · {r.tier} · {r.district}</p></div> },
    { key: 'open', header: 'Nợ đầu', align: 'right', cell: (r) => <span className="tabular">{formatVnd(r.openingDebt)}</span> },
    { key: 'inc', header: 'Phát sinh', align: 'right', cell: (r) => <span className={cn('tabular', r.incurredDebt > 0 ? 'text-danger' : r.incurredDebt < 0 ? 'text-success' : '')}>{r.incurredDebt > 0 ? '+' : ''}{formatVnd(r.incurredDebt)}</span> },
    { key: 'close', header: 'Nợ cuối', align: 'right', cell: (r) => <b className="tabular">{formatVnd(r.closingDebt)}</b> },
  ];

  const exportCsv = async () => {
    try {
      if (active === 'sales' && sales.data) {
        const r = sales.data;
        await downloadCsv('/reports/sales', { month, year }, `BM6.1_BaoCaoDoanhSo_${month}_${year}.csv`, () => [
          ['STT', 'Mã ĐL', 'Đại lý', 'Quận', 'Loại', 'Số phiếu xuất', 'Tổng trị giá', 'Tỷ lệ (%)'],
          ...r.rows.map((x) => [x.stt, x.dealerCode, x.dealerName, x.district, x.tier, x.exportCount, x.totalRevenue, x.percentage].map(String)),
        ]);
      } else if (active === 'debt' && debt.data) {
        const r = debt.data;
        await downloadCsv('/reports/debt', { month, year }, `BM6.2_BaoCaoCongNo_${month}_${year}.csv`, () => [
          ['STT', 'Mã ĐL', 'Đại lý', 'Nợ đầu', 'Phát sinh', 'Nợ cuối'],
          ...r.rows.map((x) => [x.stt, x.dealerCode, x.dealerName, x.openingDebt, x.incurredDebt, x.closingDebt].map(String)),
        ]);
      }
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const tabs: Array<[Tab, string]> = [['sales', 'BM6.1 · Doanh số'], ...(canDebt ? ([['debt', 'BM6.2 · Công nợ']] as Array<[Tab, string]>) : [])];

  return (
    <>
      <PageHeader
        title="Báo cáo tháng"
        description="Chỉ tính phiếu đã ghi nhận thành công. Số liệu khớp với sổ công nợ."
        actions={
          <>
            <Button variant="secondary" icon={<Download className="size-4" />} onClick={exportCsv} disabled={!current.data || future}>CSV</Button>
            <Button variant="secondary" icon={<Printer className="size-4" />} onClick={() => window.print()} disabled={!current.data || future}>In / PDF</Button>
          </>
        }
      />

      <div className="no-print mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="inline-flex rounded-xl bg-surface-2 p-1" role="tablist">
          {tabs.map(([key, label]) => (
            <button key={key} role="tab" aria-selected={active === key} onClick={() => setTab(key)} className={cn('cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-all', active === key ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink')}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <Select value={month} onChange={(e) => setMonth(Number(e.target.value))} aria-label="Tháng">
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>Tháng {i + 1}</option>)}
          </Select>
          <Select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Năm">
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
        </div>
      </div>

      {future ? (
        <Card><p className="p-10 text-center text-muted">Không thể lập báo cáo cho tháng chưa diễn ra.</p></Card>
      ) : (
        <>
          {active === 'sales' && sales.data && (
            <div className="mb-5 grid gap-4 sm:grid-cols-3">
              <Kpi label="Tổng doanh số" value={formatVnd(sales.data.summary.totalRevenue)} />
              <Kpi label="Số phiếu xuất" value={formatNumber(sales.data.summary.totalExportCount)} />
              <Kpi label="Đại lý có doanh số" value={formatNumber(sales.data.summary.activeDealersCount)} />
            </div>
          )}
          {active === 'debt' && debt.data && (
            <div className="mb-5 grid gap-4 sm:grid-cols-3">
              <Kpi label="Tổng nợ đầu" value={formatVnd(debt.data.summary.totalOpeningDebt)} />
              <Kpi label="Tổng phát sinh" value={formatVnd(debt.data.summary.totalIncurredDebt)} />
              <Kpi label="Tổng nợ cuối" value={formatVnd(debt.data.summary.totalClosingDebt)} />
            </div>
          )}
          <Card>
            <div className="border-b border-line px-5 py-4 text-center">
              <h2 className="text-base font-bold uppercase">{active === 'sales' ? 'Báo cáo doanh số' : 'Báo cáo công nợ đại lý'}</h2>
              <p className="text-sm text-muted">Tháng {String(month).padStart(2, '0')}/{year}{current.data ? ` · lập lúc ${formatDateTime(current.data.generatedAt)}` : ''}</p>
            </div>
            {current.error ? (
              <p className="p-6 text-sm text-danger">{errorMessage(current.error)}</p>
            ) : active === 'sales' ? (
              <DataTable columns={salesCols} rows={sales.data?.rows} loading={sales.isLoading} rowKey={(r) => r.dealerId} emptyTitle="Tháng này không có doanh số" />
            ) : (
              <DataTable columns={debtCols} rows={debt.data?.rows} loading={debt.isLoading} rowKey={(r) => r.dealerId} emptyTitle="Tháng này không có công nợ" />
            )}
          </Card>
        </>
      )}
    </>
  );
}

const Kpi = ({ label, value }: { label: string; value: string }) => (
  <Card className="p-5">
    <p className="text-xs text-muted">{label}</p>
    <p className="mt-1 text-2xl font-bold tabular">{value}</p>
  </Card>
);
