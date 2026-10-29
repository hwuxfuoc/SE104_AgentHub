import { Overlay } from '@/components/ui/Overlay';
import { formatNumber, formatVnd } from '@/lib/format';
import type { VoucherLine } from '@/lib/api/types';

/** Chi tiết phiếu (BM2/BM3) dạng bảng giống biểu mẫu: STT, Mặt hàng, ĐVT, Số lượng, Đơn giá, Thành tiền. */
export function VoucherDetail({ title, subtitle, lines, summary, onClose }: { title: string; subtitle: string; lines: VoucherLine[]; summary: Array<[string, number]>; onClose: () => void }) {
  return (
    <Overlay open onClose={onClose} title={title} description={subtitle} width="max-w-2xl">
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface-2/60 text-xs text-muted uppercase">
            <tr>
              {['STT', 'Mặt hàng', 'ĐVT', 'Số lượng', 'Đơn giá', 'Thành tiền'].map((h, i) => (
                <th key={h} className={`px-3 py-2.5 font-medium ${i > 2 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-t border-line">
                <td className="px-3 py-2.5 text-muted">{i + 1}</td>
                <td className="px-3 py-2.5 font-medium">{l.productName}</td>
                <td className="px-3 py-2.5">{l.unit}</td>
                <td className="px-3 py-2.5 text-right tabular">{formatNumber(l.quantity)}</td>
                <td className="px-3 py-2.5 text-right tabular">{formatNumber(l.unitPrice)}</td>
                <td className="px-3 py-2.5 text-right font-medium tabular">{formatNumber(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="mt-4 ml-auto max-w-xs space-y-1.5 text-sm">
        {summary.map(([k, v], i) => (
          <div key={k} className={`flex justify-between ${i === 0 ? 'font-semibold' : 'text-muted'}`}>
            <dt>{k}</dt>
            <dd className="tabular">{formatVnd(v)}</dd>
          </div>
        ))}
      </dl>
    </Overlay>
  );
}
