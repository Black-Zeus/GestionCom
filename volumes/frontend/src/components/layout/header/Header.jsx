import { useState } from 'react';

function Header() {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="col-start-2 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Inicio</span>
        <span>›</span>
        <span className="text-gray-900">Dashboard</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        
        {/* Search */}
        <div className="relative">
          <input 
            type="text"
            placeholder="Buscar..."
            className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <span className="absolute right-3 top-2.5">🔍</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 hover:bg-gray-100 rounded-lg"
          >
            🔔
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Notificaciones</h3>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600">No hay notificaciones nuevas</p>
              </div>
            </div>
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full"></div>
          <span className="text-sm font-medium">Usuario</span>
        </div>
      </div>
    </header>
  );
}

export default Header;