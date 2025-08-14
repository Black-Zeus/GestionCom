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

        {/* Grid principal de contenido */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Columna izquierda - Formularios principales */}
          <div className="xl:col-span-2 space-y-8">
            {/* Información personal */}
            <PersonalInfoForm />

            {/* Cambio de contraseña */}
            <PasswordChangeForm />
          </div>

          {/* Columna derecha - Cards de información */}
          <div className="xl:col-span-1 space-y-8">
            {/* Información de cuenta */}
            <AccountInfoCard />

            {/* Roles y permisos */}
            <RolesCard />

            {/* Acceso a bodegas */}
            <WarehouseCard />
          </div>
        </div>

        {/* Footer de la página */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Información de ayuda */}
            <div className="text-center md:text-left">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                ¿Necesitas ayuda?
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Contacta al administrador del sistema para cambios en roles o
                permisos
              </p>
            </div>

            {/* Botones de acción */}
            <div className="flex space-x-3">
              <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-500">
                📞 Soporte
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500">
                📧 Contactar Admin
              </button>
            </div>
          </div>
        </div>

        {/* Información de privacidad */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Tu información personal está protegida y solo es visible para ti y
            los administradores del sistema.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
