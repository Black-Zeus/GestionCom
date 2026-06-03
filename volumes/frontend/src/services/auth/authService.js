import apiClient from '@/services/api/apiClient';

const normalizeAuthPayload = (payload = {}) => {
  const data = payload.data || payload;
  const user = data.user || data.user_info || data.profile || null;
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
    const response = await apiClient.get('/users/me/profile');
    const data = response.data?.data || response.data;
    return data?.user || data?.profile || data;
  },
};
