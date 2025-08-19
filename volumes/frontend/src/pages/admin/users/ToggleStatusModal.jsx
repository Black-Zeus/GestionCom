// ====================================
// volumes/frontend/src/pages/admin/users/ToggleStatusModal.jsx
// Modal de confirmación para activar/desactivar usuarios
// ====================================

import React, { useState, useEffect } from "react";
import ModalManager from "@/components/ui/modal/ModalManager";
import ToggleStatusContent from "./ToggleStatusContent";

// =======================
// Componente Principal
// =======================
const ToggleStatusModal = ({ isOpen, onClose, onConfirm, user }) => {
  const [modalId, setModalId] = useState(null);

  // Crear modal cuando se abre
  useEffect(() => {
    if (isOpen && !modalId) {
      const isDeactivating = user?.isActive;
      const action = isDeactivating ? "desactivar" : "activar";
      const actionTitle = isDeactivating ? "Desactivar" : "Activar";

      const id = ModalManager.custom({
        title: `${actionTitle} Usuario`,
        content: (
          <ToggleStatusContent
            user={user}
            isDeactivating={isDeactivating}
            action={action}
            onClose={onClose}
            onConfirm={onConfirm}
          />
        ),
        size: "small",
        showCloseButton: true,
        onClose: onClose,
        footer: null,
      });
      setModalId(id);
    } else if (!isOpen && modalId) {
      ModalManager.close(modalId);
      setModalId(null);
    }
  }, [isOpen, user, onClose, onConfirm, modalId]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (modalId) {
        ModalManager.close(modalId);
      }
    };
  }, [modalId]);

  return null;
};

export default ToggleStatusModal;
