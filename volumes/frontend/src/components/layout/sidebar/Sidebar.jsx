import React from "react";
import SidebarMenu from "./SidebarMenu";
import SidebarToggle from "./SidebarToggle";
import SidebarThemeToggle from "./SidebarThemeToggle";
import useSidebarStore from "../../../store/sidebarStore"; // Importar Zustand Store

const Sidebar = () => {
  const { isCollapsed } = useSidebarStore(); // Obtener estado de colapso

  return (
    <aside
      className={`relative top-0 left-0 h-full shadow-subtle border-r border-neutral-dark transition-all duration-300 z-40
      ${isCollapsed ? "w-20" : "w-3/4 sm:w-48 md:w-64 lg:w-72"} 
      bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark flex flex-col justify-between`}
    >
      {/* Menú */}
      <SidebarMenu />

      {/* 🔹 Botones Inferiores Dentro del Sidebar 🔹 */}
      <div
        className={`mb-4 px-4 transition-all duration-300 ${
          isCollapsed ? "flex flex-col gap-4" : "flex flex-row gap-4"
        } items-start`}
      >
        <SidebarToggle />
        <SidebarThemeToggle />
      </div>
    </aside>
  );
};

export default Sidebar;
