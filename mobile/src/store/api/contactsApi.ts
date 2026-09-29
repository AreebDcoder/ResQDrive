import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';

/**
 * contactsApi — RTK Query API for emergency contact management.
 *
 * Replaces manual fetch-then-dispatch pattern in EmergencyContactsScreen
 * and AddEditContactScreen.
 */

export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  phoneNumber: string;
  email?: string | null;
  relationship: string;
  priorityOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const contactsApi = createApi({
  reducerPath: 'contactsApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Contact', 'ContactList'],
  endpoints: (builder) => ({
    // ─── Queries ──────────────────────────────────────────────────────────
    getContacts: builder.query<EmergencyContact[], void>({
      query: () => ({ url: '/emergency-contacts' }),
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Contact' as const, id })), { type: 'ContactList' as const }]
          : [{ type: 'ContactList' as const }],
    }),

    getQuickAccess: builder.query<Pick<EmergencyContact, 'id' | 'name' | 'phoneNumber' | 'priorityOrder'>[], void>({
      query: () => ({ url: '/emergency-contacts/quick-access' }),
      providesTags: [{ type: 'ContactList' as const }],
    }),

    // ─── Mutations ─────────────────────────────────────────────────────────
    createContact: builder.mutation<EmergencyContact, Partial<EmergencyContact>>({
      query: (body) => ({ url: '/emergency-contacts', method: 'POST', body }),
      invalidatesTags: [{ type: 'ContactList' as const }],
    }),

    updateContact: builder.mutation<EmergencyContact, { id: string; body: Partial<EmergencyContact> }>({
      query: ({ id, body }) => ({ url: `/emergency-contacts/${id}`, method: 'PATCH', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Contact' as const, id }, { type: 'ContactList' as const }],
    }),

    reorderContacts: builder.mutation<EmergencyContact[], { orders: Array<{ contactId: string; priorityOrder: number }> }>({
      query: (body) => ({ url: '/emergency-contacts/reorder', method: 'PATCH', body }),
      invalidatesTags: [{ type: 'ContactList' as const }],
    }),

    deleteContact: builder.mutation<{ message: string }, string>({
      query: (id) => ({ url: `/emergency-contacts/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'ContactList' as const }],
    }),
  }),
});

export const {
  useGetContactsQuery,
  useGetQuickAccessQuery,
  useCreateContactMutation,
  useUpdateContactMutation,
  useReorderContactsMutation,
  useDeleteContactMutation,
} = contactsApi;
