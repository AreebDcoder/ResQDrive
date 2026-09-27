import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';

/**
 * useAdminOps — TanStack Query hooks for the Batch 8 admin operations:
 *   - Audit log (read)
 *   - Notification broadcast (write)
 *   - Force-end sessions (write)
 *   - Purge stale device tokens (write)
 *   - Emergency numbers CRUD
 *   - Notification history with filters (replaces old NotificationHistoryPage state)
 *   - System health (live polling)
 */

// ─── Audit Log ───────────────────────────────────────────────────────────────
export interface AuditLogListParams {
  page?: number;
  limit?: number;
  adminUserId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useAuditLogs(params: AuditLogListParams = {}) {
  return useQuery<{ data: any[]; meta: any }>({
    queryKey: ['audit-logs', 'list', params],
    queryFn: async () => {
      const res = await api.get('/admin/audit-log', {
        params: {
          page: params.page ?? 1,
          limit: params.limit ?? 20,
          adminUserId: params.adminUserId,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        },
      });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

// ─── Broadcast Notification ───────────────────────────────────────────────────
export function useBroadcastNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      body: string;
      category?: string;
      segment: 'ALL' | 'DRIVERS' | 'MECHANICS';
    }) => {
      const res = await api.post('/admin/notifications/broadcast', data);
      return res.data as { sentCount: number; failedCount: number; totalUsers: number; segment: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['notifications', 'history'] });
      toast.success(`Broadcast sent to ${data.sentCount}/${data.totalUsers} ${data.segment.toLowerCase()} users. ${data.failedCount} failed.`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Broadcast failed.');
    },
  });
}

// ─── Force-end sessions ──────────────────────────────────────────────────────
export function useForceEndLocationSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/admin/location-sessions/${id}/force-end`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emergency-monitor'] });
      toast.success('Location session ended.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to end session.');
    },
  });
}

export function useForceEndEmergencySession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/admin/emergency-sessions/${id}/force-end`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emergency-monitor'] });
      toast.success('Emergency session ended. Escalation stopped.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to end session.');
    },
  });
}

// ─── Purge stale device tokens ───────────────────────────────────────────────
export function usePurgeStaleTokens() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/admin/device-tokens/purge-stale');
      return res.data as { deletedCount: number; message: string };
    },
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Purge failed.');
    },
  });
}

// ─── Emergency Numbers CRUD ──────────────────────────────────────────────────
export function useEmergencyNumbers() {
  return useQuery<any[]>({
    queryKey: ['emergency-numbers', 'list'],
    queryFn: async () => {
      const res = await api.get('/admin/emergency-numbers');
      return res.data;
    },
  });
}

export function useCreateEmergencyNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      regionName: string;
      serviceName: string;
      phoneNumber: string;
      priorityOrder?: number;
    }) => {
      const res = await api.post('/admin/emergency-numbers', data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emergency-numbers'] });
      toast.success('Emergency number added.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to add number.');
    },
  });
}

export function useUpdateEmergencyNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.patch(`/admin/emergency-numbers/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emergency-numbers'] });
      toast.success('Emergency number updated.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update number.');
    },
  });
}

export function useDeleteEmergencyNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/admin/emergency-numbers/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emergency-numbers'] });
      toast.success('Emergency number deleted.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete number.');
    },
  });
}

// ─── Notification history with filters ──────────────────────────────────────
export interface NotificationHistoryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isRead?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export function useNotificationHistory(params: NotificationHistoryParams = {}) {
  return useQuery<{ data: any[]; total: number }>({
    queryKey: ['notifications', 'history', params],
    queryFn: async () => {
      const res = await api.get('/admin/notification-history', {
        params: {
          limit: params.limit ?? 20,
          skip: ((params.page ?? 1) - 1) * (params.limit ?? 20),
          search: params.search,
          category: params.category,
          isRead: params.isRead === undefined ? undefined : (params.isRead ? 'true' : 'false'),
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        },
      });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

// ─── Emergency monitor (live polling) ────────────────────────────────────────
export function useEmergencyMonitor() {
  return useQuery<{
    emergencySessions: any[];
    locationSessions: any[];
    dispatchLogs: any[];
    allAttempts: any[];
  }>({
    queryKey: ['emergency-monitor'],
    queryFn: async () => {
      const [e, l, d] = await Promise.all([
        api.get('/admin/emergency-sessions'),
        api.get('/admin/location-sessions'),
        api.get('/admin/dispatch-logs?limit=10'),
      ]);
      const attempts = (e.data || []).flatMap((session: any) =>
        (session.attempts || []).map((a: any) => ({ ...a, sessionUser: session.user?.fullName }))
      );
      return {
        emergencySessions: e.data || [],
        locationSessions: l.data || [],
        dispatchLogs: d.data || [],
        allAttempts: attempts,
      };
    },
    refetchInterval: 5000, // live polling every 5s
  });
}

// ─── System health ────────────────────────────────────────────────────────────
export function useSystemHealth() {
  return useQuery<any>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const res = await api.get('/alert-dispatch/health');
      return res.data;
    },
    refetchInterval: 30000, // refresh every 30s
  });
}
