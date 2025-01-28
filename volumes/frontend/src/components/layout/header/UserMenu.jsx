import React from "react";
import { RiUserSettingsLine, RiLockPasswordLine, RiSettings3Line, RiLogoutBoxRLine } from "react-icons/ri";

const UserMenu = ({ activeMenu, toggleMenu }) => {
  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 p-2 bg-background-light dark:bg-background-dark rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        onClick={() => toggleMenu("user")}
      >
        <img
          src="https://randomuser.me/api/portraits/men/45.jpg"
          alt="Usuario"
          className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700"
        />
        <span className="text-lg font-medium hidden sm:block">Juan Pérez</span>
      </button>

      {activeMenu === "user" && (
        <div className="absolute z-50 right-0 mt-2 w-56 bg-background-light dark:bg-background-dark shadow-md rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <ul className="text-sm">
            <li className="flex items-center gap-2 p-3 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer">
              <RiUserSettingsLine size={20} className="text-primary" />
              <span>Ver Perfil</span>
            </li>
            <li className="flex items-center gap-2 p-3 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer">
              <RiLockPasswordLine size={20} className="text-primary" />
              <span>Cambiar Contraseña</span>
            </li>
            <li className="flex items-center gap-2 p-3 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer">
              <RiSettings3Line size={20} className="text-primary" />
              <span>Configuraciones</span>
            </li>
            <li className="flex items-center gap-2 p-3 hover:bg-red-500 hover:text-white rounded cursor-pointer">
              <RiLogoutBoxRLine size={20} />
              <span>Cerrar Sesión</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
