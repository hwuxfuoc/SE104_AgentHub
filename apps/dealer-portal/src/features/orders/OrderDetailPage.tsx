import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card, CardHeader, PageHeader, Badge } from '@/components/ui/Card';
import { formatDate, formatVnd } from '@/lib/format';
import type { SalesOrder, OrderStatus } from '@/lib/api/types';
import { OrderStatusBadge } from './badges';

/** Mock chi tiết đơn hàng — thay bằng useQuery GET /sales-orders/:id khi có API. */
const MOCK_DETAIL: SalesOrder = {
  id:          'o1',
  orderNumber: 'DH-2026-0042',
  status:      'SHIPPED',
  totalAmount: 2_100_000,
  createdAt:   '2026-11-10T08:00:00.000Z',
  approvedAt:  '2026-11-10T10:00:00.000Z',
  notes:       'Giao trước 17h, liên hệ anh Nam.',
  items: [
    { id: 'i1', skuId: 'sku-2', skuCode: 'SP-002', productName: 'Gạo tám thơm',     unit: 'Thùng', quantity: 5,  unitPrice: 320_000, amount: 1_600_000 },
    { id: 'i2', skuId: 'sku-3', skuCode: 'SP-003', productName: 'Nước mắm Phú Quốc', unit: 'Chai',  quantity: 10, unitPrice: 51_000,  amount: 510_000  },
  ],
};

const TIMELINE = [
  { label: 'Đơn hàng được tạo',    time: '2026-11-10T08:00:00.000Z', done: true },
  { label: 'Đã duyệt',             time: '2026-11-10T10:00:00.000Z', done: true },
  { label: 'Đang chuẩn bị hàng',  time: null, done: true },
  { label: 'Đang giao hàng',       time: null, done: true },
  { label: 'Giao hàng thành công', time: null, done: false },
];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const order = MOCK_DETAIL; // Thay: const { data: order } = useOrder(id)

  return (
    <>
      <div className="mb-6">
        <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Quay lại danh sách đơn hàng
        </Link>
      </div>

      <PageHeader
        title={order.orderNumber}
        description={`Ngày tạo: ${formatDate(order.createdAt)}`}
        actions={<OrderStatusBadge status={order.status as OrderStatus} />}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Chi tiết sản phẩm" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-muted">
                    <th className="px-4 py-3 text-left font-medium">Sản phẩm</th>
                    <th className="px-4 py-3 text-left font-medium">Đơn vị</th>
                    <th className="px-4 py-3 text-right font-medium">Đơn giá</th>
                    <th className="px-4 py-3 text-right font-medium">Số lượng</th>
                    <th className="px-4 py-3 text-right font-medium">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-muted font-mono">{item.skuCode}</p>
                      </td>
                      <td className="px-4 py-3 text-muted">{item.unit}</td>
                      <td className="px-4 py-3 text-right tabular">{formatVnd(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-right tabular">{item.quantity}</td>
                      <td className="px-4 py-3 text-right tabular font-medium">{formatVnd(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line bg-surface-2">
                    <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold">Tổng cộng</td>
                    <td className="px-4 py-3 text-right tabular text-base font-bold">{formatVnd(order.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {order.notes && (
            <Card className="p-4">
              <p className="text-xs text-muted mb-1">Ghi chú</p>
              <p className="text-sm">{order.notes}</p>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Tiến trình đơn hàng" />
            <div className="p-5">
              <ol className="relative space-y-4 border-l border-line pl-5">
                {TIMELINE.map((step, i) => (
                  <li key={i} className="relative">
                    <div className={`absolute -left-[21px] flex size-4 items-center justify-center rounded-full border-2 ${step.done ? 'border-brand bg-brand' : 'border-line bg-surface'}`}>
                      {step.done && <div className="size-1.5 rounded-full bg-white" />}
                    </div>
                    <p className={`text-sm font-medium ${step.done ? 'text-ink' : 'text-muted'}`}>{step.label}</p>
                    {step.time && <p className="text-xs text-muted">{formatDate(step.time)}</p>}
                  </li>
                ))}
              </ol>
            </div>
          </Card>

          <Card className="p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Trạng thái</span>
              <OrderStatusBadge status={order.status as OrderStatus} />
            </div>
            {order.approvedAt && (
              <div className="flex justify-between">
                <span className="text-muted">Ngày duyệt</span>
                <span>{formatDate(order.approvedAt)}</span>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
