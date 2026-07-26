import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SensorReading } from '../../services/sensorFusionInterface';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'unavailable';
export type SensorSource = 'ble' | 'phone' | 'mock';

export interface SensorState {
  connectionStatus: ConnectionStatus;
  activeSource: SensorSource;
  latestReading: SensorReading | null;
}

const initialState: SensorState = {
  connectionStatus: 'disconnected',
  activeSource: 'mock',
  latestReading: null,
};

const sensorSlice = createSlice({
  name: 'sensor',
  initialState,
  reducers: {
    setConnectionStatus: (state, action: PayloadAction<ConnectionStatus>) => {
      state.connectionStatus = action.payload;
    },
    setActiveSource: (state, action: PayloadAction<SensorSource>) => {
      state.activeSource = action.payload;
    },
    updateLatestReading: (state, action: PayloadAction<SensorReading>) => {
      state.latestReading = action.payload;
    },
  },
});

export const { setConnectionStatus, setActiveSource, updateLatestReading } = sensorSlice.actions;
export default sensorSlice.reducer;
