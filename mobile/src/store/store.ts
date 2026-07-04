import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import incidentsReducer from './slices/incidentsSlice';
import adminReducer from './slices/adminSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    incidents: incidentsReducer,
    admin: adminReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;