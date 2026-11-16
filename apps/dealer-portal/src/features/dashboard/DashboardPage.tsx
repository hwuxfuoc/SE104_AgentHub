import { AlertTriangle, ClipboardList, Package, ShoppingCart, Wallet } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { Card, PageHeader, Badge } from '@/components/ui/Card';
import { formatVnd, formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';

/** Dữ liệu tóm tắt — logic tải thực tế do P1 dev implement khi có API. */
const MOCK_SUMMARY = {
  currentDebt:    4_200_000,
  maxDebt:        10_000_000,
  pendingOrders:  2,
  unpaidInvoices: 1,
  lastOrderDate:  '2026-11-10T08:00:00.000Z',
};

interface StatCardProps {
  icon: typeof Wallet;
  label: string;
  value: string;
  tone?: 'brand' | 'warning' | 'danger' | 'neutral';
  sub?: string;
}

function StatCard({ icon: Icon, label, value, tone = 'neutral', sub }: StatCardProps) {
  const bg: Record<string, string> = {
    brand:   'bg-brand-soft text-brand-strong',
    warning: 'bg-warning-soft text-warning',
    danger:  'bg-danger-soft text-danger',
    neutral: 'bg-surface-2 text-muted',
  };
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={cn('grid size-12 shrink-0 place-items-center rounded-2xl', bg[tone])}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-0.5 text-xl font-semibold tabular">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const debtRatio = MOCK_SUMMARY.currentDebt / MOCK_SUMMARY.maxDebt;
  const debtTone = debtRatio >= 0.9 ? 'danger' : debtRatio >= 0.7 ? 'warning' : 'brand';

  return (
    <>
      <PageHeader
        title={`Xin chào, ${user?.dealer?.name ?? user?.fullName ?? 'Đại lý'}`}
        description="Tổng quan hoạt động của đại lý."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Tiền đang nợ"
          value={formatVnd(MOCK_SUMMARY.currentDebt)}
          tone={debtTone}
          sub={`Hạn mức: ${formatVnd(MOCK_SUMMARY.maxDebt)}`}
        />
        <StatCard
          icon={ShoppingCart}
          label="Đơn đang xử lý"
          value={String(MOCK_SUMMARY.pendingOrders)}
          tone={MOCK_SUMMARY.pendingOrders > 0 ? 'warning' : 'neutral'}
          sub="Chờ duyệt hoặc đang giao"
        />
        <StatCard
          icon={ClipboardList}
          label="Hóa đơn chưa thanh toán"
          value={String(MOCK_SUMMARY.unpaidInvoices)}
          tone={MOCK_SUMMARY.unpaidInvoices > 0 ? 'danger' : 'neutral'}
        />
        <StatCard
          icon={Package}
          label="Đơn hàng gần nhất"
          value={MOCK_SUMMARY.lastOrderDate ? formatDate(MOCK_SUMMARY.lastOrderDate) : '—'}
          tone="neutral"
        />
      </div>

      {debtRatio >= 0.7 && (
        <div className={cn(
          'mt-5 flex items-start gap-3 rounded-xl px-4 py-3.5 text-sm',
          debtRatio >= 0.9 ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning',
        )}>
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-medium">
              {debtRatio >= 0.9 ? 'Sắp đạt hạn mức nợ' : 'Công nợ ở mức cao'}
            </p>
            <p className="mt-0.5 text-xs opacity-90">
              Hiện tại {formatVnd(MOCK_SUMMARY.currentDebt)} / {formatVnd(MOCK_SUMMARY.maxDebt)}&nbsp;
              ({Math.round(debtRatio * 100)}%). Vui lòng liên hệ kế toán để thanh toán trước khi đặt thêm đơn hàng.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-[15px] font-semibold">Đơn hàng gần đây</h2>
          </div>
          <div className="divide-y divide-line">
            {[
              { no: 'DH-2026-0042', date: '2026-11-10', status: 'SHIPPED',   total: 2_100_000 },
              { no: 'DH-2026-0038', date: '2026-11-05', status: 'COMPLETED', total: 850_000 },
              { no: 'DH-2026-0031', date: '2026-10-28', status: 'COMPLETED', total: 1_250_000 },
            ].map((o) => (
              <div key={o.no} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="font-mono text-xs font-medium">{o.no}</p>
                  <p className="mt-0.5 text-xs text-muted">{formatDate(o.date)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium tabular">{formatVnd(o.total)}</span>
                  <OrderStatusBadge status={o.status as 'SHIPPED' | 'COMPLETED'} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-[15px] font-semibold">Hóa đơn chưa thanh toán</h2>
          </div>
          <div className="divide-y divide-line">
            {[
              { no: 'HD-2026-0042', date: '2026-11-10', remaining: 2_100_000, status: 'UNPAID' as const },
            ].map((inv) => (
              <div key={inv.no} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="font-mono text-xs font-medium">{inv.no}</p>
                  <p className="mt-0.5 text-xs text-muted">{formatDate(inv.date)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold tabular text-danger">{formatVnd(inv.remaining)}</span>
                  <Badge tone="danger">Chưa TT</Badge>
                </div>
              </div>
            ))}
            {MOCK_SUMMARY.unpaidInvoices === 0 && (
              <p className="px-5 py-6 text-center text-sm text-muted">Không có hóa đơn chưa thanh toán.</p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: 'neutral' | 'brand' | 'warning' | 'success' | 'danger' | 'info' }> = {
    DRAFT:            { label: 'Nháp',         tone: 'neutral' },
    PENDING_APPROVAL: { label: 'Chờ duyệt',    tone: 'warning' },
    APPROVED:         { label: 'Đã duyệt',     tone: 'brand' },
    PROCESSING:       { label: 'Đang xử lý',   tone: 'info' },
    SHIPPED:          { label: 'Đang giao',    tone: 'info' },
    COMPLETED:        { label: 'Hoàn tất',     tone: 'success' },
    CANCELLED:        { label: 'Đã hủy',       tone: 'danger' },
  };
  const s = map[status] ?? { label: status, tone: 'neutral' as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
