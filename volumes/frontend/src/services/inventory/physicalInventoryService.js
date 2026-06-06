import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;

export const physicalInventoryService = {
  async listCounts(params = {}) {
    return unwrap(await apiClient.get('/physical-inventory/counts', { params }));
  },
  async createCount(payload) {
    return unwrap(await apiClient.post('/physical-inventory/counts', payload));
  },
  async getCount(id) {
    return unwrap(await apiClient.get(`/physical-inventory/counts/${id}`));
  },
  async addItem(id, payload) {
    return unwrap(await apiClient.post(`/physical-inventory/counts/${id}/items`, payload));
  },
  async generateItems(id) {
    return unwrap(await apiClient.post(`/physical-inventory/counts/${id}/generate-items`));
  },
  async start(id) {
    return unwrap(await apiClient.post(`/physical-inventory/counts/${id}/start`));
  },
  async updateItemCount(id, itemId, payload) {
    return unwrap(await apiClient.put(`/physical-inventory/counts/${id}/items/${itemId}/count`, payload));
  },
  async sendToReview(id) {
    return unwrap(await apiClient.post(`/physical-inventory/counts/${id}/review`));
  },
  async approve(id, payload = {}) {
    return unwrap(await apiClient.post(`/physical-inventory/counts/${id}/approve`, payload));
  },
  async post(id, payload = {}) {
    return unwrap(await apiClient.post(`/physical-inventory/counts/${id}/post`, payload));
  },
  async cancel(id, payload = {}) {
    return unwrap(await apiClient.post(`/physical-inventory/counts/${id}/cancel`, payload));
  },
};

export default physicalInventoryService;
