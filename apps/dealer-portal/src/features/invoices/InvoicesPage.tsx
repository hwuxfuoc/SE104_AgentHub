import { useState } from 'react';
import { Card, PageHeader, Badge } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Select } from '@/components/ui/Fields';
import { formatDate, formatVnd } from '@/lib/format';
import type { Invoice, InvoiceStatus } from '@/lib/api/types';

const MOCK_INVOICES: Invoice[] = [
  { id: 'inv-1', invoiceNumber: 'HD-2026-0042', totalAmount: 2_100_000, paidAmount: 0,         remainingAmount: 2_100_000, status: 'UNPAID',         issueDate: '2026-11-10', orderNumber: 'DH-2026-0042', salesOrderId: 'o1' },
  { id: 'inv-2', invoiceNumber: 'HD-2026-0038', totalAmount: 850_000,   paidAmount: 850_000,   remainingAmount: 0,         status: 'PAID',           issueDate: '2026-11-05', orderNumber: 'DH-2026-0038', salesOrderId: 'o3' },
  { id: 'inv-3', invoiceNumber: 'HD-2026-0031', totalAmount: 1_250_000, paidAmount: 500_000,   remainingAmount: 750_000,   status: 'PARTIALLY_PAID', issueDate: '2026-10-28', orderNumber: 'DH-2026-0031', salesOrderId: 'o4' },
];

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  UNPAID:         'Chưa thanh toán',
  PARTIALLY_PAID: 'Thanh toán một phần',
  PAID:           'Đã thanh toán',
  CANCELLED:      'Đã hủy',
};
const STATUS_TONE: Record<InvoiceStatus, 'danger' | 'warning' | 'success' | 'neutral'> = {
  UNPAID:         'danger',
  PARTIALLY_PAID: 'warning',
  PAID:           'success',
  CANCELLED:      'neutral',
};

export default function InvoicesPage() {
  const [status, setStatus] = useState('');

  const rows = MOCK_INVOICES.filter((inv) => !status || inv.status === status);

  const columns: Column<Invoice>[] = [
    {
      key: 'stt', header: 'STT',
      cell: (_, i) => <span className="text-muted tabular">{i + 1}</span>,
      className: 'w-14',
    },
    {
      key: 'no', header: 'Số hóa đơn',
      cell: (inv) => <span className="font-mono text-xs font-medium">{inv.invoiceNumber}</span>,
    },
    {
      key: 'order', header: 'Đơn hàng',
      cell: (inv) => inv.orderNumber ? <span className="font-mono text-xs text-muted">{inv.orderNumber}</span> : <span className="text-muted">—</span>,
    },
    { key: 'date',   header: 'Ngày lập', cell: (inv) => formatDate(inv.issueDate) },
    { key: 'total',  header: 'Tổng tiền',    align: 'right', cell: (inv) => <span className="tabular">{formatVnd(inv.totalAmount)}</span> },
    { key: 'paid',   header: 'Đã thanh toán', align: 'right', cell: (inv) => <span className="tabular text-success">{formatVnd(inv.paidAmount)}</span> },
    {
      key: 'remain', header: 'Còn lại', align: 'right',
      cell: (inv) => (
        <span className={`tabular font-semibold ${inv.remainingAmount > 0 ? 'text-danger' : 'text-muted'}`}>
          {formatVnd(inv.remainingAmount)}
        </span>
      ),
    },
    {
      key: 'status', header: 'Trạng thái',
      cell: (inv) => <Badge tone={STATUS_TONE[inv.status]}>{STATUS_LABEL[inv.status]}</Badge>,
    },
  ];

  return (
    <>
      <PageHeader title="Hóa đơn" description="Danh sách hóa đơn từ các đơn hàng đã được xử lý." />

      <Card>
        <div className="flex gap-3 border-b border-line p-4">
          <div className="w-52">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Lọc trạng thái">
              <option value="">Mọi trạng thái</option>
              <option value="UNPAID">Chưa thanh toán</option>
              <option value="PARTIALLY_PAID">Thanh toán một phần</option>
              <option value="PAID">Đã thanh toán</option>
            </Select>
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(inv) => inv.id}
          emptyTitle="Không có hóa đơn"
          emptyDescription="Hóa đơn sẽ được tạo khi đơn hàng được phê duyệt."
        />
      </Card>
    </>
  );
}
