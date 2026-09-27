import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';
import type { User, UserRole, PaginatedResponse } from '../types';

/**
 * useUsers — TanStack Query hooks for user management.
 *
 * Read:
 *   useUsers(params)   → paginated user list with filters (role, status)
 *   useUserDetail(id)  → single user with incidents/vehicles/contacts
 *
 * Mutations:
 *   useCreateUser()
 *   useUpdateUserProfile()
 *   useChangeUserRole()
 *   useChangeUserStatus()
 *   useForceLogout()
 *   useVerifyWorkshop()
 *   useRejectWorkshop()
 *   useBulkDeactivate()
 *   useDeleteUser()
 *
 * All mutations show a sonner toast on success/error and invalidate the
 * relevant query caches.
 */

export interface UserListParams {
  page?: number;
  limit?: number;
  role?: UserRole;
  isActive?: boolean;
}

interface UserListResponse {
  users: User[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export function useUsers(params: UserListParams = {}) {
  return useQuery<UserListResponse>({
    queryKey: ['users', 'list', params],
    queryFn: async () => {
      const res = await api.get('/admin/users', { params });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useUserDetail(id: string | undefined) {
  return useQuery<any>({
    queryKey: ['users', 'detail', id],
    queryFn: async () => {
      const res = await api.get(`/admin/users/${id}/detail`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/admin/users', data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create user.');
    },
  });
}

export function useUpdateUserProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.patch(`/admin/users/${id}/profile`, data);
      return res.data;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users', 'detail', id] });
      toast.success('Profile updated.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update profile.');
    },
  });
}

export function useChangeUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const res = await api.patch(`/admin/users/${id}/role`, { role });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Role changed.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to change role.');
    },
  });
}

export function useChangeUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await api.patch(`/admin/users/${id}/status`, { isActive });
      return res.data;
    },
    onSuccess: (_data, { id, isActive }) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users', 'detail', id] });
      toast.success(`User ${isActive ? 'activated' : 'deactivated'}.`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to change status.');
    },
  });
}

export function useForceLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/admin/users/${id}/force-logout`);
      return res.data;
    },
    onSuccess: (data, id) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users', 'detail', id] });
      toast.success(`Force-logout complete. ${data.revokedCount} session${data.revokedCount === 1 ? '' : 's'} revoked.`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Force-logout failed.');
    },
  });
}

export function useVerifyWorkshop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isWorkshopVerified }: { id: string; isWorkshopVerified: boolean }) => {
      const res = await api.patch(`/admin/users/${id}/verify-workshop`, { isWorkshopVerified });
      return res.data;
    },
    onSuccess: (_data, { id, isWorkshopVerified }) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users', 'detail', id] });
      qc.invalidateQueries({ queryKey: ['workshop-queue'] });
      toast.success(`Workshop ${isWorkshopVerified ? 'approved' : 'un-approved'}. Email sent to mechanic.`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to verify workshop.');
    },
  });
}

export function useRejectWorkshop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.patch(`/admin/users/${id}/reject-workshop`, { reason });
      return res.data;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users', 'detail', id] });
      qc.invalidateQueries({ queryKey: ['workshop-queue'] });
      toast.success('Workshop rejected. Rejection email sent to mechanic.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to reject workshop.');
    },
  });
}

export function useBulkDeactivate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await api.post('/admin/users/bulk-deactivate', { ids });
      return res.data as { count: number; deactivatedIds: string[] };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(`Deactivated ${data.count} user${data.count === 1 ? '' : 's'}.`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Bulk deactivate failed.');
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/admin/users/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('User permanently deleted.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete user.');
    },
  });
}

// ─── Workshop queue (separate query — different cache key) ──────────────────

export function useWorkshopQueue() {
  return useQuery<any[]>({
    queryKey: ['workshop-queue'],
    queryFn: async () => {
      const res = await api.get('/admin/workshop-queue');
      return res.data;
    },
  });
}
