import { cn } from '@/utils/cn';
import { sidebarNavData } from '@/data/sidebarData';
import SidebarNavSection from './SidebarNavSection';

/**
 * Componente de Navegación Principal del Sidebar
 * Renderiza todas las secciones de navegación con scroll interno
 */
function SidebarNav({ isCollapsed, isDarkMode, className }) {
  const { sections } = sidebarNavData.data;

  return (
    <nav className={cn(
      // Flex para ocupar espacio disponible
      "flex-1",
      
      // Padding vertical
      "py-4",
      
      // Scroll interno suave y elegante - usando clase CSS específica
      "sidebar-nav",
      "overflow-y-auto overflow-x-hidden",
      
      // Altura mínima para flex
      "min-h-0",
      
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