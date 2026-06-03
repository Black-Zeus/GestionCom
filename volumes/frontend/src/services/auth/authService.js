import apiClient from '@/services/api/apiClient';

const normalizeAuthPayload = (payload = {}) => {
  const data = payload.data || payload;
  const user = data.user || data.profile || null;
  const accessToken = data.accessToken || data.token || data.access_token || null;
  const refreshToken = data.refreshToken || data.refresh_token || null;

  return {
    user,
    accessToken,
    refreshToken,
  };
};

export const authService = {
  async login(credentials) {
    const response = await apiClient.post('/auth/login', credentials);
    return normalizeAuthPayload(response.data);
  },

  async logout() {
    await apiClient.post('/auth/logout');
  },

  async getCurrentUser() {
    const response = await apiClient.get('/auth/me');
    return response.data?.user || response.data;
  },
};
