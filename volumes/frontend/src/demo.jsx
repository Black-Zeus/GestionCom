import React, { useState, useEffect } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useAuth, useIsAuthenticated, useUserDisplay } from '@/store/authStore';
import { login, logout, validateToken } from '@/services/authService';
import { onLogoutRequired, setAuthTokens } from '@/services/axiosInterceptor';
import { isDevelopment, getAppInfo } from '@/utils/environment';
import { API_ENDPOINTS, ROUTES } from '@/constants';

// Componente de icono personalizado
const Icon = ({ name, className = "w-5 h-5" }) => {
  const icons = {
    home: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    chart: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    users: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    ),
    settings: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    bell: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    star: (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    heart: (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    ),
    trending: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    menu: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
    sun: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    moon: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
    login: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
      </svg>
    ),
    logout: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    ),
    shield: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    )
  };
  
  return icons[name] || null;
};

// Componente de Card corregido
const Card = ({ children, className = "", hover = true, onClick, ...props }) => {
  const baseClasses = `
    bg-white border border-gray-200 rounded-xl shadow-sm 
    transition-all duration-300
  `;
  
  const hoverClasses = hover ? `
    hover:shadow-lg hover:-translate-y-1 cursor-pointer
  ` : '';
  
  return (
    <div 
      className={`${baseClasses} ${hoverClasses} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

// Componente de Button corregido
const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  ...props 
}) => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md',
    secondary: 'bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200 hover:border-gray-400 shadow-sm hover:shadow-md',
    warm: 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm hover:shadow-md',
    success: 'bg-green-600 hover:bg-green-700 text-white shadow-sm',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white',
    ghost: 'text-gray-700 hover:bg-gray-100',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
  };
  
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  return (
    <button
      type={type}
      className={`
        ${variants[variant]} ${sizes[size]}
        font-medium rounded-lg transition-all duration-200 
        hover:-translate-y-0.5 active:translate-y-0
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        flex items-center justify-center gap-2
        ${className}
      `}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
};

// Componente de Badge corregido
const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    primary: 'bg-blue-100 text-blue-700',
    warm: 'bg-orange-100 text-orange-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700'
  };
  
  return (
    <span className={`
      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      ${variants[variant]} ${className}
    `}>
      {children}
    </span>
  );
};

// Componente de Login corregido
const LoginForm = ({ onLogin, isLoading = false, error = null }) => {
  const [credentials, setCredentials] = useState({
    username: isDevelopment ? 'admin.demo' : '',
    password: isDevelopment ? 'admin.demo1' : '',
    remember_me: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(credentials);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-orange-600 flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8" hover={false}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="shield" className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Iniciar Sesión
          </h1>
          <p className="text-gray-600">
            Accede a tu cuenta del sistema
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Icon name="bell" className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuario
            </label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-all duration-200"
              placeholder="Tu usuario"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-all duration-200"
              placeholder="Tu contraseña"
              required
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember"
              checked={credentials.remember_me}
              onChange={(e) => setCredentials({ ...credentials, remember_me: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              disabled={isLoading}
            />
            <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
              Recordar sesión
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={isLoading}
            disabled={isLoading}
          >
            <Icon name="login" className="w-5 h-5" />
            Iniciar Sesión
          </Button>
        </form>

        {isDevelopment && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>Modo desarrollo:</strong> Credenciales pre-cargadas para testing
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

// Componente principal de la aplicación
function Demo() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [notifications, setNotifications] = useState(3);
  const [apiStatus, setApiStatus] = useState('checking'); // checking, connected, error
  
  // Auth hooks simulados para el ejemplo
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userDisplay, setUserDisplay] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Simular funciones de auth
  const hasPermission = (permission) => {
    // Simular algunos permisos para demo
    const userPermissions = ['USER_MENU_ADMIN', 'WAREHOUSE_ACCESS_READ', 'RETURNS_VIEW'];
    return userPermissions.includes(permission);
  };
  
  const appInfo = {
    name: 'Sistema Demo',
    version: '1.0.0',
    environment: 'development'
  };
  
  // Inicialización de la app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true);
        // Simular inicialización
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setApiStatus('connected');
        setIsInitialized(true);
      } catch (error) {
        console.error('App initialization error:', error);
        setApiStatus('error');
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeApp();
  }, []);
  
  // Manejo de login
  const handleLogin = async (credentials) => {
    setIsLoading(true);
    setLastError(null);
    
    try {
      //console.log('🔐 Attempting login...', credentials);
      
      // Simular llamada API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simular respuesta exitosa
      if (credentials.username === 'admin.demo' && credentials.password === 'admin.demo1') {
        setUserDisplay({
          id: 1,
          username: credentials.username,
          fullName: 'Admin Demo',
          email: 'admin@demo.com',
          initials: 'AD',
          isActive: true,
          roles: ['admin', 'user']
        });
        setIsAuthenticated(true);
        setApiStatus('connected');
        //console.log('✅ Login successful');
      } else {
        throw new Error('Credenciales inválidas');
      }
      
    } catch (error) {
      console.error('❌ Login failed:', error);
      setLastError(error.message || 'Error de login');
      setApiStatus('error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Manejo de logout
  const handleLogout = async () => {
    setIsLoading(true);
    
    try {
      //console.log('🚪 Attempting logout...');
      
      // Simular llamada API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      //console.log('✅ Logout successful');
      
    } catch (error) {
      console.warn('⚠️ Logout API failed:', error.message);
    } finally {
      // Limpiar estado local
      setIsAuthenticated(false);
      setUserDisplay(null);
      setIsLoading(false);
    }
  };
  
  // Test de API
  const testApiConnection = async () => {
    setApiStatus('checking');
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setApiStatus('connected');
    } catch (error) {
      setApiStatus('error');
    }
  };
  
  // Simular datos para las cards
  const stats = [
    { title: 'Usuarios Activos', value: '2,547', change: '+12%', trend: 'up', color: 'primary' },
    { title: 'Satisfacción', value: '98.5%', change: '+0.3%', trend: 'up', color: 'warm' },
    { title: 'Tiempo de Carga', value: '1.2s', change: '-0.3s', trend: 'up', color: 'success' },
    { title: 'API Status', value: apiStatus === 'connected' ? 'Online' : 'Error', change: apiStatus === 'connected' ? '✓' : '✗', trend: apiStatus === 'connected' ? 'up' : 'down', color: apiStatus === 'connected' ? 'success' : 'danger' }
  ];
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home' },
    { id: 'analytics', label: 'Analytics', icon: 'chart' },
    { id: 'users', label: 'Usuarios', icon: 'users', permission: 'USER_MENU_ADMIN' },
    { id: 'settings', label: 'Configuración', icon: 'settings' }
  ];
  
  const recentActivity = [
    { id: 1, action: 'Usuario autenticado', user: userDisplay?.username || 'Sistema', time: 'ahora', type: 'success' },
    { id: 2, action: 'API conectada', user: 'Sistema', time: 'hace 1 min', type: 'primary' },
    { id: 3, action: 'Store inicializado', user: 'Sistema', time: 'hace 2 min', type: 'success' },
    { id: 4, action: 'App cargada', user: 'Sistema', time: 'hace 2 min', type: 'success' }
  ];

  // Mostrar spinner de carga inicial
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">Inicializando sistema...</p>
        </div>
      </div>
    );
  }

  // Mostrar formulario de login si no está autenticado
  if (!isAuthenticated) {
    return (
      <LoginForm 
        onLogin={handleLogin} 
        isLoading={isLoading}
        error={lastError}
      />
    );
  }
  
  return (
    <div className={`min-h-screen bg-gray-50 transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-full z-50 transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-64' : 'w-16'}
      `}>
        <div className="h-full bg-gradient-to-b from-blue-600 to-blue-800 p-6 text-white">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold">✨</span>
            </div>
            {sidebarOpen && (
              <span className="font-semibold text-lg">
                {appInfo.name}
              </span>
            )}
          </div>
          
          {/* Menu Items */}
          <nav className="space-y-2">
            {menuItems.map((item) => {
              // Verificar permisos si es necesario
              if (item.permission && !hasPermission(item.permission)) {
                return null;
              }
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg 
                    transition-all duration-200 text-left
                    ${activeSection === item.id 
                      ? 'bg-white/20 text-white shadow-lg' 
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <Icon name={item.icon} className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <span>{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
          
          {/* User Profile */}
          {sidebarOpen && userDisplay && (
            <div className="absolute bottom-6 left-6 right-6">
              <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">{userDisplay.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{userDisplay.fullName}</p>
                  <p className="text-xs text-white/70 truncate">{userDisplay.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
      
      {/* Main Content */}
      <main className={`
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'ml-64' : 'ml-16'}
      `}>
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2"
            >
              <Icon name="menu" />
            </Button>
            
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
              </h1>
              <p className="text-sm text-gray-600">
                Bienvenido, {userDisplay?.fullName || 'Usuario'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* API Status */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                apiStatus === 'connected' ? 'bg-green-500' : 
                apiStatus === 'checking' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
              }`}></div>
              <span className="text-xs text-gray-600">
                {apiStatus === 'connected' ? 'API Online' : 
                 apiStatus === 'checking' ? 'Verificando...' : 'API Error'}
              </span>
              {apiStatus === 'error' && (
                <Button variant="ghost" size="sm" onClick={testApiConnection} className="text-xs px-2 py-1">
                  Reintentar
                </Button>
              )}
            </div>
            
            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDarkMode(!darkMode)}
              className="p-2"
            >
              <Icon name={darkMode ? 'sun' : 'moon'} />
            </Button>
            
            {/* Notifications */}
            <div className="relative">
              <Button variant="ghost" size="sm" className="p-2">
                <Icon name="bell" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                    {notifications}
                  </span>
                )}
              </Button>
            </div>
            
            {/* Logout Button */}
            <Button
              variant="danger"
              size="sm"
              onClick={handleLogout}
              loading={isLoading}
              className="px-3 py-2"
            >
              <Icon name="logout" className="w-4 h-4" />
              {!isLoading && 'Salir'}
            </Button>
            
            {/* User Avatar */}
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
              <span className="text-sm font-medium text-white">{userDisplay?.initials || 'U'}</span>
            </div>
          </div>
        </header>
        
        {/* Content Area */}
        <div className="p-6 space-y-8">
          {/* Welcome Section */}
          <div className="animate-fadeIn">
            <Card className="p-8 bg-gradient-to-r from-blue-600 to-orange-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    ¡Bienvenido de vuelta, {userDisplay?.fullName || 'Usuario'}! 👋 
                  </h2>
                  <p className="text-white/90 text-lg">
                    Sistema {appInfo.name} v{appInfo.version} - {appInfo.environment}
                  </p>
                  <p className="text-white/70 text-sm mt-2">
                    Roles: {userDisplay?.roles?.join(', ') || 'Sin roles'}
                  </p>
                </div>
                <div className="text-6xl animate-bounce opacity-20">
                  ✨
                </div>
              </div>
            </Card>
          </div>
          
          {/* Stats Grid */}
          <div className="animate-fadeIn">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Estado del Sistema
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <Card key={index} className="p-6" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      stat.color === 'primary' ? 'bg-blue-100' :
                      stat.color === 'warm' ? 'bg-orange-100' :
                      stat.color === 'success' ? 'bg-green-100' :
                      stat.color === 'danger' ? 'bg-red-100' :
                      'bg-blue-100'
                    }`}>
                      <Icon 
                        name={stat.color === 'primary' ? 'trending' : stat.color === 'warm' ? 'heart' : stat.color === 'success' ? 'star' : stat.color === 'danger' ? 'bell' : 'chart'} 
                        className={`w-6 h-6 ${
                          stat.color === 'primary' ? 'text-blue-600' :
                          stat.color === 'warm' ? 'text-orange-600' :
                          stat.color === 'success' ? 'text-green-600' :
                          stat.color === 'danger' ? 'text-red-600' :
                          'text-blue-600'
                        }`} 
                      />
                    </div>
                    <Badge variant={stat.color === 'primary' ? 'primary' : stat.color === 'danger' ? 'danger' : stat.color}>
                      {stat.change}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          
          {/* API Testing Section */}
          <div className="animate-fadeIn">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Pruebas de API
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={testApiConnection}>
                    Test Conexión
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => //console.log('Auth Store:', { isAuthenticated, userDisplay, hasPermission: hasPermission('USER_MENU_ADMIN') })}>
                    Debug Store
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* API Endpoints */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Endpoints Disponibles</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <code className="text-xs">/api/auth/login</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <code className="text-xs">/api/auth/validate</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <code className="text-xs">/api/auth/logout</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <code className="text-xs">/api/auth/refresh</code>
                    </div>
                  </div>
                </div>
                
                {/* User Info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Información del Usuario</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div><strong>ID:</strong> {userDisplay?.id || 'N/A'}</div>
                    <div><strong>Usuario:</strong> {userDisplay?.username || 'N/A'}</div>
                    <div><strong>Email:</strong> {userDisplay?.email || 'N/A'}</div>
                    <div><strong>Activo:</strong> {userDisplay?.isActive ? 'Sí' : 'No'}</div>
                    <div><strong>Roles:</strong> {userDisplay?.roles?.length || 0}</div>
                  </div>
                </div>
                
                {/* System Info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Info del Sistema</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div><strong>Versión:</strong> {appInfo.version}</div>
                    <div><strong>Entorno:</strong> {appInfo.environment}</div>
                    <div><strong>Modo:</strong> {isDevelopment ? 'Desarrollo' : 'Producción'}</div>
                    <div><strong>API Status:</strong> {apiStatus}</div>
                    <div><strong>Tokens:</strong> {isAuthenticated ? 'Válidos' : 'Sin tokens'}</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Charts and Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart Area */}
            <div className="lg:col-span-2 animate-fadeIn">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Integración con Backend
                  </h3>
                  <Button variant="outline" size="sm">
                    Documentación API
                  </Button>
                </div>
                
                {/* Mock Integration Status */}
                <div className="h-64 bg-gradient-to-br from-blue-50 to-orange-50 rounded-lg p-6">
                  <div className="grid grid-cols-2 gap-6 h-full">
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Servicios Integrados</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                          <div className="flex items-center gap-2">
                            <Icon name="shield" className="w-4 h-4 text-green-600" />
                            <span className="text-sm">Auth Service</span>
                          </div>
                          <Badge variant="success">Activo</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                          <div className="flex items-center gap-2">
                            <Icon name="chart" className="w-4 h-4 text-green-600" />
                            <span className="text-sm">Axios Interceptor</span>
                          </div>
                          <Badge variant="success">Activo</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                          <div className="flex items-center gap-2">
                            <Icon name="star" className="w-4 h-4 text-green-600" />
                            <span className="text-sm">Auth Store</span>
                          </div>
                          <Badge variant="success">Activo</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Últimas Acciones</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div>✅ Login exitoso</div>
                        <div>✅ Tokens configurados</div>
                        <div>✅ Usuario autenticado</div>
                        <div>✅ Permisos cargados</div>
                        <div>✅ Store sincronizado</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            
            {/* Activity Feed */}
            <div className="animate-fadeIn">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Actividad del Sistema
                </h3>
                
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                        ${activity.type === 'success' ? 'bg-green-100 text-green-600' : 
                          activity.type === 'primary' ? 'bg-blue-100 text-blue-600' : 
                          activity.type === 'warning' ? 'bg-yellow-100 text-yellow-600' : 
                          'bg-gray-100 text-gray-600'
                        }
                      `}>
                        <Icon 
                          name={activity.type === 'success' ? 'star' : 
                                activity.type === 'primary' ? 'users' : 
                                activity.type === 'warning' ? 'bell' : 'heart'} 
                          className="w-4 h-4" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.action}
                        </p>
                        <p className="text-xs text-gray-600">
                          {activity.user} • {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
          
          {/* Permission Testing */}
          <div className="animate-fadeIn">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Pruebas de Permisos
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Admin Permissions */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Permisos de Admin</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>USER_MENU_ADMIN</span>
                      <Badge variant={hasPermission('USER_MENU_ADMIN') ? 'success' : 'default'}>
                        {hasPermission('USER_MENU_ADMIN') ? '✓' : '✗'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>WAREHOUSE_ADMIN</span>
                      <Badge variant={hasPermission('WAREHOUSE_ADMIN') ? 'success' : 'default'}>
                        {hasPermission('WAREHOUSE_ADMIN') ? '✓' : '✗'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>MENU_ADMIN</span>
                      <Badge variant={hasPermission('MENU_ADMIN') ? 'success' : 'default'}>
                        {hasPermission('MENU_ADMIN') ? '✓' : '✗'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* Warehouse Permissions */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Permisos de Warehouse</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>WAREHOUSE_ACCESS_READ</span>
                      <Badge variant={hasPermission('WAREHOUSE_ACCESS_READ') ? 'success' : 'default'}>
                        {hasPermission('WAREHOUSE_ACCESS_READ') ? '✓' : '✗'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>WAREHOUSE_ZONE_ADMIN</span>
                      <Badge variant={hasPermission('WAREHOUSE_ZONE_ADMIN') ? 'success' : 'default'}>
                        {hasPermission('WAREHOUSE_ZONE_ADMIN') ? '✓' : '✗'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>WAREHOUSE_ACCESS_WRITE</span>
                      <Badge variant={hasPermission('WAREHOUSE_ACCESS_WRITE') ? 'success' : 'default'}>
                        {hasPermission('WAREHOUSE_ACCESS_WRITE') ? '✓' : '✗'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* Returns Permissions */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Permisos de Returns</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>RETURNS_VIEW</span>
                      <Badge variant={hasPermission('RETURNS_VIEW') ? 'success' : 'default'}>
                        {hasPermission('RETURNS_VIEW') ? '✓' : '✗'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>RETURNS_PROCESS</span>
                      <Badge variant={hasPermission('RETURNS_PROCESS') ? 'success' : 'default'}>
                        {hasPermission('RETURNS_PROCESS') ? '✓' : '✗'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>RETURNS_APPROVE</span>
                      <Badge variant={hasPermission('RETURNS_APPROVE') ? 'success' : 'default'}>
                        {hasPermission('RETURNS_APPROVE') ? '✓' : '✗'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Footer */}
          <div className="animate-fadeIn pt-12 border-t border-gray-200">
            <div className="text-center space-y-4">
              <div className="flex justify-center items-center gap-2 text-gray-600">
                <span className="text-2xl animate-pulse">✨</span>
                <span className="text-sm">
                  {appInfo.name} v{appInfo.version} - Integración completa con backend
                </span>
              </div>
              
              <div className="flex justify-center items-center gap-6 text-sm text-gray-500">
                <span>✅ Auth Service</span>
                <span>•</span>
                <span>✅ Axios Interceptor</span>
                <span>•</span>
                <span>✅ Auth Store</span>
                <span>•</span>
                <span>✅ Error Boundary</span>
              </div>
              
              <p className="text-xs text-gray-500 max-w-2xl mx-auto leading-relaxed">
                Sistema completamente integrado con gestión automática de tokens, 
                manejo de errores centralizado y sincronización con el backend FastAPI.
                Todos los servicios funcionando correctamente.
              </p>
              
              {isDevelopment && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg inline-block">
                  <p className="text-xs text-blue-700">
                    <strong>Modo desarrollo activo</strong> - Logs y debugging habilitados
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Demo;