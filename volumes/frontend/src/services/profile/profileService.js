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
  async accessHistory() {
    const data = unwrap(await apiClient.get('/profile/access-history'));
    return Array.isArray(data) ? data : [];
  },
  uploadAvatar(file) {
    return upload('/profile/avatar', file);
  },
};

export default profileService;
