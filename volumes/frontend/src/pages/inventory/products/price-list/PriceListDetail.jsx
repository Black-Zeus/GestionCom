import React from "react";
import { formatDate } from "@utils/formats";

const PriceListDetail = ({ priceList, group, items, priceLists }) => {
  if (!priceList) {
    return (
      <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Selecciona una lista
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Primero selecciona un grupo y luego una lista para ver sus
              precios
            </p>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600 border border-gray-200">
              Código: —
            </span>
            <span className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600 border border-gray-200">
              Moneda: —
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Grupo</span>
            <span className="text-sm font-medium text-gray-900">—</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Vigencia desde</span>
            <span className="text-sm font-medium text-gray-900">—</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Vigencia hasta</span>
            <span className="text-sm font-medium text-gray-900">Sin fecha</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Lista base</span>
            <span className="text-sm font-medium text-gray-900">N/A</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Ajuste base</span>
            <span className="text-sm font-medium text-gray-900">—</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Total ítems activos</span>
            <span className="text-sm font-medium text-gray-900">0</span>
          </div>
        </div>
      </div>
    );
  }

  const activeItems = items.filter((item) => item.is_active);
  const adjustmentText =
    priceList.base_adjustment_type && priceList.base_adjustment_value
      ? `${priceList.base_adjustment_value > 0 ? "+" : ""}${
          priceList.base_adjustment_value
        }%`
      : "—";

  const baseList = priceList.base_price_list_id
    ? priceLists.find((l) => l.id === priceList.base_price_list_id)
    : null;

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {priceList.price_list_name}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {priceList.price_list_description}
          </p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">
            Código: {priceList.price_list_code}
          </span>
          <span className="px-3 py-1 rounded-full text-xs bg-green-50 text-green-700 border border-green-200">
            Moneda: {priceList.currency}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Grupo</span>
          <span className="text-sm font-medium text-gray-900">
            {group?.group_name || "—"}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Vigencia desde</span>
          <span className="text-sm font-medium text-gray-900">
            {formatDate(priceList.valid_from)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Vigencia hasta</span>
          <span className="text-sm font-medium text-gray-900">
            {priceList.valid_to ? formatDate(priceList.valid_to) : "Sin fecha"}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Lista base</span>
          <span className="text-sm font-medium text-gray-900">
            {baseList ? baseList.price_list_name : "N/A"}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Ajuste base</span>
          <span className="text-sm font-medium text-gray-900">
            {adjustmentText}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Total ítems activos</span>
          <span className="text-sm font-medium text-gray-900">
            {activeItems.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PriceListDetail;