import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';

/**
 * notificationsApi — RTK Query API for notification management.
 *
 * Replaces manual fetch-then-dispatch pattern in NotificationHistoryScreen
 * and NotificationPreferencesScreen.
 */

export interface NotificationLog {
  id: string;
  userId: string;
  category: string;
  title: string;
  body: string;
  isRead: boolean;
  deliveryStatus: string;
  createdAt: string;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  drivingModeEnabled: boolean;
  alertDeliveryEnabled: boolean;
  falseAlarmLogEnabled: boolean;
  systemStatusEnabled: boolean;
  generalEnabled: boolean;
}

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['NotificationList', 'Preferences'],
  endpoints: (builder) => ({
    // ─── Queries ──────────────────────────────────────────────────────────
    getNotificationHistory: builder.query<{ data: NotificationLog[]; total: number }, { page?: number; limit?: number }>({
      query: ({ page = 1, limit = 20 }) => ({ url: '/notifications/history', params: { page, limit } }),
      providesTags: [{ type: 'NotificationList' as const }],
    }),

    getPreferences: builder.query<NotificationPreferences, void>({
      query: () => ({ url: '/notifications/preferences' }),
      providesTags: [{ type: 'Preferences' as const }],
    }),

    // ─── Mutations ─────────────────────────────────────────────────────────
    markAsRead: builder.mutation<{ message: string }, string>({
      query: (logId) => ({ url: `/notifications/history/${logId}/read`, method: 'PATCH' }),
      invalidatesTags: [{ type: 'NotificationList' as const }],
    }),

    markAllAsRead: builder.mutation<{ message: string }, void>({
      query: () => ({ url: '/notifications/read-all', method: 'PATCH' }),
      invalidatesTags: [{ type: 'NotificationList' as const }],
    }),

    updatePreferences: builder.mutation<NotificationPreferences, Partial<NotificationPreferences>>({
      query: (body) => ({ url: '/notifications/preferences', method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Preferences' as const }],
    }),

    registerDevice: builder.mutation<any, { fcmToken: string; platform: string }>({
      query: (body) => ({ url: '/notifications/register-device', method: 'POST', body }),
    }),

    unregisterDevice: builder.mutation<any, { fcmToken: string }>({
      query: (body) => ({ url: '/notifications/register-device', method: 'DELETE', body }),
    }),
  }),
});

export const {
  useGetNotificationHistoryQuery,
  useGetPreferencesQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useUpdatePreferencesMutation,
  useRegisterDeviceMutation,
  useUnregisterDeviceMutation,
} = notificationsApi;
