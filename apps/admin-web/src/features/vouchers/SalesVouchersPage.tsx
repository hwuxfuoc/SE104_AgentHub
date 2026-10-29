import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable';
import { Select } from '@/components/ui/Fields';
import { MockNotice } from '@/components/ui/MockNotice';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Overlay } from '@/components/ui/Overlay';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/lib/api/errors';
import type { SalesVoucher } from '@/lib/api/types';
import { formatDate, formatVnd } from '@/lib/format';
import { useDealerDebt, useDealers } from '@/features/dealers/api';
import { useCreateSalesVoucher, useProducts, useSalesVouchers } from './api';
import { LinesEditor, lineAmount, newLine, type LineDraft } from './LinesEditor';
import { VoucherDetail } from './VoucherDetail';

/** BM3 – Phiếu xuất hàng. Kiểm tra tồn kho và hạn mức nợ (QĐ3) ở backend; UI chỉ cảnh báo sớm. */
export default function SalesVouchersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<SalesVoucher | null>(null);
  const [dealerId, setDealerId] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([newLine()]);
  const [paid, setPaid] = useState<number | undefined>(0);
  const [formError, setFormError] = useState<string | null>(null);
  const { data, isLoading, error } = useSalesVouchers(page);
  const { data: products } = useProducts();
  const { data: dealers } = useDealers({ limit: 100, sortBy: 'name', sortOrder: 'asc' });
  const { data: debt } = useDealerDebt(dealerId || undefined);
  const create = useCreateSalesVoucher();
  const writable = user?.role === 'ADMIN' || user?.role === 'SALES';

  const total = useMemo(() => lines.reduce((s, l) => s + lineAmount(l, products ?? [], 'sales'), 0), [lines, products]);
  const remaining = total - (paid ?? 0);
  const newDebt = (debt?.currentDebt ?? 0) + Math.max(0, remaining);
  const overLimit = !!debt && newDebt > debt.maxDebtAllowed;

  const open = (id = '') => {
    setDealerId(id);
    setLines([newLine()]);
    setPaid(0);
    setFormError(null);
    setCreating(true);
  };

  // Mở form từ trang chi tiết đại lý (?dealerId=…&new=1)
  useEffect(() => {
    if (params.get('new') && writable) {
      open(params.get('dealerId') ?? '');
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    setFormError(null);
    if (!dealerId) return setFormError('Vui lòng chọn đại lý.');
    if (!lines.every((l) => l.productId && l.quantity && l.quantity > 0)) return setFormError('Mỗi dòng cần chọn mặt hàng và số lượng lớn hơn 0.');
    if ((paid ?? 0) < 0 || (paid ?? 0) > total) return setFormError('Số tiền trả phải nằm trong khoảng từ 0 đến tổng tiền.');
    try {
      const v = await create.mutateAsync({ dealerId, paid: paid ?? 0, lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity! })) });
      toast.success(`Lập phiếu xuất ${v.code} thành công · còn lại ${formatVnd(v.remaining)}`);
      setCreating(false);
    } catch (e) {
      setFormError(errorMessage(e));
    }
  };

  const columns: Column<SalesVoucher>[] = [
    { key: 'code', header: 'Số phiếu', cell: (v) => <span className="font-mono text-xs font-semibold">{v.code}</span> },
    { key: 'date', header: 'Ngày lập', cell: (v) => formatDate(v.date) },
    { key: 'dealer', header: 'Đại lý', cell: (v) => <span className="font-medium">{v.dealerName}</span> },
    { key: 'total', header: 'Tổng tiền', align: 'right', cell: (v) => <span className="tabular">{formatVnd(v.total)}</span> },
    { key: 'paid', header: 'Số tiền trả', align: 'right', cell: (v) => <span className="tabular text-success">{formatVnd(v.paid)}</span> },
    { key: 'rem', header: 'Còn lại', align: 'right', cell: (v) => <b className="tabular">{formatVnd(v.remaining)}</b> },
  ];

  return (
    <>
      <PageHeader
        title="Phiếu xuất hàng"
        description="BM3 – Đơn giá xuất = đơn giá nhập × tỷ lệ (QĐ3). Còn lại được cộng vào công nợ đại lý."
        actions={writable && <Button icon={<Plus className="size-4" />} onClick={() => open()}>Lập phiếu xuất</Button>}
      />
      <MockNotice>Backend chưa có API phiếu xuất có dòng hàng (P4). Màn hình dùng contract đề xuất POST/GET /sales-vouchers.</MockNotice>
      <Card>
        {error ? <p className="p-6 text-sm text-danger">{errorMessage(error)}</p> : <DataTable columns={columns} rows={data?.items} loading={isLoading} rowKey={(v) => v.id} onRowClick={setSelected} emptyTitle="Chưa có phiếu xuất" />}
        <Pagination info={data?.pagination} onPage={setPage} />
      </Card>

      <Overlay
        open={creating}
        onClose={() => setCreating(false)}
        variant="drawer"
        width="max-w-3xl"
        title="Lập phiếu xuất hàng"
        description="Số phiếu tự sinh (PX + 4 chữ số). Số lượng không vượt tồn kho; công nợ mới không vượt hạn mức."
        footer={<><Button variant="secondary" onClick={() => setCreating(false)}>Hủy</Button><Button loading={create.isPending} onClick={submit}>Lưu phiếu xuất</Button></>}
      >
        <div className="space-y-5">
          {formError && <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">{formError}</p>}
          <Select label="Đại lý" required value={dealerId} onChange={(e) => setDealerId(e.target.value)}>
            <option value="">Chọn đại lý…</option>
            {dealers?.items.filter((d) => d.status === 'ACTIVE').map((d) => <option key={d.id} value={d.id}>{d.code} · {d.name}</option>)}
          </Select>
          <LinesEditor mode="sales" lines={lines} onChange={setLines} products={products ?? []} />
          <div className="grid gap-4 rounded-xl bg-surface-2 p-4 sm:grid-cols-2">
            <MoneyInput label="Số tiền trả" value={paid} onValueChange={setPaid} error={(paid ?? 0) > total ? 'Không vượt tổng tiền' : undefined} />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted">Còn lại</span><b className="tabular">{formatVnd(Math.max(0, remaining))}</b></div>
              {debt && (
                <>
                  <div className="flex justify-between"><span className="text-muted">Nợ hiện tại</span><span className="tabular">{formatVnd(debt.currentDebt)}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Nợ sau phiếu</span><b className={`tabular ${overLimit ? 'text-danger' : ''}`}>{formatVnd(newDebt)}</b></div>
                  <div className="flex justify-between"><span className="text-muted">Hạn mức</span><span className="tabular">{formatVnd(debt.maxDebtAllowed)}</span></div>
                </>
              )}
            </div>
          </div>
          {overLimit && <p className="rounded-xl bg-warning-soft px-3 py-2.5 text-sm text-warning">Công nợ sau phiếu vượt hạn mức — hệ thống sẽ từ chối khi lưu (QĐ3). Tăng số tiền trả hoặc giảm số lượng.</p>}
        </div>
      </Overlay>

      {selected && <VoucherDetail title={`Phiếu xuất ${selected.code}`} subtitle={`${selected.dealerName} · ${formatDate(selected.date)}`} lines={selected.lines} summary={[['Tổng tiền', selected.total], ['Số tiền trả', selected.paid], ['Còn lại', selected.remaining]]} onClose={() => setSelected(null)} />}
    </>
  );
}
