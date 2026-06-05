import apiClient from '@/services/api/apiClient';

const unwrap = (response) => response.data?.data || response.data;

export const globalSearchService = {
  async search(query, params = {}) {
    if (!query || query.trim().length < 2) return [];
    const data = unwrap(await apiClient.get('/global-search/', { params: { q: query.trim(), ...params } }));
    return Array.isArray(data) ? data : [];
  },
};

export default globalSearchService;
