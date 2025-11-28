import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const ProductTable = ({
  products,
  categories,
  measurementUnits,
  onEdit,
  onManageVariants,
  onViewStock,
  onToggleStatus,
  onDelete,
}) => {
  const getCategoryName = (categoryId) => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.category_name : "—";
  };

  const getUnitSymbol = (unitId) => {
    const unit = measurementUnits.find((u) => u.id === unitId);
    return unit ? unit.unit_symbol : "—";
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <Icon name="inbox" className="text-6xl text-gray-300 mb-4 block" />
        <p className="text-gray-500 text-lg mb-2">No se encontraron productos</p>
        <p className="text-gray-400 text-sm">
          Ajusta los filtros o crea un nuevo producto
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border-2 border-gray-200 mb-6">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              Código
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              Nombre
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              Categoría
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              Marca
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              Modelo
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              Unidad Base
            </th>
            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              Variantes
            </th>
            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              Estado
            </th>
            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products.map((product) => (
            <tr
              key={product.id}
              className="hover:bg-gray-50 transition-colors duration-150"
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm font-mono font-medium text-gray-900">
                  {product.product_code}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900">
                  {product.product_name}
                </div>
                {product.product_description && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                    {product.product_description}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-900">
                  {getCategoryName(product.category_id)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-900">
                  {product.brand || "—"}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-900">
                  {product.model || "—"}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm font-medium text-gray-900">
                  {getUnitSymbol(product.base_measurement_unit_id)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <div className="flex items-center justify-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      product.has_variants ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                  <span className="text-sm text-gray-900 font-medium">
                    {product.has_variants ? "Sí" : "No"}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <div className="flex items-center justify-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      product.is_active ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span className="text-sm text-gray-900 font-medium">
                    {product.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <div className="flex items-center justify-center gap-2">
                  {/* Botón Ver Variantes */}
                  {product.has_variants && (
                    <button
                      onClick={() => onManageVariants(product)}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors duration-150"
                      title="Gestionar Variantes"
                    >
                      <Icon name="list" className="text-lg" />
                    </button>
                  )}

                  {/* Botón Ver Stock */}
                  <button
                    onClick={() => onViewStock(product)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-150"
                    title="Ver Stock"
                  >
                    <Icon name="warehouse" className="text-lg" />
                  </button>

                  {/* Botón Editar */}
                  <button
                    onClick={() => onEdit(product)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-150"
                    title="Editar"
                  >
                    <Icon name="edit" className="text-lg" />
                  </button>

                  {/* Botón Cambiar Estado */}
                  <button
                    onClick={() => onToggleStatus(product)}
                    className={`p-2 rounded-lg transition-colors duration-150 ${
                      product.is_active
                        ? "text-gray-400 hover:text-orange-600 hover:bg-orange-50"
                        : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                    }`}
                    title={product.is_active ? "Desactivar" : "Activar"}
                  >
                    <Icon
                      name={product.is_active ? "ban" : "checkCircle"}
                      className="text-lg"
                    />
                  </button>

                  {/* Botón Eliminar */}
                  <button
                    onClick={() => onDelete(product)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150"
                    title="Eliminar"
                  >
                    <Icon name="delete" className="text-lg" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductTable;