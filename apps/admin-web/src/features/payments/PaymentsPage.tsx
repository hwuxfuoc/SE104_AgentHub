import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { can } from '@/auth/permissions';
import { Button } from '@/components/ui/Button';
import { Badge, Card, PageHeader } from '@/components/ui/Card';
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable';
import { errorMessage } from '@/lib/api/errors';
import type { Payment } from '@/lib/api/types';
import { formatDate, formatVnd } from '@/lib/format';
import { usePayments } from './api';
import { PaymentFormDrawer } from './PaymentFormDrawer';

/** BM5 – Danh sách phiếu thu tiền. */
export default function PaymentsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = usePayments(page);

  const columns: Column<Payment>[] = [
    { key: 'no', header: 'Số phiếu', cell: (p) => <span className="font-mono text-xs font-semibold">{p.receiptNumber}</span> },
    { key: 'date', header: 'Ngày thu', cell: (p) => formatDate(p.paymentDate) },
    {
      key: 'dealer',
      header: 'Đại lý',
      cell: (p) => (
        <Link to={`/dealers/${p.dealerId}`} className="font-medium hover:text-brand hover:underline">
          {p.dealer?.name ?? p.dealerId}
        </Link>
      ),
    },
    { key: 'method', header: 'Phương thức', cell: (p) => <Badge tone={p.paymentMethod === 'CASH' ? 'neutral' : 'info'}>{p.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}</Badge> },
    { key: 'inv', header: 'Phân bổ HĐ', cell: (p) => <span className="text-muted">{p.allocations?.map((a) => a.invoice.invoiceNumber).join(', ') || '—'}</span> },
    { key: 'by', header: 'Người thu', cell: (p) => p.collector?.fullName ?? '—' },
    { key: 'amount', header: 'Số tiền thu', align: 'right', cell: (p) => <b className="tabular text-success">{formatVnd(p.amount)}</b> },
  ];

  return (
    <>
      <PageHeader
        title="Thu tiền & Công nợ"
        description="Phiếu thu tiền (BM5). Chọn một đại lý trong danh sách để xem chi tiết công nợ."
        actions={
          can(user?.role, 'payments.write') && (
            <Button icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
              Lập phiếu thu
            </Button>
          )
        }
      />
      <Card>
        {error ? <p className="p-6 text-sm text-danger">{errorMessage(error)}</p> : <DataTable columns={columns} rows={data?.items} loading={isLoading} rowKey={(p) => p.id} emptyTitle="Chưa có phiếu thu" />}
        <Pagination info={data?.pagination} onPage={setPage} />
      </Card>
      <PaymentFormDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
