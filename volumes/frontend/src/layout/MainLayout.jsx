import React from "react";
import { Outlet } from "react-router-dom";  // Importar Outlet

import Header from "../components/layout/header/Header";
import Sidebar from "../components/layout/sidebar/Sidebar";
import Footer from "../components/layout/footer/Footer";

const MainLayout = () => {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <Header />

      <div className="flex flex-1 overflow-hidden"> {/* Controlar overflow en el contenedor principal */}
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content - Solo esta sección tendrá scroll si el contenido lo requiere */}
        <div className="flex-1 p-4 overflow-y-auto max-h-screen  bg-background-light dark:bg-background-dark">
          <Outlet />  {/* Aquí se renderizarán las rutas hijas */}
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default MainLayout;
