import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;
const list = (data) => (Array.isArray(data) ? data : []);

export const pettyCashService = {
  async listFunds(params = {}) {
    return list(unwrap(await apiClient.get('/petty-cash/funds', { params })));
  },
  async listCategories(params = {}) {
    return list(unwrap(await apiClient.get('/petty-cash/categories', { params })));
  },
  async listVendors(params = {}) {
    return list(unwrap(await apiClient.get('/petty-cash/vendors', { params })));
  },
  async listExpenses(params = {}) {
    return list(unwrap(await apiClient.get('/petty-cash/expenses', { params })));
  },
  async createExpense(payload) {
    return this.submitExpense('/petty-cash/expenses', payload, 'post');
  },
  async updateExpense(expenseId, payload) {
    return this.submitExpense(`/petty-cash/expenses/${expenseId}`, payload, 'put');
  },
  async submitExpense(url, payload, method = 'post') {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (key === 'evidence_file') return;
      if (value !== undefined && value !== null) formData.append(key, value);
    });
    if (payload.evidence_file) formData.append('evidence_file', payload.evidence_file);
    return unwrap(await apiClient[method](url, formData, { headers: { 'Content-Type': 'multipart/form-data' } }));
  },
  async getExpenseEvidence(expenseId) {
    return unwrap(await apiClient.get(`/petty-cash/expenses/${expenseId}/evidence`));
  },
  async approveExpense(expenseId) {
    return unwrap(await apiClient.post(`/petty-cash/expenses/${expenseId}/approve`));
  },
  async rejectExpense(expenseId, payload) {
    return unwrap(await apiClient.post(`/petty-cash/expenses/${expenseId}/reject`, payload));
  },
};

export default pettyCashService;
