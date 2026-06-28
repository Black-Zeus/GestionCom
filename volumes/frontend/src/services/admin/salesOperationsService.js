import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  return [];
};

export const salesOperationsService = {
  async getSessionContext() {
    const response = await apiClient.get('/sales-operations/session-context');
    return unwrap(response);
  },

  async listSalesPoints(params = {}) {
    const response = await apiClient.get('/sales-operations/sales-points', { params });
    return normalizeList(unwrap(response));
  },

  async createSalesPoint(payload) {
    const response = await apiClient.post('/sales-operations/sales-points', payload);
    return unwrap(response);
  },

  async updateSalesPoint(salesPointId, payload) {
    const response = await apiClient.put(`/sales-operations/sales-points/${salesPointId}`, payload);
    return unwrap(response);
  },

  async changeSalesPointActivation(salesPoint, isActive) {
    const response = await apiClient.put(`/sales-operations/sales-points/${salesPoint.id}`, {
      sales_point_name: salesPoint.sales_point_name,
      warehouse_id: salesPoint.warehouse_id,
      default_cash_register_id: salesPoint.default_cash_register_id || null,
      channel_type: salesPoint.channel_type,
      location_description: salesPoint.location_description || null,
      is_active: isActive,
      has_printer: Boolean(salesPoint.has_printer),
    });
    return unwrap(response);
  },

  async removeSalesPoint(salesPointId) {
    const response = await apiClient.delete(`/sales-operations/sales-points/${salesPointId}`);
    return unwrap(response);
  },

  async regeneratePrinterApiKey(salesPointId) {
    const response = await apiClient.post(`/print/sales-points/${salesPointId}/regenerate-key`);
    return unwrap(response);
  },

  async listCashRegisterAssignments(params = {}) {
    const response = await apiClient.get('/sales-operations/assignments/cash-registers', { params });
    return normalizeList(unwrap(response));
  },

  async createCashRegisterAssignment(payload) {
    const response = await apiClient.post('/sales-operations/assignments/cash-registers', payload);
    return unwrap(response);
  },

  async updateCashRegisterAssignment(assignmentId, payload) {
    const response = await apiClient.put(`/sales-operations/assignments/cash-registers/${assignmentId}`, payload);
    return unwrap(response);
  },

  async removeCashRegisterAssignment(assignmentId) {
    const response = await apiClient.delete(`/sales-operations/assignments/cash-registers/${assignmentId}`);
    return unwrap(response);
  },

  async listSalesPointAssignments(params = {}) {
    const response = await apiClient.get('/sales-operations/assignments/sales-points', { params });
    return normalizeList(unwrap(response));
  },

  async createSalesPointAssignment(payload) {
    const response = await apiClient.post('/sales-operations/assignments/sales-points', payload);
    return unwrap(response);
  },

  async updateSalesPointAssignment(assignmentId, payload) {
    const response = await apiClient.put(`/sales-operations/assignments/sales-points/${assignmentId}`, payload);
    return unwrap(response);
  },

  async removeSalesPointAssignment(assignmentId) {
    const response = await apiClient.delete(`/sales-operations/assignments/sales-points/${assignmentId}`);
    return unwrap(response);
  },
};
