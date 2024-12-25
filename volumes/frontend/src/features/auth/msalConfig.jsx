// src/features/auth/msalConfig.js
export const msalConfig = {
    auth: {
      clientId: 'YOUR_CLIENT_ID', // ID del cliente en Azure
      authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID',
      redirectUri: window.location.origin,
    },
    cache: {
      cacheLocation: 'localStorage',
      storeAuthStateInCookie: true,
    },
  };
  