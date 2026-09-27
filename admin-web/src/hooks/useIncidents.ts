import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api, { apiDownloadAndSave } from '../api';
import type { Incident, PaginatedResponse } from '../types';

/**
 * useIncidents — TanStack Query hooks for incident management.
 *
 * Read:
 *   useIncidents(params)   → paginated list with filters
 *   useIncident(id)        → single incident
 *
 * Mutations (all auto-invalidate the list + detail):
 *   useUpdateIncident()    → PATCH /admin/incidents/:id
 *   useUpdateIncidentStatus() → PATCH /admin/incidents/:id/status
 *   useResolveIncident()  → PATCH /admin/incidents/:id/resolve  (legacy)
 *   useSoftDeleteIncident() → PATCH /admin/incidents/:id/soft-delete
 *   useRestoreIncident()  → PATCH /admin/incidents/:id/restore
 *   useBulkResolve()      → POST /admin/incidents/bulk-resolve
 *   useBulkDelete()       → POST /admin/incidents/bulk-delete
 *
 * All mutations show a sonner toast on success/error.
 */

export interface IncidentListParams {
  page?: number;
  limit?: number;
  severity?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useIncidents(params: IncidentListParams = {}) {
  return useQuery<PaginatedResponse<Incident>>({
    queryKey: ['incidents', 'list', params],
    queryFn: async () => {
      const res = await api.get('/admin/incidents', { params });
      return res.data;
    },
    placeholderData: (prev) => prev, // keep previous page's data while fetching next
  });
}

export function useIncident(id: string | undefined) {
  return useQuery<Incident>({
    queryKey: ['incidents', 'detail', id],
    queryFn: async () => {
      const res = await api.get(`/admin/incidents/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useUpdateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Incident> }) => {
      const res = await api.patch(`/admin/incidents/${id}`, data);
      return res.data;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.setQueryData(['incidents', 'detail', id], _data);
      toast.success('Incident updated.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update incident.');
    },
  });
}

export function useUpdateIncidentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch(`/admin/incidents/${id}/status`, { status });
      return res.data;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.setQueryData(['incidents', 'detail', id], _data);
      toast.success(`Status set to ${_data.status}.`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update status.');
    },
  });
}

export function useResolveIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/admin/incidents/${id}/resolve`);
      return res.data;
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.setQueryData(['incidents', 'detail', id], _data);
      toast.success('Incident marked as resolved.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to resolve incident.');
    },
  });
}

export function useSoftDeleteIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/admin/incidents/${id}/soft-delete`);
      return res.data;
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.setQueryData(['incidents', 'detail', id], _data);
      toast.success('Incident soft-deleted.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to soft-delete incident.');
    },
  });
}

export function useRestoreIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/admin/incidents/${id}/restore`);
      return res.data;
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.setQueryData(['incidents', 'detail', id], _data);
      toast.success('Incident restored.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to restore incident.');
    },
  });
}

export function useBulkResolve() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await api.post('/admin/incidents/bulk-resolve', { ids });
      return res.data as { count: number; incidents: Incident[] };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      toast.success(`Resolved ${data.count} incident${data.count === 1 ? '' : 's'}.`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Bulk resolve failed.');
    },
  });
}

export function useBulkDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await api.post('/admin/incidents/bulk-delete', { ids });
      return res.data as { count: number; incidents: Incident[] };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      toast.success(`Soft-deleted ${data.count} incident${data.count === 1 ? '' : 's'}.`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Bulk delete failed.');
    },
  });
}

// ─── PDF download helper (uses apiDownloadAndSave — refresh-token aware) ────

export async function downloadIncidentPdf(id: string) {
  await apiDownloadAndSave(`/admin/incidents/${id}/pdf`, `incident-${id}.pdf`);
}
