import React from "react";
import SidebarItem from "./SidebarItem";
import {
  RiArrowUpDownLine,
  RiAddBoxLine,
  RiBuildingLine,
  RiPriceTag3Line,
  RiExchangeLine,
  RiFileList2Line, 
  RiArrowLeftRightLine,
  RiRecycleLine,
  RiFileAddLine,
  RiIndeterminateCircleLine,
  RiFileChart2Line,
  RiFileSearchLine,
  RiFileReduceLine,
  RiFileCopyLine, 
  RiErrorWarningLine,
  RiUserCommunityFill,
  RiVerifiedBadgeFill
} from "react-icons/ri"; // Importa todos los íconos
import useSidebarStore from "../../../store/sidebarStore";

const iconMap = {
  RiArrowUpDownLine,
  RiAddBoxLine,
  RiBuildingLine,
  RiPriceTag3Line,
  RiExchangeLine,
  RiFileList2Line, 
  RiArrowLeftRightLine,
  RiRecycleLine,
  RiFileAddLine,
  RiIndeterminateCircleLine,
  RiFileChart2Line,
  RiFileSearchLine,
  RiFileReduceLine,
  RiFileCopyLine, 
  RiUserCommunityFill,
  RiVerifiedBadgeFill
};

const resolveIcon = (iconName) => {
  return iconMap[iconName] || RiErrorWarningLine;
};

const SidebarMenu = () => {
  const { expandedMenu, toggleSubMenu, menuItems } = useSidebarStore();

  return (
    <ul className="space-y-4 p-4">
      {menuItems.map((item) => {
        const IconComponent = resolveIcon(item.icon); // Resuelve el ícono
        return (
          <SidebarItem
            key={item.id}
            icon={<IconComponent size={24} />}
            label={item.label}
            path={item.path}
            hasSubmenu={item.submenu?.length > 0}
            isExpanded={expandedMenu === item.id}
            onToggle={() => toggleSubMenu(item.id)}
          >
            {/* Renderizar submenús si existen */}
            {item.submenu &&
              item.submenu.map((subitem) => {
                const SubIconComponent = resolveIcon(subitem.icon); // Resuelve el ícono del submenú
                return (
                  <SidebarItem
                    key={subitem.id}
                    icon={<SubIconComponent size={20} />}
                    label={subitem.label}
                    path={subitem.path}
                  />
                );
              })}
          </SidebarItem>
        );
      })}
    </ul>
  );
};

export default SidebarMenu;
