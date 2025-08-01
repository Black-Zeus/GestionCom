import { useSidebar } from '@/store/sidebarStore';
import Header from './header/Header';
import Sidebar from './sideBar/Sidebar';
import Main from './Main';
import Footer from './footer/Footer';

function Layout({ children }) {
    const { isCollapsed } = useSidebar();

    return (
        <div
            className={`
                w-full h-screen
                grid
                ${isCollapsed ? 'grid-cols-[80px_1fr]' : 'grid-cols-[280px_1fr]'}
                grid-rows-[64px_1fr_48px]
                transition-all duration-300 ease-smooth
            `}
        >
            {/* Sidebar ocupa todas las filas */}
            <Sidebar className="col-start-1 row-span-3 z-10" />

            {/* Header */}
            <Header className="col-start-2 row-start-1 z-20" />

            {/* Main content */}
            <Main className="col-start-2 row-start-2 overflow-y-auto">
                {children}
            </Main>

            {/* Footer */}
            <Footer className="col-start-2 row-start-3 z-20" />
        </div>
    );
}

export default Layout;
