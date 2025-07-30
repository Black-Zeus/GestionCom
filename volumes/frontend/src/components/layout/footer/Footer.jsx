import { useSidebar } from '@/store/sidebarStore';
import { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';

function Footer({ className }) {
  const { sessionInfo } = useSidebar();
  const [notification, setNotification] = useState(null);

  return (
    <footer className={cn(
      // Layout base
      "flex items-center justify-between",
      "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300",
      "border-t border-gray-200 dark:border-gray-700",
      "px-6 lg:px-8 xl:px-12",
      "h-12", // Altura fija
      "relative z-10",
      
      // Transiciones
      "transition-all duration-300 ease-in-out",
      
      // Sombra sutil
      "shadow-[0_-1px_3px_rgba(0,0,0,0.1)]",
      
      // Responsive
      "text-sm",
      "min-w-0 flex-shrink-0",
      
      className
    )}>
      
      {/* Notificación flotante */}
      <FooterNotification 
        notification={notification} 
        onClose={() => setNotification(null)} 
      />
      
      {/* Sección Izquierda - Copyright y Enlaces */}
      <div className="flex items-center gap-6 min-w-0 flex-shrink-1">
        
        {/* Copyright */}
        <div className="flex items-center gap-2 text-gray-500 font-medium">
          <span className="text-gray-600 font-bold">©</span>
          <span className="whitespace-nowrap">
            2025 Sistema de Inventario y Punto de Venta
          </span>
        </div>
        
        {/* Enlaces - Ocultos en móvil */}
        <div className="hidden md:flex items-center gap-4">
          <FooterLink href="#" onClick={() => showModal('support')}>
            Soporte
          </FooterLink>
          <span className="text-gray-400">|</span>
          <FooterLink href="#" onClick={() => showModal('help')}>
            Ayuda
          </FooterLink>
        </div>
      </div>
      
      {/* Sección Derecha - Información Operativa */}
      <div className="flex items-center gap-4 lg:gap-6 min-w-0 flex-shrink-0 font-medium">
        
        {/* Sucursal */}
        <InfoGroup 
          label="Sucursal:"
          value={sessionInfo?.branch || 'Central'}
          className="text-blue-500"
          title="Sucursal actual"
        />
        
        <Divider />
        
        {/* Caja - Oculto en móvil pequeño */}
        <InfoGroup 
          label="Caja:"
          value={sessionInfo?.cashRegister || '#1234'}
          className="hidden sm:flex"
          title="Caja registradora activa"
        />
        
        <Divider className="hidden sm:block" />
        
        {/* Usuario - Versión compacta en móvil */}
        <InfoGroup 
          label="Usuario:"
          value={sessionInfo?.user?.username || 'vsoto'}
          role={sessionInfo?.user?.role || 'Admin'}
          title="Usuario activo"
          compact={true}
        />
        
        <Divider />
        
        {/* Turno */}
        <InfoGroup 
          label="Turno:"
          value={sessionInfo?.shift || 'Mañana'}
          status="success"
          withIndicator={true}
          title="Turno de trabajo actual"
        />
      </div>
    </footer>
  );
}

// Componente para grupos de información
function InfoGroup({ 
  label, 
  value, 
  role, 
  status = 'normal', 
  withIndicator = false,
  compact = false,
  className,
  title,
  ...props 
}) {
  const statusColors = {
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
    normal: 'text-gray-900 dark:text-gray-100'
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-1 whitespace-nowrap",
        compact && "max-sm:flex-col max-sm:gap-0 max-sm:text-xs",
        className
      )}
      title={title}
      {...props}
    >
      <span className="text-gray-500 text-xs lg:text-sm">
        {label}
      </span>
      <span className={cn(
        "font-semibold text-xs lg:text-sm",
        statusColors[status]
      )}>
        {value}
      </span>
      {role && !compact && (
        <>
          <span className="text-gray-500">({role})</span>
        </>
      )}
      {role && compact && (
        <span className="text-gray-500 text-xs max-sm:text-[10px]">
          ({role})
        </span>
      )}
      {withIndicator && (
        <div className="flex items-center ml-1">
          <div className={cn(
            "w-2 h-2 rounded-full",
            status === 'success' && "bg-green-500 animate-pulse",
            status === 'warning' && "bg-yellow-500",
            status === 'danger' && "bg-red-500"
          )} />
        </div>
      )}
    </div>
  );
}

// Divisor visual
function Divider({ className }) {
  return (
    <div className={cn(
      "w-[1px] h-4 bg-gray-300 dark:bg-gray-600 flex-shrink-0",
      className
    )} />
  );
}

// Enlace del footer
function FooterLink({ href, onClick, children }) {
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
      className={cn(
        "text-gray-600 hover:text-blue-500",
        "transition-colors duration-200",
        "text-sm font-medium",
        "hover:underline underline-offset-2"
      )}
    >
      {children}
    </a>
  );
}

// Notificación flotante del footer
function FooterNotification({ notification, onClose }) {
  if (!notification) return null;

  const typeStyles = {
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-white',
    danger: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white'
  };

  return (
    <div className={cn(
      "absolute -top-12 left-1/2 transform -translate-x-1/2",
      "px-4 py-2 rounded-lg shadow-lg z-10",
      "text-sm font-medium whitespace-nowrap",
      "animate-slide-up",
      typeStyles[notification.type] || typeStyles.info
    )}>
      {notification.message}
    </div>
  );
}

// Función helper para mostrar modales (placeholder)
function showModal(type) {
  console.log(`Abrir modal: ${type}`);
  // Aquí integrarías con tu sistema de modales
}

export default Footer;