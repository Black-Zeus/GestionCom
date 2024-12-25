// src/stores/userStore.js
import create from 'zustand';

const useUserStore = create((set) => ({
  user: null, // Información del usuario
  isAuthenticated: false, // Estado de autenticación
  roles: [], // Roles del usuario

  // Acción para iniciar sesión
  login: (user, roles) => set({ user, isAuthenticated: true, roles }),

  // Acción para actualizar los datos del usuario
  updateUser: (updatedUser) => set({ user: { ...updatedUser } }),

  // Acción para cerrar sesión
  logout: () => set({ user: null, isAuthenticated: false, roles: [] }),
}));

export default useUserStore;
