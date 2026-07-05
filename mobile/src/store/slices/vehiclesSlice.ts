import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Insurance {
  id: string;
  vehicleId: string;
  providerName?: string;
  policyNumber?: string;
  coverageType?: string;
  expiryDate?: string;
  emergencyHelpline?: string;
}

export interface Vehicle {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  licensePlate: string;
  isPrimary: boolean;
  insurance?: Insurance;
}

interface VehiclesState {
  list: Vehicle[];
  isLoading: boolean;
  error: string | null;
}

const initialState: VehiclesState = {
  list: [],
  isLoading: false,
  error: null,
};

const vehiclesSlice = createSlice({
  name: 'vehicles',
  initialState,
  reducers: {
    fetchVehiclesStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchVehiclesSuccess: (state, action: PayloadAction<Vehicle[]>) => {
      state.list = action.payload;
      state.isLoading = false;
    },
    fetchVehiclesFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    addVehicleSuccess: (state, action: PayloadAction<Vehicle>) => {
      state.list.unshift(action.payload);
    },
    updateVehicleSuccess: (state, action: PayloadAction<Vehicle>) => {
      const idx = state.list.findIndex((v) => v.id === action.payload.id);
      if (idx !== -1) {
        state.list[idx] = action.payload;
      }
    },
    setPrimaryVehicleSuccess: (state, action: PayloadAction<string>) => {
      state.list = state.list.map((v) => ({
        ...v,
        isPrimary: v.id === action.payload,
      }));
    },
    deleteVehicleSuccess: (state, action: PayloadAction<string>) => {
      state.list = state.list.filter((v) => v.id !== action.payload);
    },
    upsertInsuranceSuccess: (state, action: PayloadAction<{ vehicleId: string; insurance: Insurance }>) => {
      const idx = state.list.findIndex((v) => v.id === action.payload.vehicleId);
      if (idx !== -1) {
        state.list[idx].insurance = action.payload.insurance;
      }
    },
    deleteInsuranceSuccess: (state, action: PayloadAction<string>) => {
      const idx = state.list.findIndex((v) => v.id === action.payload);
      if (idx !== -1) {
        delete state.list[idx].insurance;
      }
    },
  },
});

export const {
  fetchVehiclesStart,
  fetchVehiclesSuccess,
  fetchVehiclesFailure,
  addVehicleSuccess,
  updateVehicleSuccess,
  setPrimaryVehicleSuccess,
  deleteVehicleSuccess,
  upsertInsuranceSuccess,
  deleteInsuranceSuccess,
} = vehiclesSlice.actions;

export default vehiclesSlice.reducer;
