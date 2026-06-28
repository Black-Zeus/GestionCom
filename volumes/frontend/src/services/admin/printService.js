import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;
const normalizeList = (data) => (Array.isArray(data) ? data : []);

export const printService = {
  async listTemplates() {
    const response = await apiClient.get('/print/templates');
    return normalizeList(unwrap(response));
  },

  async getTemplate(templateCode) {
    const response = await apiClient.get(`/print/templates/${templateCode}`);
    return unwrap(response);
  },

  async createTemplate(payload) {
    const response = await apiClient.post('/print/templates', payload);
    return unwrap(response);
  },

  async updateTemplate(templateId, payload) {
    const response = await apiClient.patch(`/print/templates/${templateId}`, payload);
    return unwrap(response);
  },

  async listJobs(params = {}) {
    const response = await apiClient.get('/print/jobs', { params });
    return normalizeList(unwrap(response));
  },

  async reprintSale(saleDocumentId, salesPointId, ticketType = 'TICKET_VENTA') {
    const response = await apiClient.post(`/print/jobs/reprint/${saleDocumentId}`, {
      sales_point_id: salesPointId,
      ticket_type: ticketType,
    });
    return unwrap(response);
  },
};
