// ====================================
// volumes/frontend/src/pages/admin/users/ChangePasswordModal.jsx
// Modal de cambio de contraseña usando ModalManager
// ====================================

import React, { useState, useEffect } from "react";
import ModalManager from "@/components/ui/modal/ModalManager";
import PasswordFormContent from "./PasswordFormContent";

// =======================
// Componente Principal
// =======================
const ChangePasswordModal = ({ isOpen, onClose, onSave, user }) => {
  const [modalId, setModalId] = useState(null);

  // Crear modal cuando se abre
  useEffect(() => {
    if (isOpen && !modalId) {
      const id = ModalManager.custom({
        title: `Cambiar Contraseña: ${user?.username || "Usuario"}`,
        content: (
          <PasswordFormContent user={user} onClose={onClose} onSave={onSave} />
        ),
        size: "medium",
        showCloseButton: true,
        onClose: onClose,
        footer: null,
      });
      setModalId(id);
    } else if (!isOpen && modalId) {
      ModalManager.close(modalId);
      setModalId(null);
    }
  }, [isOpen, user, onClose, onSave, modalId]);

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

export default ChangePasswordModal;
