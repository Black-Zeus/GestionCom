import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { appConfig } from '@/config/appConfig';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 150, 200];
export const DEFAULT_TIMEZONE = import.meta.env.VITE_FRONTEND_TIMEZONE || 'America/Santiago';
export const HOUR_FORMAT_OPTIONS = ['24h', '12h'];
export const DEFAULT_HOUR_FORMAT = '24h';

const normalizeHourFormat = (hourFormat) => (
  HOUR_FORMAT_OPTIONS.includes(hourFormat) ? hourFormat : DEFAULT_HOUR_FORMAT
);

export const usePreferencesStore = create(
  persist(
    (set) => ({
      theme: 'light',
      timezone: DEFAULT_TIMEZONE,
      hourFormat: DEFAULT_HOUR_FORMAT,
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

      setHourFormat(hourFormat) {
        set({ hourFormat: normalizeHourFormat(hourFormat) });
      },

      setTablePageSize(tablePageSize) {
        const nextPageSize = Number(tablePageSize);
        set({
          tablePageSize: PAGE_SIZE_OPTIONS.includes(nextPageSize) ? nextPageSize : 25,
        });
      },

      hydratePreferences(preferences = {}) {
        set((state) => ({
          theme: preferences.theme || state.theme,
          timezone: preferences.timezone || state.timezone,
          hourFormat: normalizeHourFormat(preferences.hour_format || preferences.hourFormat || state.hourFormat),
          tablePageSize: PAGE_SIZE_OPTIONS.includes(Number(preferences.table_page_size))
            ? Number(preferences.table_page_size)
            : state.tablePageSize,
        }));
      },
    }),
    {
      name: appConfig.storageKey('preferences'),
    }
  )
);
