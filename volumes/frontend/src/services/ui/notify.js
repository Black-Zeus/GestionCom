import toast from 'react-hot-toast';

export const getBackendMessage = (error, fallback = 'No fue posible completar la operacion.') => (
  error?.response?.data?.message
  || error?.response?.data?.error?.message
  || error?.message
  || fallback
);

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
