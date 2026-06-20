import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;

export const dashboardService = {
  async summary(params = {}) {
    return unwrap(await apiClient.get('/dashboard/summary', { params }));
  },
};
