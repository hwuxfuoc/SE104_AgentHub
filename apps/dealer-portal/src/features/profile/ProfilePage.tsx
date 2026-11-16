import { Building2, Mail, MapPin, Phone } from 'lucide-react';
import { Card, CardHeader, Badge, PageHeader, Skeleton } from '@/components/ui/Card';
import { formatDate, formatVnd } from '@/lib/format';

/** BM1 — Hồ sơ đại lý. Data được load từ /dealers/:id hoặc /auth/profile khi có API. */
const MOCK_PROFILE = {
  id:           'mock-id',
  code:         'DL-001',
  name:         'Đại lý Minh Phát',
  phone:        '0901234567',
  address:      '123 Nguyễn Văn Linh, Quận 7',
  email:        'dealer1@agenthub.vn',
  district:     { name: 'Quận 7' },
  tier:         { name: 'Loại 1', maxDebt: 10_000_000 },
  receivedDate: '2024-03-15T00:00:00.000Z',
  status:       'ACTIVE' as const,
  currentDebt:  4_200_000,
};

export default function ProfilePage() {
  const p = MOCK_PROFILE;

  return (
    <>
      <PageHeader title="Hồ sơ đại lý" description="Thông tin hồ sơ và tình trạng công nợ của đại lý (BM1)." />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader title="Thông tin chung" />
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <InfoRow icon={Building2} label="Tên đại lý" value={p.name} />
            <InfoRow icon={null}      label="Mã đại lý"  value={<span className="font-mono font-medium">{p.code}</span>} />
            <InfoRow icon={Phone}     label="Điện thoại" value={p.phone} />
            <InfoRow icon={Mail}      label="Email"      value={p.email} />
            <InfoRow icon={MapPin}    label="Địa chỉ"    value={p.address} />
            <InfoRow icon={null}      label="Quận"       value={p.district.name} />
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Loại & Trạng thái" />
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Loại đại lý</span>
                <Badge tone="brand">{p.tier.name}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Trạng thái</span>
                <Badge tone={p.status === 'ACTIVE' ? 'success' : p.status === 'SUSPENDED' ? 'danger' : 'neutral'} dot>
                  {p.status === 'ACTIVE' ? 'Hoạt động' : p.status === 'SUSPENDED' ? 'Tạm khóa' : 'Ngưng'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Ngày tiếp nhận</span>
                <span className="text-sm font-medium">{formatDate(p.receivedDate)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Tình trạng công nợ" />
            <div className="p-5">
              <div className="mb-3 flex items-end justify-between">
                <span className="text-xs text-muted">Nợ hiện tại</span>
                <span className="text-lg font-semibold tabular text-danger">{formatVnd(p.currentDebt)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${Math.min(100, (p.currentDebt / p.tier.maxDebt) * 100)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted">
                <span>0 ₫</span>
                <span>Hạn mức: {formatVnd(p.tier.maxDebt)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Building2 | null; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      {Icon ? (
        <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
          <Icon className="size-3.5" />
        </div>
      ) : (
        <div className="size-7 shrink-0" />
      )}
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-0.5 text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export { Skeleton };
