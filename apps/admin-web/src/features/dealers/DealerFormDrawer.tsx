import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Overlay } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Fields';
import { useToast } from '@/components/ui/Toast';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { dateInputToIso, toDateInput } from '@/lib/format';
import type { Dealer, DealerStatus } from '@/lib/api/types';
import { useDistricts, useSaveDealer, useTiers } from './api';

const schema = z.object({
  name: z.string().trim().min(1, 'Tên đại lý là bắt buộc'),
  tierId: z.string().min(1, 'Chọn loại đại lý'),
  districtId: z.string().min(1, 'Chọn quận'),
  phone: z.string().regex(/^\d{9,11}$/, 'Số điện thoại gồm 9–11 chữ số'),
  email: z.string().email('Email không hợp lệ').or(z.literal('')),
  address: z.string().trim().min(1, 'Địa chỉ là bắt buộc'),
  receivedDate: z.string().min(1, 'Chọn ngày tiếp nhận'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
});
type Values = z.infer<typeof schema>;

const STATUS_LABEL: Record<DealerStatus, string> = { ACTIVE: 'Đang hoạt động', INACTIVE: 'Ngưng hoạt động', SUSPENDED: 'Tạm khóa' };

/** BM1 – Hồ sơ đại lý (thêm mới & chỉnh sửa). Mã đại lý do hệ thống tự sinh, không sửa. */
export function DealerFormDrawer({ open, onClose, dealer }: { open: boolean; onClose: () => void; dealer?: Dealer }) {
  const toast = useToast();
  const { data: districts } = useDistricts();
  const { data: tiers } = useTiers();
  const save = useSaveDealer(dealer?.id);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    reset({
      name: dealer?.name ?? '',
      tierId: dealer?.tierId ?? '',
      districtId: dealer?.districtId ?? '',
      phone: dealer?.phone ?? '',
      email: dealer?.email ?? '',
      address: dealer?.address ?? '',
      receivedDate: toDateInput(dealer ? new Date(dealer.receivedDate) : new Date()),
      status: dealer?.status ?? 'ACTIVE',
    });
  }, [open, dealer, reset]);

  const onSubmit = handleSubmit(async (v) => {
    try {
      const saved = await save.mutateAsync({ ...v, receivedDate: dateInputToIso(v.receivedDate) });
      toast.success(dealer ? 'Cập nhật hồ sơ đại lý thành công' : `Tiếp nhận đại lý thành công · mã ${saved.code}`);
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors.length) {
        e.fieldErrors.forEach((f) => setError(f.path as keyof Values, { message: f.message }));
      }
      toast.error(errorMessage(e));
    }
  });

  return (
    <Overlay
      open={open}
      onClose={onClose}
      variant="drawer"
      title={dealer ? `Sửa hồ sơ · ${dealer.code}` : 'Tiếp nhận đại lý mới'}
      description="BM1 – Hồ sơ đại lý. Mã đại lý được hệ thống tự sinh (DL + 4 chữ số)."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button form="dealer-form" type="submit" loading={save.isPending}>
            {dealer ? 'Lưu thay đổi' : 'Tiếp nhận đại lý'}
          </Button>
        </>
      }
    >
      <form id="dealer-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Tên đại lý" required placeholder="Đại lý Minh Phát" error={errors.name?.message} {...register('name')} />
        </div>
        <Select label="Loại đại lý" required error={errors.tierId?.message} {...register('tierId')}>
          <option value="">Chọn loại…</option>
          {tiers?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Select label="Quận" required error={errors.districtId?.message} {...register('districtId')}>
          <option value="">Chọn quận…</option>
          {districts?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Input label="Điện thoại" required inputMode="tel" placeholder="0901234567" error={errors.phone?.message} {...register('phone')} />
        <Input label="Email" type="email" placeholder="daily@example.com" error={errors.email?.message} {...register('email')} />
        <div className="sm:col-span-2">
          <Input label="Địa chỉ" required placeholder="12 Nguyễn Trãi" error={errors.address?.message} {...register('address')} />
        </div>
        <Input label="Ngày tiếp nhận" type="date" required error={errors.receivedDate?.message} {...register('receivedDate')} />
        <Select label="Trạng thái" {...register('status')}>
          {(Object.keys(STATUS_LABEL) as DealerStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </form>
    </Overlay>
  );
}
