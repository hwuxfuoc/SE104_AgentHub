import { Badge } from '@/components/ui/Card';
import type { InvoiceStatus } from '@/lib/api/types';

const MAP = {
  UNPAID: { tone: 'danger', label: 'Chưa thanh toán' },
  PARTIALLY_PAID: { tone: 'warning', label: 'Thanh toán một phần' },
  PAID: { tone: 'success', label: 'Đã thanh toán' },
  CANCELLED: { tone: 'neutral', label: 'Đã hủy' },
} as const;

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const s = MAP[status];
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}
