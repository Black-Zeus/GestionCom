import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { appConfig } from '@/config/appConfig';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 150, 200];
export const DEFAULT_TIMEZONE = import.meta.env.VITE_FRONTEND_TIMEZONE || 'America/Santiago';

export const usePreferencesStore = create(
  persist(
    (set) => ({
      theme: 'light',
      timezone: DEFAULT_TIMEZONE,
      tablePageSize: 25,

      setTheme(theme) {
        set({ theme });
      },

      toggleTheme() {
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' }));
      },

      setTimezone(timezone) {
        set({ timezone });
      },

      setTablePageSize(tablePageSize) {
        const nextPageSize = Number(tablePageSize);
        set({
          tablePageSize: PAGE_SIZE_OPTIONS.includes(nextPageSize) ? nextPageSize : 25,
        });
      },
    }),
    {
      name: appConfig.storageKey('preferences'),
    }
  )
);
