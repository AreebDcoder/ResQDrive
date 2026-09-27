import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';
import type { AccidentReport } from '../types';

/**
 * useAccidentReports — admin accident report management hooks.
 */

export interface AccidentReportListParams {
  page?: number;
  limit?: number;
  search?: string;
  severity?: string;
  userId?: string;
  autoDialed?: boolean;
}

interface AccidentReportListResponse {
  data: (AccidentReport & { user?: { id: string; fullName: string; email: string; phoneNumber: string }; vehicle?: { id: string; make: string; model: string; year: number; licensePlate: string } | null })[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export function useAccidentReports(params: AccidentReportListParams = {}) {
  return useQuery<AccidentReportListResponse>({
    queryKey: ['accident-reports', 'list', params],
    queryFn: async () => {
      const res = await api.get('/admin/accident-reports', { params });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useAccidentReport(id: string | undefined) {
  return useQuery<any>({
    queryKey: ['accident-reports', 'detail', id],
    queryFn: async () => {
      const res = await api.get(`/admin/accident-reports/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useDeleteAccidentReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/admin/accident-reports/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accident-reports'] });
      toast.success('Accident report deleted.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete accident report.');
    },
  });
}
