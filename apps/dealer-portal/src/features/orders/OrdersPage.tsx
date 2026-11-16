import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Input, Select } from '@/components/ui/Fields';
import { Button } from '@/components/ui/Button';
import { formatDate, formatVnd } from '@/lib/format';
import type { SalesOrder, OrderStatus } from '@/lib/api/types';
import { OrderStatusBadge } from './badges';

const MOCK_ORDERS: SalesOrder[] = [
  { id: 'o1', orderNumber: 'DH-2026-0042', status: 'SHIPPED',          totalAmount: 2_100_000, createdAt: '2026-11-10T08:00:00.000Z', approvedAt: '2026-11-10T10:00:00.000Z', items: [] },
  { id: 'o2', orderNumber: 'DH-2026-0040', status: 'PENDING_APPROVAL', totalAmount: 650_000,   createdAt: '2026-11-12T09:00:00.000Z', items: [] },
  { id: 'o3', orderNumber: 'DH-2026-0038', status: 'COMPLETED',        totalAmount: 850_000,   createdAt: '2026-11-05T07:00:00.000Z', approvedAt: '2026-11-05T09:00:00.000Z', items: [] },
  { id: 'o4', orderNumber: 'DH-2026-0031', status: 'COMPLETED',        totalAmount: 1_250_000, createdAt: '2026-10-28T08:00:00.000Z', approvedAt: '2026-10-28T11:00:00.000Z', items: [] },
  { id: 'o5', orderNumber: 'DH-2026-0025', status: 'CANCELLED',        totalAmount: 300_000,   createdAt: '2026-10-20T08:00:00.000Z', items: [] },
];

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Mọi trạng thái' },
  { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { value: 'APPROVED',         label: 'Đã duyệt' },
  { value: 'PROCESSING',       label: 'Đang xử lý' },
  { value: 'SHIPPED',          label: 'Đang giao' },
  { value: 'COMPLETED',        label: 'Hoàn tất' },
  { value: 'CANCELLED',        label: 'Đã hủy' },
];

export default function OrdersPage() {
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');

  const rows = MOCK_ORDERS.filter((o) => {
    const matchSearch = !search || o.orderNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !status || o.status === status;
    return matchSearch && matchStatus;
  });

  const columns: Column<SalesOrder>[] = [
    {
      key: 'stt', header: 'STT',
      cell: (_, i) => <span className="text-muted tabular">{i + 1}</span>,
      className: 'w-14',
    },
    {
      key: 'no', header: 'Số đơn',
      cell: (o) => (
        <Link to={`/orders/${o.id}`} className="font-mono text-xs font-medium text-brand hover:underline" onClick={(e) => e.stopPropagation()}>
          {o.orderNumber}
        </Link>
      ),
    },
    { key: 'date',   header: 'Ngày tạo',   cell: (o) => formatDate(o.createdAt) },
    { key: 'status', header: 'Trạng thái', cell: (o) => <OrderStatusBadge status={o.status as OrderStatus} /> },
    { key: 'total',  header: 'Tổng tiền', align: 'right', cell: (o) => <span className="tabular font-medium">{formatVnd(o.totalAmount)}</span> },
  ];

  return (
    <>
      <PageHeader
        title="Đơn hàng của tôi"
        description="Lịch sử đặt hàng và trạng thái giao hàng."
        actions={
          <Link to="/orders/new">
            <Button icon={<Plus className="size-4" />}>Đặt hàng mới</Button>
          </Link>
        }
      />

      <Card>
        <div className="flex flex-wrap gap-3 border-b border-line p-4">
          <div className="flex-1 min-w-56">
            <Input placeholder="Tìm số đơn hàng…" leading={<Search className="size-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="w-48">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Lọc trạng thái">
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(o) => o.id}
          emptyTitle="Không tìm thấy đơn hàng"
          emptyDescription="Thử thay đổi bộ lọc hoặc đặt đơn hàng mới."
        />
      </Card>
    </>
  );
}
