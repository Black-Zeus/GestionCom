import React from "react";
import { RiSunLine, RiMoonLine } from "react-icons/ri";
import useSidebarStore from "../../../store/sidebarStore";

const SidebarThemeToggle = () => {
  const { darkMode, toggleDarkMode } = useSidebarStore();

  return (
    <button
      className="w-12 h-12 bg-background-dark rounded-full shadow-deep transition-all duration-300 flex items-center justify-center"
      onClick={toggleDarkMode}
    >
      {darkMode ? (
        <RiSunLine size={24} className="text-warning-dark" />
      ) : (
        <RiMoonLine size={24} className="text-warning-dark" />
      )}
    </button>
  );
};

export default SidebarThemeToggle;
