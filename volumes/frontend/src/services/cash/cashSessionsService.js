import apiClient from '@/services/api/apiClient';

const unwrap = (r) => r.data?.data ?? r.data;
const list = (d) => (Array.isArray(d) ? d : []);

export const cashSessionsService = {
  async list(params = {}) {
    return list(unwrap(await apiClient.get('/cash-sessions', { params })));
  },
  async listActive() {
    return list(unwrap(await apiClient.get('/cash-sessions/active')));
  },
  async getDenominations() {
    return list(unwrap(await apiClient.get('/cash-sessions/denominations')));
  },
  async get(sessionId) {
    return unwrap(await apiClient.get(`/cash-sessions/${sessionId}`));
  },
  async getSummary(sessionId) {
    return unwrap(await apiClient.get(`/cash-sessions/${sessionId}/summary`));
  },
  async open(payload) {
    return unwrap(await apiClient.post('/cash-sessions/open', payload));
  },
  async close(sessionId, payload) {
    return unwrap(await apiClient.post(`/cash-sessions/${sessionId}/close`, payload));
  },
  async approve(sessionId, payload) {
    return unwrap(await apiClient.put(`/cash-sessions/${sessionId}/approve`, payload));
  },
  async reject(sessionId, payload) {
    return unwrap(await apiClient.post(`/cash-sessions/${sessionId}/reject`, payload));
  },
};
