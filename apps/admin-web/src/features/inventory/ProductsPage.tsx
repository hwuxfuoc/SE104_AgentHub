import { Card, Badge, PageHeader } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { MockNotice } from '@/components/ui/MockNotice';
import { errorMessage } from '@/lib/api/errors';
import type { Product } from '@/lib/api/types';
import { formatNumber, formatVnd } from '@/lib/format';
import { useProducts } from '@/features/vouchers/api';

/** Danh mục mặt hàng, đơn giá nhập/xuất và tồn kho. (Backend chưa có API → mock.) */
export default function ProductsPage() {
  const { data, isLoading, error } = useProducts();

  const columns: Column<Product>[] = [
    { key: 'code', header: 'Mã', cell: (p) => <span className="font-mono text-xs font-semibold">{p.code}</span> },
    { key: 'name', header: 'Mặt hàng', cell: (p) => <div><p className="font-medium">{p.name}</p><p className="text-xs text-muted">{p.category}</p></div> },
    { key: 'unit', header: 'ĐVT', cell: (p) => p.unit },
    { key: 'imp', header: 'Đơn giá nhập', align: 'right', cell: (p) => <span className="tabular">{formatVnd(p.importPrice)}</span> },
    { key: 'exp', header: 'Đơn giá xuất', align: 'right', cell: (p) => <span className="tabular">{formatVnd(p.exportPrice)}</span> },
    { key: 'stock', header: 'Tồn kho', align: 'right', cell: (p) => <Badge tone={p.stock < 30 ? 'danger' : p.stock < 80 ? 'warning' : 'success'}>{formatNumber(p.stock)}</Badge> },
  ];

  return (
    <>
      <PageHeader title="Hàng hóa & Tồn kho" description="Danh mục mặt hàng (QĐ2), giá nhập/xuất và tồn kho hiện tại." />
      <MockNotice>Backend chưa có API Product/SKU/Pricing/Inventory (P3/P4). Màn hình dùng contract đề xuất GET /products, /inventory.</MockNotice>
      <Card>
        {error ? <p className="p-6 text-sm text-danger">{errorMessage(error)}</p> : <DataTable columns={columns} rows={data} loading={isLoading} rowKey={(p) => p.id} />}
      </Card>
    </>
  );
}
