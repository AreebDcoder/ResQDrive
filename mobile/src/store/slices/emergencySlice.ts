import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

interface EmergencyAttempt {
  contactName: string;
  contactPhone: string;
  priorityOrder: number;
  channel: 'PUSH' | 'SMS' | 'EMAIL' | 'PHONE_CALL';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'ACKNOWLEDGED';
  dispatchedAt: string;
}

interface EmergencyState {
  active: boolean;
  sessionId: string | null;
  locationSessionId: string | null;
  shareToken: string | null;
  acknowledgeUrl: string | null;
  triggeredAt: string | null;
  currentPriority: number;
  nextEscalationAt: string | null;
  expiresAt: string | null;
  attempts: EmergencyAttempt[];
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'CANCELLED' | 'EXPIRED' | 'EXHAUSTED' | null;
  isTriggering: boolean;
  isCancelling: boolean;
  error: string | null;
}

const initialState: EmergencyState = {
  active: false,
  sessionId: null,
  locationSessionId: null,
  shareToken: null,
  acknowledgeUrl: null,
  triggeredAt: null,
  currentPriority: 0,
  nextEscalationAt: null,
  expiresAt: null,
  attempts: [],
  acknowledgedBy: null,
  acknowledgedAt: null,
  status: null,
  isTriggering: false,
  isCancelling: false,
  error: null,
};

export const triggerEmergency = createAsyncThunk(
  'emergency/trigger',
  async (data: { message?: string; latitude?: number; longitude?: number; address?: string; incidentId?: string }, { rejectWithValue }) => {
    try {
      const res = await api.post('/emergency-notification/trigger', data);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to trigger emergency alert');
    }
  }
);

export const cancelEmergency = createAsyncThunk(
  'emergency/cancel',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      const res = await api.post(`/emergency-notification/${sessionId}/cancel`);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to cancel');
    }
  }
);

export const fetchEmergencyStatus = createAsyncThunk(
  'emergency/fetchStatus',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/emergency-notification/status');
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch status');
    }
  }
);

const emergencySlice = createSlice({
  name: 'emergency',
  initialState,
  reducers: {
    clearEmergency(state) {
      Object.assign(state, initialState);
    },
    clearError(state) {
      state.error = null;
    },
    updateFromStatus(state, action) {
      const data = action.payload;
      if (!data.active) {
        if (state.active && state.status === 'ACTIVE') {
          // Was active, now not — could be acknowledged/expired/cancelled remotely
          state.active = false;
          state.status = 'ACKNOWLEDGED';
        }
        return;
      }
      state.active = true;
      state.sessionId = data.sessionId;
      state.shareToken = data.shareToken;
      state.acknowledgeUrl = data.acknowledgeUrl;
      state.triggeredAt = data.triggeredAt;
      state.currentPriority = data.currentPriority;
      state.nextEscalationAt = data.nextEscalationAt;
      state.expiresAt = data.expiresAt;
      state.attempts = data.attempts || [];
      state.status = 'ACTIVE';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(triggerEmergency.pending, (state) => {
        state.isTriggering = true;
        state.error = null;
      })
      .addCase(triggerEmergency.fulfilled, (state, action) => {
        state.isTriggering = false;
        state.active = true;
        state.status = 'ACTIVE';
        state.sessionId = action.payload.sessionId;
        state.locationSessionId = action.payload.locationSessionId || null;
        state.shareToken = action.payload.shareToken;
        state.acknowledgeUrl = action.payload.acknowledgeUrl;
        state.triggeredAt = action.payload.triggeredAt;
        state.currentPriority = action.payload.currentPriority;
        state.nextEscalationAt = action.payload.nextEscalationAt;
        state.attempts = [];
      })
      .addCase(triggerEmergency.rejected, (state, action) => {
        state.isTriggering = false;
        state.error = action.payload as string;
      })
      .addCase(cancelEmergency.pending, (state) => {
        state.isCancelling = true;
      })
      .addCase(cancelEmergency.fulfilled, (state) => {
        state.isCancelling = false;
        state.active = false;
        state.status = 'CANCELLED';
      })
      .addCase(cancelEmergency.rejected, (state, action) => {
        state.isCancelling = false;
        state.error = action.payload as string;
      })
      .addCase(fetchEmergencyStatus.fulfilled, (state, action) => {
        const data = action.payload;
        if (!data.active) {
          if (state.active) {
            state.active = false;
            if (!state.status || state.status === 'ACTIVE') {
              state.status = 'ACKNOWLEDGED';
            }
          }
          return;
        }
        state.active = true;
        state.status = 'ACTIVE';
        state.sessionId = data.sessionId;
        state.shareToken = data.shareToken;
        state.acknowledgeUrl = data.acknowledgeUrl;
        state.triggeredAt = data.triggeredAt;
        state.currentPriority = data.currentPriority;
        state.nextEscalationAt = data.nextEscalationAt;
        state.expiresAt = data.expiresAt;
        state.attempts = data.attempts || [];
      });
  },
});

export const { clearEmergency, clearError, updateFromStatus } = emergencySlice.actions;
export default emergencySlice.reducer;
export type { EmergencyState, EmergencyAttempt };