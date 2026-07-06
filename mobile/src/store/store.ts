import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import incidentsReducer from './slices/incidentsSlice';
import adminReducer from './slices/adminSlice';
import emergencyReducer from './slices/emergencySlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    incidents: incidentsReducer,
    admin: adminReducer,
    emergency: emergencyReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;