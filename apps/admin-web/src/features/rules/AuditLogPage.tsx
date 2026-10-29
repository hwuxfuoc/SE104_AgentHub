import { useState } from 'react';
import { Card, PageHeader } from '@/components/ui/Card';
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable';
import { Select } from '@/components/ui/Fields';
import { errorMessage } from '@/lib/api/errors';
import type { AuditLog } from '@/lib/api/types';
import { formatDateTime } from '@/lib/format';
import { Badge } from '@/components/ui/Card';
import { useAuditLogs } from './api';

const ENTITIES = ['PAYMENT', 'INVOICE', 'DEALER', 'BUSINESS_RULE', 'SALES_VOUCHER', 'PURCHASE_RECEIPT'];

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');
  const { data, isLoading, error } = useAuditLogs(page, entity);

  const columns: Column<AuditLog>[] = [
    { key: 'time', header: 'Thời điểm', cell: (a) => <span className="text-muted tabular">{formatDateTime(a.createdAt)}</span> },
    { key: 'user', header: 'Người thao tác', cell: (a) => <div><p className="font-medium">{a.user?.fullName ?? 'Hệ thống'}</p><p className="text-xs text-muted">{a.userRole ?? ''}</p></div> },
    { key: 'action', header: 'Hành động', cell: (a) => <Badge tone="brand">{a.action}</Badge> },
    { key: 'entity', header: 'Đối tượng', cell: (a) => <span className="font-mono text-xs">{a.entity}</span> },
    { key: 'details', header: 'Chi tiết', cell: (a) => <code className="line-clamp-1 max-w-xs text-xs text-muted" title={a.details ?? ''}>{a.details ?? '—'}</code> },
  ];

  return (
    <>
      <PageHeader title="Nhật ký thao tác" description="Truy vết người thực hiện các nghiệp vụ quan trọng và thay đổi quy định." />
      <Card>
        <div className="max-w-xs border-b border-line p-4">
          <Select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} aria-label="Lọc theo đối tượng">
            <option value="">Mọi đối tượng</option>
            {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
          </Select>
        </div>
        {error ? <p className="p-6 text-sm text-danger">{errorMessage(error)}</p> : <DataTable columns={columns} rows={data?.items} loading={isLoading} rowKey={(a) => a.id} emptyTitle="Chưa có nhật ký" />}
        <Pagination info={data?.pagination} onPage={setPage} />
      </Card>
    </>
  );
}
