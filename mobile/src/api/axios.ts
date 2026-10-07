import axios from 'axios';
import { Platform, NativeModules } from 'react-native';
import { logoutAction, setTokens } from '../store/slices/authSlice';
import { getItemAsync, setItemAsync, deleteItemAsync } from '../utils/secureStorage';
import Constants from 'expo-constants';

const CUSTOM_SERVER_URL_KEY = 'resqdrive_custom_server_url';
const DEFAULT_PORT = '3000';
export const DEFAULT_FALLBACK_IP = '192.168.100.13';

let cachedDynamicUrl: string | null = null;
let customServerOverride: string | null = null;
let isStorageChecked = false;

/**
 * Extracts an IP or hostname from various URL formats.
 */
function extractHost(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  
  // 1. Match http(s)://<host>:<port> or exp://<host>:<port>
  const protocolMatch = rawUrl.match(/^(?:https?|exp):\/\/([^\/:]+)/i);
  if (protocolMatch && protocolMatch[1]) {
    const host = protocolMatch[1].trim();
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return host;
    }
  }

  // 2. Match raw host:port string like '192.168.100.13:8081' or '192.168.100.13'
  const clean = rawUrl.replace(/^[a-z]+:\/\//i, '').split('/')[0];
  const hostPart = clean.split(':')[0]?.trim();
  if (hostPart && hostPart !== 'localhost' && hostPart !== '127.0.0.1') {
    return hostPart;
  }

  return null;
}

/**
 * Auto-detects the developer's laptop/PC LAN IP address across all Expo and React Native runtime sources:
 * 1. Web browser: window.location.hostname
 * 2. NativeModules.SourceCode.scriptURL (Metro Bundler URL - changes automatically when Wi-Fi changes!)
 * 3. Constants.expoConfig.hostUri (Modern Expo SDK host URI)
 * 4. Constants.expoGoConfig.debuggerHost (Expo Go SDK 49+)
 * 5. Constants.manifest2.extra.expoGo.debuggerHost
 * 6. Constants.manifest.debuggerHost (Classic Expo)
 * 7. Constants.linkingUri / Constants.experienceUrl (Expo deep link URLs)
 * 8. Android Emulator localhost alias (10.0.2.2)
 */
export function detectMetroHostIp(): string | null {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      const webHost = window.location.hostname;
      if (webHost && webHost !== 'localhost' && webHost !== '127.0.0.1') {
        return webHost;
      }
    }
    return 'localhost';
  }

  // 1. NativeModules.SourceCode.scriptURL (Most reliable runtime indicator of current Metro host)
  const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL;
  const scriptHost = extractHost(scriptURL);
  if (scriptHost) {
    return scriptHost;
  }

  // 2. Constants.expoConfig.hostUri
  const expoConfigHost = extractHost(Constants.expoConfig?.hostUri);
  if (expoConfigHost) return expoConfigHost;

  // 3. Constants.expoGoConfig.debuggerHost
  const expoGoHost = extractHost((Constants as any)?.expoGoConfig?.debuggerHost);
  if (expoGoHost) return expoGoHost;

  // 4. Constants.manifest2.extra.expoGo.debuggerHost
  const manifest2Host = extractHost((Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost);
  if (manifest2Host) return manifest2Host;

  // 5. Constants.manifest.debuggerHost
  const manifestHost = extractHost((Constants as any)?.manifest?.debuggerHost);
  if (manifestHost) return manifestHost;

  // 6. Linking URI / Experience URL
  const linkingHost = extractHost(Constants.linkingUri || (Constants as any)?.experienceUrl);
  if (linkingHost) return linkingHost;

  // 7. Android Emulator fallback
  if (Platform.OS === 'android' && typeof scriptURL === 'string' && (scriptURL.includes('10.0.2.2') || scriptURL.includes('localhost'))) {
    return '10.0.2.2';
  }

  return null;
}

/**
 * Synchronous resolver for initial module evaluation.
 * Prioritizes dynamic Metro host IP over stale fallback constants.
 */
export const getDynamicApiUrl = (): string => {
  if (customServerOverride) return customServerOverride;
  if (cachedDynamicUrl) return cachedDynamicUrl;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      cachedDynamicUrl = `http://${window.location.hostname}:${DEFAULT_PORT}`;
      return cachedDynamicUrl;
    }
    return `http://localhost:${DEFAULT_PORT}`;
  }

  const detectedIp = detectMetroHostIp();
  if (detectedIp) {
    cachedDynamicUrl = `http://${detectedIp}:${DEFAULT_PORT}`;
    return cachedDynamicUrl;
  }

  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Safe LAN IP fallback for physical devices so it never tries unreachable localhost
  return `http://${DEFAULT_FALLBACK_IP}:${DEFAULT_PORT}`;
};

/**
 * Asynchronous resolver that checks SecureStore for any user override before auto-detecting.
 */
export const getResolvedApiUrl = async (): Promise<string> => {
  if (customServerOverride) return customServerOverride;

  if (!isStorageChecked) {
    isStorageChecked = true;
    try {
      const stored = await getItemAsync(CUSTOM_SERVER_URL_KEY);
      if (stored && stored.trim()) {
        customServerOverride = stored.trim();
        return customServerOverride;
      }
    } catch {
      // Ignore storage read error
    }
  }

  if (customServerOverride) return customServerOverride;

  return getDynamicApiUrl();
};

/**
 * Sets a custom server host or URL override (persisted in SecureStore).
 * Example: setCustomServerHost('192.168.1.100') or setCustomServerHost('http://192.168.1.100:3000')
 */
export async function setCustomServerHost(hostOrUrl: string): Promise<string> {
  let formatted = hostOrUrl.trim();
  if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
    formatted = `http://${formatted}`;
  }
  if (!formatted.match(/:\d+$/) && !formatted.includes('/', 8)) {
    formatted = `${formatted}:${DEFAULT_PORT}`;
  }

  customServerOverride = formatted;
  cachedDynamicUrl = formatted;
  api.defaults.baseURL = formatted;
  await setItemAsync(CUSTOM_SERVER_URL_KEY, formatted);
  console.log(`[DynamicAPI] Custom Server URL saved: ${formatted}`);
  return formatted;
}

/**
 * Clears custom server override and reverts to dynamic auto-detection.
 */
export async function clearCustomServerHost(): Promise<string> {
  customServerOverride = null;
  cachedDynamicUrl = null;
  await deleteItemAsync(CUSTOM_SERVER_URL_KEY);
  const reDetected = await getResolvedApiUrl();
  api.defaults.baseURL = reDetected;
  console.log(`[DynamicAPI] Cleared override. Re-detected Server URL: ${reDetected}`);
  return reDetected;
}

/**
 * Returns the currently active server URL.
 */
export function getCurrentServerUrl(): string {
  return customServerOverride || api.defaults.baseURL || getDynamicApiUrl();
}

/**
 * Pings the backend health endpoint to verify connectivity.
 */
export async function testServerConnection(targetUrl?: string): Promise<{ ok: boolean; message: string; latencyMs: number }> {
  const urlToTest = targetUrl || getCurrentServerUrl();
  const start = Date.now();
  try {
    await axios.get(`${urlToTest}/ml/health`, { timeout: 4000 });
    const latencyMs = Date.now() - start;
    return { ok: true, message: `Connected (${latencyMs}ms)`, latencyMs };
  } catch (err: any) {
    try {
      await axios.get(`${urlToTest}/alert-dispatch/health`, { timeout: 4000 });
      const latencyMs = Date.now() - start;
      return { ok: true, message: `Connected (${latencyMs}ms)`, latencyMs };
    } catch (err2: any) {
      const latencyMs = Date.now() - start;
      return { ok: false, message: err2?.message || 'Connection failed', latencyMs };
    }
  }
}

export const API_URL = getDynamicApiUrl();

// Batch 13: HTTPS enforcement — in production builds, reject http:// URLs
// to prevent plaintext API calls on hostile networks (public WiFi, carrier MITM)
if (!__DEV__ && API_URL.startsWith('http://')) {
  console.error('CRITICAL: API_URL uses http:// in production. Forcing https://');
}
export const SECURE_API_URL = (!__DEV__ && API_URL.startsWith('http://'))
  ? API_URL.replace('http://', 'https://')
  : API_URL;

const api = axios.create({
  baseURL: SECURE_API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    // Dynamically guarantee active server baseURL on every outgoing request
    const activeUrl = await getResolvedApiUrl();
    if (activeUrl) {
      config.baseURL = activeUrl;
      api.defaults.baseURL = activeUrl;
    }

    // Read stored token directly to avoid circular store import dependency
    let token: string | null = null;
    try {
      token = await getItemAsync('accessToken');
    } catch {
      // Fallback
    }

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
    // If request failed with network error, invalidate cached URL so next call re-scans the Metro host
    if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error') || error.message?.includes('timeout')) {
      cachedDynamicUrl = null;
    }

    const originalRequest = error.config;

    // Public auth endpoints should never trigger token refresh
    const url = originalRequest?.url || '';
    const isPublicAuthRoute =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/google') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/verify-email') ||
      url.includes('/auth/resend-verification') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password');

    if (isPublicAuthRoute) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
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

        const currentUrl = api.defaults.baseURL || getDynamicApiUrl();
        const response = await axios.post(`${currentUrl}/auth/refresh`, {}, {
          headers: {
            Authorization: `Bearer ${storedRefreshToken}`,
          },
        });

        const { accessToken, refreshToken } = response.data;

        await setItemAsync('accessToken', accessToken);
        await setItemAsync('refreshToken', refreshToken);

        try {
          const { store } = require('../store/store');
          store.dispatch(setTokens({ accessToken, refreshToken }));
        } catch {
          // Store dispatch fallback
        }

        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await deleteItemAsync('accessToken');
        await deleteItemAsync('refreshToken');
        try {
          const { store } = require('../store/store');
          store.dispatch(logoutAction());
        } catch {
          // Store dispatch fallback
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;