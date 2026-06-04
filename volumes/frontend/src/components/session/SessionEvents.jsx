import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useMenuStore } from '@/store/useMenuStore';
import { appConfig } from '@/config/appConfig';
import { sseCoordinator } from '@/services/events/sseCoordinator';

const SessionEvents = () => {
  const navigate = useNavigate();
  const clearSession = useAuthStore((state) => state.clearSession);
  const hydrateUser = useAuthStore((state) => state.hydrateUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isDemoSession = useAuthStore((state) => state.isDemoSession);
  const syncSession = useAuthStore((state) => state.syncSession);
  const user = useAuthStore((state) => state.user);
  const fetchMenu = useMenuStore((state) => state.fetchMenu);

  useEffect(() => {
    const handleSessionExpired = () => {
      clearSession();
      navigate('/login', { replace: true });
    };

    const sessionExpiredEvent = appConfig.eventName('session-expired');
    window.addEventListener(sessionExpiredEvent, handleSessionExpired);

    return () => {
      window.removeEventListener(sessionExpiredEvent, handleSessionExpired);
    };
  }, [clearSession, navigate]);

  useEffect(() => {
    if (!isAuthenticated || isDemoSession) return;

    hydrateUser().catch(() => {
      clearSession();
      navigate('/login', { replace: true });
    });
  }, [clearSession, hydrateUser, isAuthenticated, isDemoSession, navigate]);

  useEffect(() => {
    if (!isAuthenticated || isDemoSession || !user) {
      sseCoordinator.stop();
      return undefined;
    }

    sseCoordinator.start({
      user,
      syncSession,
      hydrateUser,
      clearSession,
      fetchMenu,
    });

    return () => {
      sseCoordinator.stop();
    };
  }, [clearSession, fetchMenu, hydrateUser, isAuthenticated, isDemoSession, syncSession, user]);

  return null;
};

export default SessionEvents;
