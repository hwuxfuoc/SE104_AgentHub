import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RotateCcw, Search } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { can } from '@/auth/permissions';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable';
import { Input, Select } from '@/components/ui/Fields';
import { errorMessage } from '@/lib/api/errors';
import type { Dealer, DealerQuery } from '@/lib/api/types';
import { formatDate } from '@/lib/format';
import { useDealers, useDistricts, useTiers } from './api';
import { DealerFormDrawer } from './DealerFormDrawer';
import { DealerStatusBadge, DebtBadge } from './badges';

const DEFAULTS: DealerQuery = { page: 1, limit: 10, search: '', districtId: '', tierId: '', status: '', sortBy: 'createdAt', sortOrder: 'desc' };

/** BM4 – Danh sách / tra cứu đại lý. */
export default function DealersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState<DealerQuery>(DEFAULTS);
  const [searchText, setSearchText] = useState('');
  const [creating, setCreating] = useState(false);
  const { data, isLoading, error, isFetching } = useDealers(query);
  const { data: districts } = useDistricts();
  const { data: tiers } = useTiers();

  // Debounce ô tìm kiếm
  useEffect(() => {
    const t = setTimeout(() => setQuery((q) => (q.search === searchText ? q : { ...q, search: searchText, page: 1 })), 350);
    return () => clearTimeout(t);
  }, [searchText]);

  const set = (patch: Partial<DealerQuery>) => setQuery((q) => ({ ...q, ...patch, page: 1 }));
  const onSort = (key: string) =>
    setQuery((q) => ({ ...q, sortBy: key as DealerQuery['sortBy'], sortOrder: q.sortBy === key && q.sortOrder === 'asc' ? 'desc' : 'asc', page: 1 }));
  const filtered = !!(query.search || query.districtId || query.tierId || query.status);

  const columns: Column<Dealer>[] = [
    { key: 'stt', header: 'STT', cell: (_, i) => <span className="text-muted tabular">{((data?.pagination.page ?? 1) - 1) * (data?.pagination.limit ?? 10) + i + 1}</span>, className: 'w-14' },
    { key: 'code', header: 'Mã', sortKey: 'code', cell: (d) => <span className="font-mono text-xs font-medium text-muted">{d.code}</span> },
    {
      key: 'name',
      header: 'Đại lý',
      sortKey: 'name',
      cell: (d) => (
        <div>
          <p className="font-medium">{d.name}</p>
          <p className="text-xs text-muted">{d.phone}</p>
        </div>
      ),
    },
    { key: 'tier', header: 'Loại', cell: (d) => d.tier.name },
    { key: 'district', header: 'Quận', cell: (d) => d.district.name },
    { key: 'status', header: 'Trạng thái', cell: (d) => <DealerStatusBadge status={d.status} /> },
    { key: 'date', header: 'Ngày tiếp nhận', sortKey: 'receivedDate', cell: (d) => formatDate(d.receivedDate) },
    { key: 'debt', header: 'Tiền nợ', sortKey: 'currentDebt', align: 'right', cell: (d) => <DebtBadge debt={d.currentDebt} limit={d.tier.maxDebt} /> },
  ];

  return (
    <>
      <PageHeader
        title="Đại lý"
        description="Tra cứu và tiếp nhận đại lý (BM1, BM4). Tiền nợ lấy từ sổ công nợ."
        actions={
          can(user?.role, 'dealers.write') && (
            <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
              Tiếp nhận đại lý
            </Button>
          )
        }
      />

      <Card>
        <div className="grid gap-3 border-b border-line p-4 md:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
          <Input placeholder="Tìm theo tên, mã, điện thoại, email…" leading={<Search className="size-4" />} value={searchText} onChange={(e) => setSearchText(e.target.value)} aria-label="Tìm kiếm đại lý" />
          <Select value={query.tierId} onChange={(e) => set({ tierId: e.target.value })} aria-label="Lọc theo loại">
            <option value="">Mọi loại</option>
            {tiers?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          <Select value={query.districtId} onChange={(e) => set({ districtId: e.target.value })} aria-label="Lọc theo quận">
            <option value="">Mọi quận</option>
            {districts?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select value={query.status} onChange={(e) => set({ status: e.target.value as DealerQuery['status'] })} aria-label="Lọc theo trạng thái">
            <option value="">Mọi trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Ngưng hoạt động</option>
            <option value="SUSPENDED">Tạm khóa</option>
          </Select>
          <Button
            variant="ghost"
            icon={<RotateCcw className="size-4" />}
            disabled={!filtered}
            onClick={() => {
              setSearchText('');
              setQuery(DEFAULTS);
            }}
          >
            Xóa lọc
          </Button>
        </div>

        {error ? (
          <p className="p-6 text-sm text-danger">{errorMessage(error)}</p>
        ) : (
          <div className={isFetching && !isLoading ? 'opacity-70 transition-opacity' : ''}>
            <DataTable
              columns={columns}
              rows={data?.items}
              loading={isLoading}
              rowKey={(d) => d.id}
              onRowClick={(d) => navigate(`/dealers/${d.id}`)}
              sortBy={query.sortBy}
              sortOrder={query.sortOrder}
              onSort={onSort}
              emptyTitle="Không tìm thấy đại lý phù hợp"
              emptyDescription="Thử đổi từ khóa hoặc bỏ bớt bộ lọc."
            />
            <Pagination info={data?.pagination} onPage={(page) => setQuery((q) => ({ ...q, page }))} />
          </div>
        )}
      </Card>

      <DealerFormDrawer open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
