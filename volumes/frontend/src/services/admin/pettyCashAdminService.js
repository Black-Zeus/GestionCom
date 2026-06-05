import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;
const normalizeList = (data) => (Array.isArray(data) ? data : []);

export const pettyCashAdminService = {
  async listFunds(params = {}) {
    const response = await apiClient.get('/petty-cash-admin/funds', { params });
    return normalizeList(unwrap(response));
  },

  async createFund(payload) {
    const response = await apiClient.post('/petty-cash-admin/funds', payload);
    return unwrap(response);
  },

  async updateFund(fundId, payload) {
    const response = await apiClient.put(`/petty-cash-admin/funds/${fundId}`, payload);
    return unwrap(response);
  },

  async removeFund(fundId) {
    const response = await apiClient.delete(`/petty-cash-admin/funds/${fundId}`);
    return unwrap(response);
  },

  async listCategories(params = {}) {
    const response = await apiClient.get('/petty-cash-admin/categories', { params });
    return normalizeList(unwrap(response));
  },

  async createCategory(payload) {
    const response = await apiClient.post('/petty-cash-admin/categories', payload);
    return unwrap(response);
  },

  async updateCategory(categoryId, payload) {
    const response = await apiClient.put(`/petty-cash-admin/categories/${categoryId}`, payload);
    return unwrap(response);
  },

  async removeCategory(categoryId) {
    const response = await apiClient.delete(`/petty-cash-admin/categories/${categoryId}`);
    return unwrap(response);
  },
};
