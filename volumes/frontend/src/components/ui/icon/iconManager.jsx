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
  FaChevronDown,
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
  FaClockRotateLeft,
  FaShieldHalved,
  FaFloppyDisk,
  FaCartShopping,
  FaPerson,
  FaReceipt,
  FaAngleUp,
  FaAngleDown,
  FaCreditCard,
  FaAnglesUp,
  FaAnglesDown,
  FaBuilding,
} from "react-icons/fa6";

const ICON_REGISTRY = {
  // Estados vacíos / listados
  inbox: FaInbox,
  usersEmpty: FaUsers,

  // Acciones genéricas
  plus: FaPlus,
  add: FaPlus,
  addUser: FaUserPlus,
  addUsers: FaUserPlus,
  edit: FaPenToSquare,
  users: FaUsers,
  zones: FaLayerGroup,
  delete: FaTrash,
  password: FaKey,
  key: FaKey,
  save: FaFloppyDisk,

  // Estado / toggles
  ban: FaBan,
  checkCircle: FaCircleCheck,
  success: FaCircleCheck,
  error: FaCircleXmark,
  timesCircle: FaCircleXmark,

  // Conectividad / seguridad / infraestructura
  wifi: FaWifi,
  security: FaUserShield,
  warehouse: FaWarehouse,
  location: FaLocationDot,

  // Navegación / búsqueda / cierre
  chevronLeft: FaChevronLeft,
  chevronRight: FaChevronRight,
  chevronDown: FaChevronDown,
  search: FaMagnifyingGlass,
  close: FaXmark,
  expandLess: FaAngleUp,
  expandMore: FaAngleDown,

  // Visibilidad / campos de contraseña
  eye: FaEye,
  eyeSlash: FaEyeSlash,

  // Módulo Caja POS
  cash: FaMoneyBill,
  folder: FaFolder,
  list: FaList,
  lock: FaLock,
  activity: FaChartLine,
  info: FaCircleInfo,
  warning: FaTriangleExclamation,
  print: FaPrint,

  // Módulo Roles y Permisos
  shield: FaShieldHalved,
  history: FaClockRotateLeft,

  // Módulo Ventas (Sales)
  shoppingCart: FaCartShopping,
  person: FaPerson,
  receipt: FaReceipt,
  payments: FaCreditCard,
  unfoldLess: FaAnglesUp,
  unfoldMore: FaAnglesDown,
  business: FaBuilding,
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