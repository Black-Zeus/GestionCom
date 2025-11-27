import React from "react";
import { Icon } from "@components/ui/icon/iconManager";
import ModalManager from "@/components/ui/modal/ModalManager";

const ItemsTable = ({
  items,
  onUpdateQuantity,
  onUpdateDiscount,
  onToggleDiscountType,
  onRemoveItem,
  maxDiscountPercentage,
}) => {
  const handleRemoveClick = (item) => {
    ModalManager.confirm({
      title: "Confirmar Eliminación",
      message: `¿Está seguro que desea eliminar "${item.product_name}" del carrito?`,
      onConfirm: () => onRemoveItem(item.variant_sku),
    });
  };

  const calculateItemDiscount = (item) => {
    const itemSubtotal = item.price * item.quantity;
    if (item.discountType === "amount") {
      return Math.round(Math.min(item.discount, itemSubtotal));
    } else {
      return Math.round(itemSubtotal * (item.discount / 100));
    }
  };

  if (items.length === 0) {
    return (
      <div className="mb-8 p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="shoppingCart" className="text-gray-400 text-3xl" />
          </div>
          <p className="text-gray-600 font-medium mb-2">
            No hay productos agregados
          </p>
          <p className="text-sm text-gray-500">
            Ingrese un código de producto o use la búsqueda para comenzar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 overflow-hidden rounded-xl border-2 border-gray-200">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b-2 border-gray-200">
            <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
              Código
            </th>
            <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
              Producto
            </th>
            <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">
              Precio Unit.
            </th>
            <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">
              Cant.
            </th>
            <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">
              Descuento
            </th>
            <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">
              Desc. $
            </th>
            <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">
              Subtotal
            </th>
            <th className="px-6 py-4 text-center text-sm font-bold text-gray-900"></th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {items.map((item, index) => {
            const itemSubtotal = Math.round(item.price * item.quantity);
            const discountAmount = calculateItemDiscount(item);
            const subtotal = itemSubtotal - discountAmount;

            return (
              <tr
                key={item.variant_sku}
                className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                  index === items.length - 1 ? "border-b-0" : ""
                }`}
              >
                <td className="px-6 py-4 text-sm text-gray-900">
                  {item.variant_sku}
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {item.product_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.brand} • Stock: {item.stock}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-900 font-medium">
                  ${Math.round(item.price).toLocaleString("es-CL")}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() =>
                        onUpdateQuantity(item.variant_sku, item.quantity - 1)
                      }
                      className="w-8 h-8 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all flex items-center justify-center font-bold"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        onUpdateQuantity(
                          item.variant_sku,
                          parseInt(e.target.value) || 0
                        )
                      }
                      min="1"
                      className="w-16 text-center px-2 py-1 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      onClick={() =>
                        onUpdateQuantity(item.variant_sku, item.quantity + 1)
                      }
                      className="w-8 h-8 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <input
                      type="number"
                      value={item.discount}
                      onChange={(e) =>
                        onUpdateDiscount(
                          item.variant_sku,
                          parseFloat(e.target.value) || 0,
                          item.discountType
                        )
                      }
                      onFocus={(e) => e.target.select()}
                      min="0"
                      max={
                        item.discountType === "percent"
                          ? maxDiscountPercentage
                          : itemSubtotal
                      }
                      className="w-20 text-center px-2 py-1 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      onClick={() => onToggleDiscountType(item.variant_sku)}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 transition-all"
                      title={
                        item.discountType === "percent"
                          ? "Cambiar a monto fijo"
                          : "Cambiar a porcentaje"
                      }
                    >
                      {item.discountType === "percent" ? "%" : "$"}
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-sm font-bold text-red-600">
                  -${discountAmount.toLocaleString("es-CL")}
                </td>
                <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                  ${subtotal.toLocaleString("es-CL")}
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleRemoveClick(item)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                    title="Eliminar producto"
                  >
                    <Icon name="delete" className="text-lg" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ItemsTable;