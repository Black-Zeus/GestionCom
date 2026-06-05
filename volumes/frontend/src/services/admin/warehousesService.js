import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.warehouses)) return data.warehouses;
  return [];
};

export const warehousesService = {
  async list(params = {}) {
    const response = await apiClient.get('/warehouses/', { params });
    return normalizeList(unwrap(response));
  },

  async get(warehouseId) {
    const response = await apiClient.get(`/warehouses/${warehouseId}`);
    return unwrap(response);
  },

  async create(payload) {
    const response = await apiClient.post('/warehouses/', payload);
    return unwrap(response);
  },

  async update(warehouseId, payload) {
    const response = await apiClient.put(`/warehouses/${warehouseId}`, payload);
    return unwrap(response);
  },

  async changeActivation(warehouse, isActive) {
    const response = await apiClient.put(`/warehouses/${warehouse.id}`, {
      warehouse_name: warehouse.warehouse_name,
      warehouse_type: warehouse.warehouse_type,
      responsible_user_id: warehouse.responsible_user_id,
      address: warehouse.address || null,
      city: warehouse.city || null,
      country: warehouse.country || null,
      phone: warehouse.phone || null,
      email: warehouse.email || null,
      is_active: isActive,
    });
    return unwrap(response);
  },

  async remove(warehouseId) {
    const response = await apiClient.delete(`/warehouses/${warehouseId}`);
    return unwrap(response);
  },
};
