import React from "react";
import { RiArrowLeftSLine, RiArrowRightSLine } from "react-icons/ri";
import useSidebarStore from "../../../store/sidebarStore";

const SidebarToggle = () => {
  const { isCollapsed, toggleCollapse } = useSidebarStore();

  return (
    <button
      className="w-12 h-12 bg-background-dark rounded-full shadow-deep transition-all duration-300 flex items-center justify-center"
      onClick={toggleCollapse}
    >
      {isCollapsed ? (
        <RiArrowRightSLine size={24} className="text-warning-dark" />
      ) : (
        <RiArrowLeftSLine size={24} className="text-warning-dark" />
      )}
    </button>
  );
};

export default SidebarToggle;
