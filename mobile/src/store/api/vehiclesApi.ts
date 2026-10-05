import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';

/**
 * vehiclesApi — RTK Query API for vehicle management.
 *
 * Replaces manual fetch-then-dispatch pattern in MyVehiclesScreen, AddEditVehicleScreen,
 * and VehicleInsuranceScreen. Provides automatic caching, invalidation, and refetch.
 *
 * Hooks: useGetVehiclesQuery, useGetVehicleQuery, useCreateVehicleMutation,
 *        useUpdateVehicleMutation, useDeleteVehicleMutation, useSetPrimaryVehicleMutation,
 *        useGetInsuranceQuery, useUpsertInsuranceMutation, useDeleteInsuranceMutation
 */

export interface Vehicle {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  color?: string | null;
  licensePlate: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  insurance?: any | null;
}

export const vehiclesApi = createApi({
  reducerPath: 'vehiclesApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Vehicle', 'VehicleList', 'Insurance'],
  endpoints: (builder) => ({
    // ─── Queries ──────────────────────────────────────────────────────────
    getVehicles: builder.query<Vehicle[], void>({
      query: () => ({ url: '/vehicles' }),
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Vehicle' as const, id })), { type: 'VehicleList' as const }]
          : [{ type: 'VehicleList' as const }],
    }),

    getVehicle: builder.query<Vehicle, string>({
      query: (id) => ({ url: `/vehicles/${id}` }),
      providesTags: (result, error, id) => [{ type: 'Vehicle' as const, id }],
    }),

    getInsurance: builder.query<any, string>({
      query: (vehicleId) => ({ url: `/vehicles/${vehicleId}/insurance` }),
      providesTags: (result, error, vehicleId) => [{ type: 'Insurance' as const, id: vehicleId }],
    }),

    // ─── Mutations ─────────────────────────────────────────────────────────
    createVehicle: builder.mutation<Vehicle, Partial<Vehicle>>({
      query: (body) => ({ url: '/vehicles', method: 'POST', body }),
      invalidatesTags: [{ type: 'VehicleList' as const }],
    }),

    updateVehicle: builder.mutation<Vehicle, { id: string; body: Partial<Vehicle> }>({
      query: ({ id, body }) => ({ url: `/vehicles/${id}`, method: 'PATCH', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Vehicle' as const, id }, { type: 'VehicleList' as const }],
    }),

    deleteVehicle: builder.mutation<{ message: string }, string>({
      query: (id) => ({ url: `/vehicles/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'VehicleList' as const }],
    }),

    setPrimaryVehicle: builder.mutation<Vehicle, string>({
      query: (id) => ({ url: `/vehicles/${id}/set-primary`, method: 'PATCH' }),
      invalidatesTags: [{ type: 'VehicleList' as const }],
    }),

    upsertInsurance: builder.mutation<any, { vehicleId: string; body: any }>({
      query: ({ vehicleId, body }) => ({ url: `/vehicles/${vehicleId}/insurance`, method: 'PUT', body }),
      invalidatesTags: (result, error, { vehicleId }) => [{ type: 'Insurance' as const, id: vehicleId }],
    }),

    deleteInsurance: builder.mutation<{ message: string }, string>({
      query: (vehicleId) => ({ url: `/vehicles/${vehicleId}/insurance`, method: 'DELETE' }),
      invalidatesTags: (result, error, vehicleId) => [{ type: 'Insurance' as const, id: vehicleId }],
    }),
  }),
});

export const {
  useGetVehiclesQuery,
  useGetVehicleQuery,
  useGetInsuranceQuery,
  useCreateVehicleMutation,
  useUpdateVehicleMutation,
  useDeleteVehicleMutation,
  useSetPrimaryVehicleMutation,
  useUpsertInsuranceMutation,
  useDeleteInsuranceMutation,
} = vehiclesApi;
