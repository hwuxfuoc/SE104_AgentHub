import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { can } from '@/auth/permissions';
import { Badge, Card, CardHeader, Skeleton, PageHeader, EmptyState } from '@/components/ui/Card';
import { api } from '@/lib/api/client';
import type { SalesReport } from '@/lib/api/types';
import { cn } from '@/lib/cn';
import { formatDate, formatNumber, formatVnd } from '@/lib/format';
import { useDealers } from '@/features/dealers/api';
import { usePayments } from '@/features/payments/api';
import { DebtBadge } from '@/features/dealers/badges';

const now = new Date();

function Stat({ label, value, hint, loading }: { label: string; value?: string; hint?: string; loading?: boolean }) {
  return (
    <Card className="px-5 py-4">
      <p className="text-xs text-muted">{label}</p>
      {loading ? <Skeleton className="mt-2 h-7 w-28" /> : <p className="mt-1.5 truncate text-2xl font-semibold tabular tracking-[-0.02em]">{value}</p>}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const dealers = useDealers({ limit: 100, sortBy: 'currentDebt', sortOrder: 'desc' });
  const canSales = can(user?.role, 'reports.sales');
  const canPay = can(user?.role, 'payments');
  const sales = useQuery({
    queryKey: ['reports', 'sales', now.getMonth() + 1, now.getFullYear()],
    enabled: canSales,
    queryFn: async () => (await api.get<SalesReport>('/reports/sales', { month: now.getMonth() + 1, year: now.getFullYear() })).data,
  });
  const payments = usePayments(1);

  const all = dealers.data?.items ?? [];
  const totalDebt = all.reduce((s, d) => s + d.currentDebt, 0);
  const exceeded = all.filter((d) => d.currentDebt > d.tier.maxDebt);
  const nearLimit = all.filter((d) => d.currentDebt <= d.tier.maxDebt && d.currentDebt >= d.tier.maxDebt * 0.8);
  const topDebt = all.filter((d) => d.currentDebt > 0).slice(0, 5);
  const topSales = sales.data?.rows.slice(0, 5) ?? [];
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  return (
    <>
      <PageHeader title="Tổng quan" description={`${greeting}, ${user?.fullName.split(' ').slice(-1)[0]} · ${formatDate(now)}`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Tổng số đại lý" value={formatNumber(dealers.data?.pagination.total ?? 0)} hint={`${all.filter((d) => d.status === 'ACTIVE').length} đang hoạt động`} loading={dealers.isLoading} />
        <Stat label="Tổng công nợ" value={formatVnd(totalDebt)} hint={`${all.filter((d) => d.currentDebt > 0).length} đại lý còn nợ`} loading={dealers.isLoading} />
        {canSales && <Stat label={`Doanh số tháng ${now.getMonth() + 1}`} value={formatVnd(sales.data?.summary.totalRevenue ?? 0)} hint={`${sales.data?.summary.totalExportCount ?? 0} phiếu xuất`} loading={sales.isLoading} />}
        {canPay && <Stat label="Phiếu thu" value={formatNumber(payments.data?.pagination.total ?? 0)} hint="Tổng số phiếu thu" loading={payments.isLoading} />}
      </div>

      {(exceeded.length > 0 || nearLimit.length > 0) && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-warning/30 bg-warning-soft px-5 py-4 text-sm text-warning">
          <AlertTriangle className="size-5 shrink-0" />
          <p className="flex-1">
            {exceeded.length > 0 && <b>{exceeded.length} đại lý vượt hạn mức nợ. </b>}
            {nearLimit.length > 0 && <>{nearLimit.length} đại lý đã dùng từ 80% hạn mức.</>}
          </p>
          <Link to="/dealers" className="font-semibold underline-offset-4 hover:underline">Xem đại lý</Link>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Đại lý nợ nhiều nhất" description="So với hạn mức của loại đại lý (QĐ3)" action={<Link to="/dealers" className="text-xs font-medium text-brand hover:underline">Tất cả</Link>} />
          {dealers.isLoading ? (
            <div className="space-y-3 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : topDebt.length === 0 ? (
            <EmptyState title="Chưa có công nợ" />
          ) : (
            <ul className="divide-y divide-line">
              {topDebt.map((d) => (
                <li key={d.id}>
                  <Link to={`/dealers/${d.id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.name}</p>
                      <div className="mt-1.5 h-1.5 overflow-hidden bg-surface-2">
                        <div className={cn('h-full', d.currentDebt > d.tier.maxDebt ? 'bg-danger' : d.currentDebt / d.tier.maxDebt >= 0.7 ? 'bg-warning' : 'bg-brand')} style={{ width: `${Math.min(100, (d.currentDebt / d.tier.maxDebt) * 100)}%` }} />
                      </div>
                    </div>
                    <div className="text-right">
                      <DebtBadge debt={d.currentDebt} limit={d.tier.maxDebt} />
                      <p className="mt-0.5 text-[11px] text-muted">/ {formatVnd(d.tier.maxDebt)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {canSales ? (
          <Card>
            <CardHeader title={`Top doanh số tháng ${now.getMonth() + 1}`} action={<Link to="/reports" className="text-xs font-medium text-brand hover:underline">Báo cáo</Link>} />
            {sales.isLoading ? (
              <div className="space-y-3 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : topSales.length === 0 ? (
              <EmptyState title="Tháng này chưa có doanh số" />
            ) : (
              <ul className="space-y-4 p-5">
                {topSales.map((r) => (
                  <li key={r.dealerId}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium">{r.dealerName}</span>
                      <span className="tabular text-muted">{formatVnd(r.totalRevenue)} · {r.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden bg-surface-2">
                      <div className="h-full bg-brand transition-all duration-700" style={{ width: `${r.percentage}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : (
          <Card>
            <CardHeader title="Lối tắt" />
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              {[['/dealers', 'Tra cứu đại lý'], ['/products', 'Hàng hóa & tồn kho'], ['/purchase-receipts', 'Phiếu nhập hàng'], ['/rules', 'Xem quy định']].map(([to, label]) => (
                <Link key={to} to={to} className="rounded-xl border border-line p-4 text-sm font-medium transition-colors hover:border-brand hover:text-brand">{label}</Link>
              ))}
            </div>
          </Card>
        )}

        {canPay && (
          <Card className="lg:col-span-2">
            <CardHeader title="Phiếu thu gần đây" action={<Link to="/payments" className="text-xs font-medium text-brand hover:underline">Xem tất cả</Link>} />
            {payments.isLoading ? (
              <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : (
              <ul className="divide-y divide-line">
                {payments.data?.items.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                    <span className="font-mono text-xs font-semibold">{p.receiptNumber}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{p.dealer?.name}</span>
                    <span className="text-muted">{formatDate(p.paymentDate)}</span>
                    <Badge tone="success">{formatVnd(p.amount)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
