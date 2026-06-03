import axios from 'axios';
import { tokenStorage } from './tokenStorage';

const resolveApiUrl = () => {
  const configuredUrl = import.meta.env.VITE_FRONTEND_API_URL;

  if (!configuredUrl || configuredUrl.includes('${')) {
    return '/api';
  }

  return configuredUrl;
};

const apiClient = axios.create({
  baseURL: resolveApiUrl(),
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise = null;

const refreshSession = async () => {
  const refreshToken = tokenStorage.getRefreshToken();

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await axios.post(
    `${resolveApiUrl()}/auth/refresh`,
    { refreshToken },
    { withCredentials: true }
  );

  const accessToken = response.data?.accessToken || response.data?.token;
  const nextRefreshToken = response.data?.refreshToken || refreshToken;

  if (!accessToken) {
    throw new Error('Refresh response without access token');
  }

  tokenStorage.setTokens({ accessToken, refreshToken: nextRefreshToken });

  return accessToken;
};

apiClient.interceptors.request.use((config) => {
  const accessToken = tokenStorage.getAccessToken();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status !== 401 || originalRequest?._retry) {
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
      window.dispatchEvent(new CustomEvent('gescom:session-expired'));

      return Promise.reject(refreshError);
    }
  }
);

export default apiClient;
