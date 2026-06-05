import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.payment_methods)) return data.payment_methods;
  return [];
};

export const paymentMethodsService = {
  async list(params = {}) {
    const response = await apiClient.get('/payment-methods/', { params });
    return normalizeList(unwrap(response));
  },

  async create(payload) {
    const response = await apiClient.post('/payment-methods/', payload);
    return unwrap(response);
  },

  async update(paymentMethodId, payload) {
    const response = await apiClient.put(`/payment-methods/${paymentMethodId}`, payload);
    return unwrap(response);
  },

  async changeActivation(paymentMethod, isActive) {
    const response = await apiClient.put(`/payment-methods/${paymentMethod.id}`, {
      method_name: paymentMethod.method_name,
      method_type: paymentMethod.method_type,
      affects_cash_flow: paymentMethod.affects_cash_flow,
      requires_authorization: paymentMethod.requires_authorization,
      currency_code: paymentMethod.currency_code,
      allows_postdated: paymentMethod.allows_postdated,
      requires_bank_info: paymentMethod.requires_bank_info,
      default_terms_days: paymentMethod.default_terms_days,
      is_active: isActive,
    });
    return unwrap(response);
  },

  async remove(paymentMethodId) {
    const response = await apiClient.delete(`/payment-methods/${paymentMethodId}`);
    return unwrap(response);
  },
};
