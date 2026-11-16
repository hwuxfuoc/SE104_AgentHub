import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/Fields';
import { formatVnd } from '@/lib/format';

/** Mock SKUs — P1 dev thay bằng useQuery khi có API. */
const MOCK_SKUS = [
  { id: 'sku-1', code: 'SP-001', productName: 'Gạo tám thơm',     unit: 'Kg',    exportPrice: 32_000 },
  { id: 'sku-2', code: 'SP-002', productName: 'Gạo tám thơm',     unit: 'Thùng', exportPrice: 320_000 },
  { id: 'sku-3', code: 'SP-003', productName: 'Nước mắm Phú Quốc', unit: 'Chai', exportPrice: 51_000 },
  { id: 'sku-4', code: 'SP-004', productName: 'Dầu ăn Tường An',  unit: 'Lít',   exportPrice: 56_100 },
  { id: 'sku-5', code: 'SP-005', productName: 'Nước ngọt Pepsi',   unit: 'Thùng', exportPrice: 285_000 },
];

interface LineItem {
  skuId: string;
  quantity: number;
}

export default function NewOrderPage() {
  const navigate = useNavigate();
  const [lines, setLines]   = useState<LineItem[]>([{ skuId: '', quantity: 1 }]);
  const [notes, setNotes]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  const addLine = () => setLines((l) => [...l, { skuId: '', quantity: 1 }]);
  const removeLine = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));
  const setSkuId   = (i: number, skuId: string) => setLines((l) => l.map((x, idx) => idx === i ? { ...x, skuId } : x));
  const setQty     = (i: number, qty: number)   => setLines((l) => l.map((x, idx) => idx === i ? { ...x, quantity: Math.max(1, qty) } : x));

  const total = lines.reduce((sum, ln) => {
    const sku = MOCK_SKUS.find((s) => s.id === ln.skuId);
    return sum + (sku ? sku.exportPrice * ln.quantity : 0);
  }, 0);

  const canSubmit = lines.some((l) => l.skuId);

  const handleSubmit = async () => {
    setSubmitting(true);
    // TODO: gọi API POST /sales-orders khi P4 backend sẵn sàng
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    navigate('/orders');
  };

  return (
    <>
      <PageHeader title="Đặt hàng mới" description="Chọn sản phẩm và số lượng để tạo đơn hàng." />

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardHeader title="Danh sách sản phẩm" />
          <div className="p-5 space-y-3">
            {lines.map((ln, i) => {
              const sku = MOCK_SKUS.find((s) => s.id === ln.skuId);
              return (
                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-3">
                  <Select
                    label={i === 0 ? 'Sản phẩm' : undefined}
                    value={ln.skuId}
                    onChange={(e) => setSkuId(i, e.target.value)}
                  >
                    <option value="">— Chọn sản phẩm —</option>
                    {MOCK_SKUS.map((s) => (
                      <option key={s.id} value={s.id}>{s.productName} ({s.unit})</option>
                    ))}
                  </Select>

                  <div className="flex items-center gap-1">
                    {i === 0 && <label className="mb-1.5 block text-xs font-medium text-muted">Số lượng</label>}
                    <div className="flex h-10 items-center rounded-xl border border-line bg-surface">
                      <button type="button" onClick={() => setQty(i, ln.quantity - 1)} className="cursor-pointer px-2 text-muted hover:text-ink">
                        <Minus className="size-3.5" />
                      </button>
                      <span className="min-w-[2.5rem] text-center text-sm tabular">{ln.quantity}</span>
                      <button type="button" onClick={() => setQty(i, ln.quantity + 1)} className="cursor-pointer px-2 text-muted hover:text-ink">
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="pb-0.5 text-right">
                    {i === 0 && <p className="mb-1.5 text-xs font-medium text-muted">Thành tiền</p>}
                    <p className="text-sm font-medium tabular">{sku ? formatVnd(sku.exportPrice * ln.quantity) : '—'}</p>
                  </div>

                  <div className={i === 0 ? 'pt-5' : ''}>
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      disabled={lines.length === 1}
                      className="cursor-pointer rounded-lg p-2.5 text-muted hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            <Button variant="secondary" icon={<Plus className="size-4" />} onClick={addLine} className="w-full mt-2">
              Thêm sản phẩm
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Ghi chú" />
            <div className="p-5">
              <Textarea
                placeholder="Ghi chú đặc biệt cho đơn hàng (không bắt buộc)…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between border-b border-line pb-4">
              <span className="text-sm text-muted">Tổng tiền tạm tính</span>
              <span className="text-xl font-bold tabular">{formatVnd(total)}</span>
            </div>
            <p className="mb-4 text-xs text-muted">
              Giá xuất tính theo bảng giá hiện hành. Đơn hàng cần được phê duyệt trước khi giao.
            </p>
            <div className="flex flex-col gap-2">
              <Button loading={submitting} disabled={!canSubmit} onClick={handleSubmit} className="w-full">
                Gửi đơn hàng
              </Button>
              <Button variant="secondary" onClick={() => navigate('/orders')} className="w-full">
                Hủy
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
