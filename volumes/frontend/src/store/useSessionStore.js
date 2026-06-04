import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { appConfig } from '@/config/appConfig';

const defaultLocations = ['Casa Matriz', 'Sucursal Centro', 'Sucursal Online'];
const defaultCashRegisters = ['Caja Principal', 'Caja 2', 'Caja Web'];

export const useSessionStore = create(
  persist(
    (set, get) => ({
      locations: defaultLocations,
      cashRegisters: defaultCashRegisters,
      activeLocation: defaultLocations[0],
      activeCashRegister: defaultCashRegisters[0],

      initializeFromUser(user) {
        const locations = user?.authorizedLocations?.length ? user.authorizedLocations : defaultLocations;
        const cashRegisters = user?.authorizedCashRegisters?.length ? user.authorizedCashRegisters : defaultCashRegisters;
        const currentState = get();

        set({
          locations,
          cashRegisters,
          activeLocation: locations.includes(currentState.activeLocation) ? currentState.activeLocation : locations[0],
          activeCashRegister: cashRegisters.includes(currentState.activeCashRegister)
            ? currentState.activeCashRegister
            : cashRegisters[0],
        });
      },

      setActiveLocation(activeLocation) {
        set({ activeLocation });
      },

      setActiveCashRegister(activeCashRegister) {
        set({ activeCashRegister });
      },
    }),
    {
      name: appConfig.storageKey('session'),
    }
  )
);
