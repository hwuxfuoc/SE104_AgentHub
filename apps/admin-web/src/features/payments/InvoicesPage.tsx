import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, PageHeader } from '@/components/ui/Card';
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable';
import { Select } from '@/components/ui/Fields';
import { errorMessage } from '@/lib/api/errors';
import type { Invoice, InvoiceStatus } from '@/lib/api/types';
import { formatDate, formatVnd } from '@/lib/format';
import { useInvoices } from './api';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';

export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<InvoiceStatus | ''>('');
  const { data, isLoading, error } = useInvoices(page, status);

  const columns: Column<Invoice>[] = [
    { key: 'no', header: 'Số hóa đơn', cell: (i) => <span className="font-mono text-xs font-semibold">{i.invoiceNumber}</span> },
    { key: 'date', header: 'Ngày lập', cell: (i) => formatDate(i.issueDate) },
    { key: 'due', header: 'Hạn thanh toán', cell: (i) => (i.dueDate ? formatDate(i.dueDate) : '—') },
    { key: 'dealer', header: 'Đại lý', cell: (i) => <Link to={`/dealers/${i.dealerId}`} className="font-medium hover:text-brand hover:underline">{i.dealer?.name ?? i.dealerId}</Link> },
    { key: 'total', header: 'Tổng tiền', align: 'right', cell: (i) => <span className="tabular">{formatVnd(i.totalAmount)}</span> },
    { key: 'paid', header: 'Đã thu', align: 'right', cell: (i) => <span className="tabular text-success">{formatVnd(i.paidAmount)}</span> },
    { key: 'rem', header: 'Còn lại', align: 'right', cell: (i) => <b className="tabular">{formatVnd(i.remainingAmount)}</b> },
    { key: 'st', header: 'Trạng thái', cell: (i) => <InvoiceStatusBadge status={i.status} /> },
  ];

  return (
    <>
      <PageHeader title="Hóa đơn" description="Hóa đơn phát sinh từ phiếu xuất hàng; tiền thu được phân bổ theo FIFO." />
      <Card>
        <div className="max-w-xs border-b border-line p-4">
          <Select value={status} onChange={(e) => { setStatus(e.target.value as InvoiceStatus | ''); setPage(1); }} aria-label="Lọc trạng thái">
            <option value="">Mọi trạng thái</option>
            <option value="UNPAID">Chưa thanh toán</option>
            <option value="PARTIALLY_PAID">Thanh toán một phần</option>
            <option value="PAID">Đã thanh toán</option>
          </Select>
        </div>
        {error ? <p className="p-6 text-sm text-danger">{errorMessage(error)}</p> : <DataTable columns={columns} rows={data?.items} loading={isLoading} rowKey={(i) => i.id} emptyTitle="Không có hóa đơn" />}
        <Pagination info={data?.pagination} onPage={setPage} />
      </Card>
    </>
  );
}
