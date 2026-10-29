import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { AuditLog, BusinessRule } from '@/lib/api/types';
import { getPaged } from '@/lib/api/client';

export const useRules = () => useQuery({ queryKey: ['rules'], queryFn: async () => (await api.get<BusinessRule[]>('/business-rules')).data });

export function useUpdateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { code: string; value: Record<string, unknown>; changeReason?: string }) =>
      (await api.patch<BusinessRule>(`/business-rules/${p.code}`, { value: p.value, changeReason: p.changeReason })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rules'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
      qc.invalidateQueries({ queryKey: ['tiers'] });
    },
  });
}

export const useAuditLogs = (page: number, entity: string) =>
  useQuery({ queryKey: ['audit', page, entity], queryFn: () => getPaged<AuditLog>('/audit-logs', { page, limit: 15, entity }) });
