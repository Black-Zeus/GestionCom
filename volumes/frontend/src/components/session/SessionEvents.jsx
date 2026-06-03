import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

const SessionEvents = () => {
  const navigate = useNavigate();
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    const handleSessionExpired = () => {
      clearSession();
      navigate('/login', { replace: true });
    };

    window.addEventListener('gescom:session-expired', handleSessionExpired);

    return () => {
      window.removeEventListener('gescom:session-expired', handleSessionExpired);
    };
  }, [clearSession, navigate]);

  return null;
};

export default SessionEvents;
