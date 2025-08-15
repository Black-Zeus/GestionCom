// ====================================
// volumes/frontend/src/pages/profile/index.jsx
// Página principal del perfil de usuario - Layout Bento
// ====================================

import React from "react";

// Componentes del perfil
import ProfileHeader from "./Headers/ProfileHeader";
import PersonalInfoForm from "./Forms/PersonalInfoForm";
import PasswordChangeForm from "./Forms/PasswordChangeForm";
import AccountInfoCard from "./Cards/AccountInfoCard";
import RolesCard from "./Cards/RolesCard";
import WarehouseCard from "./Cards/WarehouseCard";

const Profile = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header principal */}
        <ProfileHeader />

        {/* Fila 1: Información Personal + Información de Cuenta */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" style={{ gridAutoRows: '1fr' }}>
          {/* Información personal - 70% */}
          <div className="lg:col-span-2 flex flex-col h-full">
            <div className="h-full flex flex-col">
              <PersonalInfoForm />
            </div>
          </div>

          {/* Información de cuenta - 30% */}
          <div className="lg:col-span-1 flex flex-col h-full">
            <div className="h-full flex flex-col">
              <AccountInfoCard />
            </div>
          </div>
        </div>

        {/* Fila 2: Cambiar Contraseña + Acceso a Bodegas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" style={{ gridAutoRows: '1fr' }}>
          {/* Cambiar contraseña - 50% */}
          <div className="flex flex-col h-full">
            <div className="h-full flex flex-col">
              <PasswordChangeForm />
            </div>
          </div>

          {/* Acceso a bodegas - 50% */}
          <div className="flex flex-col h-full">
            <div className="h-full flex flex-col">
              <WarehouseCard />
            </div>
          </div>
        </div>

        {/* Fila 3: Roles y Permisos - Ancho completo */}
        <div>
          <RolesCard />
        </div>
      </div>
    </div>
  );
};

export default Profile;