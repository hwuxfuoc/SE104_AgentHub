import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, PageHeader, Badge } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/Fields';
import { formatDate, formatVnd } from '@/lib/format';
import type { ReturnRequest, ReturnStatus } from '@/lib/api/types';

const MOCK_RETURNS: ReturnRequest[] = [
  { id: 'r1', returnNumber: 'TH-2026-0003', salesOrderId: 'o3', orderNumber: 'DH-2026-0038', status: 'COMPLETED', reason: 'Hàng bị hỏng khi vận chuyển', debtCreditAmount: 170_000, createdAt: '2026-11-08' },
  { id: 'r2', returnNumber: 'TH-2026-0002', salesOrderId: 'o4', orderNumber: 'DH-2026-0031', status: 'APPROVED',  reason: 'Sản phẩm không đúng quy cách', debtCreditAmount: 0,       createdAt: '2026-11-01' },
];

const STATUS_LABEL: Record<ReturnStatus, string> = {
  REQUESTED: 'Đang chờ',
  APPROVED:  'Đã duyệt',
  REJECTED:  'Từ chối',
  COMPLETED: 'Hoàn tất',
};
const STATUS_TONE: Record<ReturnStatus, 'warning' | 'brand' | 'danger' | 'success'> = {
  REQUESTED: 'warning',
  APPROVED:  'brand',
  REJECTED:  'danger',
  COMPLETED: 'success',
};

const columns: Column<ReturnRequest>[] = [
  { key: 'no',    header: 'Số phiếu',    cell: (r) => <span className="font-mono text-xs font-medium">{r.returnNumber}</span> },
  { key: 'order', header: 'Đơn hàng',   cell: (r) => <span className="font-mono text-xs text-muted">{r.orderNumber}</span> },
  { key: 'date',  header: 'Ngày tạo',    cell: (r) => formatDate(r.createdAt) },
  { key: 'reason', header: 'Lý do',     cell: (r) => <span className="line-clamp-1 max-w-[200px]">{r.reason}</span> },
  { key: 'credit', header: 'Giảm nợ', align: 'right', cell: (r) => r.debtCreditAmount > 0 ? <span className="tabular font-medium text-success">{formatVnd(r.debtCreditAmount)}</span> : <span className="text-muted">—</span> },
  { key: 'status', header: 'Trạng thái', cell: (r) => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge> },
];

export default function ReturnsPage() {
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason]     = useState('');
  const [orderId, setOrderId]   = useState('');

  return (
    <>
      <PageHeader
        title="Yêu cầu trả hàng"
        description="Gửi và theo dõi yêu cầu trả hàng."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setShowForm(true)}>
            Yêu cầu trả hàng
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-5">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-[15px] font-semibold">Tạo yêu cầu trả hàng mới</h2>
            <p className="mt-0.5 text-xs text-muted">Điền thông tin bên dưới. Nhân viên sẽ liên hệ xác nhận sau.</p>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Select label="Đơn hàng cần trả" required value={orderId} onChange={(e) => setOrderId(e.target.value)}>
              <option value="">— Chọn đơn hàng —</option>
              <option value="o3">DH-2026-0038</option>
              <option value="o4">DH-2026-0031</option>
            </Select>
            <div className="sm:col-span-2">
              <Textarea
                label="Lý do trả hàng"
                required
                placeholder="Mô tả chi tiết lý do trả hàng (hỏng hóc, không đúng quy cách…)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-line px-5 py-4">
            <Button variant="secondary" onClick={() => { setShowForm(false); setReason(''); setOrderId(''); }}>Hủy</Button>
            <Button disabled={!orderId || !reason.trim()}>Gửi yêu cầu</Button>
          </div>
        </Card>
      )}

      <Card>
        <DataTable
          columns={columns}
          rows={MOCK_RETURNS}
          rowKey={(r) => r.id}
          emptyTitle="Chưa có yêu cầu trả hàng"
          emptyDescription="Nhấn nút trên để tạo yêu cầu trả hàng mới."
        />
      </Card>
    </>
  );
}
