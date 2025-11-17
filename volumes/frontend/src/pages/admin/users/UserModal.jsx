// ====================================
// volumes/frontend/src/pages/admin/users/UserModal.jsx
// ====================================

import React, { useEffect, useState } from "react";
import ModalManager from "@/components/ui/modal/ModalManager";
import UserForm from "./UserForm";

const UserModal = ({ isOpen, onClose, onSave, user, isEditing = false }) => {
  const [modalId, setModalId] = useState(null);

  // Crear modal cuando se abre
  useEffect(() => {
    if (isOpen && !modalId) {
      const id = ModalManager.custom({
        title: isEditing
          ? `Editar Usuario: ${user?.username || "Usuario"}`
          : "Nuevo Usuario",
        content: (
          <UserForm
            user={user}
            isEditing={isEditing}
            onClose={onClose}
            onSave={onSave}
          />
        ),
        size: "xlarge",
        showCloseButton: true,
        onClose,
        footer: null,
      });
      setModalId(id);
    } else if (!isOpen && modalId) {
      ModalManager.close(modalId);
      setModalId(null);
    }
  }, [isOpen, user, isEditing, onClose, onSave, modalId]);

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

export default UserModal;
