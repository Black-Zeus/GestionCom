import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
            path: module.path,
            group: module.group,
            tooltip: module.description || `${module.group}: ${module.label}`,
            visitedAt: Date.now(),
          };

          const filteredItems = state.items.filter((item) => item.path !== module.path);

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
      name: 'gescom.navigation-history',
    }
  )
);
