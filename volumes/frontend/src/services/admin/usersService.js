import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;

export const usersService = {
  async list(params = {}) {
    const response = await apiClient.get('/users/', { params });
    return unwrap(response);
  },

  async create(payload) {
    const response = await apiClient.post('/users/', payload);
    return unwrap(response);
  },

  async update(userId, payload) {
    const response = await apiClient.put(`/users/${userId}`, payload);
    return unwrap(response);
  },

  async toggleActivation(userId, isActive, reason = '') {
    const response = await apiClient.put(`/users/${userId}/toggle-activation`, {
      is_active: isActive,
      reason,
    });
    return unwrap(response);
  },

  async changePasswordByAdmin(userId, payload) {
    const response = await apiClient.put('/auth/change-password-by-admin', {
      target_user_id: userId,
      new_password: payload.new_password,
      confirm_password: payload.confirm_password,
      reason: payload.reason,
    });
    return unwrap(response);
  },

  async getRoles(userId) {
    const response = await apiClient.get(`/users/${userId}/roles`);
    return unwrap(response);
  },

  async updateRoles(userId, payload) {
    const response = await apiClient.put(`/users/${userId}/roles`, {
      role_ids: payload.role_ids,
      reason: payload.reason,
    });
    return unwrap(response);
  },

  async getPermissions(userId) {
    const response = await apiClient.get(`/users/${userId}/permissions`);
    return unwrap(response);
  },

  async updatePermissions(userId, payload) {
    const response = await apiClient.put(`/users/${userId}/permissions`, {
      permission_ids: payload.permission_ids,
      reason: payload.reason,
    });
    return unwrap(response);
  },
};
