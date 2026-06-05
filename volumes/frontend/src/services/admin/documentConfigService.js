import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;
const list = (data) => (Array.isArray(data) ? data : []);

export const documentConfigService = {
  async listTypes(params = {}) {
    return list(unwrap(await apiClient.get('/document-config/types', { params })));
  },
  async updateType(id, payload) {
    return unwrap(await apiClient.put(`/document-config/types/${id}`, payload));
  },
  async listSeries(params = {}) {
    return list(unwrap(await apiClient.get('/document-config/series', { params })));
  },
  async createSeries(payload) {
    return unwrap(await apiClient.post('/document-config/series', payload));
  },
  async updateSeries(id, payload) {
    return unwrap(await apiClient.put(`/document-config/series/${id}`, payload));
  },
  async removeSeries(id) {
    return unwrap(await apiClient.delete(`/document-config/series/${id}`));
  },
};
