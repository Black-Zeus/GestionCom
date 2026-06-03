import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '@/services/auth/authService';
import { tokenStorage } from '@/services/api/tokenStorage';

const demoUser = {
  id: 'demo-admin',
  name: 'Administrador Demo',
  email: 'admin.demo@gescom.local',
  profile: 'Administrador',
  authorizedLocations: ['Casa Matriz', 'Sucursal Centro', 'Sucursal Online'],
  authorizedCashRegisters: ['Caja Principal', 'Caja 2', 'Caja Web'],
};

const canUseDemoSession = () => import.meta.env.DEV && import.meta.env.VITE_AUTH_DEMO_MODE !== 'false';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: tokenStorage.getAccessToken(),
      refreshToken: tokenStorage.getRefreshToken(),
      status: 'idle',
      error: null,
      isDemoSession: false,
      isAuthenticated: Boolean(tokenStorage.getAccessToken()),

      async login(credentials) {
        set({ status: 'loading', error: null });

        try {
          const session = await authService.login(credentials);
          tokenStorage.setTokens(session);

          set({
            user: session.user,
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            status: 'authenticated',
            error: null,
            isDemoSession: false,
            isAuthenticated: true,
          });

          return session;
        } catch (error) {
          if (canUseDemoSession()) {
            const session = {
              user: demoUser,
              accessToken: null,
              refreshToken: null,
            };

            set({
              ...session,
              status: 'authenticated',
              error: null,
              isDemoSession: true,
              isAuthenticated: true,
            });

            return session;
          }

          const message = error.response?.data?.message || error.message || 'No fue posible iniciar sesion';
          set({ status: 'error', error: message });
          throw error;
        }
      },

      async hydrateUser() {
        if (!tokenStorage.getAccessToken()) return null;

        set({ status: 'loading', error: null });

        try {
          const user = await authService.getCurrentUser();
          set({ user, status: 'authenticated', error: null, isDemoSession: false, isAuthenticated: true });
          return user;
        } catch (error) {
          get().clearSession();
          throw error;
        }
      },

      async logout() {
        const isDemoSession = get().isDemoSession;

        try {
          if (!isDemoSession) {
            await authService.logout();
          }
        } catch {
          // La salida local debe completarse aunque el backend no responda.
        } finally {
          get().clearSession();
        }
      },

      clearSession() {
        tokenStorage.clearTokens();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          status: 'idle',
          error: null,
          isDemoSession: false,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'gescom.auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        status: state.status,
        isDemoSession: state.isDemoSession,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
