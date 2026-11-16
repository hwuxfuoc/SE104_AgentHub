import { Badge } from '@/components/ui/Card';
import type { OrderStatus } from '@/lib/api/types';

const ORDER_STATUS: Record<OrderStatus, { label: string; tone: 'neutral' | 'brand' | 'warning' | 'success' | 'danger' | 'info' }> = {
  DRAFT:            { label: 'Nháp',          tone: 'neutral' },
  PENDING_APPROVAL: { label: 'Chờ duyệt',     tone: 'warning' },
  APPROVED:         { label: 'Đã duyệt',      tone: 'brand' },
  PROCESSING:       { label: 'Đang xử lý',    tone: 'info' },
  SHIPPED:          { label: 'Đang giao',     tone: 'info' },
  COMPLETED:        { label: 'Hoàn tất',      tone: 'success' },
  CANCELLED:        { label: 'Đã hủy',        tone: 'danger' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const s = ORDER_STATUS[status] ?? { label: status, tone: 'neutral' as const };
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}
