import { useSidebar } from '@/store/sidebarStore';
import { useAuth } from '@/store/authStore';

function Sidebar() {
  const { 
    isCollapsed, 
    activeSection, 
    navigateTo, 
    toggleCollapsed,
    toggleTheme,
    isDarkMode 
  } = useSidebar();
  
  const { user } = useAuth();

  return (
    <aside className={`
      col-start-1 row-span-full 
      bg-gradient-to-b from-slate-700 to-slate-800
      ${isDarkMode ? 'from-slate-900 to-black' : ''}
      text-white transition-all duration-300
      ${isCollapsed ? 'w-20' : 'w-70'}
    `}>
      
      {/* Toggle Button */}
      <button 
        onClick={toggleCollapsed}
        className="absolute -right-4 top-4 w-8 h-8 bg-blue-500 rounded-full"
      >
        {isCollapsed ? '→' : '←'}
      </button>

      {/* Brand */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
            S
          </div>
          {!isCollapsed && <span className="font-semibold">Sistema</span>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map(item => (
          <button
            key={item.id}
            onClick={() => navigateTo(item.id)}
            className={`
              w-full flex items-center gap-3 p-3 rounded-lg transition-colors
              ${activeSection === item.id ? 'bg-blue-500' : 'hover:bg-white/10'}
              ${isCollapsed ? 'justify-center' : ''}
            `}
          >
            <span className="text-xl">{item.icon}</span>
            {!isCollapsed && <span>{item.text}</span>}
          </button>
        ))}
      </nav>

      {/* User Profile & Controls */}
      <div className="p-4 border-t border-white/10">
        {/* User Info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          {!isCollapsed && (
            <div>
              <div className="font-medium">{user?.username}</div>
              <div className="text-sm text-white/70">Admin</div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 p-2 hover:bg-white/10 rounded"
        >
          <span>🌙</span>
          {!isCollapsed && <span>Modo Oscuro</span>}
        </button>
      </div>
    </aside>
  );
}

// Data simple
const navigationItems = [
  { id: 'dashboard', text: 'Dashboard', icon: '📊' },
  { id: 'products', text: 'Productos', icon: '📦' },
  { id: 'sales', text: 'Ventas', icon: '💰' },
  { id: 'clients', text: 'Clientes', icon: '👥' },
];

export default Sidebar;