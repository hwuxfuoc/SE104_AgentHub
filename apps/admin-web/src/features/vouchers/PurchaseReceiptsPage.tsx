import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable';
import { MockNotice } from '@/components/ui/MockNotice';
import { Overlay } from '@/components/ui/Overlay';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/lib/api/errors';
import type { PurchaseReceipt } from '@/lib/api/types';
import { formatDate, formatVnd } from '@/lib/format';
import { useCreatePurchaseReceipt, useProducts, usePurchaseReceipts } from './api';
import { LinesEditor, newLine, type LineDraft } from './LinesEditor';
import { VoucherDetail } from './VoucherDetail';

/** BM2 – Phiếu nhập hàng. (Backend chưa có API → đang dùng mock theo contract đề xuất.) */
export default function PurchaseReceiptsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<PurchaseReceipt | null>(null);
  const [lines, setLines] = useState<LineDraft[]>([newLine()]);
  const [formError, setFormError] = useState<string | null>(null);
  const { data, isLoading, error } = usePurchaseReceipts(page);
  const { data: products } = useProducts();
  const create = useCreatePurchaseReceipt();
  const writable = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  const open = () => {
    setLines([newLine()]);
    setFormError(null);
    setCreating(true);
  };

  const submit = async () => {
    setFormError(null);
    const valid = lines.every((l) => l.productId && l.quantity && l.quantity > 0 && l.unitPrice && l.unitPrice > 0);
    if (!valid) return setFormError('Mỗi dòng cần chọn mặt hàng, số lượng và đơn giá nhập lớn hơn 0.');
    try {
      const r = await create.mutateAsync({ lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity!, unitPrice: l.unitPrice! })) });
      toast.success(`Lập phiếu nhập ${r.code} thành công · tồn kho đã được cộng thêm`);
      setCreating(false);
    } catch (e) {
      setFormError(errorMessage(e));
    }
  };

  const columns: Column<PurchaseReceipt>[] = [
    { key: 'code', header: 'Số phiếu', cell: (r) => <span className="font-mono text-xs font-semibold">{r.code}</span> },
    { key: 'date', header: 'Ngày lập', cell: (r) => formatDate(r.date) },
    { key: 'lines', header: 'Mặt hàng', cell: (r) => <span className="text-muted">{r.lines.map((l) => l.productName).join(', ')}</span> },
    { key: 'by', header: 'Người lập', cell: (r) => r.createdBy },
    { key: 'total', header: 'Tổng tiền', align: 'right', cell: (r) => <b className="tabular">{formatVnd(r.total)}</b> },
  ];

  return (
    <>
      <PageHeader
        title="Phiếu nhập hàng"
        description="BM2 – Nhập hàng làm tăng tồn kho và cập nhật đơn giá nhập mới nhất (cơ sở tính giá xuất)."
        actions={writable && <Button icon={<Plus className="size-4" />} onClick={open}>Lập phiếu nhập</Button>}
      />
      <MockNotice>Backend chưa có API phiếu nhập (P3/P4). Màn hình dùng contract đề xuất POST/GET /purchase-receipts.</MockNotice>
      <Card>
        {error ? <p className="p-6 text-sm text-danger">{errorMessage(error)}</p> : <DataTable columns={columns} rows={data?.items} loading={isLoading} rowKey={(r) => r.id} onRowClick={setSelected} emptyTitle="Chưa có phiếu nhập" emptyDescription="Lập phiếu nhập đầu tiên để cộng tồn kho." />}
        <Pagination info={data?.pagination} onPage={setPage} />
      </Card>

      <Overlay
        open={creating}
        onClose={() => setCreating(false)}
        variant="drawer"
        width="max-w-3xl"
        title="Lập phiếu nhập hàng"
        description="Số phiếu tự sinh (PN + 4 chữ số), ngày lập mặc định là hôm nay."
        footer={<><Button variant="secondary" onClick={() => setCreating(false)}>Hủy</Button><Button loading={create.isPending} onClick={submit}>Lưu phiếu nhập</Button></>}
      >
        {formError && <p role="alert" className="mb-4 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">{formError}</p>}
        <LinesEditor mode="purchase" lines={lines} onChange={setLines} products={products ?? []} />
      </Overlay>

      {selected && <VoucherDetail title={`Phiếu nhập ${selected.code}`} subtitle={`Ngày lập ${formatDate(selected.date)} · ${selected.createdBy}`} lines={selected.lines} summary={[['Tổng tiền', selected.total]]} onClose={() => setSelected(null)} />}
    </>
  );
}
