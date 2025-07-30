import { useSidebar } from '@/store/sidebarStore';
import Header from './Header';
import Sidebar from './Sidebar';
import Main from './Main';
import Footer from './Footer';

function Layout({ children }) {
  const { isCollapsed, isMobileOpen } = useSidebar();

  return (
    <div className={`
      grid h-screen 
      ${isCollapsed ? 'grid-cols-[80px_1fr]' : 'grid-cols-[280px_1fr]'}
      grid-rows-[64px_1fr_48px]
      lg:grid-areas-['sidebar_header' 'sidebar_main' 'sidebar_footer']
    `}>
      <Header />
      <Sidebar />
      <Main>{children}</Main>
      <Footer />
      
      {/* Overlay móvil */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-10 lg:hidden"
          onClick={() => useSidebar.getState().closeMobile()}
        />
      )}
    </div>
  );
}

export default Layout;