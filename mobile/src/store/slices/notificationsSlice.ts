import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface NotificationLog {
  id: string;
  userId: string;
  category: 'driving_mode' | 'alert_delivery_confirmation' | 'false_alarm_log' | 'system_status' | 'general';
  title: string;
  body: string;
  isRead: boolean;
  deliveryStatus: 'sent' | 'failed' | 'skipped_by_preference';
  metadata?: any;
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

interface NotificationsState {
  history: NotificationLog[];
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  isHistoryLoading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const initialState: NotificationsState = {
  history: [],
  preferences: null,
  isLoading: false,
  isHistoryLoading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  },
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    fetchPreferencesStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchPreferencesSuccess: (state, action: PayloadAction<NotificationPreferences>) => {
      state.preferences = action.payload;
      state.isLoading = false;
    },
    fetchPreferencesFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    updatePreferenceOptimistic: (state, action: PayloadAction<Partial<NotificationPreferences>>) => {
      if (state.preferences) {
        state.preferences = { ...state.preferences, ...action.payload };
      }
    },
    fetchHistoryStart: (state) => {
      state.isHistoryLoading = true;
      state.error = null;
    },
    fetchHistorySuccess: (
      state,
      action: PayloadAction<{ logs: NotificationLog[]; pagination: any; append: boolean }>
    ) => {
      state.isHistoryLoading = false;
      if (action.payload.append) {
        state.history = [...state.history, ...action.payload.logs];
      } else {
        state.history = action.payload.logs;
      }
      state.pagination = action.payload.pagination;
    },
    fetchHistoryFailure: (state, action: PayloadAction<string>) => {
      state.isHistoryLoading = false;
      state.error = action.payload;
    },
    markReadSuccess: (state, action: PayloadAction<string>) => {
      const idx = state.history.findIndex((log) => log.id === action.payload);
      if (idx !== -1) {
        state.history[idx].isRead = true;
      }
    },
    markAllReadSuccess: (state) => {
      state.history = state.history.map((log) => ({ ...log, isRead: true }));
    },
  },
});

export const {
  fetchPreferencesStart,
  fetchPreferencesSuccess,
  fetchPreferencesFailure,
  updatePreferenceOptimistic,
  fetchHistoryStart,
  fetchHistorySuccess,
  fetchHistoryFailure,
  markReadSuccess,
  markAllReadSuccess,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
