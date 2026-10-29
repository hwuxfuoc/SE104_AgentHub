import { Badge } from '@/components/ui/Card';
import { formatVnd } from '@/lib/format';
import type { DealerStatus } from '@/lib/api/types';

export function DealerStatusBadge({ status }: { status: DealerStatus }) {
  const map = {
    ACTIVE: { tone: 'success', label: 'Hoạt động' },
    INACTIVE: { tone: 'neutral', label: 'Ngưng hoạt động' },
    SUSPENDED: { tone: 'warning', label: 'Tạm khóa' },
  } as const;
  const s = map[status];
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

/** Màu theo mức sử dụng hạn mức nợ: <70% xanh, 70–100% vàng, >100% đỏ. */
export function DebtBadge({ debt, limit }: { debt: number; limit: number }) {
  const ratio = limit ? debt / limit : 0;
  const tone = debt === 0 ? 'neutral' : ratio > 1 ? 'danger' : ratio >= 0.7 ? 'warning' : 'success';
  return <Badge tone={tone}>{formatVnd(debt)}</Badge>;
}
