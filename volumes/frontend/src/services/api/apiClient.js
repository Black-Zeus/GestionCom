import axios from 'axios';
import { tokenStorage } from './tokenStorage';
import { appConfig } from '@/config/appConfig';

const resolveApiUrl = () => {
  const configuredUrl = import.meta.env.VITE_FRONTEND_API_URL;

  if (!configuredUrl || configuredUrl.includes('${')) {
    return '/api';
  }

  try {
    const apiUrl = new URL(configuredUrl, window.location.origin);
    const sameLocalOrigin = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const pointsToDirectBackend = ['localhost', '127.0.0.1'].includes(apiUrl.hostname) && apiUrl.port === '8000';
    if (sameLocalOrigin && pointsToDirectBackend) return '/api';
  } catch {
    return '/api';
  }

  return configuredUrl;
};

const apiClient = axios.create({
  baseURL: resolveApiUrl(),
  timeout: 30000,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise = null;
const TOKEN_REFRESH_SKEW_SECONDS = 30;

const isAuthRecoveryEndpoint = (url = '') => (
  url.includes('/auth/login')
  || url.includes('/auth/refresh')
);

const getTokenExpiration = (token) => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(window.atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')));
    return typeof decoded.exp === 'number' ? decoded.exp : null;
  } catch {
    return null;
  }
};

const shouldRefreshToken = (token) => {
  const expiresAt = getTokenExpiration(token);
  if (!expiresAt) return false;
  const now = Math.floor(Date.now() / 1000);
  return expiresAt - now <= TOKEN_REFRESH_SKEW_SECONDS;
};

const refreshSession = async () => {
  const refreshToken = tokenStorage.getRefreshToken();

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await axios.post(
    `${resolveApiUrl()}/auth/refresh`,
    null,
    {
      withCredentials: false,
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    }
  );

  const data = response.data?.data || response.data;
  const accessToken = data?.accessToken || data?.token || data?.access_token;
  const nextRefreshToken = data?.refreshToken || data?.refresh_token || refreshToken;

  if (!accessToken) {
    throw new Error('Refresh response without access token');
  }

  tokenStorage.setTokens({ accessToken, refreshToken: nextRefreshToken });

  return accessToken;
};

const getClientContextHeaders = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return {};
  const headers = {};

  try {
    headers['X-Client-Timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    headers['X-Client-Timezone'] = '';
  }

  if (navigator.language) headers['X-Client-Language'] = navigator.language;
  if (navigator.platform) headers['X-Client-Platform'] = navigator.platform;
  if (navigator.vendor) headers['X-Client-Vendor'] = navigator.vendor;
  if (navigator.hardwareConcurrency) headers['X-Client-Hardware-Concurrency'] = String(navigator.hardwareConcurrency);

  return Object.fromEntries(Object.entries(headers).filter(([, value]) => value));
};

apiClient.interceptors.request.use(async (config) => {
  let accessToken = tokenStorage.getAccessToken();

  if (accessToken && tokenStorage.getRefreshToken() && !isAuthRecoveryEndpoint(config.url) && shouldRefreshToken(accessToken)) {
    refreshPromise ||= refreshSession().finally(() => {
      refreshPromise = null;
    });
    accessToken = await refreshPromise;
  }

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  Object.entries(getClientContextHeaders()).forEach(([key, value]) => {
    config.headers[key] = value;
  });

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status !== 401 || originalRequest?._retry || isAuthRecoveryEndpoint(originalRequest?.url)) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      refreshPromise ||= refreshSession().finally(() => {
        refreshPromise = null;
      });

      const accessToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      tokenStorage.clearTokens();
      window.dispatchEvent(new CustomEvent(appConfig.eventName('session-expired')));

      return Promise.reject(refreshError);
    }
  }
);

export default apiClient;
