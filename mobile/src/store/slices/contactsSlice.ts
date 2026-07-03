import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  phoneNumber: string;
  email?: string;
  relationship: string;
  priorityOrder: number;
}

export interface QuickAccessContact {
  id: string;
  name: string;
  phoneNumber: string;
  priorityOrder: number;
}

interface ContactsState {
  list: EmergencyContact[];
  quickAccessList: QuickAccessContact[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ContactsState = {
  list: [],
  quickAccessList: [],
  isLoading: false,
  error: null,
};

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    fetchContactsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchContactsSuccess: (state, action: PayloadAction<EmergencyContact[]>) => {
      state.list = action.payload;
      state.isLoading = false;
    },
    fetchContactsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    fetchQuickAccessSuccess: (state, action: PayloadAction<QuickAccessContact[]>) => {
      state.quickAccessList = action.payload;
    },
    addContactSuccess: (state, action: PayloadAction<EmergencyContact>) => {
      state.list.push(action.payload);
      state.list.sort((a, b) => a.priorityOrder - b.priorityOrder);
    },
    updateContactSuccess: (state, action: PayloadAction<EmergencyContact>) => {
      const idx = state.list.findIndex((c) => c.id === action.payload.id);
      if (idx !== -1) {
        state.list[idx] = action.payload;
      }
    },
    reorderContactsSuccess: (state, action: PayloadAction<EmergencyContact[]>) => {
      state.list = action.payload;
    },
    deleteContactSuccess: (state, action: PayloadAction<{ id: string }>) => {
      // Deleting a contact shifts remaining priorities contiguously
      const remaining = state.list
        .filter((c) => c.id !== action.payload.id)
        .sort((a, b) => a.priorityOrder - b.priorityOrder);
      
      state.list = remaining.map((c, i) => ({
        ...c,
        priorityOrder: i + 1,
      }));
    },
  },
});

export const {
  fetchContactsStart,
  fetchContactsSuccess,
  fetchContactsFailure,
  fetchQuickAccessSuccess,
  addContactSuccess,
  updateContactSuccess,
  reorderContactsSuccess,
  deleteContactSuccess,
} = contactsSlice.actions;

export default contactsSlice.reducer;
