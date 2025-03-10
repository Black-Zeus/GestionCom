import React, { useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import {
  RiErrorWarningLine,
  RiCheckLine,
  RiInformationLine,
  RiAlertLine,
  RiCloseLine,
  RiExternalLinkLine,
} from "react-icons/ri";

const Modal = ({ isOpen, onClose, children, variant }) => {
  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    } else {
      document.removeEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const variantColors = {
    info: "border-blue-500",
    error: "border-red-500",
    warning: "border-yellow-500",
    success: "border-green-500",
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      onClick={onClose} // Cierra el modal si se hace clic afuera
    >
      <div
        className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md relative border-l-4 ${
          variant ? variantColors[variant] : "border-gray-500"
        }`}
        onClick={(e) => e.stopPropagation()} // Evita que se cierre al hacer clic dentro
      >
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          onClick={onClose}
        >
          <RiCloseLine size={24} />
        </button>
        {children}
      </div>
    </div>
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(["info", "error", "warning", "success"]),
};

const iconStyles = "w-6 h-6 mr-2";

const variantIcons = {
  info: <RiInformationLine className={iconStyles} />,
  error: <RiErrorWarningLine className={iconStyles} />,
  warning: <RiAlertLine className={iconStyles} />,
  success: <RiCheckLine className={iconStyles} />,
};

// 📌 Modal de Alerta
export const AlertModal = ({ isOpen, onClose, message, variant = "info" }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} variant={variant}>
      <div className="flex items-center">
        {variantIcons[variant]}
        <h2 className="text-lg font-bold">{variant.charAt(0).toUpperCase() + variant.slice(1)}</h2>
      </div>
      <p className="mt-2 text-gray-600 dark:text-gray-400">{message}</p>
      <div className="flex justify-end mt-4">
        <button
          className="py-2 px-4 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg mr-2 hover:bg-gray-400 dark:hover:bg-gray-600"
          onClick={onClose}
        >
          Aceptar
        </button>
      </div>
    </Modal>
  );
};

AlertModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  message: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(["info", "error", "warning", "success"]),
};

// 📌 Modal de Confirmación
export const ConfirmModal = ({ isOpen, onClose, onConfirm, message }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} variant="error">
      <div className="flex items-center">
        {variantIcons["error"]}
        <h2 className="text-lg font-bold">Confirmación</h2>
      </div>
      <p className="mt-2 text-gray-600 dark:text-gray-400">{message}</p>
      <div className="flex justify-end mt-4">
        <button
          className="py-2 px-4 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg mr-2 hover:bg-gray-400 dark:hover:bg-gray-600"
          onClick={onClose}
        >
          Cancelar
        </button>
        <button
          className="py-2 px-4 bg-red-600 dark:bg-red-700 text-white font-semibold rounded-lg hover:bg-red-700 dark:hover:bg-red-800"
          onClick={onConfirm}
        >
          Confirmar
        </button>
      </div>
    </Modal>
  );
};

ConfirmModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  message: PropTypes.string.isRequired,
};

// 📌 Modal de Multimedia
export const MediaModal = ({ isOpen, onClose, title, mediaSrc }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} variant="info">
      <h2 className="text-lg font-bold mb-4">{title}</h2>
      <img src={mediaSrc} alt="Media Preview" className="w-full rounded-lg" />
    </Modal>
  );
};

MediaModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  mediaSrc: PropTypes.string.isRequired,
};

// 📌 Modal de Enlace Externo
export const ExternalLinkModal = ({ isOpen, onClose, message, url }) => {
  const openLink = () => {
    window.open(url, "_blank");
    //onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} variant="info">
      <div className="flex items-center">
        <RiExternalLinkLine className={iconStyles} />
        <h2 className="text-lg font-bold">Enlace Externo</h2>
      </div>
      <p className="mt-2 text-gray-600 dark:text-gray-400">{message}</p>
      <div className="flex justify-end mt-4">
        <button
          className="py-2 px-4 bg-blue-600 dark:bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800"
          onClick={openLink}
        >
          Abrir Enlace
        </button>
      </div>
    </Modal>
  );
};

ExternalLinkModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  message: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
};

// 📌 Modal de Formulario
export const FormModal = ({ isOpen, onClose, onSubmit, title, children }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} variant="info">
      <h2 className="text-lg font-bold mb-4">{title}</h2>
      <form onSubmit={onSubmit}>
        {children}
        <div className="flex justify-end mt-4">
          <button
            type="button"
            className="py-2 px-4 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg mr-2 hover:bg-gray-400 dark:hover:bg-gray-600"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="py-2 px-4 bg-blue-600 dark:bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800"
          >
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
};

FormModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export default Modal;
