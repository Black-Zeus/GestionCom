import { tokenStorage } from '@/services/api/tokenStorage';
import { toast } from '@/services/ui/notify';
import { appConfig } from '@/config/appConfig';

const CHANNEL_NAME = appConfig.storageKey('sse-channel');
const OWNER_KEY = appConfig.storageKey('sse-owner');
const STORAGE_EVENT_KEY = appConfig.storageKey('sse-storage-event');
const LEGACY_LAST_EVENT_PREFIX = appConfig.storageKey('sse-last-event');
const OWNER_TTL_MS = 7000;
const OWNER_HEARTBEAT_MS = 2500;
const OWNER_SCAN_MS = 3000;
const PROCESSED_LIMIT = 120;
const RECONNECT_BASE_MS = 3000;
const RECONNECT_MAX_MS = 60000;

const SSE_EVENT_NAME = 'gestioncom.event';

const getStableTabId = () => {
  const key = appConfig.storageKey('sse-tab-id');
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;

    const next = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    window.sessionStorage.setItem(key, next);
    return next;
  } catch {
    return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  }
};

const tabId = getStableTabId();
const clientId = `tab:${tabId}`;
let processedEvents = [];

const resolveEventsUrl = () => {
  const configuredEventsUrl = import.meta.env.VITE_FRONTEND_EVENTS_URL;
  if (configuredEventsUrl && !configuredEventsUrl.includes('${')) return configuredEventsUrl;

  const configuredUrl = import.meta.env.VITE_FRONTEND_API_URL;
  if (!configuredUrl || configuredUrl.includes('${')) return '/api';

  try {
    const apiUrl = new URL(configuredUrl, window.location.origin);
    if (apiUrl.hostname === 'localhost' && apiUrl.port === '8000') {
      return 'http://localhost/api';
    }
  } catch {
    return '/api';
  }

  return configuredUrl;
};

const readJson = (key, fallback = null) => {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage puede estar bloqueado; SSE sigue funcionando en la pestaña dueña.
  }
};

const removeKey = (key) => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // sin accion
  }
};

const isOwnerFresh = (owner) => owner?.tabId && Number(owner.expiresAt || 0) > Date.now();

const isDuplicate = (eventId) => {
  if (!eventId || eventId === '0-0') return false;

  if (processedEvents.includes(eventId)) return true;

  processedEvents = [eventId, ...processedEvents].slice(0, PROCESSED_LIMIT);
  return false;
};

const debounceAsync = (fn, waitMs = 300) => {
  let timeout = null;
  return (...args) => {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => {
      Promise.resolve(fn(...args)).catch(() => null);
    }, waitMs);
  };
};

const cleanupLegacyLastEventCache = () => {
  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(`${LEGACY_LAST_EVENT_PREFIX}:`)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // sin accion
  }
};

class SseCoordinator {
  constructor() {
    this.channel = null;
    this.eventSource = null;
    this.ownerHeartbeat = null;
    this.ownerScan = null;
    this.callbacks = {};
    this.user = null;
    this.started = false;
    this.reconnectAttempt = 0;
    this.reconnectTimer = null;
    this.handleBroadcast = this.handleBroadcast.bind(this);
    this.handleStorage = this.handleStorage.bind(this);
    this.releaseOwner = this.releaseOwner.bind(this);
  }

  start({ user, syncSession, hydrateUser, clearSession, fetchMenu }) {
    if (!user || !tokenStorage.getAccessToken()) return;

    this.user = user;
    cleanupLegacyLastEventCache();
    this.callbacks = {
      syncSession,
      hydrateUser,
      clearSession,
      fetchMenu,
      refreshPermissions: debounceAsync(async () => {
        await syncSession?.();
        await fetchMenu?.();
        toast.success('Permisos sincronizados');
      }),
      refreshMenu: debounceAsync(async () => {
        await fetchMenu?.();
        toast.success('Menu actualizado');
      }),
      refreshProfile: debounceAsync(async () => {
        await hydrateUser?.();
        toast.success('Perfil actualizado');
      }),
    };

    if (this.started) return;
    this.started = true;

    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.addEventListener('message', this.handleBroadcast);
    }

    window.addEventListener('storage', this.handleStorage);
    window.addEventListener('beforeunload', this.releaseOwner);
    this.ownerScan = window.setInterval(() => this.ensureOwner(), OWNER_SCAN_MS);
    this.ensureOwner();
  }

  stop() {
    this.started = false;
    this.closeStream();
    this.clearReconnectTimer();
    this.stopOwnerHeartbeat();
    this.releaseOwner();

    if (this.ownerScan) {
      window.clearInterval(this.ownerScan);
      this.ownerScan = null;
    }

    if (this.channel) {
      this.channel.removeEventListener('message', this.handleBroadcast);
      this.channel.close();
      this.channel = null;
    }

    window.removeEventListener('storage', this.handleStorage);
    window.removeEventListener('beforeunload', this.releaseOwner);
  }

  ensureOwner() {
    const owner = readJson(OWNER_KEY, null);
    if (isOwnerFresh(owner) && owner.tabId !== tabId) {
      this.closeStream();
      this.clearReconnectTimer();
      this.stopOwnerHeartbeat();
      return;
    }

    writeJson(OWNER_KEY, {
      tabId,
      expiresAt: Date.now() + OWNER_TTL_MS,
    });

    const nextOwner = readJson(OWNER_KEY, null);
    if (nextOwner?.tabId === tabId) {
      this.becomeOwner();
    }
  }

  becomeOwner() {
    if (!this.ownerHeartbeat) {
      this.ownerHeartbeat = window.setInterval(() => {
        writeJson(OWNER_KEY, {
          tabId,
          expiresAt: Date.now() + OWNER_TTL_MS,
        });
      }, OWNER_HEARTBEAT_MS);
    }

    if (!this.eventSource) {
      this.openStream();
    }
  }

  releaseOwner() {
    const owner = readJson(OWNER_KEY, null);
    if (owner?.tabId === tabId) removeKey(OWNER_KEY);
  }

  stopOwnerHeartbeat() {
    if (this.ownerHeartbeat) {
      window.clearInterval(this.ownerHeartbeat);
      this.ownerHeartbeat = null;
    }
  }

  broadcastEvent(event) {
    if (this.channel) {
      this.channel.postMessage({ kind: 'sse-event', event });
      return;
    }

    if (event.type === 'task.v1.progress' || event.type === 'backup.v1.progress') {
      return;
    }

    writeJson(STORAGE_EVENT_KEY, {
      id: `${Date.now()}:${tabId}:${Math.random()}`,
      event,
    });
  }

  closeStream() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  clearReconnectTimer() {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  scheduleReconnect() {
    this.clearReconnectTimer();
    const backoffMs = Math.min(RECONNECT_BASE_MS * (2 ** this.reconnectAttempt), RECONNECT_MAX_MS);
    const jitterMs = Math.floor(Math.random() * 1000);
    this.reconnectAttempt += 1;

    this.reconnectTimer = window.setTimeout(() => {
      const owner = readJson(OWNER_KEY, null);
      if (this.started && owner?.tabId === tabId) this.openStream();
    }, backoffMs + jitterMs);
  }

  openStream() {
    const token = tokenStorage.getAccessToken();
    if (!token) return;

    const url = new URL(`${resolveEventsUrl().replace(/\/$/, '')}/events/stream`, window.location.origin);
    url.searchParams.set('token', token);
    url.searchParams.set('client_id', clientId);

    this.eventSource = new EventSource(url.toString());

    this.eventSource.addEventListener(SSE_EVENT_NAME, (message) => this.handleSseMessage(message));

    this.eventSource.onopen = () => {
      this.reconnectAttempt = 0;
      this.clearReconnectTimer();
    };

    this.eventSource.onmessage = (message) => this.handleSseMessage(message);
    this.eventSource.onerror = () => {
      this.closeStream();
      this.scheduleReconnect();
    };
  }

  handleSseMessage(message) {
    const eventId = message.lastEventId;

    let envelope = null;
    try {
      envelope = JSON.parse(message.data);
    } catch {
      return;
    }

    const event = {
      ...envelope,
      sse_id: eventId,
      stream_id: envelope.stream_id || eventId,
      type: envelope.type || 'message',
    };

    const dedupeKey = event.stream_name && event.stream_id
      ? `${event.stream_name}:${event.stream_id}`
      : eventId;
    if (isDuplicate(dedupeKey)) return;

    this.processEvent(event);
    this.broadcastEvent(event);
  }

  handleBroadcast(message) {
    if (message.data?.kind !== 'sse-event') return;
    const event = message.data.event;
    const dedupeKey = event?.stream_name && event?.stream_id
      ? `${event.stream_name}:${event.stream_id}`
      : event?.sse_id;
    if (!event || isDuplicate(dedupeKey)) return;
    this.processEvent(event);
  }

  handleStorage(message) {
    if (message.key !== STORAGE_EVENT_KEY || !message.newValue) return;

    let payload = null;
    try {
      payload = JSON.parse(message.newValue);
    } catch {
      return;
    }

    const event = payload?.event;
    const dedupeKey = event?.stream_name && event?.stream_id
      ? `${event.stream_name}:${event.stream_id}`
      : event?.sse_id;
    if (!event || isDuplicate(dedupeKey)) return;

    this.processEvent(event);
  }

  processEvent(event) {
    const payload = event.payload || {};

    if (event.type === 'system.v1.ping') return;

    if (event.type === 'notification.v1.toast') {
      this.showToast(payload);
      return;
    }

    if (event.type === 'permissions.v1.refresh_requested') {
      this.callbacks.refreshPermissions?.();
      return;
    }

    if (event.type === 'menu.v1.refresh_requested') {
      this.callbacks.refreshMenu?.();
      return;
    }

    if (event.type === 'profile.v1.refresh_requested') {
      this.callbacks.refreshProfile?.();
      return;
    }

    if (event.type === 'session.v1.invalidate_requested') {
      this.callbacks.clearSession?.();
      window.dispatchEvent(new CustomEvent(appConfig.eventName('session-expired')));
      return;
    }

    if (payload.message) {
      this.showToast(payload);
    }
  }

  showToast(payload) {
    const message = payload.message || payload.title || 'Notificacion';
    const variant = payload.variant || payload.level || payload.type || 'default';

    if (variant === 'success') toast.success(message);
    else if (variant === 'error') toast.error(message);
    else toast(message);
  }
}

export const sseCoordinator = new SseCoordinator();
