import { cn } from '@/utils/cn';
import useSidebarStore from '@/store/sidebarStore'; // Import directo
import SidebarNavSection from './SidebarNavSection';

/**
 * Componente de Navegación Principal del Sidebar
 * Usa el store directamente para evitar bucles infinitos
 */
function SidebarNav({ isCollapsed, isDarkMode, className }) {
  // Usar store directamente con selector simple
  const sections = useSidebarStore((state) => state.sidebarData?.data?.sections || []);
  const isLoading = useSidebarStore((state) => state.isLoadingSidebarData);
  const error = useSidebarStore((state) => state.sidebarDataError);

  // Mostrar loading si está cargando
  if (isLoading) {
    return (
      <nav className={cn("flex-1 py-4", className)}>
        <div className="px-6 text-white/60 text-sm">
          Cargando menú...
        </div>
      </nav>
    );
  }

  // Mostrar error si hay error
  if (error) {
    return (
      <nav className={cn("flex-1 py-4", className)}>
        <div className="px-6 text-red-400 text-sm">
          Error cargando menú: {error}
        </div>
      </nav>
    );
  }

  return (
    <nav className={cn(
      "flex-1 py-4 sidebar-nav overflow-y-auto overflow-x-hidden min-h-0",
      className
    )}>
      {sections.map((section) => (
        <SidebarNavSection
          key={section.id}
          section={section}
          isCollapsed={isCollapsed}
          isDarkMode={isDarkMode}
        />
      ))}
    </nav>
  );
}

export default SidebarNav;