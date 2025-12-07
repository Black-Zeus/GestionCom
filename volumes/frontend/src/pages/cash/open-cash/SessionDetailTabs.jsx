import React from "react";

/**
 * SessionDetailTabs
 * Sistema de tabs para el modal de detalle de sesión
 */
const SessionDetailTabs = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: "summary", label: "Resumen" },
    { id: "cash", label: "Movimientos de caja" },
    { id: "petty", label: "Caja chica" },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-gray-200 px-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === tab.id
              ? "border-teal-600 text-teal-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default SessionDetailTabs;