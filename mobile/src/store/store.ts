import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import vehiclesReducer from './slices/vehiclesSlice';
import contactsReducer from './slices/contactsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    vehicles: vehiclesReducer,
    contacts: contactsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
