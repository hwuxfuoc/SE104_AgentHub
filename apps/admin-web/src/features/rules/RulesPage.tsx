import { useState } from 'react';
import { AlertTriangle, ArrowRight, History, Lock, Pencil } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { can } from '@/auth/permissions';
import { Button } from '@/components/ui/Button';
import { Badge, Card, CardHeader, Skeleton, PageHeader } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Fields';
import { Overlay } from '@/components/ui/Overlay';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/lib/api/errors';
import type { BusinessRule } from '@/lib/api/types';
import { formatDateTime, formatNumber } from '@/lib/format';
import { useRules, useUpdateRule } from './api';

type Value = Record<string, unknown>;

interface FieldDef {
  key: string;
  label: string;
  suffix?: string;
  /** hiển thị / nhập theo đơn vị khác với lưu trữ (vd. 1.02 ↔ 102%) */
  toUi?: (v: number) => number;
  fromUi?: (v: number) => number;
  decimals?: boolean;
}

/** Mô tả trường nhập theo từng quy định (QĐ7). */
function fieldsFor(rule: BusinessRule): FieldDef[] {
  switch (rule.code) {
    case 'QD1':
      return [
        { key: 'maxDealerTypes', label: 'Số loại đại lý tối đa' },
        { key: 'totalDistricts', label: 'Số quận' },
        { key: 'maxDealersPerDistrict', label: 'Số đại lý tối đa mỗi quận' },
      ];
    case 'QD2':
      return [
        { key: 'maxProductCount', label: 'Số mặt hàng tối đa' },
        { key: 'maxUnitCount', label: 'Số đơn vị tính tối đa' },
      ];
    case 'QD3':
      return [
        ...Object.keys((rule.value.tierDebtLimits as Record<string, number>) ?? {}).map((t) => ({ key: `tier:${t}`, label: `Hạn mức nợ tối đa · ${t}`, suffix: '₫' })),
        { key: 'exportPriceRatio', label: 'Tỷ lệ đơn giá xuất / đơn giá nhập', suffix: '%', toUi: (v: number) => Math.round(v * 10000) / 100, fromUi: (v: number) => v / 100, decimals: true },
      ];
    default:
      return [];
  }
}

const read = (rule: BusinessRule, f: FieldDef): number => {
  const raw = f.key.startsWith('tier:') ? (rule.value.tierDebtLimits as Record<string, number>)[f.key.slice(5)] : (rule.value[f.key] as number);
  return f.toUi ? f.toUi(raw) : raw;
};

function build(rule: BusinessRule, fields: FieldDef[], draft: Record<string, string>): Value {
  const next: Value = JSON.parse(JSON.stringify(rule.value));
  fields.forEach((f) => {
    const n = Number(draft[f.key]);
    const v = f.fromUi ? f.fromUi(n) : n;
    if (f.key.startsWith('tier:')) (next.tierDebtLimits as Record<string, number>)[f.key.slice(5)] = v;
    else next[f.key] = v;
  });
  return next;
}

function validate(fields: FieldDef[], draft: Record<string, string>) {
  const errs: Record<string, string> = {};
  fields.forEach((f) => {
    const raw = draft[f.key]?.trim();
    const n = Number(raw);
    if (!raw || Number.isNaN(n)) errs[f.key] = 'Nhập một số hợp lệ';
    else if (f.key === 'exportPriceRatio') {
      if (n <= 0) errs[f.key] = 'Tỷ lệ phải lớn hơn 0';
    } else if (f.key.startsWith('tier:')) {
      if (!Number.isInteger(n) || n < 0) errs[f.key] = 'Phải là số nguyên không âm';
    } else if (!Number.isInteger(n) || n <= 0) errs[f.key] = 'Phải là số nguyên dương';
  });
  return errs;
}

const fmt = (f: FieldDef, n: number) => (f.suffix === '₫' ? `${formatNumber(n)} ₫` : f.suffix === '%' ? `${String(n).replace('.', ',')}%` : formatNumber(n));

/** QĐ7 – Thay đổi quy định (chỉ Admin). Bước 1: nhập; bước 2: xem tóm tắt và xác nhận. */
export default function RulesPage() {
  const { user } = useAuth();
  const { data: rules, isLoading, error } = useRules();
  const [editing, setEditing] = useState<BusinessRule | null>(null);
  const writable = can(user?.role, 'rules.write');

  return (
    <>
      <PageHeader title="Quy định" description="QĐ7 – Giá trị quy định lưu trong cơ sở dữ liệu, thay đổi có hiệu lực cho giao dịch lập sau thời điểm lưu. Mọi thay đổi được ghi lịch sử." />
      {!writable && (
        <p className="mb-5 flex items-center gap-2 rounded-xl bg-info-soft px-4 py-3 text-sm text-info"><Lock className="size-4" /> Chỉ vai trò Quản trị viên được thay đổi quy định.</p>
      )}
      {error && <p className="text-sm text-danger">{errorMessage(error)}</p>}
      <div className="grid gap-5 lg:grid-cols-2">
        {isLoading && [0, 1, 2, 3].map((i) => <Card key={i} className="p-5"><Skeleton className="h-32" /></Card>)}
        {rules?.map((rule) => {
          const fields = fieldsFor(rule);
          return (
            <Card key={rule.id}>
              <CardHeader
                title={rule.name}
                description={rule.description}
                action={writable && fields.length > 0 ? <Button size="sm" variant="secondary" icon={<Pencil className="size-3.5" />} onClick={() => setEditing(rule)}>Chỉnh sửa</Button> : <Badge tone="neutral">Chỉ xem</Badge>}
              />
              <div className="space-y-2.5 p-5">
                {fields.length ? (
                  fields.map((f) => (
                    <div key={f.key} className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-muted">{f.label}</span>
                      <b className="tabular">{fmt(f, read(rule, f))}</b>
                    </div>
                  ))
                ) : (
                  <pre className="overflow-x-auto rounded-xl bg-surface-2 p-3 text-xs">{JSON.stringify(rule.value, null, 2)}</pre>
                )}
              </div>
              <div className="border-t border-line px-5 py-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted"><History className="size-3.5" /> Lịch sử thay đổi gần đây</p>
                {rule.histories.length === 0 ? (
                  <p className="text-xs text-muted">Chưa có thay đổi quy định.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs">
                    {rule.histories.slice(0, 3).map((h) => (
                      <li key={h.id} className="flex flex-wrap items-center gap-x-2 text-muted">
                        <span className="tabular">{formatDateTime(h.changedAt)}</span>·<b className="text-ink">{h.changedBy.fullName}</b>
                        {h.changeReason && <span>— “{h.changeReason}”</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      {editing && <RuleEditor rule={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function RuleEditor({ rule, onClose }: { rule: BusinessRule; onClose: () => void }) {
  const toast = useToast();
  const update = useUpdateRule();
  const fields = fieldsFor(rule);
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.key, String(read(rule, f))])));
  const [reason, setReason] = useState('');
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  const [serverError, setServerError] = useState<string | null>(null);
  const errs = validate(fields, draft);
  const changed = fields.filter((f) => Number(draft[f.key]) !== read(rule, f));
  const lowered = changed.filter((f) => f.key.startsWith('tier:') && Number(draft[f.key]) < read(rule, f));

  const save = async () => {
    setServerError(null);
    try {
      await update.mutateAsync({ code: rule.code, value: build(rule, fields, draft), changeReason: reason.trim() || undefined });
      toast.success('Cập nhật quy định thành công. Giao dịch lập sau thời điểm này áp dụng giá trị mới.');
      onClose();
    } catch (e) {
      setServerError(errorMessage(e));
      setStep('edit');
    }
  };

  return (
    <Overlay
      open
      onClose={onClose}
      title={`Chỉnh sửa ${rule.name}`}
      description={step === 'edit' ? 'Bước 1/2 · Nhập giá trị mới' : 'Bước 2/2 · Xác nhận thay đổi'}
      footer={
        step === 'edit' ? (
          <>
            <Button variant="secondary" onClick={onClose}>Hủy</Button>
            <Button disabled={Object.keys(errs).length > 0 || changed.length === 0} onClick={() => setStep('review')}>Xem lại thay đổi</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setStep('edit')}>Quay lại</Button>
            <Button loading={update.isPending} onClick={save}>Xác nhận & lưu</Button>
          </>
        )
      }
    >
      {step === 'edit' ? (
        <div className="space-y-4">
          {serverError && <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">{serverError}</p>}
          {fields.map((f) => (
            <Input key={f.key} label={f.label} inputMode="decimal" value={draft[f.key]} error={draft[f.key] !== String(read(rule, f)) ? errs[f.key] : undefined} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} leading={f.suffix ? <span className="text-xs">{f.suffix}</span> : undefined} />
          ))}
          <Textarea label="Lý do thay đổi" placeholder="Không bắt buộc, lưu vào lịch sử" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      ) : (
        <div className="space-y-4">
          <ul className="divide-y divide-line rounded-xl border border-line text-sm">
            {changed.map((f) => (
              <li key={f.key} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span className="text-muted">{f.label}</span>
                <span className="flex items-center gap-2 tabular">
                  <span className="text-muted line-through">{fmt(f, read(rule, f))}</span>
                  <ArrowRight className="size-3.5 text-muted" />
                  <b>{fmt(f, Number(draft[f.key]))}</b>
                </span>
              </li>
            ))}
          </ul>
          {lowered.length > 0 && (
            <p className="flex gap-2 rounded-xl bg-warning-soft px-3 py-2.5 text-sm text-warning">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              Giảm hạn mức nợ: các đại lý đang nợ vượt mức mới sẽ không thể lập phiếu xuất cho đến khi giảm nợ dưới hạn mức.
            </p>
          )}
          <p className="text-xs text-muted">Giá trị mới có hiệu lực từ thời điểm lưu. Giao dịch đã lưu giữ nguyên giá trị đã áp dụng.</p>
        </div>
      )}
    </Overlay>
  );
}
