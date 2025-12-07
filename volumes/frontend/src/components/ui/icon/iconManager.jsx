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
  FaChartBar,

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

  // Caja / Finanzas adicionales
  FaCashRegister,
  FaMoneyBillWave,

  // Documentos específicos
  FaFileLines,

  // Flechas direccionales
  FaArrowUp,
  FaArrowDown,

  // Símbolos matemáticos
  FaMinus,
  FaEquals,

  // Movimientos / Comercio
  FaCalculator,
  FaDoorOpen,
  FaArrowsRotate,
} from "react-icons/fa6";

const ICON_REGISTRY = {
  // ====================================
  // ESTADOS VACÍOS / LISTADOS
  // ====================================
  FaInbox,
  inbox: FaInbox,
  FaUsers,
  usersEmpty: FaUsers,

  // ====================================
  // ACCIONES GENÉRICAS
  // ====================================
  FaPlus,
  plus: FaPlus,
  add: FaPlus,
  FaUserPlus,
  addUser: FaUserPlus,
  addUsers: FaUserPlus,
  FaPenToSquare,
  edit: FaPenToSquare,
  FaTrash,
  delete: FaTrash,
  FaKey,
  password: FaKey,
  key: FaKey,
  FaFloppyDisk,
  save: FaFloppyDisk,
  FaFilter,
  filter: FaFilter,
  FaLayerGroup,
  zones: FaLayerGroup,
  return: FaArrowRotateLeft,

  // ====================================
  // ESTADO / TOGGLES
  // ====================================
  FaBan,
  ban: FaBan,
  FaCircleCheck,
  checkCircle: FaCircleCheck,
  success: FaCircleCheck,
  FaCircleXmark,
  error: FaCircleXmark,
  timesCircle: FaCircleXmark,
  FaCheck,
  check: FaCheck,
  FaXmark,
  cancel: FaXmark,

  // ====================================
  // CONECTIVIDAD / SEGURIDAD / INFRAESTRUCTURA
  // ====================================
  FaWifi,
  wifi: FaWifi,
  FaUserShield,
  security: FaUserShield,
  FaWarehouse,
  warehouse: FaWarehouse,
  FaLocationDot,
  location: FaLocationDot,
  FaShieldHalved,
  shield: FaShieldHalved,

  // ====================================
  // NAVEGACIÓN / BÚSQUEDA / CIERRE
  // ====================================
  FaChevronLeft,
  chevronLeft: FaChevronLeft,
  FaChevronRight,
  chevronRight: FaChevronRight,
  FaChevronDown,
  chevronDown: FaChevronDown,
  FaChevronUp,
  "chevron-up": FaChevronUp,
  FaMagnifyingGlass,
  search: FaMagnifyingGlass,
  close: FaXmark,
  FaAngleUp,
  expandLess: FaAngleUp,
  FaAngleDown,
  expandMore: FaAngleDown,
  FaAnglesUp,
  unfoldLess: FaAnglesUp,
  FaAnglesDown,
  unfoldMore: FaAnglesDown,
  FaArrowRotateLeft,
  FaArrowRotateRight,
  refresh: FaArrowRotateRight,

  // ====================================
  // VISIBILIDAD / CAMPOS DE CONTRASEÑA
  // ====================================
  FaEye,
  eye: FaEye,
  FaEyeSlash,
  eyeSlash: FaEyeSlash,

  // ====================================
  // FINANCIERO / DINERO
  // ====================================
  FaMoneyBill,
  cash: FaMoneyBill,
  money: FaMoneyBill,
  FaDollarSign,
  dollar: FaDollarSign,
  FaCreditCard,
  payments: FaCreditCard,
  "credit-card": FaCreditCard,
  FaMoneyBillWave,
  moneyWave: FaMoneyBillWave,
  FaCashRegister,
  cashRegister: FaCashRegister,

  // ====================================
  // DOCUMENTOS / ARCHIVOS
  // ====================================
  FaFolder,
  folder: FaFolder,
  FaRegFileLines,
  document: FaRegFileLines,
  FaPrint,
  print: FaPrint,
  FaReceipt,
  receipt: FaReceipt,
  FaFileLines: FaFileLines,
  fileAlt: FaFileLines,

  // ====================================
  // GRÁFICOS / ESTADÍSTICAS
  // ====================================
  FaChartSimple,
  chart: FaChartSimple,
  FaChartLine,
  activity: FaChartLine,
  FaChartBar,
  chartBar: FaChartBar,

  // ====================================
  // INFORMACIÓN / ALERTAS
  // ====================================
  FaCircleInfo,
  info: FaCircleInfo,
  FaTriangleExclamation,
  warning: FaTriangleExclamation,

  // ====================================
  // SISTEMA / SEGURIDAD
  // ====================================
  FaList,
  list: FaList,
  FaLock,
  lock: FaLock,
  FaClockRotateLeft,
  history: FaClockRotateLeft,

  // ====================================
  // COMERCIO / VENTAS / CLIENTES
  // ====================================
  FaCartShopping,
  shoppingCart: FaCartShopping,
  FaPerson,
  person: FaPerson,
  FaBuilding,
  business: FaBuilding,
  users: FaUsers,
  FaTag,
  tag: FaTag,
  FaTags,
  discount: FaTags,

  // ====================================
  // FLECHAS DIRECCIONALES
  // ====================================
  FaArrowUp,
  arrowUp: FaArrowUp,
  FaArrowDown,
  arrowDown: FaArrowDown,

  // ====================================
  // SÍMBOLOS MATEMÁTICOS
  // ====================================
  FaMinus,
  minus: FaMinus,
  FaEquals,
  equals: FaEquals,

  // ====================================
  // MOVIMIENTOS / COMERCIO
  // ====================================
  FaShoppingCart: FaCartShopping,
  shoppingCart: FaCartShopping,
  cart: FaCartShopping,
  FaUndo: FaArrowRotateLeft,
  undo: FaArrowRotateLeft,
  refund: FaArrowRotateLeft,
  FaCalculator,
  calculator: FaCalculator,
  FaDoorOpen,
  doorOpen: FaDoorOpen,
  opening: FaDoorOpen,
  FaArrowsRotate,
  FaExchangeAlt: FaArrowsRotate,
  exchange: FaArrowsRotate,

  // ====================================
  // TIEMPOS Y CONTROLES
  // ====================================
  FaTimes: FaXmark,
  times: FaXmark,
};

/**
 * Icon genérico centralizado.
 *
 * Uso:
 *   <Icon name="edit" className="w-4 h-4" />
 *   <Icon name="FaUsers" className="text-2xl text-blue-600" />
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