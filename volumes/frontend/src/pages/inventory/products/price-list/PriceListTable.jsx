import React, { useState } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import ModalManager from "@components/ui/modal/ModalManager";
import AddProductsModal from "./AddProductsModal";
import { formatCurrency, formatPercentage } from "@utils/formats";

const PriceListTable = ({
    items,
    variants,
    products,
    onUpdateItem,
    onDeleteItem,
    selectedListId,
    onAddProducts,
}) => {
    const [editingCell, setEditingCell] = useState(null);
    const [editValue, setEditValue] = useState("");

    const getVariant = (variantId) => {
        return variants.find((v) => v.id === variantId);
    };

    const getProduct = (productId) => {
        return products.find((p) => p.id === productId);
    };

    const handleCellClick = (itemId, field, currentValue) => {
        setEditingCell({ itemId, field });
        setEditValue(currentValue.toString());
    };

    const handleCellBlur = (item) => {
        if (editingCell) {
            const newValue = parseFloat(editValue) || 0;
            const { field } = editingCell;

            // Recalcular según el campo editado
            let updates = {};

            if (field === "base_price") {
                const finalPrice = newValue * (1 - item.discount_percentage / 100);
                const margin =
                    item.cost_price > 0
                        ? ((finalPrice - item.cost_price) / item.cost_price) * 100
                        : 0;
                updates = {
                    base_price: newValue,
                    final_price: finalPrice,
                    margin_percentage: margin,
                };
            } else if (field === "discount_percentage") {
                const finalPrice = item.base_price * (1 - newValue / 100);
                const margin =
                    item.cost_price > 0
                        ? ((finalPrice - item.cost_price) / item.cost_price) * 100
                        : 0;
                updates = {
                    discount_percentage: newValue,
                    final_price: finalPrice,
                    margin_percentage: margin,
                };
            } else if (field === "cost_price") {
                const margin =
                    newValue > 0
                        ? ((item.final_price - newValue) / newValue) * 100
                        : 0;
                updates = {
                    cost_price: newValue,
                    margin_percentage: margin,
                };
            }

            onUpdateItem(item.id, updates);
            setEditingCell(null);
            setEditValue("");
        }
    };

    const handleKeyDown = (e, item) => {
        if (e.key === "Enter") {
            handleCellBlur(item);
        } else if (e.key === "Escape") {
            setEditingCell(null);
            setEditValue("");
        }
    };

    const handleDelete = (item) => {
        ModalManager.confirm({
            title: "Lista de Precios",
            message: "¿Estás seguro de eliminar est producto de la lista de Precio? Esta acción no se puede deshacer.",
            confirmText: "Limpiar",
            cancelText: "Cancelar",
            onConfirm: () => {
                onDeleteItem(item.id);
                ModalManager.success({
                    title: "Lista de Precios",
                    message: "Producto removido de la Lista.",
                });
            },
        });
    };

    const handleAddProducts = () => {
        ModalManager.custom({
            title: "Agregar productos a la lista",
            size: "xlarge",
            content: (
                <AddProductsModal
                    variants={variants}
                    products={products}
                    existingItems={items}
                    onSave={(newProducts) => {
                        onAddProducts(newProducts);
                        ModalManager.closeAll();
                        ModalManager.success("Productos agregados correctamente");
                    }}
                    onClose={() => ModalManager.closeAll()}
                />
            ),
        });
    };

    const renderEditableCell = (item, field, value, isNumeric = false) => {
        const isEditing =
            editingCell?.itemId === item.id && editingCell?.field === field;

        if (isEditing) {
            return (
                <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleCellBlur(item)}
                    onKeyDown={(e) => handleKeyDown(e, item)}
                    autoFocus
                    min="0"
                    step={field === "discount_percentage" ? "0.01" : "1"}
                    className="w-full px-2 py-1 border-2 border-blue-500 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
            );
        }

        return (
            <div
                onClick={() => handleCellClick(item.id, field, value)}
                className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors group relative"
                title="Click para editar"
            >
                <span className={isNumeric ? "text-right block" : ""}>
                    {isNumeric ? formatCurrency(value) : value}
                </span>
                <Icon
                    name="edit"
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                />
            </div>
        );
    };

    if (!selectedListId) {
        return (
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        Detalle de precios por variante
                    </h3>
                    <span className="text-xs text-gray-500">Sin datos</span>
                </div>

                <div className="overflow-x-auto rounded-lg border-2 border-gray-200">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                    SKU Variante
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                    Producto / Variante
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                    Unidad
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                    Precio base
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                    % desc.
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                    Precio venta
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                    Costo
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                    Margen %
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            <tr>
                                <td
                                    colSpan="9"
                                    className="px-6 py-16 text-center text-gray-400"
                                >
                                    Selecciona una lista de precios para ver sus items
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        Detalle de precios por variante
                    </h3>
                    <button
                        onClick={handleAddProducts}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    >
                        <Icon name="plus" className="text-lg" />
                        Agregar Productos
                    </button>
                </div>

                <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <Icon name="inbox" className="text-6xl text-gray-300 mb-4 block" />
                    <p className="text-gray-500 text-lg mb-2">
                        No hay productos en esta lista
                    </p>
                    <p className="text-gray-400 text-sm">
                        Agrega productos para comenzar
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Detalle de precios por variante
                </h3>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500">
                        {items.length} variante{items.length !== 1 ? "s" : ""}
                    </span>
                    <button
                        onClick={handleAddProducts}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    >
                        <Icon name="plus" className="text-lg" />
                        Agregar Productos
                    </button>
                </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
                <div className="flex items-center gap-2 text-xs text-blue-700">
                    <Icon name="info" className="text-sm" />
                    <span>
                        Click en el precio, descuento o costo para editarlo directamente
                    </span>
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border-2 border-gray-200">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                SKU Variante
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                Producto / Variante
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                Unidad
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                Precio base
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                % desc.
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                Precio venta
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                Costo
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                Margen %
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {items.map((item) => {
                            const variant = getVariant(item.product_variant_id);
                            const product = variant ? getProduct(variant.product_id) : null;

                            return (
                                <tr
                                    key={item.id}
                                    className="hover:bg-gray-50 transition-colors duration-150"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-mono font-medium text-gray-900">
                                            {variant?.variant_sku || "N/A"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">
                                            {product?.product_name || "N/A"}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {variant?.variant_name || "N/A"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-gray-900">UN</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        {renderEditableCell(
                                            item,
                                            "base_price",
                                            item.base_price,
                                            true
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div
                                            onClick={() =>
                                                handleCellClick(
                                                    item.id,
                                                    "discount_percentage",
                                                    item.discount_percentage
                                                )
                                            }
                                            className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors group relative"
                                            title="Click para editar"
                                        >
                                            <span className="text-sm text-gray-900">
                                                {item.discount_percentage}%
                                            </span>
                                            <Icon
                                                name="edit"
                                                className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <span className="text-sm font-semibold text-gray-900">
                                            {formatCurrency(item.final_price)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        {renderEditableCell(
                                            item,
                                            "cost_price",
                                            item.cost_price,
                                            true
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <span className="text-sm text-gray-900">
                                            {formatPercentage(item.margin_percentage / 100)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <button
                                            onClick={() => handleDelete(item)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150"
                                            title="Eliminar"
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
        </div>
    );
};

export default PriceListTable;