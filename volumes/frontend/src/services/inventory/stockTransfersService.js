import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;
const list = (data) => (Array.isArray(data) ? data : []);

export const stockTransfersService = {
  async listTransfers(params = {}) {
    return list(unwrap(await apiClient.get('/stock-transfers/transfers', { params })));
  },
  async createTransfer(payload) {
    return unwrap(await apiClient.post('/stock-transfers/transfers', payload));
  },
  async updateTransfer(id, payload) {
    return unwrap(await apiClient.put(`/stock-transfers/transfers/${id}`, payload));
  },
  async deleteTransfer(id) {
    return unwrap(await apiClient.delete(`/stock-transfers/transfers/${id}`));
  },
  async getTransfer(id) {
    return unwrap(await apiClient.get(`/stock-transfers/transfers/${id}`));
  },
  async getAvailableStock(params) {
    return unwrap(await apiClient.get('/stock-transfers/available-stock', { params }));
  },
  async listVariantOptions() {
    return list(unwrap(await apiClient.get('/stock-movements/variants-options')));
  },
  async addItem(id, payload) {
    return unwrap(await apiClient.post(`/stock-transfers/transfers/${id}/items`, payload));
  },
  async updateItem(id, itemId, payload) {
    return unwrap(await apiClient.put(`/stock-transfers/transfers/${id}/items/${itemId}`, payload));
  },
  async saveReceptionLine(id, itemId, payload) {
    return unwrap(await apiClient.put(`/stock-transfers/transfers/${id}/items/${itemId}/reception`, payload));
  },
  async removeItem(id, itemId) {
    return unwrap(await apiClient.delete(`/stock-transfers/transfers/${id}/items/${itemId}`));
  },
  async ship(id) {
    return unwrap(await apiClient.post(`/stock-transfers/transfers/${id}/ship`));
  },
  async receive(id, payload) {
    return unwrap(await apiClient.post(`/stock-transfers/transfers/${id}/receive`, payload));
  },
  async putaway(id, payload) {
    return unwrap(await apiClient.post(`/stock-transfers/transfers/${id}/putaway`, payload));
  },
  async cancel(id, payload = {}) {
    return unwrap(await apiClient.post(`/stock-transfers/transfers/${id}/cancel`, payload));
  },
};

export default stockTransfersService;
