import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;

export const electronicBillingService = {
  async getConfig() {
    return unwrap(await apiClient.get('/electronic-billing/config'));
  },
  async updateConfig(payload) {
    return unwrap(await apiClient.put('/electronic-billing/config', payload));
  },
};

