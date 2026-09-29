import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import incidentsReducer from './slices/incidentsSlice';
import adminReducer from './slices/adminSlice';
import emergencyReducer from './slices/emergencySlice';
import vehiclesReducer from './slices/vehiclesSlice';
import contactsReducer from './slices/contactsSlice';
import notificationsReducer from './slices/notificationsSlice';
import sensorReducer from './slices/sensorSlice';

// RTK Query APIs
import { vehiclesApi } from './api/vehiclesApi';
import { contactsApi } from './api/contactsApi';
import { notificationsApi } from './api/notificationsApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    incidents: incidentsReducer,
    admin: adminReducer,
    emergency: emergencyReducer,
    vehicles: vehiclesReducer,
    contacts: contactsReducer,
    notifications: notificationsReducer,
    sensor: sensorReducer,
    // RTK Query APIs (coexist with legacy slices — screens can migrate gradually)
    [vehiclesApi.reducerPath]: vehiclesApi.reducer,
    [contactsApi.reducerPath]: contactsApi.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Re-enabled serializableCheck (was disabled for non-serializable sensor data).
      // We ignore the sensor.latestReading path which may contain class instances.
      serializableCheck: {
        ignoredPaths: ['sensor.latestReading'],
      },
      immutableCheck: true,
    }).concat(
      vehiclesApi.middleware,
      contactsApi.middleware,
      notificationsApi.middleware,
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
