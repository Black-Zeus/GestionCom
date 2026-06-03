const ACCESS_TOKEN_KEY = 'gescom.accessToken';
const REFRESH_TOKEN_KEY = 'gescom.refreshToken';

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export const tokenStorage = {
  getAccessToken() {
    if (!canUseStorage()) return null;
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken() {
    if (!canUseStorage()) return null;
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setTokens({ accessToken, refreshToken }) {
    if (!canUseStorage()) return;
    if (accessToken) window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  clearTokens() {
    if (!canUseStorage()) return;
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
