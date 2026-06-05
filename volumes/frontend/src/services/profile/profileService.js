import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;

const upload = async (url, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return unwrap(await apiClient.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } }));
};

export const profileService = {
  async get() {
    return unwrap(await apiClient.get('/profile/me'));
  },
  async update(payload) {
    return unwrap(await apiClient.put('/profile/me', payload));
  },
  async updatePreferences(payload) {
    return unwrap(await apiClient.put('/profile/preferences', payload));
  },
  async sessions() {
    const data = unwrap(await apiClient.get('/profile/sessions'));
    return Array.isArray(data) ? data : [];
  },
  uploadAvatar(file) {
    return upload('/profile/avatar', file);
  },
  uploadCompanyMedia(companyId, role, file) {
    return upload(`/profile/companies/${companyId}/${role}`, file);
  },
  uploadProductImage(productId, file) {
    return upload(`/profile/products/${productId}/image`, file);
  },
  uploadCustomerMedia(customerId, role, file) {
    return upload(`/profile/customers/${customerId}/${role}`, file);
  },
};

export default profileService;
