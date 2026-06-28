import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;
const normalizeList = (data) => (Array.isArray(data) ? data : []);

export const salesDocumentsService = {
  async createPending(payload) {
    const response = await apiClient.post('/sales-documents/pending', payload);
    return unwrap(response);
  },

  async listPending() {
    const response = await apiClient.get('/sales-documents/pending');
    return normalizeList(unwrap(response));
  },

  async get(saleId) {
    const response = await apiClient.get(`/sales-documents/${saleId}`);
    return unwrap(response);
  },

  async getByCode(saleCode) {
    const response = await apiClient.get(`/sales-documents/by-code/${encodeURIComponent(saleCode)}`);
    return unwrap(response);
  },

  async updatePending(saleId, payload) {
    const response = await apiClient.put(`/sales-documents/${saleId}/pending`, payload);
    return unwrap(response);
  },

  async deletePending(saleId) {
    const response = await apiClient.delete(`/sales-documents/${saleId}/pending`);
    return unwrap(response);
  },

  async close(saleId, payload) {
    const response = await apiClient.post(`/sales-documents/${saleId}/close`, payload);
    return unwrap(response);
  },

  async listClosed() {
    const response = await apiClient.get('/sales-documents/closed');
    return normalizeList(unwrap(response));
  },

  async findByTicket(ticketNumber) {
    const response = await apiClient.get(`/sales-documents/by-ticket/${encodeURIComponent(ticketNumber)}`);
    return unwrap(response);
  },

  async searchByTicket(q, limit = 10) {
    const response = await apiClient.get(`/sales-documents/search?q=${encodeURIComponent(q)}&limit=${limit}`);
    return normalizeList(unwrap(response));
  },

  async registerReturn(payload) {
    const response = await apiClient.post('/sales-documents/returns', payload);
    return unwrap(response);
  },
};
