import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const StockViewModal = ({
  product,
  variants,
  stock,
  warehouses,
  onClose,
}) => {
  const getVariantName = (variantId) => {
    const variant = variants.find((v) => v.id === variantId);
    return variant ? variant.variant_name : "—";
  };

  const getVariantSKU = (variantId) => {
    const variant = variants.find((v) => v.id === variantId);
    return variant ? variant.variant_sku : "—";
  };

  const getWarehouseName = (warehouseId) => {
    const warehouse = warehouses.find((w) => w.id === warehouseId);
    return warehouse ? warehouse.warehouse_name : "—";
  };

  const getStockStatus = (stockItem) => {
    if (stockItem.current_quantity === 0) {
      return { text: "Sin Stock", color: "text-red-600", bgColor: "bg-red-50" };
    }
    if (
      stockItem.minimum_stock &&
      stockItem.current_quantity <= stockItem.minimum_stock
    ) {
      return {
        text: "Stock Crítico",
        color: "text-orange-600",
        bgColor: "bg-orange-50",
      };
    }
    if (
      stockItem.minimum_stock &&
      stockItem.current_quantity <= stockItem.minimum_stock * 1.5
    ) {
      return {
        text: "Stock Bajo",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
      };
    }
    return { text: "Stock Normal", color: "text-green-600", bgColor: "bg-green-50" };
  };

  const getRotationBadge = (rotation) => {
    const badges = {
      FAST: { text: "Alta", color: "bg-green-100 text-green-700" },
      MEDIUM: { text: "Media", color: "bg-blue-100 text-blue-700" },
      SLOW: { text: "Baja", color: "bg-yellow-100 text-yellow-700" },
      NO_MOVEMENT: { text: "Sin Movimiento", color: "bg-gray-100 text-gray-700" },
    };
    return badges[rotation] || badges.NO_MOVEMENT;
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat("es-CL", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Calcular totales
  const totalCurrentStock = stock.reduce(
    (sum, s) => sum + parseFloat(s.current_quantity),
    0
  );
  const totalReservedStock = stock.reduce(
    (sum, s) => sum + parseFloat(s.reserved_quantity),
    0
  );
  const totalAvailableStock = stock.reduce(
    (sum, s) => sum + parseFloat(s.available_quantity),
    0
  );

  // Contar alertas
  const criticalStock = stock.filter((s) => {
    const status = getStockStatus(s);
    return status.text === "Stock Crítico" || status.text === "Sin Stock";
  }).length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {product.product_name}
        </h3>
        <p className="text-sm text-gray-500">
          Código: {product.product_code} • {variants.length} variante(s)
        </p>
      </div>

      {/* Resumen de stock */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-xs text-gray-600 mb-1">Stock Total</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatNumber(totalCurrentStock)}
          </p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <p className="text-xs text-gray-600 mb-1">Reservado</p>
          <p className="text-2xl font-bold text-orange-600">
            {formatNumber(totalReservedStock)}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-xs text-gray-600 mb-1">Disponible</p>
          <p className="text-2xl font-bold text-green-600">
            {formatNumber(totalAvailableStock)}
          </p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <p className="text-xs text-gray-600 mb-1">Alertas Críticas</p>
          <p className="text-2xl font-bold text-red-600">{criticalStock}</p>
        </div>
      </div>

      {/* Tabla de stock */}
      {stock.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <Icon name="warehouse" className="text-6xl text-gray-300 mb-4 block" />
          <p className="text-gray-500 text-lg mb-2">No hay stock registrado</p>
          <p className="text-gray-400 text-sm">
            Este producto no tiene stock en ninguna bodega
          </p>
        </div>
      ) : (
        <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Variante
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Bodega
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Stock Actual
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Reservado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Disponible
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Mín/Máx
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Rotación
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stock.map((stockItem) => {
                  const status = getStockStatus(stockItem);
                  const rotationBadge = getRotationBadge(
                    stockItem.rotation_category
                  );

                  return (
                    <tr
                      key={stockItem.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-900">
                          {getVariantSKU(stockItem.product_variant_id)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-900">
                          {getVariantName(stockItem.product_variant_id)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-900">
                          {getWarehouseName(stockItem.warehouse_id)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatNumber(stockItem.current_quantity)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="text-sm text-orange-600">
                          {formatNumber(stockItem.reserved_quantity)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="text-sm font-semibold text-green-600">
                          {formatNumber(stockItem.available_quantity)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className="text-xs text-gray-600">
                          {stockItem.minimum_stock
                            ? formatNumber(stockItem.minimum_stock)
                            : "—"}{" "}
                          /{" "}
                          {stockItem.maximum_stock
                            ? formatNumber(stockItem.maximum_stock)
                            : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium ${rotationBadge.color}`}
                        >
                          {rotationBadge.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium ${status.bgColor} ${status.color}`}
                        >
                          {status.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Información adicional */}
      {stock.length > 0 && (
        <div className="mt-6 bg-blue-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <Icon name="info" className="text-blue-600 text-xl" />
            <h4 className="text-sm font-semibold text-gray-900">
              Información de Stock
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Stock Actual</p>
                <p className="text-xs text-gray-600">Cantidad física en bodega</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Reservado</p>
                <p className="text-xs text-gray-600">Unidades comprometidas en pedidos</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Disponible</p>
                <p className="text-xs text-gray-600">Stock actual menos reservado</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Rotación</p>
                <p className="text-xs text-gray-600">Velocidad de movimiento del inventario</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-end pt-6 mt-6 border-t-2 border-gray-200">
        <button
          onClick={onClose}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default StockViewModal;