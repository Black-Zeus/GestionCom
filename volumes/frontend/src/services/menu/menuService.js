import apiClient from '@/services/api/apiClient';

const normalizeMenuPayload = (payload = {}) => {
  const data = payload.data || payload;
  return data.hierarchy || data.menus || data.tree || [];
};

export const menuService = {
  async getUserHierarchy() {
    const response = await apiClient.get('/user-menus/hierarchy', {
      params: {
        include_favorites: true,
      },
    });

    return normalizeMenuPayload(response.data);
  },
};
