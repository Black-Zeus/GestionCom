import toast from 'react-hot-toast';
import { getErrorMessageByCode } from './errorCatalog';

const sensitivePatterns = [
  /Bearer\s+[A-Za-z0-9._~+/=-]+/i,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
  /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|mariadb|mysql|redis|minio|backend-api|events-orchestrator)(?::\d+)?[^\s)]*/i,
  /\b(?:mariadb|mysql|redis|minio|backend-api|events-orchestrator):\d+\b/i,
  /(?:access_token|refresh_token|token|password|secret|authorization)=([^&\s]+)/i,
];

export const sanitizeUiMessage = (message, fallback = 'No fue posible completar la operacion.') => {
  if (!message) return fallback;
  const rawMessage = String(message);
  if (/error interno del servidor|internal server error|request failed with status code 500/i.test(rawMessage)) {
    return fallback;
  }
  if (sensitivePatterns.some((pattern) => pattern.test(rawMessage))) return fallback;
  if (/network error|failed to fetch|cors|xmlhttprequest|net::err/i.test(rawMessage)) {
    return 'No fue posible comunicarse con el servicio. Intente nuevamente.';
  }
  return rawMessage.slice(0, 220);
};

export const getBackendMessage = (error, fallback = 'No fue posible completar la operacion.') => {
  const backendMessage = error?.response?.data?.message
    || error?.response?.data?.error?.message
    || error?.response?.data?.error?.details;
  if (backendMessage) return sanitizeUiMessage(backendMessage, fallback);

  const errorCode = error?.response?.data?.error?.code || error?.response?.data?.error_code || error?.code;
  const catalogMessage = getErrorMessageByCode(errorCode);
  if (catalogMessage) return catalogMessage;

  return sanitizeUiMessage(
    error?.message,
    fallback
  );
};

export const notifyPromise = (promise, messages = {}) => toast.promise(
  promise,
  {
    loading: messages.loading || 'Procesando...',
    success: (result) => (
      typeof messages.success === 'function'
        ? messages.success(result)
        : messages.success || 'Operacion completada.'
    ),
    error: (error) => (
      typeof messages.error === 'function'
        ? messages.error(error)
        : messages.error || getBackendMessage(error)
    ),
  }
);

export { toast };
