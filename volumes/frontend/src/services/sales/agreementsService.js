import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;
const normalizeList = (data) => (Array.isArray(data) ? data : []);

export const agreementsService = {
  async list(params = {}) {
    const response = await apiClient.get('/agreements/', { params });
    return normalizeList(unwrap(response));
  },

  async create(payload) {
    const response = await apiClient.post('/agreements/', payload);
    return unwrap(response);
  },

  async update(agreementId, payload) {
    const response = await apiClient.put(`/agreements/${agreementId}`, payload);
    return unwrap(response);
  },

  async remove(agreementId) {
    const response = await apiClient.delete(`/agreements/${agreementId}`);
    return unwrap(response);
  },

  async listBeneficiaries(agreementId) {
    const response = await apiClient.get(`/agreements/${agreementId}/beneficiaries`);
    return normalizeList(unwrap(response));
  },

  async createBeneficiary(agreementId, payload) {
    const response = await apiClient.post(`/agreements/${agreementId}/beneficiaries`, payload);
    return unwrap(response);
  },

  async updateBeneficiary(agreementId, beneficiaryId, payload) {
    const response = await apiClient.put(`/agreements/${agreementId}/beneficiaries/${beneficiaryId}`, payload);
    return unwrap(response);
  },

  async removeBeneficiary(agreementId, beneficiaryId) {
    const response = await apiClient.delete(`/agreements/${agreementId}/beneficiaries/${beneficiaryId}`);
    return unwrap(response);
  },

  async usage(params = {}) {
    const response = await apiClient.get('/agreements/usage/report', { params });
    return normalizeList(unwrap(response));
  },
};
