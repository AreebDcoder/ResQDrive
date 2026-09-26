import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';
import type { EmergencyContact } from '../types';

/**
 * useEmergencyContacts — admin emergency contact management hooks.
 */

export interface ContactListParams {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
  relationship?: string;
}

interface ContactListResponse {
  data: (EmergencyContact & { user?: { id: string; fullName: string; email: string; phoneNumber: string } })[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export function useEmergencyContacts(params: ContactListParams = {}) {
  return useQuery<ContactListResponse>({
    queryKey: ['emergency-contacts', 'list', params],
    queryFn: async () => {
      const res = await api.get('/admin/emergency-contacts', { params });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useEmergencyContact(id: string | undefined) {
  return useQuery<any>({
    queryKey: ['emergency-contacts', 'detail', id],
    queryFn: async () => {
      const res = await api.get(`/admin/emergency-contacts/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.patch(`/admin/emergency-contacts/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emergency-contacts'] });
      toast.success('Contact updated.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update contact.');
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/admin/emergency-contacts/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emergency-contacts'] });
      toast.success('Contact deleted. Priorities re-sequenced.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete contact.');
    },
  });
}
