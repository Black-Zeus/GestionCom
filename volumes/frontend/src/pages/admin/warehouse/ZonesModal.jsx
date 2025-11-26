import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";

const ZonesModal = ({ warehouse, onSave, onClose }) => {
  const [zones, setZones] = useState([]);

  useEffect(() => {
    if (warehouse && warehouse.zones) {
      setZones(warehouse.zones);
    }
  }, [warehouse]);

  const handleAddZone = () => {
    const zoneCode = prompt("Código de zona:");
    if (!zoneCode) return;

    const zoneName = prompt("Nombre de zona:");
    if (!zoneName) return;

    const newZone = {
      id: Date.now(),
      zone_code: zoneCode,
      zone_name: zoneName,
      zone_description: "",
      is_location_tracking_enabled: 0,
      is_active: 1,
    };

    setZones([...zones, newZone]);
  };

  const handleEditZone = (zoneId) => {
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return;

    const newName = prompt("Nuevo nombre:", zone.zone_name);
    if (newName) {
      setZones(
        zones.map((z) => (z.id === zoneId ? { ...z, zone_name: newName } : z))
      );
    }
  };

  const handleDeleteZone = (zoneId) => {
    if (confirm("¿Está seguro de eliminar esta zona?")) {
      setZones(zones.filter((z) => z.id !== zoneId));
    }
  };

  const handleSave = () => {
    onSave(zones);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg text-gray-900 font-semibold">
          Bodega: {warehouse?.warehouse_name}
        </h3>
        <button
          onClick={handleAddZone}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <Icon name="plus" className="text-sm" />
          Agregar Zona
        </button>
      </div>

      {zones.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Icon name="zones" className="text-4xl mb-4 block" />
          <p>No hay zonas configuradas</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 mb-6">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200 flex justify-between items-center"
            >
              <div>
                <h4 className="text-gray-900 font-semibold mb-1">
                  {zone.zone_code} - {zone.zone_name}
                </h4>
                <p className="text-gray-500 text-sm mb-2">
                  {zone.zone_description || "Sin descripción"}
                </p>
                <p className="text-xs text-gray-600">
                  {zone.is_location_tracking_enabled ? (
                    <span className="inline-flex items-center gap-1">
                      <Icon name="location" className="text-gray-700" />
                      Seguimiento activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 opacity-40">
                      <Icon name="location" className="text-gray-700" />
                      Sin seguimiento
                    </span>
                  )}
                  <span className="mx-2">|</span>
                  <span
                    className={
                      zone.is_active
                        ? "text-gray-900 font-medium"
                        : "text-red-600 font-medium"
                    }
                  >
                    {zone.is_active ? "Activa" : "Inactiva"}
                  </span>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditZone(zone.id)}
                  title="Editar"
                  className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                >
                  <Icon name="edit" />
                </button>
                <button
                  onClick={() => handleDeleteZone(zone.id)}
                  title="Eliminar"
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                >
                  <Icon name="delete" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-all"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
        >
          Guardar Cambios
        </button>
      </div>
    </div>
  );
};

export default ZonesModal;
