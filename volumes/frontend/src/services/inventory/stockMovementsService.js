import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;
const list = (data) => (Array.isArray(data) ? data : []);

export const stockMovementsService = {
  async listMovements(params = {}) {
    return list(unwrap(await apiClient.get('/stock-movements/movements', { params })));
  },
  async listVariantUnits(productVariantId) {
    return list(unwrap(await apiClient.get(`/stock-movements/variant-units/${productVariantId}`)));
  },
  async listVariantOptions() {
    return list(unwrap(await apiClient.get('/stock-movements/variants-options')));
  },
  async createMovement(payload) {
    return unwrap(await apiClient.post('/stock-movements/movements', payload));
  },
};

export default stockMovementsService;
