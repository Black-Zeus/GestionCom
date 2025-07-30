import { useSidebar } from '@/store/sidebarStore';
import Header from './header/Header';
import Sidebar from './sideBar/Sidebar'; // ← Cambiamos a nuestro componente React
import Main from './Main';
import Footer from './footer/Footer';

function Layout({ children }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className={`
      min-h-screen w-full overflow-hidden
      grid transition-all duration-300 ease-smooth
      ${
        // Desktop: Sidebar + Content
        isCollapsed 
          ? 'grid-cols-[80px_1fr]' 
          : 'grid-cols-[280px_1fr]'
      }
      grid-rows-[64px_1fr_48px]
      grid-areas-layout
    `}>
      
      {/* Header - Always visible */}
      <Header className="col-start-2" />
      
      {/* Sidebar - Desktop only (React component) */}
      <Sidebar className="col-start-1 row-span-full z-fixed" />
      
      {/* Main Content */}
      <Main className="col-start-2 row-start-2">
        {children}
      </Main>
      
      {/* Footer */}
      <Footer className="col-start-2 row-start-3" />
    </div>
  );
}

export default Layout;