import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

interface AnalyticsSummary {
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  falseAlarms: number;
  severityBreakdown: { NONE: number; MINOR: number; MODERATE: number; SEVERE: number };
  severityPercentages: { NONE: number; MINOR: number; MODERATE: number; SEVERE: number };
  recentIncidents: Array<{
    id: string; occurredAt: string; severity: string; status: string; address?: string | null;
  }>;
}

interface AnalyticsTrend { date: string; count: number; }

interface AnalyticsHotspot {
  latitude: number; longitude: number; incidentCount: number; sampleAddresses: string[];
}

interface AdminState {
  summary: AnalyticsSummary | null;
  trends: AnalyticsTrend[];
  hotspots: AnalyticsHotspot[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

const initialState: AdminState = {
  summary: null, trends: [], hotspots: [],
  isLoading: false, isRefreshing: false, error: null,
};

export const fetchAnalyticsSummary = createAsyncThunk(
  'admin/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/admin/analytics/summary');
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load summary');
    }
  }
);

export const fetchAnalyticsTrends = createAsyncThunk(
  'admin/fetchTrends',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/admin/analytics/trends');
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load trends');
    }
  }
);

export const fetchAnalyticsHotspots = createAsyncThunk(
  'admin/fetchHotspots',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/admin/analytics/hotspots');
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load hotspots');
    }
  }
);

export const refreshAllAnalytics = createAsyncThunk(
  'admin/refreshAll',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      await Promise.all([
        dispatch(fetchAnalyticsSummary()).unwrap(),
        dispatch(fetchAnalyticsTrends()).unwrap(),
        dispatch(fetchAnalyticsHotspots()).unwrap(),
      ]);
      return true;
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Refresh failed');
    }
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearAdminData(state) {
      state.summary = null; state.trends = []; state.hotspots = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnalyticsSummary.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchAnalyticsSummary.fulfilled, (state, action) => {
        state.isLoading = false; state.summary = action.payload;
      })
      .addCase(fetchAnalyticsSummary.rejected, (state, action) => {
        state.isLoading = false; state.error = action.payload as string;
      })
      .addCase(fetchAnalyticsTrends.fulfilled, (state, action) => { state.trends = action.payload; })
      .addCase(fetchAnalyticsHotspots.fulfilled, (state, action) => { state.hotspots = action.payload; })
      .addCase(refreshAllAnalytics.pending, (state) => { state.isRefreshing = true; })
      .addCase(refreshAllAnalytics.fulfilled, (state) => { state.isRefreshing = false; })
      .addCase(refreshAllAnalytics.rejected, (state) => { state.isRefreshing = false; });
  },
});

export const { clearAdminData } = adminSlice.actions;
export default adminSlice.reducer;
export type { AdminState, AnalyticsSummary, AnalyticsTrend, AnalyticsHotspot };