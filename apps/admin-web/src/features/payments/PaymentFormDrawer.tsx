import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Overlay } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Fields';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { useToast } from '@/components/ui/Toast';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { dateInputToIso, formatVnd, toDateInput } from '@/lib/format';
import { useDealerDebt, useDealers } from '@/features/dealers/api';
import { useCreatePayment } from './api';

const schema = z.object({
  dealerId: z.string().min(1, 'Chọn đại lý'),
  amount: z.number({ required_error: 'Nhập số tiền thu', invalid_type_error: 'Nhập số tiền thu' }).int().positive('Số tiền thu phải lớn hơn 0'),
  paymentDate: z.string().min(1, 'Chọn ngày thu'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER']),
  notes: z.string().max(500, 'Tối đa 500 ký tự').optional(),
});
type Values = z.infer<typeof schema>;

/** BM5 – Phiếu thu tiền. QĐ5: số tiền thu không vượt quá số tiền đại lý đang nợ. */
export function PaymentFormDrawer({ open, onClose, defaultDealerId }: { open: boolean; onClose: () => void; defaultDealerId?: string }) {
  const toast = useToast();
  const create = useCreatePayment();
  const { data: dealers } = useDealers({ limit: 100, sortBy: 'name', sortOrder: 'asc' });
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) reset({ dealerId: defaultDealerId ?? '', amount: undefined, paymentDate: toDateInput(), paymentMethod: 'CASH', notes: '' });
  }, [open, defaultDealerId, reset]);

  const dealerId = watch('dealerId');
  const amount = watch('amount');
  const { data: debt } = useDealerDebt(dealerId || undefined);
  const dealer = useMemo(() => dealers?.items.find((d) => d.id === dealerId), [dealers, dealerId]);
  const over = !!debt && typeof amount === 'number' && amount > debt.currentDebt;

  const onSubmit = handleSubmit(async (v) => {
    if (debt && v.amount > debt.currentDebt) {
      setError('amount', { message: 'Số tiền thu vượt quá số tiền đại lý đang nợ' });
      return;
    }
    try {
      const p = await create.mutateAsync({ ...v, paymentDate: dateInputToIso(v.paymentDate) });
      toast.success(`Lập phiếu thu ${p.receiptNumber} thành công · ${formatVnd(p.amount)}`);
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors.length) e.fieldErrors.forEach((f) => setError(f.path as keyof Values, { message: f.message }));
      toast.error(errorMessage(e));
    }
  });

  return (
    <Overlay
      open={open}
      onClose={onClose}
      variant="drawer"
      title="Lập phiếu thu tiền"
      description="BM5 – Số tiền thu không được vượt quá số tiền đại lý đang nợ (QĐ5)."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button form="payment-form" type="submit" loading={create.isPending} disabled={over}>
            Lập phiếu thu
          </Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={onSubmit} noValidate className="space-y-4">
        <Select label="Đại lý" required error={errors.dealerId?.message} {...register('dealerId')}>
          <option value="">Chọn đại lý…</option>
          {dealers?.items
            .filter((d) => d.currentDebt > 0 || d.id === defaultDealerId)
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} · {d.name} · nợ {formatVnd(d.currentDebt)}
              </option>
            ))}
        </Select>

        {dealer && (
          <div className="animate-fade-up space-y-2 rounded-xl bg-surface-2 p-4 text-sm">
            <div className="grid gap-x-6 gap-y-1 text-muted sm:grid-cols-2">
              <span>Địa chỉ: <b className="font-medium text-ink">{dealer.address}, {dealer.district.name}</b></span>
              <span>Điện thoại: <b className="font-medium text-ink">{dealer.phone}</b></span>
              <span className="sm:col-span-2">Email: <b className="font-medium text-ink">{dealer.email || '—'}</b></span>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-2">
              <span className="text-muted">Tiền nợ hiện tại</span>
              <span className="text-lg font-bold tabular">{formatVnd(debt?.currentDebt ?? dealer.currentDebt)}</span>
            </div>
          </div>
        )}

        <Controller
          control={control}
          name="amount"
          render={({ field }) => (
            <div>
              <MoneyInput label="Số tiền thu" required value={field.value} onValueChange={field.onChange} placeholder="0" error={errors.amount?.message ?? (over ? 'Số tiền thu vượt quá số tiền đại lý đang nợ' : undefined)} />
              {debt && debt.currentDebt > 0 && (
                <button type="button" className="mt-1.5 cursor-pointer text-xs font-medium text-brand hover:underline" onClick={() => setValue('amount', debt.currentDebt, { shouldValidate: true })}>
                  Thu toàn bộ nợ ({formatVnd(debt.currentDebt)})
                </button>
              )}
            </div>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Ngày thu tiền" type="date" required error={errors.paymentDate?.message} {...register('paymentDate')} />
          <Select label="Phương thức" {...register('paymentMethod')}>
            <option value="CASH">Tiền mặt</option>
            <option value="BANK_TRANSFER">Chuyển khoản</option>
          </Select>
        </div>
        <Textarea label="Ghi chú" placeholder="Không bắt buộc" error={errors.notes?.message} {...register('notes')} />
        <p className="text-xs text-muted">Tiền thu được phân bổ vào các hóa đơn cũ nhất trước (FIFO) và ghi vào sổ công nợ trong cùng một giao dịch.</p>
      </form>
    </Overlay>
  );
}
