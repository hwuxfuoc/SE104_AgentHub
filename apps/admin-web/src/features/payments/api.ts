import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getPaged } from '@/lib/api/client';
import type { Invoice, InvoiceStatus, Payment, PaymentInput } from '@/lib/api/types';

export const usePayments = (page: number) =>
  useQuery({ queryKey: ['payments', page], queryFn: () => getPaged<Payment>('/payments', { page, limit: 10 }), placeholderData: keepPreviousData });

export const useInvoices = (page: number, status: InvoiceStatus | '') =>
  useQuery({ queryKey: ['invoices', page, status], queryFn: () => getPaged<Invoice>('/invoices', { page, limit: 10, status }), placeholderData: keepPreviousData });

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PaymentInput) => (await api.post<Payment>('/payments', input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['dealers'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
