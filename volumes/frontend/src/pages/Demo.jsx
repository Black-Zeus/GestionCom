import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { AlertModal, ConfirmModal, MediaModal, ExternalLinkModal } from "../components/ui/Modal/Modal";
import { FiCheck, FiAlertCircle } from "react-icons/fi";
import Button from "../components/atoms/Button";
import PageTitle from "../features/PageTitle/PageTitle";
import IconList from "../components/atoms/IconList";

const Demo = () => {
  const location = useLocation();
  const pageName = location.pathname.split("/").pop();

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertVariant, setAlertVariant] = useState("info");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [isExternalOpen, setIsExternalOpen] = useState(false);

  const handleAlertOpen = (variant) => {
    setAlertVariant(variant);
    setIsAlertOpen(true);
  };

  const handleConfirmOpen = () => {
    setIsConfirmOpen(true);
  };

  const handleMediaOpen = () => {
    setIsMediaOpen(true);
  };

  const handleExternalOpen = () => {
    setIsExternalOpen(true);
  };

  const handleClick = (text) => {
    alert(`You clicked: ${text}`);
  };

  const buttons = [
    {
      id: 1,
      component: <Button text="Primary" onClick={() => handleClick("Primary")} />,
      description: "Botón estándar con estilos predeterminados.",
    },
    {
      id: 2,
      component: (
        <Button
          text="Small Button"
          size="sm"
          onClick={() => handleClick("Small Button")}
          bgColor="bg-green-500 hover:bg-green-600"
        />
      ),
      description: "Botón pequeño con fondo verde.",
    },
    {
      id: 3,
      component: (
        <Button
          text="Large Disabled"
          size="lg"
          disabled
          bgColor="bg-red-500 hover:bg-red-600"
          icon={<FiAlertCircle />}
        />
      ),
      description: "Botón grande deshabilitado con ícono de alerta.",
    },
    {
      id: 4,
      component: (
        <Button
          text="With Icon"
          icon={<FiCheck />}
          onClick={() => handleClick("With Icon")}
          bgColor="bg-yellow-500 hover:bg-yellow-600"
          textColor="text-gray-800"
        />
      ),
      description: "Botón con ícono de check y colores personalizados.",
    },
  ];

  // Lista de iconos que quieres mostrar
  const iconList = [
    "RiArrowLeftRightLine","RiShoppingBagLine","RiLoopLeftLine","RiRefund2Line","RiMoneyDollarCircleLine","RiPriceTag3Line","RiAddCircleLine","RiFileList3Line","RiSortDesc","RiBox3Line","RiHome6Line","RiBarcodeBoxLine","RiSettings3Line","RiFileTextLine","RiRecycleLine","RiFileDownloadLine","RiDeleteBin6Line","RiBarChartBoxLine","RiListUnordered","RiHistoryLine","RiFileWarningLine","RiFileCopy2Line","RiQuestionLine","RiBookOpenLine","RiErrorWarningLine",
  ];

  return (
    <>
      <PageTitle title="Pagina de Pruebas" />
      <div className="min-h-screen p-6 bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark">
        <h1 className="text-3xl font-bold mb-6">Demo de Componentes</h1>
        <h2 className="text-xl font-semibold mb-6">Página: {pageName}</h2>

        {/* Tabla de Ejemplo */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">Tabla de Datos</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border-light dark:border-border-dark">
              <thead className="bg-gray-200 dark:bg-gray-700">
                <tr>
                  <th className="border border-border-light dark:border-border-dark px-4 py-2">ID</th>
                  <th className="border border-border-light dark:border-border-dark px-4 py-2">Nombre</th>
                  <th className="border border-border-light dark:border-border-dark px-4 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border-light dark:border-border-dark px-4 py-2">1</td>
                  <td className="border border-border-light dark:border-border-dark px-4 py-2">Ejemplo 1</td>
                  <td className="border border-border-light dark:border-border-dark px-4 py-2">Activo</td>
                </tr>
                <tr>
                  <td className="border border-border-light dark:border-border-dark px-4 py-2">2</td>
                  <td className="border border-border-light dark:border-border-dark px-4 py-2">Ejemplo 2</td>
                  <td className="border border-border-light dark:border-border-dark px-4 py-2">Inactivo</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Formulario de Ejemplo */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">Formulario</h2>
          <form>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Nombre
              </label>
              <input
                id="name"
                type="text"
                className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:outline-none"
                placeholder="Ingrese su nombre"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:outline-none"
                placeholder="Ingrese su correo electrónico"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-primary-light dark:bg-primary-dark text-white font-semibold rounded-lg shadow-md hover:bg-primary dark:hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
            >
              Enviar
            </button>
          </form>
        </section>

        {/* Imagen de Ejemplo */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">Imagen</h2>
          <img
            src="https://placehold.co/800x100/png"
            alt="Ejemplo"
            className="w-full rounded-lg shadow-md"
          />
        </section>

        {/* Texto de Ejemplo */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Texto de Ejemplo</h2>
          <p className="mb-4">
            Este es un ejemplo de un párrafo para mostrar el modo claro y oscuro.
            La funcionalidad del modo oscuro asegura que los textos sean legibles
            y agradables a la vista en ambos modos.
          </p>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam ac
            volutpat arcu, at tincidunt sapien. Integer malesuada massa in justo
            gravida fermentum.
          </p>
        </section>

        {/* Modales */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Prueba de Modales</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border-light dark:border-border-dark">
              <thead className="bg-gray-200 dark:bg-gray-700">
                <tr>
                  <th className="border border-border-light dark:border-border-dark px-4 py-2">Modal</th>
                  <th className="border border-border-light dark:border-border-dark px-4 py-2">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Alerta Info", color: "bg-blue-500", variant: "info", description: "Muestra un mensaje informativo en el modal." },
                  { label: "Alerta Error", color: "bg-red-500", variant: "error", description: "Muestra un mensaje de error en el modal." },
                  { label: "Alerta Warning", color: "bg-yellow-500", variant: "warning", description: "Muestra un mensaje de advertencia en el modal." },
                  { label: "Alerta Success", color: "bg-green-500", variant: "success", description: "Muestra un mensaje de éxito en el modal." },
                  { label: "Confirmación", color: "bg-gray-500", action: handleConfirmOpen, description: "Muestra un mensaje de confirmación con botones de 'Aceptar' y 'Cancelar'." },
                  { label: "Multimedia", color: "bg-cyan-500", action: handleMediaOpen, description: "Muestra un modal con un recurso multimedia." },
                  { label: "Enlace Externo", color: "bg-purple-500", action: handleExternalOpen, description: "Abre un modal con un enlace externo." },
                ].map(({ label, color, variant, action, description }) => (
                  <tr key={label}>
                    <td className="border border-border-light dark:border-border-dark px-4 py-2">
                      <button
                        className={`w-full py-2 px-4 ${color} text-white rounded-lg hover:bg-opacity-80`}
                        onClick={() => (action ? action() : handleAlertOpen(variant))}
                      >
                        {label}
                      </button>
                    </td>
                    <td className="border border-border-light dark:border-border-dark px-4 py-2">{description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Botones */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Button Variations</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border-light dark:border-border-dark">
              <thead>
                <tr>
                  <th className="border border-border-light dark:border-border-dark px-4 py-2">Button</th>
                  <th className="border border-border-light dark:border-border-dark px-4 py-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {buttons.map(({ id, component, description }) => (
                  <tr key={id} >
                    <td className="border border-gray-300 px-4 py-2">{component}</td>
                    <td className="border border-gray-300 px-4 py-2">{description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Modales */}
        <AlertModal
          isOpen={isAlertOpen}
          onClose={() => setIsAlertOpen(false)}
          message={`Este es un mensaje de alerta ${alertVariant}.`}
          variant={alertVariant}
        />
        <ConfirmModal
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={() => {
            setIsConfirmOpen(false);
            alert("Acción confirmada");
          }}
          message="¿Estás seguro de realizar esta acción?"
        />
        <MediaModal
          isOpen={isMediaOpen}
          onClose={() => setIsMediaOpen(false)}
          title="Vista Previa"
          mediaSrc="https://placehold.co/400x300/png"
        />
        <ExternalLinkModal
          isOpen={isExternalOpen}
          onClose={() => setIsExternalOpen(false)}
          message="Haz clic en el botón de abajo para abrir el enlace en una nueva pestaña."
          url="https://www.google.com"
        />


        {/* iconos */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Seccion Iconos</h2>
          <div className="overflow-x-auto">
            <IconList icons={iconList} />
          </div>
        </section>
      </div>
    </>
  );
};

export default Demo;
