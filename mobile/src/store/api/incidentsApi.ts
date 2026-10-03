import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';

/**
 * incidentsApi — RTK Query API for incident management.
 * Replaces manual api.get/post/delete calls in IncidentsListScreen,
 * IncidentDetailScreen, and CreateIncidentScreen.
 */

export interface Incident {
  id: string;
  type: string;
  severity: string;
  status: string;
  occurredAt: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  description?: string;
  acknowledged?: boolean;
  userId?: string;
  user?: { id: string; fullName: string; phoneNumber: string };
  attempts?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface IncidentsResponse {
  incidents: Incident[];
  total: number;
  page: number;
  totalPages: number;
}

export const incidentsApi = createApi({
  reducerPath: 'incidentsApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Incident', 'IncidentList'],
  endpoints: (builder) => ({
    // ─── Queries ──────────────────────────────────────────────────────────
    getIncidents: builder.query<IncidentsResponse, { page?: number; limit?: number; severity?: string; refresh?: boolean }>({
      query: ({ page = 1, limit = 20, severity, refresh } = {}) => ({
        url: '/incidents',
        params: { page, limit, severity: severity !== 'ALL' ? severity : undefined, refresh },
      }),
      providesTags: [{ type: 'IncidentList' as const }],
    }),

    getIncident: builder.query<Incident, string>({
      query: (id) => ({ url: `/incidents/${id}` }),
      providesTags: (result, error, id) => [{ type: 'Incident' as const, id }],
    }),

    // ─── Mutations ─────────────────────────────────────────────────────────
    createIncident: builder.mutation<Incident, Partial<Incident>>({
      query: (body) => ({ url: '/incidents', method: 'POST', body }),
      invalidatesTags: [{ type: 'IncidentList' as const }],
    }),

    updateIncident: builder.mutation<Incident, { id: string; body: Partial<Incident> }>({
      query: ({ id, body }) => ({ url: `/incidents/${id}`, method: 'PATCH', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Incident' as const, id }, { type: 'IncidentList' as const }],
    }),

    deleteIncident: builder.mutation<{ message: string }, string>({
      query: (id) => ({ url: `/incidents/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'IncidentList' as const }],
    }),
  }),
});

export const {
  useGetIncidentsQuery,
  useGetIncidentQuery,
  useCreateIncidentMutation,
  useUpdateIncidentMutation,
  useDeleteIncidentMutation,
} = incidentsApi;
