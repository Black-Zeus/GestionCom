import { create } from 'zustand';
import { menuService } from '@/services/menu/menuService';
import { getBackendMessage } from '@/services/ui/notify';

const menuCodeToId = (code) => String(code || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const toMenuItem = (node) => ({
  id: menuCodeToId(node.code || node.id),
  code: node.code,
  label: node.name,
  tooltip: node.description || node.name,
  path: node.url || '#',
  iconName: node.icon_name,
  iconColor: node.icon_color,
  targetWindow: node.target_window || 'SELF',
  type: node.type || 'LINK',
  weight: node.sort_order || 0,
  children: (node.children || []).map(toMenuItem),
});

const toMenuGroup = (node) => {
  const children = (node.children || []).map(toMenuItem);
  const rootAsItem = node.url && node.type === 'LINK'
    ? [toMenuItem(node)]
    : [];

  return {
    id: menuCodeToId(node.code || node.id),
    code: node.code,
    label: node.name,
    tooltip: node.description || node.name,
    iconName: node.icon_name,
    iconColor: node.icon_color,
    weight: node.sort_order || 0,
    items: [...rootAsItem, ...children]
      .filter((item) => item.type !== 'DIVIDER' && item.type !== 'HEADER')
      .sort((left, right) => left.weight - right.weight),
  };
};

const normalizeWarehouseMenus = (hierarchy = []) => {
  let warehouseItem = null;

  const normalizeNode = (node) => {
    const children = (node.children || [])
      .map(normalizeNode)
      .filter(Boolean);

    if (node.code === 'warehouse_zones' || node.url === '/inventory/warehouse-zones') {
      return null;
    }

    if (node.code === 'warehouses') {
      warehouseItem = {
        ...node,
        name: 'Administracion de bodegas',
        description: 'Bodegas, tiendas, outlets y zonas operativas.',
        url: '/inventory/warehouses',
        sort_order: 35,
        children,
      };
      return null;
    }

    return { ...node, children };
  };

  const normalized = hierarchy
    .map(normalizeNode)
    .filter(Boolean);

  if (!warehouseItem) return normalized;

  return normalized.map((group) => {
    if (group.code !== 'inventory') return group;
    const currentChildren = (group.children || []).filter((item) => item.code !== 'warehouses');
    return {
      ...group,
      children: [...currentChildren, warehouseItem].sort((left, right) => (left.sort_order || 0) - (right.sort_order || 0)),
    };
  });
};

const flattenItems = (groups) => groups.flatMap((group) => group.items.map((item) => ({
  ...item,
  group: group.label,
  groupId: group.id,
})));

export const useMenuStore = create((set, get) => ({
  groups: [],
  pages: [],
  status: 'idle',
  error: null,

  async fetchMenu() {
    if (get().status === 'loading') return get().groups;

    set({ status: 'loading', error: null });

    try {
      const hierarchy = normalizeWarehouseMenus(await menuService.getUserHierarchy());
      const groups = hierarchy
        .map(toMenuGroup)
        .filter((group) => group.items.length > 0)
        .sort((left, right) => left.weight - right.weight);

      set({
        groups,
        pages: flattenItems(groups),
        status: 'ready',
        error: null,
      });

      return groups;
    } catch (error) {
      set({
        status: 'error',
        error: getBackendMessage(error, 'No fue posible cargar el menu'),
      });
      throw error;
    }
  },

  clearMenu() {
    set({
      groups: [],
      pages: [],
      status: 'idle',
      error: null,
    });
  },
}));
