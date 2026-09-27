import axios, { type AxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

/**
 * api — Axios instance with JWT auth + refresh-token retry.
 *
 * baseURL is now driven by Vite env var (see src/lib/env.ts).
 *   - dev:  http://localhost:3000  (.env.development)
 *   - prod: https://api.resqdrive.app (.env.production)
 *
 * Backwards compat: re-exports `API_URL` (existing pages import this).
 */

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: attach Bearer token ──────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor: refresh-token retry on 401 (single-flight) ──────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null) => {
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

    // If 401 (and not already retried, and not an /auth/ call) → try refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/')
    ) {
      // If another refresh is in flight, queue this request
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
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { headers: { Authorization: `Bearer ${refreshToken}` } },
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        // Soft reload — let AuthContext pick up the empty state and show login page.
        // (Avoids window.location.reload() which loses scroll/state.)
        toast.error('Your session has expired. Please sign in again.');
        setTimeout(() => window.location.reload(), 800);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ─── apiDownload helper ─────────────────────────────────────────────────────
/**
 * Download a binary file (PDF / CSV) through the axios instance so it benefits
 * from the 401 refresh-token retry path (raw `fetch()` does NOT).
 *
 * Usage:
 *   const blob = await apiDownload('/admin/incidents/123/pdf');
 *   // then trigger a save-as:
 *   const url = window.URL.createObjectURL(blob);
 *   const a = document.createElement('a');
 *   a.href = url; a.download = 'incident-123.pdf'; a.click();
 *   window.URL.revokeObjectURL(url);
 */
export async function apiDownload(
  url: string,
  config: AxiosRequestConfig = {},
): Promise<Blob> {
  const response = await api.get(url, {
    ...config,
    responseType: 'blob',
  });
  return response.data as Blob;
}

/**
 * Convenience helper: download + trigger save-as in one call.
 * Returns the filename used (caller can show in a toast).
 */
export async function apiDownloadAndSave(
  url: string,
  filename: string,
  config: AxiosRequestConfig = {},
): Promise<string> {
  const blob = await apiDownload(url, config);
  const objectUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(objectUrl);
  return filename;
}

export default api;
export { API_URL };
