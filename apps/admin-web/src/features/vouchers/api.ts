import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getPaged } from '@/lib/api/client';
import type { Product, PurchaseReceipt, SalesVoucher } from '@/lib/api/types';

export const useProducts = () => useQuery({ queryKey: ['products'], queryFn: async () => (await api.get<Product[]>('/products')).data });

export const usePurchaseReceipts = (page: number) =>
  useQuery({ queryKey: ['purchase-receipts', page], queryFn: () => getPaged<PurchaseReceipt>('/purchase-receipts', { page, limit: 10 }), placeholderData: keepPreviousData });

export const useSalesVouchers = (page: number) =>
  useQuery({ queryKey: ['sales-vouchers', page], queryFn: () => getPaged<SalesVoucher>('/sales-vouchers', { page, limit: 10 }), placeholderData: keepPreviousData });

export function useCreatePurchaseReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { date?: string; lines: Array<{ productId: string; quantity: number; unitPrice: number }> }) => (await api.post<PurchaseReceipt>('/purchase-receipts', body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-receipts'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useCreateSalesVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { dealerId: string; paid: number; lines: Array<{ productId: string; quantity: number }> }) => (await api.post<SalesVoucher>('/sales-vouchers', body)).data,
    onSuccess: () => {
      for (const k of ['sales-vouchers', 'products', 'dealers', 'invoices', 'reports']) qc.invalidateQueries({ queryKey: [k] });
    },
  });
}
