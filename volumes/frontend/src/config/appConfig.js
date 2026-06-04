const appName = import.meta.env.VITE_FRONTEND_NAME?.trim() || 'Aplicación';
const appNamespace = import.meta.env.VITE_FRONTEND_NAMESPACE?.trim() || 'app';
const demoEmail = import.meta.env.VITE_AUTH_DEMO_EMAIL?.trim() || `admin.demo@${appNamespace}.local`;

export const appConfig = {
  name: appName,
  namespace: appNamespace,
  demoEmail,
  eventName: (name) => `${appNamespace}:${name}`,
  storageKey: (name) => `${appNamespace}.${name}`,
};
