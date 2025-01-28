import React from "react";
import { useNavigate } from "react-router-dom";
import { RiArrowDownSLine, RiArrowRightSLine } from "react-icons/ri";
import useSidebarStore from "../../../store/sidebarStore";

const SidebarItem = ({ icon, label, path, hasSubmenu, isExpanded, onToggle, children, parentLabel }) => {
  const navigate = useNavigate();
  const { isCollapsed } = useSidebarStore();

  // Define el título dinámico
  const tooltipTitle = parentLabel
    ? `${parentLabel} >> ${label}` // Submódulo
    : label; // Módulo principal

  return (
    <li title={tooltipTitle}>
      <div
        className="flex items-center justify-between cursor-pointer hover:text-primary-dark"
        onClick={hasSubmenu ? onToggle : () => navigate(path)}
      >
        <div className="flex items-center gap-4">
          {icon}
          {!isCollapsed && <span>{label}</span>}
        </div>
        {!isCollapsed && hasSubmenu && (
          isExpanded ? <RiArrowDownSLine size={20} /> : <RiArrowRightSLine size={20} />
        )}
      </div>
      
      {/* Renderiza los submenús si están expandidos */}
      {hasSubmenu && isExpanded && (
        <ul className="pl-6 mt-2 space-y-3">
          {React.Children.map(children, (child) =>
            React.cloneElement(child, { parentLabel: label }) // Pasa el label del padre
          )}
        </ul>
      )}
    </li>
  );
};

export default SidebarItem;
