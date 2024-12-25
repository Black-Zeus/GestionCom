// src/stores/useStore.js
import create from 'zustand';

// Definimos el estado global para la aplicación
const useStore = create((set) => ({
  // stados globales y acciones aquí
  theme: 'light',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
}));

export default useStore;
