import axios from 'axios';
import { Platform } from 'react-native';
import { store } from '../store/store';
import { logoutAction, setTokens } from '../store/slices/authSlice';
import { getItemAsync, setItemAsync, deleteItemAsync } from '../utils/secureStorage';

const LOCALHOST_API_URL = 'http://localhost:3000';
const MOBILE_API_URL = process.env.EXPO_PUBLIC_API_URL || LOCALHOST_API_URL;

const API_URL = Platform.OS === 'web' ? LOCALHOST_API_URL : MOBILE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
        const storedRefreshToken = await getItemAsync('refreshToken');
        if (!storedRefreshToken) {
          throw new Error('No refresh token stored');
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {}, {
          headers: {
            Authorization: `Bearer ${storedRefreshToken}`,
          },
        });

        const { accessToken, refreshToken } = response.data;

        await setItemAsync('refreshToken', refreshToken);
        store.dispatch(setTokens({ accessToken, refreshToken }));

        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await deleteItemAsync('refreshToken');
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