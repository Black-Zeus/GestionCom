import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;
const list = (data) => (Array.isArray(data) ? data : []);

export const adminMaintainersService = {
  async list(resource) {
    return list(unwrap(await apiClient.get(`/admin-maintainers/${resource}`)));
  },
  async create(resource, payload) {
    return unwrap(await apiClient.post(`/admin-maintainers/${resource}`, payload));
  },
  async update(resource, id, payload) {
    return unwrap(await apiClient.put(`/admin-maintainers/${resource}/${id}`, payload));
  },
  async remove(resource, id) {
    return unwrap(await apiClient.delete(`/admin-maintainers/${resource}/${id}`));
  },
};
