import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../api/axios';

export interface Incident {
  id: string;
  userId: string;
  type: 'AUTO' | 'MANUAL';
  severity: 'NONE' | 'MINOR' | 'MODERATE' | 'SEVERE';
  status: 'ACTIVE' | 'RESOLVED' | 'FALSE_ALARM' | 'ARCHIVED';
  occurredAt: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  description?: string | null;
  sensorSnapshot?: any;
  alertDispatchStatus?: any;
  damageAssessmentResult?: any;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IncidentsState {
  list: Incident[];
  current: Incident | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isSubmitting: boolean;
  error: string | null;
  meta: { page: number; limit: number; total: number; totalPages: number };
  filters: { severity?: string; status?: string; type?: string; search?: string };
}

const initialState: IncidentsState = {
  list: [],
  current: null,
  isLoading: false,
  isRefreshing: false,
  isSubmitting: false,
  error: null,
  meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
  filters: {},
};

export const fetchIncidents = createAsyncThunk(
  'incidents/fetchIncidents',
  async (params: { page?: number; refresh?: boolean }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const { filters, meta } = state.incidents;
      const page = params.page ?? meta.page;
      const query: any = { page, limit: meta.limit };
      if (filters.severity) query.severity = filters.severity;
      if (filters.status) query.status = filters.status;
      if (filters.type) query.type = filters.type;
      if (filters.search) query.search = filters.search;
      const response = await api.get('/incidents', { params: query });
      return { ...response.data, refresh: params.refresh };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch incidents');
    }
  }
);

export const fetchIncident = createAsyncThunk(
  'incidents/fetchIncident',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/incidents/${id}`);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch incident');
    }
  }
);

export const createIncident = createAsyncThunk(
  'incidents/createIncident',
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await api.post('/incidents', data);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create incident');
    }
  }
);

export const updateIncident = createAsyncThunk(
  'incidents/updateIncident',
  async ({ id, data }: { id: string; data: any }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/incidents/${id}`, data);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update incident');
    }
  }
);

export const deleteIncident = createAsyncThunk(
  'incidents/deleteIncident',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/incidents/${id}`);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete incident');
    }
  }
);

const incidentsSlice = createSlice({
  name: 'incidents',
  initialState,
  reducers: {
    clearCurrent(state) { state.current = null; },
    clearError(state) { state.error = null; },
    setFilters(state, action: PayloadAction<any>) {
      state.filters = { ...state.filters, ...action.payload };
      state.meta.page = 1;
    },
    clearFilters(state) {
      state.filters = {};
      state.meta.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchIncidents.pending, (state, action) => {
        if (action.meta.arg.refresh) state.isRefreshing = true;
        else state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchIncidents.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isRefreshing = false;
        const payload = action.payload as any;
        if (payload.refresh) state.list = payload.data;
        else state.list = [...state.list, ...payload.data];
        state.meta = payload.meta;
      })
      .addCase(fetchIncidents.rejected, (state, action) => {
        state.isLoading = false;
        state.isRefreshing = false;
        state.error = action.payload as string;
      })
      .addCase(fetchIncident.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchIncident.fulfilled, (state, action) => {
        state.isLoading = false;
        state.current = action.payload;
      })
      .addCase(fetchIncident.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createIncident.pending, (state) => { state.isSubmitting = true; state.error = null; })
      .addCase(createIncident.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.list = [action.payload, ...state.list];
      })
      .addCase(createIncident.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })
      .addCase(updateIncident.pending, (state) => { state.isSubmitting = true; state.error = null; })
      .addCase(updateIncident.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const idx = state.list.findIndex(i => i.id === action.payload.id);
        if (idx !== -1) state.list[idx] = action.payload;
        if (state.current?.id === action.payload.id) state.current = action.payload;
      })
      .addCase(updateIncident.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })
      .addCase(deleteIncident.fulfilled, (state, action) => {
        state.list = state.list.filter(i => i.id !== action.payload);
        if (state.current?.id === action.payload) state.current = null;
      });
  },
});

export const { clearCurrent, clearError, setFilters, clearFilters } = incidentsSlice.actions;
export default incidentsSlice.reducer;
export type { IncidentsState };