import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ArrowUp,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Search,
  Sun,
  UserCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getMenuItemPermissions, moduleGroups, navigablePages } from '@/data/modules';
import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigationHistoryStore } from '@/store/useNavigationHistoryStore';
import { useSessionStore } from '@/store/useSessionStore';
import { appConfig } from '@/config/appConfig';
import ProductInfoModalContent from '@/components/product/ProductInfoModalContent';
import { getBackendMessage, toast } from '@/services/ui/notify';

const getCompactNavigationLabel = (label) => {
  const words = label.trim().split(/\s+/);
  if (words.length <= 1) return label;
  if (['mi', 'mis'].includes(words[0].toLowerCase()) && words[1]) return words[1];
  return words[0];
};

const getCleanDisplayName = (value) => (
  String(value || '').replace(/\s*\([^)]*\)\s*$/, '').trim()
);

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [sideUserOpen, setSideUserOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [syncingSession, setSyncingSession] = useState(false);
  const contentRef = useRef(null);
  const userMenuRef = useRef(null);
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

  const sidebarWidth = collapsed ? 'w-20' : 'w-72';
  const activeModule = navigablePages.find((module) => module.path === location.pathname);
  const activeGroupId = activeModule?.groupId || moduleGroups[0]?.id;
  const [openGroupId, setOpenGroupId] = useState(activeGroupId);
  const topNavigationHistory = navigationHistory.slice(-5);
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
    setOpenGroupId(activeGroupId);
  }, [activeGroupId]);

  useEffect(() => {
    document.title = activeModule?.label ? `${appDisplayName} / ${activeModule.label}` : appDisplayName;
  }, [activeModule, appDisplayName]);

  useEffect(() => {
    if (activeModule) {
      addNavigationVisit(activeModule);
    }
  }, [activeModule, addNavigationVisit]);

  useEffect(() => {
    if (!userOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!userMenuRef.current?.contains(event.target)) {
        setUserOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [userOpen]);

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
    setUserOpen(false);
    setSideUserOpen(false);
    navigate('/profile');
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
      setUserOpen(false);
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
    const permissions = getMenuItemPermissions(group, item);

    return (
      isDemoSession
      || !permissions.length
      || hasAnyPermission(permissions)
    );
  };

  const canViewMenuGroup = (group) => (
    isDemoSession
    || !group.permissions?.length
    || hasAnyPermission(group.permissions)
  );

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
              const GroupIcon = group.icon;
              if (!canViewMenuGroup(group)) return null;

              const sortedItems = [...group.items]
                .filter((item) => canViewMenuItem(group, item))
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
                        <span className="min-w-0 flex-1 truncate text-left">{group.label}</span>
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
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      title={item.label}
                      className={({ isActive }) => cn(
                        'flex h-9 items-center gap-3 rounded-md px-3 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-white/65 dark:hover:bg-white/10 dark:hover:text-white',
                        isActive && 'bg-blue-600 text-white shadow-sm dark:bg-blue-600 dark:text-white'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
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

        <div className="relative border-t border-slate-200 p-3 dark:border-white/10">
          <button
            type="button"
            title={displayUserName}
            onClick={() => setSideUserOpen((value) => !value)}
            className={cn(
              'flex h-12 w-full items-center gap-3 rounded-md px-2 text-left text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-950 dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white',
              collapsed && 'justify-center px-0'
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white">
              <UserCircle className="h-6 w-6" />
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{displayUserName}</div>
                  <div className="truncate text-xs text-slate-500 dark:text-white/50">{displayUserProfile}</div>
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
              <div className="px-3 py-2">
                <div className="text-sm font-semibold">{displayUserName}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{displayUserProfile}</div>
                {isDemoSession && <div className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-300">Sesión demo</div>}
              </div>
              <button type="button" onClick={handleProfileNavigation} className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                Mi perfil
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
                    'h-10 max-w-28 truncate border-b-2 border-transparent px-1 text-left text-slate-500 transition-colors hover:text-slate-950 dark:text-slate-400 dark:hover:text-white',
                    item.path === location.pathname && 'border-blue-500 text-blue-700 dark:border-blue-400 dark:text-blue-300'
                  )}
                >
                  {getCompactNavigationLabel(item.label)}
                </button>
              </div>
            ))}
          </nav>

        <div className="flex min-w-0 items-center justify-end gap-4 justify-self-end">
          <div className="relative flex w-80 items-center">
            <input
              type="search"
              placeholder="Buscar módulo, documento, cliente o producto"
              className="h-10 w-full rounded-md border border-slate-300 bg-white pl-3 pr-11 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <button type="button" className="absolute right-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Buscar">
              <Search className="h-4 w-4" />
            </button>
          </div>

          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Notificaciones">
            <Bell className="h-5 w-5" />
          </button>
          <button type="button" onClick={toggleTheme} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Cambiar tema">
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <div ref={userMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setUserOpen((value) => !value)}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <UserCircle className="h-5 w-5" />
            <span className="hidden md:inline">{displayUserName}</span>
            <ChevronDown className="h-4 w-4" />
          </button>
          {userOpen && (
            <div className="absolute right-0 top-12 z-20 w-72 rounded-md border border-slate-200 bg-white p-2 text-slate-900 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <div className="flex items-center gap-3 px-3 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  <UserCircle className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold uppercase">{displayUserName}</div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">{displayUserSubtitle}</div>
                {isDemoSession && <div className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-300">Sesión demo</div>}
                </div>
              </div>
              <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
              <button type="button" onClick={handleProfileNavigation} className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                Mi perfil
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
