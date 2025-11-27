import React, { useState } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import RolesTab from "./RolesTab";
import PermissionsTab from "./PermissionsTab";
import UserRolesTab from "./UserRolesTab";
import AuditTab from "./AuditTab";
import permissionsData from "./data.json";

const Permissions = () => {
  const [activeTab, setActiveTab] = useState("roles");

  const tabs = [
    { id: "roles", label: "Roles", icon: "shield" },
    { id: "permissions", label: "Permisos", icon: "key" },
    { id: "user-roles", label: "Usuarios-Roles", icon: "users" },
    { id: "audit", label: "Auditoría", icon: "history" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "roles":
        return <RolesTab data={permissionsData} />;
      case "permissions":
        return <PermissionsTab data={permissionsData} />;
      case "user-roles":
        return <UserRolesTab data={permissionsData} />;
      case "audit":
        return <AuditTab data={permissionsData} />;
      default:
        return <RolesTab data={permissionsData} />;
    }
  };

  return (
    <div className="min-h-screen p-8 -mt-10">
      <div className="max-w-[90%] mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {/* Header */}
        <div className="mb-8 pb-6 border-b-2 border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-2">
            <Icon name="shield" className="text-blue-600 text-3xl" />
            Gestión de Roles y Permisos
          </h1>
          <p className="text-gray-500 text-sm">
            Administra roles, permisos y asignaciones de usuarios
          </p>
        </div>

        {/* Tabs Navigation */}
        <div className="flex gap-2 mb-6 border-b-2 border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium text-sm transition-all border-b-2 -mb-0.5 ${
                activeTab === tab.id
                  ? "text-blue-600 border-blue-600"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon name={tab.icon} className="text-lg" />
                {tab.label}
              </div>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-6">{renderTabContent()}</div>
      </div>
    </div>
  );
};

export default Permissions;