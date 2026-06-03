import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  UserCircle,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { moduleGroups, navigablePages } from '@/data/modules';
import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigationHistoryStore } from '@/store/useNavigationHistoryStore';
import { useSessionStore } from '@/store/useSessionStore';

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [sideUserOpen, setSideUserOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isDemoSession = useAuthStore((state) => state.isDemoSession);
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
  const displayUser = user || {
    name: 'Administrador Demo',
    profile: 'Administrador',
  };

  useEffect(() => {
    if (user) {
      initializeFromUser(user);
    }
  }, [initializeFromUser, user]);

  useEffect(() => {
    setOpenGroupId(activeGroupId);
  }, [activeGroupId]);

  useEffect(() => {
    const appName = import.meta.env.VITE_FRONTEND_NAME || 'GesCom';
    document.title = activeModule?.label ? `${appName} / ${activeModule.label}` : appName;
  }, [activeModule]);

  useEffect(() => {
    if (activeModule) {
      addNavigationVisit(activeModule);
    }
  }, [activeModule, addNavigationVisit]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleProfileNavigation = () => {
    setUserOpen(false);
    setSideUserOpen(false);
    navigate('/profile');
  };

  const showProductInfoModal = async () => {
    const { default: ModalManager } = await import('@/components/ui/modal');
    const appName = import.meta.env.VITE_FRONTEND_NAME || 'GesCom';
    const appVersion = import.meta.env.VITE_FRONTEND_VERSION || '1.0.0';
    const appEnv = (import.meta.env.VITE_FRONTEND_ENV || '').toUpperCase();
    const modalId = 'gescom-product-info';

    ModalManager.close(modalId);

    ModalManager.custom({
      id: modalId,
      title: appName,
      size: 'xlarge',
      showHeader: false,
      showFooter: false,
      content: (
        <div className={cn('-m-6 overflow-hidden rounded-md bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100', isDark && 'dark')}>
          <div className="relative p-6 sm:p-7">
            <button
              type="button"
              onClick={() => ModalManager.close(modalId)}
              className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-md border border-blue-300 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 dark:border-blue-400/70 dark:text-slate-200 dark:hover:bg-blue-500/10 dark:hover:text-white"
              aria-label="Cerrar informacion del producto"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-7 flex items-center gap-3 pr-14">
              <img src="/assets/logo.png" alt="Logo del aplicativo" loading="eager" decoding="async" className="h-12 w-12 rounded-md bg-white object-contain p-2 shadow-sm" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-semibold leading-none text-slate-950 dark:text-white">{appName}</h2>
                  <span className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 dark:border-slate-500/70 dark:text-slate-200">
                    {appVersion}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Sistema de inventarios y gestion comercial</div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
              <div className="flex aspect-square items-center justify-center rounded-md border border-slate-200 bg-slate-50 p-8 shadow-inner dark:border-slate-600/80 dark:bg-slate-800">
                <img src="/assets/logo.png" alt="Logo GesCom" width="192" height="192" loading="eager" decoding="async" className="h-48 w-48 object-contain drop-shadow-xl" />
              </div>

              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Descripcion</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-200">
                    {appName} centraliza la gestion de inventarios, ventas, caja, documentos y reportes,
                    habilitando trazabilidad operativa y control consistente entre modulos. Su foco es reducir
                    carga manual, ordenar flujos diarios y preparar el sistema para datos reales, multiples
                    usuarios y crecimiento modular.
                  </p>
                </div>

                <div className="grid gap-x-8 gap-y-4 text-sm text-slate-600 dark:text-slate-200 sm:grid-cols-2">
                  <div className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500 dark:bg-blue-300" />
                    <span><strong className="text-slate-950 dark:text-white">Inventario</strong> con productos, stock, transferencias y ajustes.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500 dark:bg-blue-300" />
                    <span><strong className="text-slate-950 dark:text-white">Ventas</strong> integradas con caja, clientes y documentos.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500 dark:bg-blue-300" />
                    <span><strong className="text-slate-950 dark:text-white">Sesion</strong> centralizada con stores, token e interceptores.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500 dark:bg-blue-300" />
                    <span><strong className="text-slate-950 dark:text-white">Escalabilidad</strong> mediante modulos lazy y layout optimizado.</span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Desarrollado para GestionCom · Base frontend reconstruida · Ambiente {appEnv || 'PRD'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 sm:px-7">
            <span>Producto · {appName}</span>
            <span>Gestion · Trazabilidad · Modularidad</span>
          </div>
        </div>
      ),
    });
  };

  return (
    <div className="grid h-screen grid-cols-[auto_1fr] grid-rows-[96px_1fr_44px] overflow-hidden bg-slate-100 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <aside className={cn('row-span-3 flex h-screen flex-col border-r border-slate-200 bg-white text-slate-700 transition-[width,background-color,color,border-color] duration-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100', sidebarWidth)}>
        <button
          type="button"
          onClick={showProductInfoModal}
          className="flex h-16 w-full items-center gap-3 border-b border-slate-200 px-4 text-left transition-colors hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
        >
          <img src="/assets/logo.png" alt="Logo del aplicativo" loading="eager" decoding="async" className="h-9 w-9 shrink-0 rounded-md bg-white object-contain p-1" />
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">GesCom</div>
              <div className="truncate text-xs text-slate-500 dark:text-white/60">Inventarios y gestion comercial</div>
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
              const sortedItems = [...group.items].sort((left, right) => left.weight - right.weight);
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
            title={displayUser.name}
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
                  <div className="truncate text-sm font-semibold">{displayUser.name}</div>
                  <div className="truncate text-xs text-slate-500 dark:text-white/50">{displayUser.profile}</div>
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
                <div className="text-sm font-semibold">{displayUser.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{displayUser.profile}</div>
                {isDemoSession && <div className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-300">Sesion demo</div>}
              </div>
              <button type="button" onClick={handleProfileNavigation} className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                Mi perfil
              </button>
              <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                <LogOut className="h-4 w-4" />
                Cerrar sesion
              </button>
            </div>
          )}
        </div>
      </aside>

      <header className="col-start-2 row-start-1 flex h-24 flex-col border-b border-slate-200 bg-white text-slate-900 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <div className="flex h-16 items-center gap-4 px-5">
          <div className="relative min-w-0 flex-1 max-w-2xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Buscar modulo, documento, cliente o producto"
              className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Notificaciones">
            <Bell className="h-5 w-5" />
          </button>
          <button type="button" onClick={toggleTheme} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Cambiar tema">
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <div className="relative">
          <button
            type="button"
            onClick={() => setUserOpen((value) => !value)}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <UserCircle className="h-5 w-5" />
            <span className="hidden md:inline">{displayUser.name}</span>
            <ChevronDown className="h-4 w-4" />
          </button>
          {userOpen && (
            <div className="absolute right-0 top-12 z-20 w-64 rounded-md border border-slate-200 bg-white p-2 text-slate-900 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <div className="px-3 py-2">
                <div className="text-sm font-semibold">{displayUser.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{displayUser.profile}</div>
                {isDemoSession && <div className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-300">Sesion demo</div>}
              </div>
              <button type="button" onClick={handleProfileNavigation} className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                Mi perfil
              </button>
              <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                <LogOut className="h-4 w-4" />
                Cerrar sesion
              </button>
            </div>
          )}
        </div>
        </div>

        <div className="flex h-8 items-center gap-3 overflow-hidden border-t border-slate-100 px-5 text-xs dark:border-slate-800">
          <span className="shrink-0 font-medium text-slate-400 dark:text-slate-500">Visitados</span>
          <div className="flex min-w-0 flex-1 items-center justify-start overflow-x-auto">
            {navigationHistory.length === 0 && (
              <span className="text-slate-400 dark:text-slate-500">Sin historial</span>
            )}
            {navigationHistory.map((item, index) => (
              <div key={item.path} className="flex min-w-0 shrink-0 items-center">
                {index > 0 && <span className="px-2 text-slate-300 dark:text-slate-700">/</span>}
                <button
                  type="button"
                  title={`Estabas viendo: ${item.tooltip}`}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'h-8 max-w-44 truncate border-b-2 border-transparent px-1 text-left text-slate-500 transition-colors hover:text-slate-950 dark:text-slate-400 dark:hover:text-white',
                    item.path === location.pathname && 'border-blue-500 text-blue-700 dark:border-blue-400 dark:text-blue-300'
                  )}
                >
                  {item.label}
                </button>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="col-start-2 row-start-2 min-h-0 overflow-y-auto bg-slate-50 p-5 transition-colors duration-200 dark:bg-slate-950">
        <Outlet />
      </main>

      <footer className="col-start-2 row-start-3 flex h-11 items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 text-xs text-slate-600 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <div className="min-w-0 truncate"><span className="font-medium">Usuario:</span> {displayUser.name} - {displayUser.profile}</div>
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
