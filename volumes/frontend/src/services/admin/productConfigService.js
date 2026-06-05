import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;
const list = (data) => (Array.isArray(data) ? data : []);

export const productConfigService = {
  async listCategories(params = {}) {
    return list(unwrap(await apiClient.get('/product-config/categories', { params })));
  },
  async createCategory(payload) {
    return unwrap(await apiClient.post('/product-config/categories', payload));
  },
  async updateCategory(id, payload) {
    return unwrap(await apiClient.put(`/product-config/categories/${id}`, payload));
  },
  async removeCategory(id) {
    return unwrap(await apiClient.delete(`/product-config/categories/${id}`));
  },
  async listGroups(params = {}) {
    return list(unwrap(await apiClient.get('/product-config/attribute-groups', { params })));
  },
  async createGroup(payload) {
    return unwrap(await apiClient.post('/product-config/attribute-groups', payload));
  },
  async updateGroup(id, payload) {
    return unwrap(await apiClient.put(`/product-config/attribute-groups/${id}`, payload));
  },
  async removeGroup(id) {
    return unwrap(await apiClient.delete(`/product-config/attribute-groups/${id}`));
  },
  async listAttributes(params = {}) {
    return list(unwrap(await apiClient.get('/product-config/attributes', { params })));
  },
  async createAttribute(payload) {
    return unwrap(await apiClient.post('/product-config/attributes', payload));
  },
  async updateAttribute(id, payload) {
    return unwrap(await apiClient.put(`/product-config/attributes/${id}`, payload));
  },
  async removeAttribute(id) {
    return unwrap(await apiClient.delete(`/product-config/attributes/${id}`));
  },
  async listValues(params = {}) {
    return list(unwrap(await apiClient.get('/product-config/attribute-values', { params })));
  },
  async createValue(payload) {
    return unwrap(await apiClient.post('/product-config/attribute-values', payload));
  },
  async updateValue(id, payload) {
    return unwrap(await apiClient.put(`/product-config/attribute-values/${id}`, payload));
  },
  async removeValue(id) {
    return unwrap(await apiClient.delete(`/product-config/attribute-values/${id}`));
  },
};
