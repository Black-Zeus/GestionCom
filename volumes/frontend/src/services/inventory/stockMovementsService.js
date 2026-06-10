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
  async listUnitConversions(params = {}) {
    return list(unwrap(await apiClient.get('/stock-movements/unit-conversions', { params })));
  },
  async createUnitConversion(payload) {
    return unwrap(await apiClient.post('/stock-movements/unit-conversions', payload));
  },
  async listLocationGaps(params = {}) {
    return list(unwrap(await apiClient.get('/stock-movements/reports/location-gaps', { params })));
  },
  async listExpiringLots(params = {}) {
    return list(unwrap(await apiClient.get('/stock-movements/reports/expiring-lots', { params })));
  },
  async emitExpiringLotAlerts(params = {}) {
    return unwrap(await apiClient.post('/stock-movements/reports/expiring-lots/alerts', null, { params }));
  },
};

export default stockMovementsService;
