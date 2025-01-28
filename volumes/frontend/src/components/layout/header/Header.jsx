import React, { useState, useRef, useEffect } from "react";
import Logo from "./Logo";
import SearchBar from "./SearchBar";
import BranchSelector from "./BranchSelector";
import Notifications from "./Notifications";
import UserMenu from "./UserMenu";

const Header = () => {
    const [activeMenu, setActiveMenu] = useState(null); // Controla qué menú está activo (branch, notif, user)
    const menuRef = useRef();

    // Función para alternar menús
    const toggleMenu = (menu) => {
        setActiveMenu(activeMenu === menu ? null : menu);
    };

    // Detectar clics fuera de los menús
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveMenu(null); // Cerrar el menú activo
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <header className="grid grid-cols-6 px-6 py-3 relative bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark shadow-lg">
            {/* Logo - Columna 1 */}
            <div className="flex-shrink-0 col-span-1">
                <Logo />
            </div>

            {/* Centro: Buscador y Selección de Sucursal (Col 2 a 5) */}
            <div className="col-span-4 flex items-center justify-center space-x-6">
                <SearchBar />
                <BranchSelector activeMenu={activeMenu} toggleMenu={toggleMenu} />
            </div>

            {/* Derecha: Notificaciones y Usuario - Columna 6 */}
            <div className="flex items-center gap-4 col-span-1">
                <Notifications activeMenu={activeMenu} toggleMenu={toggleMenu} />
                <UserMenu activeMenu={activeMenu} toggleMenu={toggleMenu} />
            </div>
        </header>
    );
};

export default Header;
