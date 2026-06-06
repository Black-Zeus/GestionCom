import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;

const upload = async (url, file, fields = {}) => {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') formData.append(key, value);
  });
  formData.append('file', file);
  return unwrap(await apiClient.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } }));
};

export const mediaService = {
  uploadCompanyMedia(companyId, role, file) {
    return upload(`/profile/companies/${companyId}/${role}`, file);
  },
  uploadCustomerMedia(customerId, role, file) {
    return upload(`/profile/customers/${customerId}/${role}`, file);
  },
  uploadSupplierMedia(supplierId, role, file) {
    return upload(`/profile/suppliers/${supplierId}/${role}`, file);
  },
  uploadProductImage(productId, file) {
    return upload(`/profile/products/${productId}/image`, file);
  },
  async removeProductImage(productId) {
    return unwrap(await apiClient.delete(`/profile/products/${productId}/image`));
  },
};

export default mediaService;
