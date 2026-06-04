import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { appConfig } from '@/config/appConfig';

const SessionEvents = () => {
  const navigate = useNavigate();
  const clearSession = useAuthStore((state) => state.clearSession);
  const hydrateUser = useAuthStore((state) => state.hydrateUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isDemoSession = useAuthStore((state) => state.isDemoSession);

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

  return null;
};

export default SessionEvents;
