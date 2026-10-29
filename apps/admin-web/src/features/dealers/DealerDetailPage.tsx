import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Banknote, FileUp, Mail, MapPin, Pencil, Phone } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { can } from '@/auth/permissions';
import { Button } from '@/components/ui/Button';
import { Badge, Card, CardHeader, EmptyState, Skeleton } from '@/components/ui/Card';
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable';
import { cn } from '@/lib/cn';
import { errorMessage } from '@/lib/api/errors';
import type { DebtLedgerEntry, Invoice } from '@/lib/api/types';
import { formatDate, formatDateTime, formatVnd } from '@/lib/format';
import { PaymentFormDrawer } from '@/features/payments/PaymentFormDrawer';
import { InvoiceStatusBadge } from '@/features/payments/InvoiceStatusBadge';
import { useDealer, useDealerDebt, useDealerInvoices, useDealerLedger } from './api';
import { DealerFormDrawer } from './DealerFormDrawer';
import { DealerStatusBadge } from './badges';

const TYPE_LABEL: Record<DebtLedgerEntry['transactionType'], string> = { INVOICE: 'Xuất hàng', PAYMENT: 'Thu tiền', RETURN: 'Trả hàng', ADJUSTMENT: 'Điều chỉnh' };

export default function DealerDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [ledgerPage, setLedgerPage] = useState(1);
  const dealer = useDealer(id);
  const debt = useDealerDebt(id);
  const ledger = useDealerLedger(id, ledgerPage);
  const invoices = useDealerInvoices(id);

  if (dealer.error) return <EmptyState title="Không tải được đại lý" description={errorMessage(dealer.error)} action={<Link to="/dealers"><Button variant="secondary">Về danh sách</Button></Link>} />;
  const d = dealer.data;
  const dbt = debt.data;
  const used = dbt && dbt.maxDebtAllowed ? Math.min(100, (dbt.currentDebt / dbt.maxDebtAllowed) * 100) : 0;
  const meterTone = !dbt ? 'bg-brand' : dbt.isDebtExceeded ? 'bg-danger' : used >= 70 ? 'bg-warning' : 'bg-success';

  const ledgerCols: Column<DebtLedgerEntry>[] = [
    { key: 'date', header: 'Thời điểm', cell: (e) => <span className="text-muted">{formatDateTime(e.createdAt)}</span> },
    { key: 'type', header: 'Loại', cell: (e) => <Badge tone={e.transactionType === 'PAYMENT' ? 'success' : 'info'}>{TYPE_LABEL[e.transactionType]}</Badge> },
    { key: 'ref', header: 'Chứng từ', cell: (e) => <span className="font-mono text-xs">{e.referenceCode ?? '—'}</span> },
    { key: 'debit', header: 'Tăng nợ', align: 'right', cell: (e) => (e.debitAmount ? <span className="tabular text-danger">+{formatVnd(e.debitAmount)}</span> : '—') },
    { key: 'credit', header: 'Giảm nợ', align: 'right', cell: (e) => (e.creditAmount ? <span className="tabular text-success">−{formatVnd(e.creditAmount)}</span> : '—') },
    { key: 'bal', header: 'Dư nợ', align: 'right', cell: (e) => <span className="tabular font-medium">{formatVnd(e.currentBalance)}</span> },
  ];
  const invoiceCols: Column<Invoice>[] = [
    { key: 'no', header: 'Số HĐ', cell: (i) => <span className="font-mono text-xs font-medium">{i.invoiceNumber}</span> },
    { key: 'date', header: 'Ngày lập', cell: (i) => formatDate(i.issueDate) },
    { key: 'total', header: 'Tổng', align: 'right', cell: (i) => <span className="tabular">{formatVnd(i.totalAmount)}</span> },
    { key: 'rem', header: 'Còn lại', align: 'right', cell: (i) => <span className="tabular">{formatVnd(i.remainingAmount)}</span> },
    { key: 'st', header: 'Trạng thái', cell: (i) => <InvoiceStatusBadge status={i.status} /> },
  ];

  return (
    <>
      <Link to="/dealers" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Danh sách đại lý
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          {d ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{d.name}</h1>
                <DealerStatusBadge status={d.status} />
              </div>
              <p className="mt-1 text-sm text-muted">
                <span className="font-mono">{d.code}</span> · {d.tier.name} · {d.district.name} · tiếp nhận {formatDate(d.receivedDate)}
              </p>
            </>
          ) : (
            <Skeleton className="h-8 w-64" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {can(user?.role, 'dealers.write') && (
            <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)} disabled={!d}>
              Sửa hồ sơ
            </Button>
          )}
          {can(user?.role, 'sales-vouchers') && user?.role !== 'ACCOUNTANT' && (
            <Link to={`/sales-vouchers?dealerId=${id}&new=1`}>
              <Button variant="secondary" icon={<FileUp className="size-4" />}>Lập phiếu xuất</Button>
            </Link>
          )}
          {can(user?.role, 'payments.write') && (
            <Button icon={<Banknote className="size-4" />} onClick={() => setPaying(true)} disabled={!d || !dbt?.currentDebt}>
              Lập phiếu thu
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Công nợ & hạn mức" description="Hạn mức theo loại đại lý (QĐ3)" />
          <div className="p-5">
            {!dbt ? (
              <Skeleton className="h-24" />
            ) : (
              <>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted">Tiền nợ hiện tại</p>
                    <p className={cn('text-3xl font-bold tabular', dbt.isDebtExceeded && 'text-danger')}>{formatVnd(dbt.currentDebt)}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-muted">Hạn mức tối đa</p>
                    <p className="font-semibold tabular">{formatVnd(dbt.maxDebtAllowed)}</p>
                  </div>
                </div>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(used)} aria-valuemin={0} aria-valuemax={100}>
                  <div className={cn('h-full rounded-full transition-all duration-700', meterTone)} style={{ width: `${used}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted">
                  <span>Đã dùng {used.toFixed(0)}%</span>
                  <span>Còn được nợ thêm: <b className="text-ink tabular">{formatVnd(dbt.remainingCredit)}</b></span>
                </div>
                {dbt.isDebtExceeded && <p className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">Đại lý đang vượt hạn mức nợ — không thể lập phiếu xuất cho đến khi giảm nợ.</p>}
              </>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Liên hệ" />
          <ul className="space-y-3.5 p-5 text-sm">
            {d ? (
              <>
                <li className="flex gap-3"><Phone className="mt-0.5 size-4 shrink-0 text-muted" />{d.phone}</li>
                <li className="flex gap-3"><Mail className="mt-0.5 size-4 shrink-0 text-muted" />{d.email || '—'}</li>
                <li className="flex gap-3"><MapPin className="mt-0.5 size-4 shrink-0 text-muted" />{d.address}, {d.district.name}</li>
              </>
            ) : (
              <Skeleton className="h-20" />
            )}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Sổ công nợ" description="Lịch sử biến động công nợ (bất biến)" />
          <DataTable columns={ledgerCols} rows={ledger.data?.items} loading={ledger.isLoading} rowKey={(e) => e.id} emptyTitle="Chưa có giao dịch" />
          <Pagination info={ledger.data?.pagination} onPage={setLedgerPage} />
        </Card>

        <Card>
          <CardHeader title="Hóa đơn gần đây" />
          <DataTable columns={invoiceCols.slice(0, 1).concat(invoiceCols.slice(3))} rows={invoices.data?.items} loading={invoices.isLoading} rowKey={(i) => i.id} emptyTitle="Chưa có hóa đơn" />
        </Card>
      </div>

      {d && <DealerFormDrawer open={editing} onClose={() => setEditing(false)} dealer={d} />}
      {d && <PaymentFormDrawer open={paying} onClose={() => setPaying(false)} defaultDealerId={d.id} />}
    </>
  );
}
