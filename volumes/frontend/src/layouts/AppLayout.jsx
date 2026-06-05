/* eslint-disable react/prop-types */
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ArrowUp,
  ChevronDown,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Search,
  Sun,
  UserCircle,
  XCircle,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMenuItemPermissions, moduleGroups as fallbackModuleGroups, navigablePages as fallbackNavigablePages } from '@/data/modules';
import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/store/useAuthStore';
import { useMenuStore } from '@/store/useMenuStore';
import { useNavigationHistoryStore } from '@/store/useNavigationHistoryStore';
import { useSessionStore } from '@/store/useSessionStore';
import { appConfig } from '@/config/appConfig';
import ProductInfoModalContent from '@/components/product/ProductInfoModalContent';
import { authService } from '@/services/auth/authService';
import { globalSearchService } from '@/services/search/globalSearchService';
import { notificationService } from '@/services/notifications/notificationService';
import { getBackendMessage, toast } from '@/services/ui/notify';

const formatNotificationTime = (value) => {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '';
  }
};

const getCleanDisplayName = (value) => (
  String(value || '').replace(/\s*\([^)]*\)\s*$/, '').trim()
);

const hiddenSidebarMenuPaths = new Set(['/notifications']);
const hiddenSidebarMenuIds = new Set(['notifications']);
const isHiddenSidebarMenuItem = (item) => (
  hiddenSidebarMenuPaths.has(item?.path) || hiddenSidebarMenuIds.has(item?.id) || hiddenSidebarMenuIds.has(item?.code)
);

const passwordPolicyRequirements = [
  { id: 'length', shortLabel: '8 caracteres', test: (value) => value.length >= 8 },
  { id: 'lowercase', shortLabel: 'Minuscula', test: (value) => /[a-z]/.test(value) },
  { id: 'uppercase', shortLabel: 'Mayuscula', test: (value) => /[A-Z]/.test(value) },
  { id: 'number', shortLabel: 'Numero', test: (value) => /\d/.test(value) },
  { id: 'special', shortLabel: 'Simbolo', test: (value) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?]/.test(value) },
];

const getPasswordStrength = (password) => {
  const checks = passwordPolicyRequirements.map((requirement) => ({
    ...requirement,
    passed: requirement.test(password),
  }));
  const score = checks.filter((check) => check.passed).length;
  const percent = (score / passwordPolicyRequirements.length) * 100;

  if (!password) return { checks, percent: 0, label: 'Sin evaluar', barClass: 'bg-slate-300', textClass: 'text-slate-500', valid: false };
  if (score <= 2) return { checks, percent, label: 'Debil', barClass: 'bg-red-500', textClass: 'text-red-600 dark:text-red-300', valid: false };
  if (score <= 4) return { checks, percent, label: 'Media', barClass: 'bg-amber-500', textClass: 'text-amber-700 dark:text-amber-300', valid: false };
  return { checks, percent, label: 'Fuerte', barClass: 'bg-emerald-500', textClass: 'text-emerald-700 dark:text-emerald-300', valid: true };
};

const getUserInitials = (user) => {
  const source = user?.display_name || user?.full_name || user?.name || user?.username || 'U';
  const parts = String(source).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const SelfPasswordChangeModal = ({ user, displayName, onSubmit, onClose }) => {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({
    current_password: false,
    new_password: false,
    confirm_password: false,
  });
  const passwordStrength = useMemo(() => getPasswordStrength(form.new_password), [form.new_password]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const togglePasswordVisibility = (field) => {
    setVisiblePasswords((current) => ({ ...current, [field]: !current[field] }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (form.new_password !== form.confirm_password) {
      setFormError('La nueva clave y su confirmacion deben coincidir.');
      return;
    }

    if (!passwordStrength.valid) {
      setFormError('La nueva clave no cumple la politica de seguridad.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(form);
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  const passwordField = (field, label, placeholder) => (
    <label className="space-y-1.5 text-sm">
      <span className="font-semibold text-slate-800 dark:text-slate-100">{label}</span>
      <div className="relative">
        <input
          className="h-11 w-full rounded-md border border-slate-300 px-3 pr-10 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950"
          type={visiblePasswords[field] ? 'text' : 'password'}
          placeholder={placeholder}
          value={form[field]}
          onChange={(event) => updateField(field, event.target.value)}
          required
        />
        <button type="button" className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100" onClick={() => togglePasswordVisibility(field)} aria-label={visiblePasswords[field] ? 'Ocultar clave' : 'Mostrar clave'}>
          {visiblePasswords[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
              {getUserInitials(user)}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Cambio propio</div>
              <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">{displayName}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Cuenta</div>
            <div className="mt-1 rounded-md bg-white px-2 py-1 font-mono text-xs text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800">
              {user?.username || user?.email || 'usuario'}
            </div>
          </div>
        </div>
      </div>

      {passwordField('current_password', 'Clave actual', 'Ingrese su clave actual')}

      <div className="grid gap-4 md:grid-cols-2">
        {passwordField('new_password', 'Nueva clave', 'Ingrese la nueva clave')}
        {passwordField('confirm_password', 'Confirmar clave', 'Repita la clave')}
      </div>

      <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold text-slate-800 dark:text-slate-100">Politica de clave</span>
          <span className={`font-medium ${passwordStrength.textClass}`}>{passwordStrength.label}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className={`h-full rounded-full transition-all ${passwordStrength.barClass}`} style={{ width: `${passwordStrength.percent}%` }} />
        </div>
        <div className="flex flex-wrap gap-2">
          {passwordStrength.checks.map((check) => (
            <div key={check.id} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${check.passed ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'}`}>
              {check.passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              <span>{check.shortLabel}</span>
            </div>
          ))}
        </div>
      </div>

      {formError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {formError}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
          {saving ? 'Actualizando...' : 'Actualizar clave'}
        </button>
      </div>
    </form>
  );
};

const notificationSeverityLabels = { INFO: 'Informacion', SUCCESS: 'Exito', WARNING: 'Alerta', ERROR: 'Error' };
const notificationSeverityClasses = {
  INFO: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200',
  SUCCESS: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
  WARNING: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  ERROR: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200',
};

const NotificationPreviewDetail = ({ notification, onClose }) => (
  <div className="space-y-5">
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
            <Bell className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold text-slate-950 dark:text-white">{notification.title}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{notification.type_name || notification.type_code}</span>
              <span className="inline-flex items-center gap-1">
                <LucideIcons.Clock3 className="h-3.5 w-3.5" />
                {formatNotificationTime(notification.delivered_at)}
              </span>
            </div>
          </div>
        </div>
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${notificationSeverityClasses[notification.severity] || notificationSeverityClasses.INFO}`}>
          {notificationSeverityLabels[notification.severity] || notification.severity || 'Informacion'}
        </span>
      </div>
    </div>
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{notification.message}</p>
    </div>
    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
      {notification.action_url && (
        <button type="button" onClick={() => { window.location.href = notification.action_url; }} className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white dark:bg-white dark:text-slate-950">
          <LucideIcons.ExternalLink className="h-4 w-4" />
          {notification.action_label || 'Abrir'}
        </button>
      )}
      <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
        Cerrar
      </button>
    </div>
  </div>
);

const iconAliases = {
  'add-circle': LucideIcons.CirclePlus,
  'admin': LucideIcons.Shield,
  'archive': LucideIcons.Archive,
  'bank-card': LucideIcons.CreditCard,
  'bar-chart': LucideIcons.BarChart3,
  'calculator': LucideIcons.Calculator,
  'credit-card': LucideIcons.CreditCard,
  'dashboard': LucideIcons.Gauge,
  'database': LucideIcons.Database,
  'exchange': LucideIcons.RefreshCw,
  'file-chart': LucideIcons.ChartNoAxesColumn,
  'file-list-3': LucideIcons.FileText,
  'file-search': LucideIcons.FileSearch,
  'file-text': LucideIcons.FileText,
  'folder': LucideIcons.Folder,
  'home': LucideIcons.Home,
  'list-check': LucideIcons.ListChecks,
  'lock': LucideIcons.Lock,
  'lock-unlock': LucideIcons.LockOpen,
  'money-dollar-circle': LucideIcons.CircleDollarSign,
  'price-tag': LucideIcons.Tag,
  'price-tag-3': LucideIcons.Tags,
  'product-hunt': LucideIcons.Package,
  'qr-code': LucideIcons.QrCode,
  'refund': LucideIcons.Receipt,
  'safe': LucideIcons.WalletCards,
  'search': LucideIcons.Search,
  'settings': LucideIcons.Settings,
  'shield-user': LucideIcons.Shield,
  'shopping-cart': LucideIcons.ShoppingCart,
  'shopping-bag': LucideIcons.ShoppingBag,
  'team': LucideIcons.Users,
  'truck': LucideIcons.Truck,
  'user': LucideIcons.User,
  'user-3': LucideIcons.Users,
  'wallet-3': LucideIcons.WalletCards,
};

const resolveMenuIcon = (iconName, fallback = LucideIcons.Circle) => {
  const normalized = String(iconName || '')
    .trim()
    .replace(/-line$/, '')
    .replace(/-fill$/, '')
    .toLowerCase();

  if (!normalized) return fallback;
  if (iconAliases[normalized]) return iconAliases[normalized];

  const pascalName = normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  return LucideIcons[pascalName] || fallback;
};

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [sideUserOpen, setSideUserOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationSummary, setNotificationSummary] = useState({ unread_count: 0, latest: [] });
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [globalSearchError, setGlobalSearchError] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [syncingSession, setSyncingSession] = useState(false);
  const contentRef = useRef(null);
  const sideUserMenuRef = useRef(null);
  const globalSearchRef = useRef(null);
  const notificationsRef = useRef(null);
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const syncSession = useAuthStore((state) => state.syncSession);
  const isDemoSession = useAuthStore((state) => state.isDemoSession);
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);
  const locations = useSessionStore((state) => state.locations);
  const cashRegisters = useSessionStore((state) => state.cashRegisters);
  const activeLocation = useSessionStore((state) => state.activeLocation);
  const activeCashRegister = useSessionStore((state) => state.activeCashRegister);
  const setActiveLocation = useSessionStore((state) => state.setActiveLocation);
  const setActiveCashRegister = useSessionStore((state) => state.setActiveCashRegister);
  const initializeFromUser = useSessionStore((state) => state.initializeFromUser);
  const navigationHistory = useNavigationHistoryStore((state) => state.items);
  const addNavigationVisit = useNavigationHistoryStore((state) => state.addVisit);
  const dbMenuGroups = useMenuStore((state) => state.groups);
  const dbMenuPages = useMenuStore((state) => state.pages);
  const fetchMenu = useMenuStore((state) => state.fetchMenu);
  const clearMenu = useMenuStore((state) => state.clearMenu);

  const sidebarWidth = collapsed ? 'w-20' : 'w-80';
  const usingDatabaseMenu = dbMenuGroups.length > 0;
  const moduleGroups = usingDatabaseMenu ? dbMenuGroups : fallbackModuleGroups;
  const navigablePages = useMemo(() => (
    usingDatabaseMenu
      ? [...dbMenuPages, ...fallbackNavigablePages.filter((page) => page.groupId === 'system')].filter((page) => !isHiddenSidebarMenuItem(page))
      : fallbackNavigablePages.filter((page) => !isHiddenSidebarMenuItem(page))
  ), [dbMenuPages, usingDatabaseMenu]);
  const activeModule = navigablePages.find((module) => module.path === location.pathname);
  const currentLocationPath = `${location.pathname}${location.search || ''}`;
  const activeGroupId = activeModule?.groupId || moduleGroups[0]?.id || fallbackModuleGroups[0]?.id;
  const [openGroupId, setOpenGroupId] = useState(activeGroupId);
  const topNavigationHistory = navigationHistory.slice(-5);
  const unreadNotifications = Number(notificationSummary.unread_count || 0);
  const latestNotifications = notificationSummary.latest || [];
  const appDisplayName = appConfig.name;
  const displayUser = user || {
    name: 'Administrador Demo',
    profile: 'Administrador',
  };
  const displayUserName = getCleanDisplayName(
    displayUser.display_name
    || displayUser.full_name
    || displayUser.name
    || displayUser.username
    || 'Usuario'
  );
  const displayUserSubtitle = displayUser.email || 'Sin correo';
  const displayUserAvatar = displayUser.avatar?.thumb_url || displayUser.avatar_thumb_url;
  const displayTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Zona horaria local';
  const displayUserProfile = (
    displayUser.profile
    || displayUser.role_name
    || displayUser.role_names?.[0]
    || displayUser.roles?.[0]
    || 'Sin rol'
  );

  useEffect(() => {
    if (user) {
      initializeFromUser(user);
    }
  }, [initializeFromUser, user]);

  useEffect(() => {
    const preloadModalSystem = () => {
      import('@/components/ui/modal').catch(() => {});
    };

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(preloadModalSystem, { timeout: 2000 });
      return () => window.cancelIdleCallback?.(idleId);
    }

    const timer = window.setTimeout(preloadModalSystem, 800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user || isDemoSession) {
      clearMenu();
      return;
    }

    fetchMenu().catch(() => {});
  }, [clearMenu, fetchMenu, isDemoSession, user]);

  const loadNotificationSummary = useCallback(async () => {
    if (!user || isDemoSession) {
      setNotificationSummary({ unread_count: 0, latest: [] });
      return;
    }
    try {
      setNotificationSummary(await notificationService.summary());
    } catch {
      setNotificationSummary({ unread_count: 0, latest: [] });
    }
  }, [isDemoSession, user]);

  useEffect(() => {
    loadNotificationSummary();
    if (!user || isDemoSession) return undefined;
    const timer = window.setInterval(loadNotificationSummary, 60000);
    window.addEventListener('notifications:updated', loadNotificationSummary);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('notifications:updated', loadNotificationSummary);
    };
  }, [isDemoSession, loadNotificationSummary, user]);

  useEffect(() => {
    setOpenGroupId(activeGroupId);
  }, [activeGroupId]);

  useEffect(() => {
    document.title = activeModule?.label ? `${appDisplayName} / ${activeModule.label}` : appDisplayName;
  }, [activeModule, appDisplayName]);

  useEffect(() => {
    if (activeModule) {
      addNavigationVisit({ ...activeModule, visitPath: currentLocationPath });
    }
  }, [activeModule, addNavigationVisit, currentLocationPath]);

  useEffect(() => {
    if (!sideUserOpen) return undefined;

    const handlePointerDown = (event) => {
      if (sideUserOpen && !sideUserMenuRef.current?.contains(event.target)) {
        setSideUserOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [sideUserOpen]);

  useEffect(() => {
    if (!notificationsOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!notificationsRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [notificationsOpen]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return undefined;

    const handleScroll = () => {
      setShowScrollTop(content.scrollTop > 240);
    };

    content.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      content.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    content.scrollTo({ top: 0 });
    setShowScrollTop(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleProfileNavigation = () => {
    setSideUserOpen(false);
    navigate('/profile');
  };

  const handlePasswordNavigation = () => {
    setSideUserOpen(false);
    const modalId = `${appConfig.namespace}-self-password-change`;

    import('@/components/ui/modal').then(({ default: ModalManager }) => {
      ModalManager.close(modalId);
      ModalManager.custom({
        id: modalId,
        title: 'Cambiar contraseña',
        size: 'large',
        contentComponent: SelfPasswordChangeModal,
        contentProps: {
          user: displayUser,
          displayName: displayUserName,
          onSubmit: async (payload) => {
            try {
              await authService.changePassword(payload);
              toast.success('Contraseña actualizada');
            } catch (error) {
              toast.error(getBackendMessage(error, 'No fue posible cambiar la contraseña'));
              throw error;
            }
          },
          onClose: () => ModalManager.close(modalId),
        },
      });
    });
  };

  const openNotification = async (notification) => {
    try {
      const detail = await notificationService.get(notification.id);
      setNotificationsOpen(false);
      await loadNotificationSummary();

      import('@/components/ui/modal').then(({ default: ModalManager }) => {
        const modalId = `${appConfig.namespace}-notification-preview-${detail.id}`;
        ModalManager.custom({
          id: modalId,
          title: 'Notificacion',
          size: 'medium',
          contentComponent: NotificationPreviewDetail,
          contentProps: {
            notification: detail,
            onClose: () => ModalManager.close(modalId),
          },
        });
      });
    } catch (error) {
      toast.error(getBackendMessage(error, 'No fue posible abrir la notificacion'));
    }
  };

  const goToNotifications = () => {
    setNotificationsOpen(false);
    navigate('/notifications');
  };

  const handleSyncSession = async () => {
    if (isDemoSession || syncingSession) return;

    const { default: ModalManager } = await import('@/components/ui/modal');
    const modalId = `${appConfig.namespace}-sync-session`;

    setSyncingSession(true);
    ModalManager.close(modalId);
    ModalManager.loading({
      id: modalId,
      title: 'Sincronizar permisos',
      message: 'Procesando permisos de la sesion...',
      showProgress: false,
      showCancel: false,
      indeterminate: true,
    });

    try {
      await syncSession();
      setSideUserOpen(false);
      toast.success('Permisos sincronizados');
    } catch (error) {
      toast.error(getBackendMessage(error, 'No fue posible sincronizar permisos'));
    } finally {
      ModalManager.close(modalId);
      setSyncingSession(false);
    }
  };

  const showProductInfoModal = async () => {
    const { default: ModalManager } = await import('@/components/ui/modal');
    const modalId = `${appConfig.namespace}-product-info`;

    ModalManager.close(modalId);

    ModalManager.custom({
      id: modalId,
      title: appDisplayName,
      size: 'fullscreenWide',
      showHeader: false,
      showFooter: false,
      contentComponent: ProductInfoModalContent,
      contentProps: { isDark },
    });
  };

  const canViewMenuItem = (group, item) => {
    if (usingDatabaseMenu) return true;

    const permissions = getMenuItemPermissions(group, item);

    return (
      isDemoSession
      || !permissions.length
      || hasAnyPermission(permissions)
    );
  };

  const canViewMenuGroup = (group) => (
    usingDatabaseMenu
    ||
    isDemoSession
    || !group.permissions?.length
    || hasAnyPermission(group.permissions)
  );

  const navigateSearchResult = (result) => {
    if (!result?.path || result.path === '#') return;
    setGlobalSearchOpen(false);
    setGlobalSearchQuery('');
    navigate(result.path);
  };

  const navigateGlobalSearchPage = () => {
    const query = globalSearchQuery.trim();
    if (query.length < 2) {
      setGlobalSearchOpen(true);
      return;
    }
    setGlobalSearchOpen(false);
    setGlobalSearchQuery('');
    setGlobalSearchResults([]);
    setGlobalSearchError('');
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  useEffect(() => {
    const query = globalSearchQuery.trim();
    if (query.length < 2) {
      setGlobalSearchResults([]);
      setGlobalSearchError('');
      setGlobalSearchLoading(false);
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setGlobalSearchLoading(true);
      setGlobalSearchError('');
      try {
        const normalized = query.toLowerCase();
        const moduleResults = navigablePages
          .filter((page) => page.path && page.path !== '#' && !isHiddenSidebarMenuItem(page))
          .filter((page) => [page.label, page.group, page.description].filter(Boolean).some((value) => value.toLowerCase().includes(normalized)))
          .slice(0, 8)
          .map((page) => ({
            entity: 'Modulo',
            domain: page.group || 'Sistema',
            title: page.label,
            subtitle: [page.group, page.label].filter(Boolean).join(' >> '),
            path: page.path,
            destination_label: [page.group, page.label].filter(Boolean).join(' >> '),
            icon: 'Search',
          }));
        const backendResults = isDemoSession ? [] : await globalSearchService.search(query, { limit: 6 });
        if (!cancelled) {
          setGlobalSearchResults([...moduleResults, ...backendResults]);
          setGlobalSearchOpen(true);
        }
      } catch (error) {
        if (!cancelled) {
          setGlobalSearchError(getBackendMessage(error, 'No fue posible buscar.'));
          setGlobalSearchResults([]);
          setGlobalSearchOpen(true);
        }
      } finally {
        if (!cancelled) setGlobalSearchLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [globalSearchQuery, isDemoSession, navigablePages]);

  useEffect(() => {
    if (!globalSearchOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!globalSearchRef.current?.contains(event.target)) {
        setGlobalSearchOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [globalSearchOpen]);

  return (
    <div className="grid h-screen grid-cols-[auto_1fr] grid-rows-[64px_1fr_44px] overflow-hidden bg-slate-100 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <aside className={cn('row-span-3 flex h-screen flex-col border-r border-slate-200 bg-white text-slate-700 transition-[width,background-color,color,border-color] duration-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100', sidebarWidth)}>
        <button
          type="button"
          onClick={showProductInfoModal}
          className="flex h-16 w-full items-center gap-3 border-b border-slate-200 px-4 text-left transition-colors hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
        >
          <img src="/assets/logo.png" alt="Logo del aplicativo" loading="eager" decoding="async" className="h-9 w-9 shrink-0 rounded-md bg-white object-contain p-1" />
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{appDisplayName}</div>
              <div className="truncate text-xs text-slate-500 dark:text-white/60">Inventarios y gestión comercial</div>
            </div>
          )}
        </button>

        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3 dark:border-white/10">
          {!collapsed && <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-white/50">Modulos</span>}
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Expandir o contraer menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          <div className="space-y-1">
            {moduleGroups.map((group) => {
              const GroupIcon = group.icon || resolveMenuIcon(group.iconName, LucideIcons.Folder);
              if (!canViewMenuGroup(group)) return null;

              const sortedItems = [...group.items]
                .filter((item) => canViewMenuItem(group, item))
                .filter((item) => !isHiddenSidebarMenuItem(item))
                .sort((left, right) => left.weight - right.weight);
              if (sortedItems.length === 0) return null;

              const isGroupActive = group.id === activeGroupId;
              const isGroupOpen = group.id === openGroupId && !collapsed;
              const firstItemPath = sortedItems[0]?.path || '/dashboard';

              return (
                <div key={group.id}>
                  <button
                    type="button"
                    title={group.label}
                    onClick={() => {
                      if (collapsed) {
                        navigate(firstItemPath);
                        return;
                      }

                      setOpenGroupId((current) => (current === group.id ? null : group.id));
                    }}
                    className={cn(
                      'flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-950 dark:text-white/75 dark:hover:bg-white/10 dark:hover:text-white',
                      isGroupActive && 'bg-blue-50 text-blue-700 dark:bg-white/10 dark:text-white'
                    )}
                  >
                    <GroupIcon className={cn('h-4 w-4 shrink-0 transition-colors duration-200', isGroupActive && 'text-blue-600 dark:text-sky-300')} />
                    {!collapsed && (
                      <>
                        <span className="min-w-0 flex-1 text-left leading-snug">{group.label}</span>
                        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform duration-200 ease-out', isGroupOpen ? 'rotate-0' : '-rotate-90')} />
                      </>
                    )}
                  </button>

                  <div
                    className={cn(
                      'grid overflow-hidden transition-[grid-template-rows,opacity,transform] duration-200 ease-out',
                      isGroupOpen ? 'grid-rows-[1fr] opacity-100 translate-y-0' : 'grid-rows-[0fr] opacity-0 -translate-y-1'
                    )}
                  >
                    <div className="min-h-0">
                      <div className="mt-1 space-y-1 border-l border-slate-200 pl-3 dark:border-white/10">
                      {sortedItems.map((item) => {
                  const Icon = item.icon || resolveMenuIcon(item.iconName, LucideIcons.Circle);
                  return (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      end
                      title={item.label}
                      className={({ isActive }) => cn(
                        'flex min-h-9 items-center gap-3 rounded-md px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-white/65 dark:hover:bg-white/10 dark:hover:text-white',
                        isActive && 'bg-blue-600 text-white shadow-sm dark:bg-blue-600 dark:text-white'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 leading-snug">{item.label}</span>
                    </NavLink>
                  );
                      })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        <div ref={sideUserMenuRef} className="relative border-t border-slate-200 p-3 dark:border-white/10">
          <button
            type="button"
            title={displayUserName}
            onClick={() => setSideUserOpen((value) => !value)}
            className={cn(
              'flex h-12 w-full items-center gap-3 rounded-md px-2 text-left text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-950 dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white',
              collapsed && 'justify-center px-0'
            )}
          >
            {displayUserAvatar ? (
              <img src={displayUserAvatar} alt={displayUserName} className="h-9 w-9 shrink-0 rounded-md object-cover" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white">
                <UserCircle className="h-6 w-6" />
              </div>
            )}
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{displayUserName}</div>
                  <div className="truncate text-xs text-slate-500 dark:text-white/50">{displayTimezone}</div>
                </div>
                <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform duration-200', sideUserOpen && 'rotate-180')} />
              </>
            )}
          </button>

          {sideUserOpen && (
            <div
              className={cn(
                'absolute bottom-16 z-30 rounded-md border border-slate-200 bg-white p-2 text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
                collapsed ? 'left-3 w-64' : 'left-3 right-3'
              )}
            >
              <div className="flex items-center gap-3 px-3 py-3">
                {displayUserAvatar ? (
                  <img src={displayUserAvatar} alt={displayUserName} className="h-10 w-10 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                    <UserCircle className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold uppercase">{displayUserName}</div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">{displayUserSubtitle}</div>
                  {isDemoSession && <div className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-300">Sesión demo</div>}
                </div>
              </div>
              <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
              <button type="button" onClick={handleProfileNavigation} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                <UserCircle className="h-4 w-4" />
                Mi perfil
              </button>
              <button type="button" onClick={handlePasswordNavigation} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                <KeyRound className="h-4 w-4" />
                Cambiar contraseña
              </button>
              <button
                type="button"
                onClick={handleSyncSession}
                disabled={isDemoSession || syncingSession}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RefreshCw className={cn('h-4 w-4', syncingSession && 'animate-spin')} />
                Sincronizar permisos
              </button>
              <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                <LogOut className="h-4 w-4" />
                Cerrar sesion
              </button>
            </div>
          )}
        </div>
      </aside>

      <header className="col-start-2 row-start-1 grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-slate-200 bg-white px-7 text-slate-900 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
          <nav className="hidden min-w-0 items-center justify-start overflow-hidden pr-8 text-xs lg:flex" aria-label="Paginas recientes">
            {topNavigationHistory.length === 0 && (
              <span className="truncate text-slate-400 dark:text-slate-500">Sin historial</span>
            )}
            {topNavigationHistory.map((item, index) => (
              <div key={item.path} className="flex min-w-0 shrink-0 items-center">
                {index > 0 && <span className="px-2 text-slate-300 dark:text-slate-700">/</span>}
                <button
                  type="button"
                  title={`Estabas viendo: ${item.tooltip}`}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'h-10 max-w-56 truncate border-b-2 border-transparent px-1 text-left text-slate-500 transition-colors hover:text-slate-950 dark:text-slate-400 dark:hover:text-white',
                    item.path === currentLocationPath && 'border-blue-500 text-blue-700 dark:border-blue-400 dark:text-blue-300'
                  )}
                >
                  {item.label}
                </button>
              </div>
            ))}
          </nav>

        <div className="flex min-w-0 items-center justify-end gap-4 justify-self-end">
          <div ref={globalSearchRef} className="relative flex w-80 items-center">
            <input
              type="search"
              value={globalSearchQuery}
              onChange={(event) => setGlobalSearchQuery(event.target.value)}
              onFocus={() => {
                if (globalSearchQuery.trim().length >= 2) setGlobalSearchOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  navigateGlobalSearchPage();
                }
                if (event.key === 'Escape') setGlobalSearchOpen(false);
              }}
              placeholder="Buscar módulo, documento, cliente o producto"
              className="h-10 w-full rounded-md border border-slate-300 bg-white pl-3 pr-11 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={() => {
                navigateGlobalSearchPage();
              }}
              className="absolute right-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="Buscar"
            >
              <Search className={cn('h-4 w-4', globalSearchLoading && 'animate-pulse')} />
            </button>
            {globalSearchOpen && (
              <div className="absolute right-0 top-12 z-40 w-[32rem] overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <div className="text-sm font-semibold">Busqueda global</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Modulos visibles y datos maestros disponibles actualmente.</div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {globalSearchLoading && (
                    <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">Buscando...</div>
                  )}
                  {!globalSearchLoading && globalSearchError && (
                    <div className="px-4 py-6 text-center text-sm text-red-600 dark:text-red-300">{globalSearchError}</div>
                  )}
                  {!globalSearchLoading && !globalSearchError && globalSearchResults.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      {globalSearchQuery.trim().length < 2 ? 'Escribe al menos 2 caracteres.' : 'Sin resultados consultables.'}
                    </div>
                  )}
                  {!globalSearchLoading && !globalSearchError && globalSearchResults.map((result, index) => {
                    const ResultIcon = LucideIcons[result.icon] || LucideIcons.Search;
                    return (
                      <button
                        key={`${result.entity}-${result.title}-${result.path}-${index}`}
                        type="button"
                        onClick={() => navigateSearchResult(result)}
                        className="flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/70"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                          <ResultIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">{result.entity}</span>
                            <span className="truncate text-sm font-semibold">{result.title}</span>
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{result.subtitle}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {globalSearchQuery.trim().length >= 2 && (
                  <div className="border-t border-slate-200 p-3 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={navigateGlobalSearchPage}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                    >
                      <Search className="h-4 w-4" />
                      Ver todas las coincidencias
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div ref={notificationsRef} className="relative">
            <button type="button" onClick={() => setNotificationsOpen((current) => !current)} className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Notificaciones">
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -right-2 -top-2 min-w-5 rounded-md bg-red-600 px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-white shadow-sm">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-12 z-40 w-96 overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <div>
                    <div className="text-sm font-semibold">Notificaciones</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{unreadNotifications} nuevas</div>
                  </div>
                  <button type="button" onClick={goToNotifications} className="h-8 rounded-md border border-slate-200 px-3 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                    Ir a la bandeja
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {latestNotifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">Sin notificaciones recientes</div>
                  ) : latestNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => openNotification(notification)}
                      className="flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/70"
                    >
                      <span className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', notification.is_read ? 'bg-slate-300 dark:bg-slate-700' : 'bg-red-500')} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{notification.title}</span>
                        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500 dark:text-slate-400">{notification.message}</span>
                        <span className="mt-2 block text-[11px] font-medium uppercase text-slate-400">{formatNotificationTime(notification.delivered_at)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button type="button" onClick={toggleTheme} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Cambiar tema">
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <main ref={contentRef} className="relative col-start-2 row-start-2 min-h-0 overflow-y-auto bg-slate-50 p-5 transition-colors duration-200 dark:bg-slate-950">
        <Outlet />
        <button
          type="button"
          onClick={() => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className={cn(
            'fixed bottom-16 right-6 z-30 inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-lg transition duration-200 hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
            showScrollTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
          )}
          aria-label="Ir arriba"
          title="Ir arriba"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </main>

      <footer className="col-start-2 row-start-3 flex h-11 items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 text-xs text-slate-600 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <div className="min-w-0 truncate"><span className="font-medium">Usuario:</span> {displayUserName} - {displayUserProfile}</div>
        <label className="hidden items-center gap-2 md:flex">
          <span className="font-medium">Locacion:</span>
          <select
            value={activeLocation}
            onChange={(event) => setActiveLocation(event.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            {locations.map((location) => <option key={location}>{location}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="font-medium">Caja:</span>
          <select
            value={activeCashRegister}
            onChange={(event) => setActiveCashRegister(event.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            {cashRegisters.map((cash) => <option key={cash}>{cash}</option>)}
          </select>
        </label>
      </footer>
    </div>
  );
};

export default AppLayout;
