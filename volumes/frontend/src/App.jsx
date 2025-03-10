import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";

//Store
import useSidebarStore from "./store/sidebarStore";

// Layout y Páginas
import MainLayout from "./layout/MainLayout";
import Home from "./pages/Home";
import Demo from "./pages/Demo";
import InventoryMenu from "./pages/InventoryMenu";
import NotFound from "./components/ui/Errors/NotFound";
import Forbidden from "./components/ui/Errors/Forbidden";
import Login from "./features/Auth/Login";
import RecoverPassword from "./features/Auth/RecoverPass";
import ResetPassword from "./features/Auth/ResetPassword";
import About from "./pages/About";

const dummyMenuItems = [
  {
    id: 1,
    label: "Movimientos",
    path: "/movements",
    icon: "RiArrowLeftRightLine", // 🔄 Mejor que ExchangeLine para representar transacciones
    submenu: [
      { id: 11, label: "Ventas", path: "/movements/sales", icon: "RiShoppingBagLine" }, // 🛍 Más representativo para ventas
      { id: 12, label: "Cambios", path: "/movements/changes", icon: "RiLoopLeftLine" }, // 🔁 Más claro para cambios
      { id: 13, label: "Devoluciones", path: "/movements/returns", icon: "RiRefund2Line" }, // 🔄 Representa reembolsos/devoluciones
      { id: 14, label: "Caja Chica", path: "/movements/petty-cash", icon: "RiMoneyDollarCircleLine" }, // 💰 Más claro que WalletLine
    ],
  },
  {
    id: 2,
    label: "Listas de Precio",
    path: "/price-lists",
    icon: "RiPriceTag3Line", // 🏷️ Etiqueta de precio
    submenu: [
      { id: 21, label: "Crear", path: "/price-lists/create", icon: "RiAddCircleLine" }, // ➕ Más claro que AddBoxLine
      { id: 22, label: "Buscar/Listar", path: "/price-lists/list", icon: "RiFileList3Line" }, // 📋 Lista de archivos mejor que SearchLine
    ],
  },
  {
    id: 3,
    label: "Altas y Bajas",
    path: "/inventory/entries-exits",
    icon: "RiSortDesc", // 🔽🔼 Representa entradas y salidas
    submenu: [
      { id: 31, label: "Artículos", path: "/inventory/entries-exits/articles", icon: "RiBox3Line" }, // 📦 Más claro para productos
      { id: 32, label: "Depósitos", path: "/inventory/entries-exits/warehouses", icon: "RiHome6Line" }, // 🏢 Más intuitivo que BuildingLine
      { id: 33, label: "Etiquetas", path: "/inventory/entries-exits/tags", icon: "RiBarcodeBoxLine" }, // 🏷️ Mejor para etiquetas
    ],
  },
  {
    id: 4,
    label: "Operaciones",
    path: "/inventory/operations",
    icon: "RiSettings3Line", // ⚙️ Representa procesos operativos mejor que ToolsLine
    submenu: [
      { id: 41, label: "Remito de Venta", path: "/inventory/operations/sales-delivery", icon: "RiFileTextLine" }, // 📜 Documento mejor que FileList3Line
      { id: 42, label: "Movimientos", path: "/inventory/operations/movements", icon: "RiArrowLeftRightLine" }, // 🔄 Movimientos
      { id: 43, label: "Transformación", path: "/inventory/operations/transformation", icon: "RiRecycleLine" }, // ♻️ Representa cambios
      { id: 44, label: "Remitos de Compra", path: "/inventory/operations/purchase-delivery", icon: "RiFileDownloadLine" }, // 📩 Representa compras mejor que FileAddLine
      { id: 45, label: "Bajas", path: "/inventory/operations/downs", icon: "RiDeleteBin6Line" }, // 🗑 Representa eliminación mejor que IndeterminateCircleLine
    ],
  },
  {
    id: 5,
    label: "Reportes",
    path: "/inventory/reports",
    icon: "RiBarChartBoxLine", // 📊 Más claro que FileChartLine
    submenu: [
      { id: 51, label: "Listado", path: "/inventory/reports/list", icon: "RiListUnordered" }, // 📋 Listado de reportes
      { id: 52, label: "Movimiento por Artículo", path: "/inventory/reports/movement-by-article", icon: "RiHistoryLine" }, // 🕒 Representa historial de movimientos
      { id: 53, label: "Baja de Inventario", path: "/inventory/reports/inventory-down", icon: "RiFileWarningLine" }, // ⚠️ Baja de inventario con advertencia
      { id: 54, label: "Baja de Inventario por CC", path: "/inventory/reports/inventory-down-by-cc", icon: "RiFileCopy2Line" }, // 📄 Copia de reporte
    ],
  },
  {
    id: 6,
    label: "Ayuda",
    path: "/inventory/help",
    icon: "RiQuestionLine", // ❓ Representa ayuda o soporte
    submenu: [
      { id: 61, label: "Módulos", path: "/inventory/help/index", icon: "RiBookOpenLine" }, // 📖 Documentación mejor que UserCommunityFill
    ],
  },
];

function App() {
  const { initializeTheme } = useSidebarStore(); // Cargar tema persistente
  const { setMenuItems } = useSidebarStore();

  useEffect(() => {
    setMenuItems(dummyMenuItems);
  }, [setMenuItems]);

  useEffect(() => {
    initializeTheme(); // Aplicar modo oscuro si estaba activo
  }, []);

  return (
    <Routes>
      {/* Rutas principales con MainLayout */}
      <Route path="/" element={<MainLayout />}>
        {/* Página por defecto */}
        <Route index element={<Home />} />

        {/* Movimientos */}
        <Route path="movements" element={<Demo />} />
        <Route path="movements/sales" element={<Demo />} />
        <Route path="movements/changes" element={<Demo />} />
        <Route path="movements/returns" element={<Demo />} />
        <Route path="movements/petty-cash" element={<Demo />} />

        {/* Listas de Precio */}
        <Route path="price-lists" element={<Demo />} />
        <Route path="price-lists/create" element={<Demo />} />
        <Route path="price-lists/list" element={<Demo />} />

        {/* Altas y Bajas */}
        <Route path="inventory/entries-exits" element={<Demo />} />
        <Route path="inventory/entries-exits/articles" element={<Demo />} />
        <Route path="inventory/entries-exits/warehouses" element={<Demo />} />
        <Route path="inventory/entries-exits/tags" element={<Demo />} />

        {/* Operaciones */}
        <Route path="inventory/operations" element={<Demo />} />
        <Route path="inventory/operations/sales-delivery" element={<Demo />} />
        <Route path="inventory/operations/movements" element={<Demo />} />
        <Route path="inventory/operations/transformation" element={<Demo />} />
        <Route path="inventory/operations/purchase-delivery" element={<Demo />} />
        <Route path="inventory/operations/downs" element={<Demo />} />

        {/* Reportes */}
        <Route path="inventory/reports" element={<Demo />} />
        <Route path="inventory/reports/list" element={<Demo />} />
        <Route path="inventory/reports/movement-by-article" element={<Demo />} />
        <Route path="inventory/reports/inventory-down" element={<Demo />} />
        <Route path="inventory/reports/inventory-down-by-cc" element={<Demo />} />

        {/* Ayuda */}
        <Route path="inventory/help" element={<Demo />} />
        <Route path="inventory/help/index" element={<InventoryMenu />} />
      </Route>

      {/* Página Acerca de */}
      <Route path="/about" element={<About />} />

      {/* Página de Inicio de Sesión */}
      <Route path="/login" element={<Login />} />

      {/* Página de Recuperación de Contraseña */}
      <Route path="/recover" element={<RecoverPassword />} />

      {/* Página de Restablecimiento de Contraseña */}
      <Route path="/reset" element={<ResetPassword />} />

      {/* Página 403 - Acceso Restringido */}
      <Route path="/forbidden" element={<Forbidden />} />

      {/* Página 404 - No Encontrado */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
