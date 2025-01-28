import React from "react";
import Accordion from "../components/ui/Accordion/Accordion";

const InventoryMenu = () => {
  const accordionItems = [
    {
      title: "Movimientos",
      content: (
        <>
          <p className="mb-4">
            Incluye las principales operaciones relacionadas con las ventas, cambios, devoluciones y caja chica.
          </p>
          <ul className="list-disc ml-6">
            <li>
              <strong>Ventas:</strong> Permite gestionar las ventas realizadas.
            </li>
            <li>
              <strong>Cambios:</strong> Registra modificaciones en las transacciones existentes.
            </li>
            <li>
              <strong>Devoluciones:</strong> Gestiona devoluciones de productos por parte de los clientes.
            </li>
            <li>
              <strong>Caja Chica:</strong> Gestiona los movimientos de dinero en la caja chica.
            </li>
          </ul>
        </>
      ),
    },
    {
      title: "Listas de Precio",
      content: (
        <>
          <p className="mb-4">
            Herramienta para crear y gestionar listas de precios.
          </p>
          <ul className="list-disc ml-6">
            <li>
              <strong>Crear:</strong> Permite crear una nueva lista de precios.
            </li>
            <li>
              <strong>Buscar/Listar:</strong> Permite buscar o listar las listas de precios existentes.
            </li>
          </ul>
        </>
      ),
    },
    {
      title: "Altas y Bajas",
      content: (
        <>
          <p className="mb-4">
            Sección dedicada a la gestión de entradas y salidas de inventario.
          </p>
          <ul className="list-disc ml-6">
            <li>
              <strong>Artículos:</strong> Permite dar de alta todos los artículos que se desean gestionar en el stock.
            </li>
            <li>
              <strong>Depósitos:</strong> Funcionalidad para registrar los diferentes depósitos físicos donde se almacenan los artículos.
            </li>
            <li>
              <strong>Etiquetas:</strong> Herramienta para agrupar depósitos y manejar un gran volumen de ellos, logrando un stock unificado.
            </li>
          </ul>
        </>
      ),
    },
    {
      title: "Operaciones",
      content: (
        <>
          <p className="mb-4">
            Incluye las principales operaciones que afectan al inventario.
          </p>
          <ul className="list-disc ml-6">
            <li>
              <strong>Remito de Venta:</strong> Funcionalidad para disminuir el stock de artículos vendidos a terceros, con estados como pendientes, finalizados o parciales.
            </li>
            <li>
              <strong>Movimientos:</strong> Permite transferir inventario entre depósitos.
            </li>
            <li>
              <strong>Transformación:</strong> Opción para transformar uno o más artículos en un nuevo producto dentro de una misma operación.
            </li>
            <li>
              <strong>Remitos de Compra:</strong> Incrementa el stock de artículos comprados a terceros, con estados similares a los remitos de venta.
            </li>
            <li>
              <strong>Bajas:</strong> Utilizado para disminuir el stock de artículos que han sido consumidos.
            </li>
          </ul>
        </>
      ),
    },
    {
      title: "Reportes",
      content: (
        <>
          <p className="mb-4">
            Ofrece diversas opciones para generar informes detallados.
          </p>
          <ul className="list-disc ml-6">
            <li>
              <strong>Listado:</strong> Genera un movimiento de inventario por cada operación que afecta al stock.
            </li>
            <li>
              <strong>Movimiento por Artículo:</strong> Proporciona un historial completo de un artículo mediante diversos filtros.
            </li>
            <li>
              <strong>Baja de Inventario:</strong> Reporte que, combinado con el módulo de egresos, muestra el costo asociado a las salidas de stock.
            </li>
            <li>
              <strong>Baja de Inventario por CC:</strong> Similar al anterior, pero desglosado por Centros de Costos.
            </li>
          </ul>
        </>
      ),
    },
    {
      title: "Ayuda",
      content: (
        <>
          <p className="mb-4">
            Sección destinada a la documentación y orientación sobre el sistema.
          </p>
          <ul className="list-disc ml-6">
            <li>
              <strong>Módulos:</strong> Información detallada sobre los módulos disponibles en el sistema.
            </li>
          </ul>
        </>
      ),
    },
  ];

  return (
    <div className="p-4 bg-background-light dark:bg-background-dark rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4 text-text-light dark:text-text-dark">
        Gestión de Inventario
      </h1>
      <Accordion items={accordionItems} />
    </div>
  );
};

export default InventoryMenu;
