import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.cash_registers)) return data.cash_registers;
  return [];
};

export const cashRegistersService = {
  async list(params = {}) {
    const response = await apiClient.get('/cash-registers/', { params });
    return normalizeList(unwrap(response));
  },

  async create(payload) {
    const response = await apiClient.post('/cash-registers/', payload);
    return unwrap(response);
  },

  async update(cashRegisterId, payload) {
    const response = await apiClient.put(`/cash-registers/${cashRegisterId}`, payload);
    return unwrap(response);
  },

  async changeActivation(cashRegister, isActive) {
    const response = await apiClient.put(`/cash-registers/${cashRegister.id}`, {
      register_name: cashRegister.register_name,
      warehouse_id: cashRegister.warehouse_id,
      terminal_identifier: cashRegister.terminal_identifier || null,
      ip_address: cashRegister.ip_address || null,
      location_description: cashRegister.location_description || null,
      requires_supervisor_approval: cashRegister.requires_supervisor_approval,
      max_difference_amount: cashRegister.max_difference_amount,
      is_active: isActive,
    });
    return unwrap(response);
  },

  async remove(cashRegisterId) {
    const response = await apiClient.delete(`/cash-registers/${cashRegisterId}`);
    return unwrap(response);
  },
};
