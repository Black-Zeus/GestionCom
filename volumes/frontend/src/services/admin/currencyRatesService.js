import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;
const list = (data) => (Array.isArray(data) ? data : []);

export const currencyRatesService = {
  async list() {
    return list(unwrap(await apiClient.get('/currency-rates')));
  },
  async sync() {
    return unwrap(await apiClient.post('/currency-rates/sync'));
  },
  async saveManual(payload) {
    return unwrap(await apiClient.post('/currency-rates/manual', payload));
  },
  async listCurrencies() {
    return list(unwrap(await apiClient.get('/admin-maintainers/currencies')));
  },
};
