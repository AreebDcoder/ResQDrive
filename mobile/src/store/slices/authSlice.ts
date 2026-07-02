import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'DRIVER' | 'ADMIN' | 'MECHANIC';
  profilePictureUrl?: string;
  isVerified: boolean;
  isActive: boolean;
  driverDetails?: {
    cnicNumber: string;
    drivingLicenseNumber: string;
  };
  mechanicDetails?: {
    workshopName: string;
    workshopAddress: string;
    specialization: string;
    isWorkshopVerified: boolean;
  };
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const initialState: AuthState = {
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<{ accessToken: string; user: User }>) => {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.isLoading = false;
    },
    setTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) => {
      state.accessToken = action.payload.accessToken;
    },
    updateUserProfile: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    logoutAction: (state) => {
      state.accessToken = null;
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { loginSuccess, setTokens, updateUserProfile, logoutAction, setLoading } = authSlice.actions;
export default authSlice.reducer;
export type { User, AuthState };
