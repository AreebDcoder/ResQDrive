import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';
import type { Vehicle, VehicleInsurance, PaginatedResponse } from '../types';

/**
 * useVehicles — TanStack Query hooks for admin vehicle management.
 *
 * Read:
 *   useVehicles(params)   → paginated list with filters
 *   useVehicleDetail(id)  → single vehicle + insurance + linked damage/repair/incidents
 *
 * Mutations:
 *   useUpdateVehicle()
 *   useSetPrimaryVehicle()
 *   useDeleteVehicle()
 *   useUpsertInsurance()
 *   useDeleteInsurance()
 */

export interface VehicleListParams {
  page?: number;
  limit?: number;
  search?: string;
  make?: string;
  year?: number;
  isPrimary?: boolean;
  userId?: string;
}

interface VehicleListResponse {
  data: (Vehicle & { user?: { id: string; fullName: string; email: string; phoneNumber: string }; insurance?: VehicleInsurance | null })[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export function useVehicles(params: VehicleListParams = {}) {
  return useQuery<VehicleListResponse>({
    queryKey: ['vehicles', 'list', params],
    queryFn: async () => {
      const res = await api.get('/admin/vehicles', { params });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useVehicleDetail(id: string | undefined) {
  return useQuery<any>({
    queryKey: ['vehicles', 'detail', id],
    queryFn: async () => {
      const res = await api.get(`/admin/vehicles/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useUpdateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.patch(`/admin/vehicles/${id}`, data);
      return res.data;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['vehicles', 'detail', id] });
      toast.success('Vehicle updated.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update vehicle.');
    },
  });
}

export function useSetPrimaryVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/admin/vehicles/${id}/set-primary`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle marked as primary.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to set primary vehicle.');
    },
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/admin/vehicles/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle deleted. Insurance record auto-removed.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete vehicle.');
    },
  });
}

export function useUpsertInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ vehicleId, data }: { vehicleId: string; data: any }) => {
      const res = await api.patch(`/admin/vehicles/${vehicleId}/insurance`, data);
      return res.data;
    },
    onSuccess: (_data, { vehicleId }) => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['vehicles', 'detail', vehicleId] });
      toast.success('Insurance saved.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save insurance.');
    },
  });
}

export function useDeleteInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vehicleId: string) => {
      const res = await api.delete(`/admin/vehicles/${vehicleId}/insurance`);
      return res.data;
    },
    onSuccess: (_data, vehicleId) => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['vehicles', 'detail', vehicleId] });
      toast.success('Insurance removed.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to remove insurance.');
    },
  });
}
