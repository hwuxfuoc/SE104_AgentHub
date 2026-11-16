import { useState } from 'react';
import { Search, Tag } from 'lucide-react';
import { Card, PageHeader, Badge } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Fields';
import { formatVnd, formatDate } from '@/lib/format';

/** Mock catalog data — P1 dev thay bằng API call khi backend ready. */
const MOCK_CATEGORIES = [
  { id: 'cat-1', name: 'Thực phẩm' },
  { id: 'cat-2', name: 'Đồ uống' },
  { id: 'cat-3', name: 'Gia dụng' },
];

const MOCK_SKUS = [
  { id: 'sku-1', code: 'SP-001', productName: 'Gạo tám thơm',    category: 'Thực phẩm', unit: 'Kg',    exportPrice: 32_000,  importPrice: 31_373, promotionDiscount: 0 },
  { id: 'sku-2', code: 'SP-002', productName: 'Gạo tám thơm',    category: 'Thực phẩm', unit: 'Thùng', exportPrice: 320_000, importPrice: 313_726, promotionDiscount: 5 },
  { id: 'sku-3', code: 'SP-003', productName: 'Nước mắm Phú Quốc', category: 'Thực phẩm', unit: 'Chai', exportPrice: 51_000,  importPrice: 50_000, promotionDiscount: 0 },
  { id: 'sku-4', code: 'SP-004', productName: 'Dầu ăn Tường An', category: 'Thực phẩm', unit: 'Lít',   exportPrice: 56_100,  importPrice: 55_000, promotionDiscount: 0 },
  { id: 'sku-5', code: 'SP-005', productName: 'Nước ngọt Pepsi',  category: 'Đồ uống',   unit: 'Thùng', exportPrice: 285_000, importPrice: 279_412, promotionDiscount: 10 },
];

const MOCK_PROMOTIONS = [
  { id: 'promo-1', skuId: 'sku-2', name: 'KM tháng 11 - Gạo thùng', discountPercent: 5,  minimumQuantity: 10, effectiveTo: '2026-11-30' },
  { id: 'promo-2', skuId: 'sku-5', name: 'KM Pepsi mùa lễ',          discountPercent: 10, minimumQuantity: 5,  effectiveTo: '2026-12-31' },
];

export default function CatalogPage() {
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('');

  const filtered = MOCK_SKUS.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.productName.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
    const matchCat    = !category || s.category === category;
    return matchSearch && matchCat;
  });

  return (
    <>
      <PageHeader title="Danh mục sản phẩm" description="Xem sản phẩm, đơn vị tính, bảng giá xuất và khuyến mãi đang áp dụng." />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-56">
          <Input placeholder="Tìm theo tên hoặc mã sản phẩm…" leading={<Search className="size-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-48">
          <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Lọc danh mục">
            <option value="">Mọi danh mục</option>
            {MOCK_CATEGORIES.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </Select>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="px-4 py-3 text-left font-medium">Mã</th>
                <th className="px-4 py-3 text-left font-medium">Sản phẩm</th>
                <th className="px-4 py-3 text-left font-medium">Danh mục</th>
                <th className="px-4 py-3 text-left font-medium">Đơn vị</th>
                <th className="px-4 py-3 text-right font-medium">Giá xuất</th>
                <th className="px-4 py-3 text-left font-medium">Khuyến mãi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const promo = MOCK_PROMOTIONS.find((p) => p.skuId === s.id);
                return (
                  <tr key={s.id} className="border-b border-line last:border-0 hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3"><span className="font-mono text-xs text-muted">{s.code}</span></td>
                    <td className="px-4 py-3 font-medium">{s.productName}</td>
                    <td className="px-4 py-3 text-muted">{s.category}</td>
                    <td className="px-4 py-3 text-muted">{s.unit}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular">{formatVnd(s.exportPrice)}</td>
                    <td className="px-4 py-3">
                      {promo ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning">
                          <Tag className="size-3" />
                          -{promo.discountPercent}% (≥{promo.minimumQuantity} {s.unit}) · đến {formatDate(promo.effectiveTo)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-muted">Không tìm thấy sản phẩm phù hợp.</p>
          )}
        </div>
      </Card>

      {MOCK_PROMOTIONS.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-3 text-sm font-semibold text-muted">Khuyến mãi đang áp dụng</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {MOCK_PROMOTIONS.map((p) => {
              const sku = MOCK_SKUS.find((s) => s.id === p.skuId);
              return (
                <Card key={p.id} className="flex items-center gap-4 p-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning">
                    <Tag className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{p.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      Giảm {p.discountPercent}% · đặt từ {p.minimumQuantity} {sku?.unit} · đến {formatDate(p.effectiveTo)}
                    </p>
                  </div>
                  <Badge tone="warning">-{p.discountPercent}%</Badge>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
