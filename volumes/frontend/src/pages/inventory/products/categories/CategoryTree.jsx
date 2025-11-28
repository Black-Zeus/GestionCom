import React, { useState } from "react";
import { Icon } from "@components/ui/icon/iconManager";

const CategoryTree = ({
  categories,
  onEdit,
  onCreateSubcategory,
  onToggleStatus,
  onDelete,
}) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  const toggleNode = (categoryId) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allIds = categories.map((c) => c.id);
    setExpandedNodes(new Set(allIds));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const buildTree = (parentId = null) => {
    return categories
      .filter((cat) => cat.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((category) => ({
        ...category,
        children: buildTree(category.id),
      }));
  };

  const renderTreeNode = (node, level = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const indent = level * 24;

    return (
      <div key={node.id} className="select-none">
        {/* Nodo */}
        <div
          className="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors group"
          style={{ paddingLeft: `${indent + 12}px` }}
        >
          {/* Icono expandir/contraer */}
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
            {hasChildren ? (
              <button
                onClick={() => toggleNode(node.id)}
                className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded transition-colors"
              >
                <Icon
                  name={isExpanded ? "chevronDown" : "chevronRight"}
                  className="text-gray-500 text-sm"
                />
              </button>
            ) : (
              <div className="w-1 h-1 bg-gray-300 rounded-full" />
            )}
          </div>

          {/* Icono de carpeta */}
          <Icon
            name="folder"
            className={`text-xl flex-shrink-0 ${
              node.is_active ? "text-blue-500" : "text-gray-400"
            }`}
          />

          {/* Información de la categoría */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-medium ${
                  node.is_active ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {node.category_name}
              </span>
              <span className="text-xs text-gray-500 font-mono">
                ({node.category_code})
              </span>
              {!node.is_active && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                  Inactivo
                </span>
              )}
            </div>
            {node.category_description && (
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {node.category_description}
              </p>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onCreateSubcategory(node)}
              className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
              title="Crear Subcategoría"
            >
              <Icon name="plus" className="text-base" />
            </button>

            <button
              onClick={() => onEdit(node)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Editar"
            >
              <Icon name="edit" className="text-base" />
            </button>

            <button
              onClick={() => onToggleStatus(node)}
              className={`p-1.5 rounded transition-colors ${
                node.is_active
                  ? "text-gray-400 hover:text-orange-600 hover:bg-orange-50"
                  : "text-gray-400 hover:text-green-600 hover:bg-green-50"
              }`}
              title={node.is_active ? "Desactivar" : "Activar"}
            >
              <Icon
                name={node.is_active ? "ban" : "checkCircle"}
                className="text-base"
              />
            </button>

            <button
              onClick={() => onDelete(node)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Eliminar"
            >
              <Icon name="delete" className="text-base" />
            </button>
          </div>
        </div>

        {/* Hijos */}
        {hasChildren && isExpanded && (
          <div className="ml-3 border-l-2 border-gray-200">
            {node.children.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const tree = buildTree();

  if (categories.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <Icon name="inbox" className="text-6xl text-gray-300 mb-4 block" />
        <p className="text-gray-500 text-lg mb-2">
          No se encontraron categorías
        </p>
        <p className="text-gray-400 text-sm">
          Ajusta los filtros o crea una nueva categoría
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Vista Jerárquica
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 hover:bg-blue-50 rounded transition-colors"
          >
            Expandir Todo
          </button>
          <button
            onClick={collapseAll}
            className="text-xs text-gray-600 hover:text-gray-700 font-medium px-3 py-1.5 hover:bg-gray-100 rounded transition-colors"
          >
            Contraer Todo
          </button>
        </div>
      </div>

      {/* Árbol */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {tree.map((node) => renderTreeNode(node))}
      </div>

      {/* Info */}
      <div className="px-4 py-3 border-t-2 border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Icon name="info" className="text-blue-500" />
          <span>
            Mostrando {categories.length} categoría(s). Haz clic en las flechas
            para expandir/contraer subcategorías.
          </span>
        </div>
      </div>
    </div>
  );
};

export default CategoryTree;