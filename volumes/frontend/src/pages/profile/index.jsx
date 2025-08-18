// ====================================
// volumes/frontend/src/pages/profile/index.jsx
// Página principal del perfil de usuario
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

        {/* Información de Cuenta - 100% ancho */}
        <AccountInfoCard />

        {/* Información Personal - 100% ancho */}
        <PersonalInfoForm />

        {/* Grid de 2 columnas para Contraseña y Bodegas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cambiar Contraseña */}
          <PasswordChangeForm />
          
          {/* Acceso a Bodegas */}
          <WarehouseCard />
        </div>

        {/* Roles y Permisos - 100% ancho */}
        <RolesCard />
      </div>
    </div>
  );
};

export default Profile;