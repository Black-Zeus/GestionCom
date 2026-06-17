import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data ?? response.data;

export const cashMovementsService = {
  async list(params = {}) {
    const response = await apiClient.get('/cash-movements', { params });
    const data = unwrap(response);
    return {
      movements: Array.isArray(data?.movements) ? data.movements : [],
      summary: data?.summary || {},
    };
  },
};
