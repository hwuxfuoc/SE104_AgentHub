import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getPaged } from '@/lib/api/client';
import type { DebtLedgerEntry, Dealer, DealerDebtSummary, DealerInput, DealerQuery, DealerTier, District, Invoice } from '@/lib/api/types';

export const dealerKeys = {
  all: ['dealers'] as const,
  list: (q: DealerQuery) => ['dealers', 'list', q] as const,
  detail: (id: string) => ['dealers', 'detail', id] as const,
  debt: (id: string) => ['dealers', 'debt', id] as const,
  ledger: (id: string, page: number) => ['dealers', 'ledger', id, page] as const,
};

export const useDealers = (q: DealerQuery) =>
  useQuery({ queryKey: dealerKeys.list(q), queryFn: () => getPaged<Dealer>('/dealers', { ...q }), placeholderData: keepPreviousData });

export const useDealer = (id: string) => useQuery({ queryKey: dealerKeys.detail(id), queryFn: async () => (await api.get<Dealer>(`/dealers/${id}`)).data });

export const useDealerDebt = (id: string | undefined) =>
  useQuery({ queryKey: dealerKeys.debt(id ?? ''), enabled: !!id, queryFn: async () => (await api.get<DealerDebtSummary>(`/dealers/${id}/debt`)).data });

export const useDealerLedger = (id: string, page: number) =>
  useQuery({ queryKey: dealerKeys.ledger(id, page), queryFn: () => getPaged<DebtLedgerEntry>(`/dealers/${id}/debt-ledger`, { page, limit: 8 }), placeholderData: keepPreviousData });

export const useDealerInvoices = (id: string) =>
  useQuery({ queryKey: ['invoices', 'dealer', id], queryFn: () => getPaged<Invoice>('/invoices', { dealerId: id, limit: 10 }) });

export const useDistricts = () => useQuery({ queryKey: ['districts'], staleTime: 5 * 60_000, queryFn: async () => (await api.get<District[]>('/districts')).data });
export const useTiers = () => useQuery({ queryKey: ['tiers'], staleTime: 5 * 60_000, queryFn: async () => (await api.get<DealerTier[]>('/dealer-tiers')).data });

export function useSaveDealer(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DealerInput) => (id ? await api.patch<Dealer>(`/dealers/${id}`, input) : await api.post<Dealer>('/dealers', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: dealerKeys.all }),
  });
}
