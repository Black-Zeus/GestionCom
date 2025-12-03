// src/components/icons/iconManager.jsx
import React from "react";
import {
  // Estados vacíos / listados
  FaInbox,
  FaUsers,

  // Acciones genéricas
  FaPlus,
  FaUserPlus,
  FaPenToSquare,
  FaTrash,
  FaKey,
  FaFloppyDisk,
  FaFilter,
  FaLayerGroup,

  // Estado / toggles
  FaBan,
  FaCircleCheck,
  FaCircleXmark,
  FaCheck,
  FaXmark,

  // Conectividad / seguridad / infraestructura
  FaWifi,
  FaUserShield,
  FaWarehouse,
  FaLocationDot,
  FaShieldHalved,

  // Navegación / búsqueda / cierre
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaChevronUp,
  FaMagnifyingGlass,
  FaAngleUp,
  FaAngleDown,
  FaAnglesUp,
  FaAnglesDown,
  FaArrowRotateLeft,
  FaArrowRotateRight,

  // Visibilidad / campos de contraseña
  FaEye,
  FaEyeSlash,

  // Financiero / Dinero
  FaMoneyBill,
  FaCreditCard,
  FaDollarSign,

  // Documentos / Archivos
  FaFolder,
  FaRegFileLines,
  FaPrint,
  FaReceipt,

  // Gráficos / Estadísticas
  FaChartLine,
  FaChartSimple,

  // Información / Alertas
  FaCircleInfo,
  FaTriangleExclamation,

  // Sistema / Seguridad
  FaList,
  FaLock,
  FaClockRotateLeft,

  // Comercio / Ventas
  FaCartShopping,
  FaPerson,
  FaBuilding,
  FaTag,
  FaTags,
} from "react-icons/fa6";

const ICON_REGISTRY = {
  // ====================================
  // ESTADOS VACÍOS / LISTADOS
  // ====================================
  inbox: FaInbox,
  usersEmpty: FaUsers,

  // ====================================
  // ACCIONES GENÉRICAS
  // ====================================
  plus: FaPlus,
  add: FaPlus,
  addUser: FaUserPlus,
  addUsers: FaUserPlus,
  edit: FaPenToSquare,
  delete: FaTrash,
  password: FaKey,
  key: FaKey,
  save: FaFloppyDisk,
  filter: FaFilter,
  zones: FaLayerGroup,
  return: FaArrowRotateLeft,

  // ====================================
  // ESTADO / TOGGLES
  // ====================================
  ban: FaBan,
  checkCircle: FaCircleCheck,
  success: FaCircleCheck,
  error: FaCircleXmark,
  timesCircle: FaCircleXmark,
  check: FaCheck,
  cancel: FaXmark,

  // ====================================
  // CONECTIVIDAD / SEGURIDAD / INFRAESTRUCTURA
  // ====================================
  wifi: FaWifi,
  security: FaUserShield,
  warehouse: FaWarehouse,
  location: FaLocationDot,
  shield: FaShieldHalved,

  // ====================================
  // NAVEGACIÓN / BÚSQUEDA / CIERRE
  // ====================================
  chevronLeft: FaChevronLeft,
  chevronRight: FaChevronRight,
  chevronDown: FaChevronDown,
  "chevron-up": FaChevronUp,
  search: FaMagnifyingGlass,
  close: FaXmark,
  expandLess: FaAngleUp,
  expandMore: FaAngleDown,
  unfoldLess: FaAnglesUp,
  unfoldMore: FaAnglesDown,
  refresh: FaArrowRotateRight,

  // ====================================
  // VISIBILIDAD / CAMPOS DE CONTRASEÑA
  // ====================================
  eye: FaEye,
  eyeSlash: FaEyeSlash,

  // ====================================
  // FINANCIERO / DINERO
  // ====================================
  cash: FaMoneyBill,
  money: FaMoneyBill,
  dollar: FaDollarSign,
  payments: FaCreditCard,
  "credit-card": FaCreditCard,

  // ====================================
  // DOCUMENTOS / ARCHIVOS
  // ====================================
  folder: FaFolder,
  document: FaRegFileLines,
  print: FaPrint,
  receipt: FaReceipt,

  // ====================================
  // GRÁFICOS / ESTADÍSTICAS
  // ====================================
  chart: FaChartSimple,
  activity: FaChartLine,

  // ====================================
  // INFORMACIÓN / ALERTAS
  // ====================================
  info: FaCircleInfo,
  warning: FaTriangleExclamation,

  // ====================================
  // SISTEMA / SEGURIDAD
  // ====================================
  list: FaList,
  lock: FaLock,
  history: FaClockRotateLeft,

  // ====================================
  // COMERCIO / VENTAS / CLIENTES
  // ====================================
  shoppingCart: FaCartShopping,
  person: FaPerson,
  business: FaBuilding,
  users: FaUsers,
  tag: FaTag,
  discount: FaTags,
};

/**
 * Icon genérico centralizado.
 *
 * Uso:
 *   <Icon name="edit" className="w-4 h-4" />
 *   <Icon name="users" className="text-2xl text-blue-600" />
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

export default Icon;
