import { Card, CardHeader, PageHeader, Badge } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { formatDate, formatVnd } from '@/lib/format';
import type { DebtLedgerEntry, LedgerType } from '@/lib/api/types';

/** Mock debt — P1 dev thay bằng GET /dealers/me/debt khi có API (P5 backend). */
const MOCK_SUMMARY = {
  currentDebt:    4_200_000,
  maxDebtAllowed: 10_000_000,
  remainingCredit: 5_800_000,
  isDebtExceeded: false,
  lastPaymentDate:   '2026-11-01',
  lastPaymentAmount: 500_000,
};

const MOCK_LEDGER: DebtLedgerEntry[] = [
  { id: 'l1', transactionType: 'INVOICE', referenceCode: 'HD-2026-0042', debitAmount: 2_100_000, creditAmount: 0,       previousBalance: 2_600_000, currentBalance: 4_700_000, createdAt: '2026-11-10' },
  { id: 'l2', transactionType: 'PAYMENT', referenceCode: 'PT-2026-0021', debitAmount: 0,         creditAmount: 500_000, previousBalance: 3_100_000, currentBalance: 2_600_000, createdAt: '2026-11-01' },
  { id: 'l3', transactionType: 'INVOICE', referenceCode: 'HD-2026-0038', debitAmount: 850_000,   creditAmount: 0,       previousBalance: 2_250_000, currentBalance: 3_100_000, createdAt: '2026-11-05' },
  { id: 'l4', transactionType: 'PAYMENT', referenceCode: 'PT-2026-0019', debitAmount: 0,         creditAmount: 1_000_000, previousBalance: 3_250_000, currentBalance: 2_250_000, createdAt: '2026-10-25' },
];

const TYPE_LABEL: Record<LedgerType, string> = {
  INVOICE:    'Hóa đơn',
  PAYMENT:    'Thu tiền',
  RETURN:     'Trả hàng',
  ADJUSTMENT: 'Điều chỉnh',
};
const TYPE_TONE: Record<LedgerType, 'danger' | 'success' | 'brand' | 'neutral'> = {
  INVOICE:    'danger',
  PAYMENT:    'success',
  RETURN:     'brand',
  ADJUSTMENT: 'neutral',
};

const columns: Column<DebtLedgerEntry>[] = [
  { key: 'date',    header: 'Ngày',         cell: (l) => formatDate(l.createdAt) },
  { key: 'type',    header: 'Loại phát sinh', cell: (l) => <Badge tone={TYPE_TONE[l.transactionType]}>{TYPE_LABEL[l.transactionType]}</Badge> },
  { key: 'ref',     header: 'Chứng từ',     cell: (l) => <span className="font-mono text-xs text-muted">{l.referenceCode ?? '—'}</span> },
  { key: 'debit',   header: 'Tăng nợ (+)',  align: 'right', cell: (l) => l.debitAmount > 0 ? <span className="tabular font-medium text-danger">+{formatVnd(l.debitAmount)}</span> : <span className="text-muted">—</span> },
  { key: 'credit',  header: 'Giảm nợ (−)',  align: 'right', cell: (l) => l.creditAmount > 0 ? <span className="tabular font-medium text-success">−{formatVnd(l.creditAmount)}</span> : <span className="text-muted">—</span> },
  { key: 'balance', header: 'Số dư',        align: 'right', cell: (l) => <span className="tabular font-semibold">{formatVnd(l.currentBalance)}</span> },
];

export default function DebtPage() {
  const debtRatio = MOCK_SUMMARY.currentDebt / MOCK_SUMMARY.maxDebtAllowed;

  return (
    <>
      <PageHeader title="Công nợ" description="Tổng quan công nợ và lịch sử phát sinh (BM5)." />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs text-muted">Nợ hiện tại</p>
          <p className="mt-1 text-2xl font-bold tabular text-danger">{formatVnd(MOCK_SUMMARY.currentDebt)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted">Hạn mức còn lại</p>
          <p className="mt-1 text-2xl font-bold tabular text-success">{formatVnd(MOCK_SUMMARY.remainingCredit)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted">Hạn mức tối đa</p>
          <p className="mt-1 text-2xl font-bold tabular">{formatVnd(MOCK_SUMMARY.maxDebtAllowed)}</p>
          <p className="mt-0.5 text-xs text-muted">theo QĐ3</p>
        </Card>
      </div>

      <Card className="mb-5 p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted">Mức sử dụng hạn mức</span>
          <span className="font-medium">{Math.round(debtRatio * 100)}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className={`h-full rounded-full transition-all ${debtRatio >= 0.9 ? 'bg-danger' : debtRatio >= 0.7 ? 'bg-warning' : 'bg-brand'}`}
            style={{ width: `${Math.min(100, debtRatio * 100)}%` }}
          />
        </div>
        {MOCK_SUMMARY.lastPaymentDate && (
          <p className="mt-3 text-xs text-muted">
            Lần thanh toán gần nhất: <span className="font-medium text-ink">{formatVnd(MOCK_SUMMARY.lastPaymentAmount ?? 0)}</span> ngày {formatDate(MOCK_SUMMARY.lastPaymentDate)}
          </p>
        )}
      </Card>

      <Card>
        <CardHeader title="Lịch sử phát sinh công nợ" description="Các giao dịch làm thay đổi số dư công nợ." />
        <DataTable
          columns={columns}
          rows={MOCK_LEDGER}
          rowKey={(l) => l.id}
          emptyTitle="Chưa có phát sinh"
        />
      </Card>
    </>
  );
}
