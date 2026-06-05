import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { appConfig } from '@/config/appConfig';

const MAX_HISTORY_ITEMS = 10;

export const useNavigationHistoryStore = create(
  persist(
    (set) => ({
      items: [],

      addVisit(module) {
        if (!module?.path || !module?.label) return;

        set((state) => {
          const nextItem = {
            id: module.id,
            label: module.label,
            path: module.visitPath || module.path,
            basePath: module.path,
            group: module.group,
            tooltip: module.description || `${module.group}: ${module.label}`,
            visitedAt: Date.now(),
          };

          const filteredItems = state.items.filter((item) => item.path !== nextItem.path);

          return {
            items: [...filteredItems, nextItem].slice(-MAX_HISTORY_ITEMS),
          };
        });
      },

      clear() {
        set({ items: [] });
      },
    }),
    {
      name: appConfig.storageKey('navigation-history'),
    }
  )
);
