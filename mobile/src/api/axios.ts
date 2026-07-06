import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { store } from '../store/store';
import { logoutAction, setTokens } from '../store/slices/authSlice';



// Use 192.168.100.4 (your computer's Wi-Fi IP) so your physical phone can connect
const API_URL = 'http://192.168.18.186:3000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach the current Access Token from memory/Redux state
api.interceptors.request.use(
  async (config) => {
    const token = store.getState().auth.accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Silent refresh on 401 (Unauthorized)
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Guard to prevent looping if the error was on the refresh endpoint itself
    if (originalRequest.url.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!storedRefreshToken) {
          throw new Error('No refresh token stored');
        }

        // Silent refresh call
        const response = await axios.post(`${API_URL}/auth/refresh`, {}, {
          headers: {
            Authorization: `Bearer ${storedRefreshToken}`,
          },
        });

        const { accessToken, refreshToken } = response.data;

        // Store new rotated tokens
        await SecureStore.setItemAsync('refreshToken', refreshToken);
        store.dispatch(setTokens({ accessToken, refreshToken }));

        // Retry original requests queued during the refresh
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Force logout if refresh token invalid/expired
        await SecureStore.deleteItemAsync('refreshToken');
        store.dispatch(logoutAction());
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
