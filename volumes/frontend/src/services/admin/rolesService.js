import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;

export const rolesService = {
  async list(params = {}) {
    const response = await apiClient.get('/roles/', { params });
    return unwrap(response);
  },

  async get(roleId) {
    const response = await apiClient.get(`/roles/${roleId}`);
    return unwrap(response);
  },

  async create(payload) {
    const response = await apiClient.post('/roles/', payload);
    return unwrap(response);
  },

  async changeActivation(roleId, payload) {
    const response = await apiClient.patch(`/roles/${roleId}/activation`, payload);
    return unwrap(response);
  },

  async summary() {
    const response = await apiClient.get('/roles/stats/summary');
    return unwrap(response);
  },

  async getPermissions(roleId) {
    const response = await apiClient.get(`/roles/${roleId}/permissions`);
    return unwrap(response);
  },

  async updatePermissions(roleId, payload) {
    const response = await apiClient.put(`/roles/${roleId}/permissions`, {
      permission_ids: payload.permission_ids,
      reason: payload.reason,
    });
    return unwrap(response);
  },
};
