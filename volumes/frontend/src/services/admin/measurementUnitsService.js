import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.measurement_units)) return data.measurement_units;
  return [];
};

export const measurementUnitsService = {
  async list(params = {}) {
    const response = await apiClient.get('/measurement-units/', { params });
    return normalizeList(unwrap(response));
  },

  async create(payload) {
    const response = await apiClient.post('/measurement-units/', payload);
    return unwrap(response);
  },

  async update(unitId, payload) {
    const response = await apiClient.put(`/measurement-units/${unitId}`, payload);
    return unwrap(response);
  },

  async changeActivation(unit, isActive) {
    const response = await apiClient.put(`/measurement-units/${unit.id}`, {
      unit_name: unit.unit_name,
      unit_symbol: unit.unit_symbol,
      unit_type: unit.unit_type,
      base_unit_id: unit.base_unit_id,
      conversion_factor: unit.conversion_factor,
      allow_decimals: unit.allow_decimals,
      is_active: isActive,
    });
    return unwrap(response);
  },

  async remove(unitId) {
    const response = await apiClient.delete(`/measurement-units/${unitId}`);
    return unwrap(response);
  },
};
