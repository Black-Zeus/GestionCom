// src/components/icons/iconManager.jsx
import React from "react";
import {
  FaInbox,
  FaUsers,
  FaPenToSquare,
  FaLayerGroup,
  FaTrash,
  FaKey,
  FaBan,
  FaCircleCheck,
  FaCircleXmark,
  FaPlus,
  FaWifi,
  FaUserShield,
  FaWarehouse,
  FaUserPlus,
  FaLocationDot,
  FaChevronLeft,
  FaChevronRight,
  FaMagnifyingGlass,
  FaXmark,
  FaEye,
  FaEyeSlash,
  FaMoneyBill,
  FaFolder,
  FaList,
  FaLock,
  FaChartLine,
  FaCircleInfo,
  FaTriangleExclamation,
  FaPrint,
} from "react-icons/fa6";

const ICON_REGISTRY = {
  // Estados vacíos / listados
  inbox: FaInbox, // fa-inbox
  usersEmpty: FaUsers, // listado sin usuarios / bodegas

  // Acciones genéricas
  plus: FaPlus, // fa-plus (acción genérica "agregar")
  add: FaPlus, // alias
  addUser: FaUserPlus, // fa-user-plus (agregar usuario)
  addUsers: FaUserPlus, // alias
  edit: FaPenToSquare, // fa-edit → pen-to-square en FA6
  users: FaUsers, // fa-users
  zones: FaLayerGroup, // fa-layer-group
  delete: FaTrash, // fa-trash
  password: FaKey, // fa-key

  // Estado / toggles
  ban: FaBan, // fa-ban (bloquear / desactivar)
  checkCircle: FaCircleCheck, // fa-check-circle
  success: FaCircleCheck, // alias para estados OK
  error: FaCircleXmark, // fa-times-circle → circle-xmark
  timesCircle: FaCircleXmark, // alias directo

  // Conectividad / seguridad / infraestructura
  wifi: FaWifi, // fa-wifi
  security: FaUserShield, // fa-user-shield
  warehouse: FaWarehouse, // fa-warehouse
  location: FaLocationDot, // reemplazo de map-marker-alt

  // Navegación / búsqueda / cierre
  chevronLeft: FaChevronLeft, // fa-chevron-left
  chevronRight: FaChevronRight, // fa-chevron-right
  search: FaMagnifyingGlass, // fa-search → magnifying-glass en FA6
  close: FaXmark, // fa-times → xmark en FA6

  // Visibilidad / campos de contraseña
  eye: FaEye,
  eyeSlash: FaEyeSlash,

  // Módulo Caja POS
  cash: FaMoneyBill, // fa-money-bill (dinero/caja)
  folder: FaFolder, // fa-folder (sesiones/archivos)
  list: FaList, // fa-list (movimientos/listados)
  lock: FaLock, // fa-lock (cerrar sesión)
  activity: FaChartLine, // fa-chart-line (actividad/operación)
  info: FaCircleInfo, // fa-circle-info (información)
  warning: FaTriangleExclamation, // fa-triangle-exclamation (advertencia)
  print: FaPrint, // fa-print (imprimir)
};

/**
 * Icon genérico centralizado.
 *
 * Uso:
 *   <Icon name="edit" className="w-4 h-4" />
 */
export const Icon = ({ name, className = "", ...rest }) => {
  const IconComponent = ICON_REGISTRY[name];

  if (!IconComponent) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[IconManager] Icon "${name}" no está registrado.`);
    }
    return null;
  }

  return <IconComponent className={className} {...rest} />;
};

export const ICONS = ICON_REGISTRY;