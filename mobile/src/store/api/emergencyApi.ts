import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';

/**
 * emergencyApi — RTK Query API for emergency notification management.
 * Replaces manual api.post calls in CountdownScreen and EmergencyNotificationScreen.
 *
 * Flow:
 *   1. triggerEmergency → POST /emergency-notification/trigger
 *      (backend sends RoboCall + RoboSMS via Twilio)
 *   2. dispatchAlert → POST /alert-dispatch
 *      (backend sends WhatsApp Cloud API + Email + Push to all contacts)
 *   3. cancelEmergency → POST /emergency-notification/cancel/:sessionId
 *      (stops escalation, marks alert as cancelled)
 */

export interface EmergencyTriggerResponse {
  sessionId: string;
  acknowledgeUrl: string;
  status: string;
}

export interface AlertDispatchResponse {
  channels: {
    push: { status: string; devMode?: boolean };
    sms: { status: string; devMode?: boolean };
    email: { status: string; devMode?: boolean };
    whatsapp?: { status: string; devMode?: boolean };
  };
  devMode?: boolean;
}

export interface EmergencyDispatchContact {
  name: string;
  phoneNumber: string;
  email?: string;
  priorityOrder?: number;
}

export const emergencyApi = createApi({
  reducerPath: 'emergencyApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Emergency'],
  endpoints: (builder) => ({
    // ─── Queries ──────────────────────────────────────────────────────────
    getEmergencyStatus: builder.query<any, string>({
      query: (sessionId) => ({ url: `/emergency-notification/${sessionId}` }),
      providesTags: (result, error, id) => [{ type: 'Emergency' as const, id }],
    }),

    // ─── Mutations ─────────────────────────────────────────────────────────
    triggerEmergency: builder.mutation<EmergencyTriggerResponse, {
      incidentId?: string;
      severity?: string;
      message: string;
      latitude: number;
      longitude: number;
      address?: string;
    }>({
      query: (body) => ({ url: '/emergency-notification/trigger', method: 'POST', body }),
      invalidatesTags: [{ type: 'Emergency' as const }],
    }),

    dispatchAlert: builder.mutation<AlertDispatchResponse, {
      userId?: string;
      userName?: string;
      incidentId?: string;
      acknowledgeUrl?: string;
      latitude: number;
      longitude: number;
      address?: string;
      severity: string;
      contacts: EmergencyDispatchContact[];
    }>({
      query: (body) => ({ url: '/alert-dispatch', method: 'POST', body }),
      invalidatesTags: [{ type: 'Emergency' as const }],
    }),

    cancelEmergency: builder.mutation<any, string>({
      query: (sessionId) => ({ url: `/emergency-notification/cancel/${sessionId}`, method: 'POST' }),
      invalidatesTags: [{ type: 'Emergency' as const }],
    }),

    logEmergencyCall: builder.mutation<any, { serviceName: string; autoDialed: boolean }>({
      query: (body) => ({ url: '/emergency-sos/log-call', method: 'POST', body }),
    }),

    getRegionalNumbers: builder.query<any, { lat: number; lng: number }>({
      query: ({ lat, lng }) => ({ url: '/emergency-sos/numbers', params: { lat, lng } }),
    }),
  }),
});

export const {
  useGetEmergencyStatusQuery,
  useTriggerEmergencyMutation,
  useDispatchAlertMutation,
  useCancelEmergencyMutation,
  useLogEmergencyCallMutation,
  useGetRegionalNumbersQuery,
} = emergencyApi;
