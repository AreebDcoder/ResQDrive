import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';

/**
 * authApi — RTK Query API for authentication and user profile.
 * Replaces manual api.post calls in LoginScreen, RegisterScreen, ProfileScreen.
 *
 * Note: Auth token management (storing access/refresh tokens) is still handled
 * by the existing authSlice + secureStorage. This API just provides the
 * network calls — the auth state is managed separately.
 */

export interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  profilePictureUrl?: string | null;
  mechanicDetails?: {
    workshopName?: string;
    workshopAddress?: string;
    specialization?: string;
  } | null;
  isVerified?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['User'],
  endpoints: (builder) => ({
    // ─── Queries ──────────────────────────────────────────────────────────
    getProfile: builder.query<User, void>({
      query: () => ({ url: '/users/me' }),
      providesTags: ['User'],
    }),

    // ─── Mutations ─────────────────────────────────────────────────────────
    login: builder.mutation<AuthResponse, { emailOrPhone: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),

    register: builder.mutation<any, any>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),

    googleAuth: builder.mutation<AuthResponse, { idToken: string }>({
      query: (body) => ({ url: '/auth/google', method: 'POST', body }),
    }),

    googleRegister: builder.mutation<any, any>({
      query: (body) => ({ url: '/auth/google/register', method: 'POST', body }),
    }),

    updateProfile: builder.mutation<User, Partial<User>>({
      query: (body) => ({ url: '/users/me', method: 'PATCH', body }),
      invalidatesTags: ['User'],
    }),

    changePassword: builder.mutation<any, { currentPassword: string; newPassword: string }>({
      query: (body) => ({ url: '/users/me/password', method: 'PATCH', body }),
    }),
  }),
});

export const {
  useGetProfileQuery,
  useLoginMutation,
  useRegisterMutation,
  useGoogleAuthMutation,
  useGoogleRegisterMutation,
  useUpdateProfileMutation,
  useChangePasswordMutation,
} = authApi;
