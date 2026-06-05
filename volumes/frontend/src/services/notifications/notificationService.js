import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;
const list = (data) => (Array.isArray(data) ? data : []);

export const notificationService = {
  async summary() {
    return unwrap(await apiClient.get('/notifications/summary'));
  },
  async list(params = {}) {
    return list(unwrap(await apiClient.get('/notifications/', { params })));
  },
  async get(id) {
    return unwrap(await apiClient.get(`/notifications/${id}`));
  },
  async markRead(id) {
    return unwrap(await apiClient.put(`/notifications/${id}/read`));
  },
  async markAllRead() {
    return unwrap(await apiClient.put('/notifications/read-all'));
  },
  async bulkAction({ action, scope = 'selected', ids = [] }) {
    return unwrap(await apiClient.put('/notifications/bulk-action', { action, scope, ids }));
  },
  async listTypes() {
    return list(unwrap(await apiClient.get('/notifications/types/catalog')));
  },
};
