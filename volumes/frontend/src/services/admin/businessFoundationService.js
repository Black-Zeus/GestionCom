import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;
const list = (data) => (Array.isArray(data) ? data : []);

const crud = (basePath) => ({
  async list(params = {}) {
    return list(unwrap(await apiClient.get(basePath, { params })));
  },
  async create(payload) {
    return unwrap(await apiClient.post(basePath, payload));
  },
  async update(id, payload) {
    return unwrap(await apiClient.put(`${basePath}/${id}`, payload));
  },
  async remove(id) {
    return unwrap(await apiClient.delete(`${basePath}/${id}`));
  },
});

export const businessFoundationService = {
  taxes: crud('/business-foundation/tax-rates'),
  priceGroups: crud('/business-foundation/price-list-groups'),
  priceCategories: {
    async list(params = {}) {
      return list(unwrap(await apiClient.get('/business-foundation/price-list-categories', { params })));
    },
  },
  priceLists: crud('/business-foundation/price-lists'),
  priceItems: {
    ...crud('/business-foundation/price-list-items'),
    async resolve(params = {}) {
      return unwrap(await apiClient.get('/business-foundation/pricing/resolve', { params }));
    },
  },
  products: crud('/business-foundation/products'),
  variants: {
    ...crud('/business-foundation/product-variants'),
    async listSkuAttributes() {
      return list(unwrap(await apiClient.get('/business-foundation/product-variants/sku-attributes')));
    },
    async units(variantId) {
      return list(unwrap(await apiClient.get(`/business-foundation/product-variants/${variantId}/units`)));
    },
    async pricingReference(variantId, params = {}) {
      return unwrap(await apiClient.get(`/business-foundation/product-variants/${variantId}/pricing-reference`, { params }));
    },
    async generate(payload) {
      return unwrap(await apiClient.post('/business-foundation/product-variants/generate', payload));
    },
  },
  companies: {
    async list(params = {}) {
      return list(unwrap(await apiClient.get('/business-foundation/company-config', { params })));
    },
    async create(payload) {
      return unwrap(await apiClient.post('/business-foundation/company-config', payload));
    },
    async update(id, payload) {
      return unwrap(await apiClient.put(`/business-foundation/company-config/${id}`, payload));
    },
    async remove(id) {
      return unwrap(await apiClient.delete(`/business-foundation/company-config/${id}`));
    },
  },
};
