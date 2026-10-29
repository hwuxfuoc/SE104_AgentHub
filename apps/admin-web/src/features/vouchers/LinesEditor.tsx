import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Fields';
import { MoneyInput } from '@/components/ui/MoneyInput';
import type { Product } from '@/lib/api/types';
import { formatNumber, formatVnd } from '@/lib/format';

export interface LineDraft {
  key: number;
  productId: string;
  quantity: number | undefined;
  unitPrice: number | undefined;
}

let k = 0;
export const newLine = (): LineDraft => ({ key: ++k, productId: '', quantity: undefined, unitPrice: undefined });

export const lineAmount = (l: LineDraft, products: Product[], mode: 'purchase' | 'sales') => {
  const p = products.find((x) => x.id === l.productId);
  const price = mode === 'sales' ? p?.exportPrice ?? 0 : l.unitPrice ?? 0;
  return (l.quantity ?? 0) * price;
};

/** Bảng dòng hàng dùng chung cho BM2 (nhập: sửa đơn giá nhập) và BM3 (xuất: đơn giá xuất = giá nhập × tỷ lệ, chỉ đọc). */
export function LinesEditor({ mode, lines, onChange, products }: { mode: 'purchase' | 'sales'; lines: LineDraft[]; onChange: (l: LineDraft[]) => void; products: Product[] }) {
  const patch = (key: number, p: Partial<LineDraft>) => onChange(lines.map((l) => (l.key === key ? { ...l, ...p } : l)));
  const total = lines.reduce((s, l) => s + lineAmount(l, products, mode), 0);

  return (
    <div className="space-y-3">
      {lines.map((l, i) => {
        const p = products.find((x) => x.id === l.productId);
        const over = mode === 'sales' && p && (l.quantity ?? 0) > p.stock;
        return (
          <div key={l.key} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1.6fr_0.8fr_1fr_auto] sm:items-start">
            <Select
              aria-label={`Mặt hàng dòng ${i + 1}`}
              value={l.productId}
              onChange={(e) => {
                const prod = products.find((x) => x.id === e.target.value);
                patch(l.key, { productId: e.target.value, unitPrice: prod?.importPrice });
              }}
            >
              <option value="">Chọn mặt hàng…</option>
              {products.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} ({x.unit}){mode === 'sales' ? ` · tồn ${x.stock}` : ''}
                </option>
              ))}
            </Select>
            <Input
              aria-label={`Số lượng dòng ${i + 1}`}
              type="number"
              min={1}
              placeholder="Số lượng"
              value={l.quantity ?? ''}
              error={over ? `Tồn chỉ còn ${p!.stock}` : undefined}
              onChange={(e) => patch(l.key, { quantity: e.target.value ? Math.floor(Number(e.target.value)) : undefined })}
            />
            {mode === 'purchase' ? (
              <MoneyInput aria-label={`Đơn giá nhập dòng ${i + 1}`} placeholder="Đơn giá nhập" value={l.unitPrice} onValueChange={(v) => patch(l.key, { unitPrice: v })} />
            ) : (
              <div className="flex h-10 items-center rounded-xl bg-surface-2 px-3 text-sm tabular text-muted" title="Đơn giá xuất = đơn giá nhập × tỷ lệ (QĐ3)">
                {p ? formatVnd(p.exportPrice) : 'Đơn giá xuất'}
              </div>
            )}
            <div className="flex items-center gap-2 sm:h-10">
              <span className="min-w-24 text-right text-sm font-semibold tabular">{formatNumber(lineAmount(l, products, mode))}</span>
              <button type="button" aria-label={`Xóa dòng ${i + 1}`} disabled={lines.length === 1} onClick={() => onChange(lines.filter((x) => x.key !== l.key))} className="cursor-pointer rounded-lg p-2 text-muted hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-30">
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" icon={<Plus className="size-4" />} onClick={() => onChange([...lines, newLine()])}>
          Thêm dòng hàng
        </Button>
        <p className="text-sm">
          Tổng tiền: <b className="text-lg tabular">{formatVnd(total)}</b>
        </p>
      </div>
    </div>
  );
}
