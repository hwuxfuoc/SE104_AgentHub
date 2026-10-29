import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, SearchX } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Pagination as PaginationInfo } from '@/lib/api/types';
import { EmptyState, Skeleton } from './Card';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  align?: 'left' | 'right' | 'center';
  sortKey?: string;
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  loading?: boolean;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  footer?: ReactNode;
}

export function DataTable<T>({ columns, rows, loading, rowKey, onRowClick, sortBy, sortOrder, onSort, emptyTitle = 'Không có dữ liệu', emptyDescription, footer }: Props<T>) {
  const align = { left: 'text-left', right: 'text-right', center: 'text-center' };
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-muted">
            {columns.map((c) => {
              const sortable = !!c.sortKey && !!onSort;
              const active = sortable && sortBy === c.sortKey;
              return (
                <th key={c.key} className={cn('px-4 py-3 font-medium whitespace-nowrap', align[c.align ?? 'left'])} aria-sort={active ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {sortable ? (
                    <button onClick={() => onSort!(c.sortKey!)} className={cn('inline-flex cursor-pointer items-center gap-1 hover:text-ink', active && 'text-ink')}>
                      {c.header}
                      {active && (sortOrder === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-line last:border-0">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3.5">
                    <Skeleton className="h-4" />
                  </td>
                ))}
              </tr>
            ))}
          {!loading &&
            rows?.map((row, i) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn('border-b border-line transition-colors last:border-0', onRowClick && 'cursor-pointer hover:bg-surface-2')}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3', align[c.align ?? 'left'], c.className)}>
                    {c.cell(row, i)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
        {footer}
      </table>
      {!loading && rows?.length === 0 && <EmptyState icon={<SearchX className="size-6" />} title={emptyTitle} description={emptyDescription} />}
    </div>
  );
}

export function Pagination({ info, onPage }: { info?: PaginationInfo; onPage: (p: number) => void }) {
  if (!info || info.total === 0) return null;
  const from = (info.page - 1) * info.limit + 1;
  const to = Math.min(info.total, info.page * info.limit);
  return (
    <div className="no-print flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
      <span>
        Hiển thị <b className="text-ink">{from}–{to}</b> trong <b className="text-ink">{info.total}</b> kết quả
      </span>
      <div className="flex items-center gap-1">
        <button disabled={info.page <= 1} onClick={() => onPage(info.page - 1)} aria-label="Trang trước" className="grid size-8 cursor-pointer place-items-center rounded-lg border border-line hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40">
          <ChevronLeft className="size-4" />
        </button>
        <span className="px-3 tabular">
          Trang {info.page}/{info.totalPages}
        </span>
        <button disabled={info.page >= info.totalPages} onClick={() => onPage(info.page + 1)} aria-label="Trang sau" className="grid size-8 cursor-pointer place-items-center rounded-lg border border-line hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
