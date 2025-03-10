import React from "react";
import SidebarItem from "./SidebarItem";
import {
  RiArrowLeftRightLine,
  RiShoppingBagLine,
  RiLoopLeftLine,
  RiRefund2Line,
  RiMoneyDollarCircleLine,
  RiPriceTag3Line,
  RiAddCircleLine,
  RiFileList3Line,
  RiSortDesc,
  RiBox3Line,
  RiHome6Line,
  RiBarcodeBoxLine,
  RiSettings3Line,
  RiFileTextLine,
  RiRecycleLine,
  RiFileDownloadLine,
  RiDeleteBin6Line,
  RiBarChartBoxLine,
  RiListUnordered,
  RiHistoryLine,
  RiFileWarningLine,
  RiFileCopy2Line,
  RiQuestionLine,
  RiBookOpenLine,
  RiErrorWarningLine
} from "react-icons/ri"; // Importa todos los íconos
import useSidebarStore from "../../../store/sidebarStore";

const iconMap = {
  RiArrowLeftRightLine,
  RiShoppingBagLine,
  RiLoopLeftLine,
  RiRefund2Line,
  RiMoneyDollarCircleLine,
  RiPriceTag3Line,
  RiAddCircleLine,
  RiFileList3Line,
  RiSortDesc,
  RiBox3Line,
  RiHome6Line,
  RiBarcodeBoxLine,
  RiSettings3Line,
  RiFileTextLine,
  RiRecycleLine,
  RiFileDownloadLine,
  RiDeleteBin6Line,
  RiBarChartBoxLine,
  RiListUnordered,
  RiHistoryLine,
  RiFileWarningLine,
  RiFileCopy2Line,
  RiQuestionLine,
  RiBookOpenLine,
  RiErrorWarningLine,
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
