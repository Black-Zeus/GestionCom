import React, { useState } from "react";
import { Icon } from "@components/ui/icon/iconManager";

const AttributesModal = ({
  attributeGroups: initialGroups,
  attributes: initialAttributes,
  attributeValues: initialValues,
  onSave,
  onClose,
}) => {
  const [groups, setGroups] = useState(initialGroups || []);
  const [attributes, setAttributes] = useState(initialAttributes || []);
  const [values, setValues] = useState(initialValues || []);
  const [activeTab, setActiveTab] = useState("groups"); // groups, attributes, values

  // Estado para formularios
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({
    group_code: "",
    group_name: "",
    group_description: "",
    sort_order: 0,
    is_active: true,
  });

  const [showAttributeForm, setShowAttributeForm] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState(null);
  const [attributeForm, setAttributeForm] = useState({
    attribute_group_id: "",
    attribute_code: "",
    attribute_name: "",
    attribute_type: "TEXT",
    is_required: false,
    affects_sku: false,
    sort_order: 0,
    is_active: true,
  });

  // Handlers para Grupos
  const handleAddGroup = () => {
    setEditingGroup(null);
    setGroupForm({
      group_code: "",
      group_name: "",
      group_description: "",
      sort_order: 0,
      is_active: true,
    });
    setShowGroupForm(true);
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setGroupForm({
      group_code: group.group_code,
      group_name: group.group_name,
      group_description: group.group_description || "",
      sort_order: group.sort_order || 0,
      is_active: group.is_active,
    });
    setShowGroupForm(true);
  };

  const handleSaveGroup = () => {
    if (!groupForm.group_code.trim() || !groupForm.group_name.trim()) {
      alert("Código y nombre son obligatorios");
      return;
    }

    if (editingGroup) {
      setGroups(
        groups.map((g) =>
          g.id === editingGroup.id
            ? { ...g, ...groupForm, updated_at: new Date().toISOString() }
            : g
        )
      );
    } else {
      const newGroup = {
        id: Math.max(...groups.map((g) => g.id), 0) + 1,
        ...groupForm,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setGroups([...groups, newGroup]);
    }

    setShowGroupForm(false);
    setEditingGroup(null);
  };

  const handleDeleteGroup = (groupId) => {
    if (confirm("¿Eliminar este grupo? Los atributos asociados quedarán sin grupo.")) {
      setGroups(groups.filter((g) => g.id !== groupId));
      // Actualizar atributos que pertenecían a este grupo
      setAttributes(
        attributes.map((a) =>
          a.attribute_group_id === groupId
            ? { ...a, attribute_group_id: null }
            : a
        )
      );
    }
  };

  // Handlers para Atributos
  const handleAddAttribute = () => {
    setEditingAttribute(null);
    setAttributeForm({
      attribute_group_id: "",
      attribute_code: "",
      attribute_name: "",
      attribute_type: "TEXT",
      is_required: false,
      affects_sku: false,
      sort_order: 0,
      is_active: true,
    });
    setShowAttributeForm(true);
  };

  const handleEditAttribute = (attribute) => {
    setEditingAttribute(attribute);
    setAttributeForm({
      attribute_group_id: attribute.attribute_group_id || "",
      attribute_code: attribute.attribute_code,
      attribute_name: attribute.attribute_name,
      attribute_type: attribute.attribute_type,
      is_required: attribute.is_required,
      affects_sku: attribute.affects_sku,
      sort_order: attribute.sort_order || 0,
      is_active: attribute.is_active,
    });
    setShowAttributeForm(true);
  };

  const handleSaveAttribute = () => {
    if (!attributeForm.attribute_code.trim() || !attributeForm.attribute_name.trim()) {
      alert("Código y nombre son obligatorios");
      return;
    }

    if (editingAttribute) {
      setAttributes(
        attributes.map((a) =>
          a.id === editingAttribute.id
            ? { ...a, ...attributeForm, updated_at: new Date().toISOString() }
            : a
        )
      );
    } else {
      const newAttribute = {
        id: Math.max(...attributes.map((a) => a.id), 0) + 1,
        ...attributeForm,
        attribute_group_id: attributeForm.attribute_group_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setAttributes([...attributes, newAttribute]);
    }

    setShowAttributeForm(false);
    setEditingAttribute(null);
  };

  const handleDeleteAttribute = (attributeId) => {
    if (confirm("¿Eliminar este atributo? Se eliminarán también sus valores.")) {
      setAttributes(attributes.filter((a) => a.id !== attributeId));
      setValues(values.filter((v) => v.attribute_id !== attributeId));
    }
  };

  const handleSaveAll = () => {
    onSave({ groups, attributes, values });
  };

  const getGroupName = (groupId) => {
    const group = groups.find((g) => g.id === groupId);
    return group ? group.group_name : "Sin grupo";
  };

  return (
    <div className="p-6">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b-2 border-gray-200">
        <button
          onClick={() => setActiveTab("groups")}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === "groups"
              ? "text-blue-600 border-b-2 border-blue-600 -mb-0.5"
              : "text-gray-600 hover:text-blue-600"
          }`}
        >
          Grupos de Atributos
        </button>
        <button
          onClick={() => setActiveTab("attributes")}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === "attributes"
              ? "text-blue-600 border-b-2 border-blue-600 -mb-0.5"
              : "text-gray-600 hover:text-blue-600"
          }`}
        >
          Atributos
        </button>
      </div>

      {/* Tab: Grupos */}
      {activeTab === "groups" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Grupos de Atributos
            </h3>
            {!showGroupForm && (
              <button
                onClick={handleAddGroup}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <Icon name="plus" className="text-sm" />
                Agregar Grupo
              </button>
            )}
          </div>

          {showGroupForm && (
            <div className="bg-blue-50 rounded-lg p-6 mb-6 border-2 border-blue-200">
              <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">
                {editingGroup ? "Editar Grupo" : "Nuevo Grupo"}
              </h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código *
                  </label>
                  <input
                    type="text"
                    value={groupForm.group_code}
                    onChange={(e) =>
                      setGroupForm({ ...groupForm, group_code: e.target.value })
                    }
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                    placeholder="Ej: SIZE"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={groupForm.group_name}
                    onChange={(e) =>
                      setGroupForm({ ...groupForm, group_name: e.target.value })
                    }
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                    placeholder="Ej: Tallas"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={groupForm.group_description}
                    onChange={(e) =>
                      setGroupForm({
                        ...groupForm,
                        group_description: e.target.value,
                      })
                    }
                    rows="2"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Orden
                  </label>
                  <input
                    type="number"
                    value={groupForm.sort_order}
                    onChange={(e) =>
                      setGroupForm({
                        ...groupForm,
                        sort_order: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={groupForm.is_active}
                      onChange={(e) =>
                        setGroupForm({ ...groupForm, is_active: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Activo</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowGroupForm(false)}
                  className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveGroup}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Icon name="save" className="text-sm" />
                  {editingGroup ? "Actualizar" : "Agregar"}
                </button>
              </div>
            </div>
          )}

          {groups.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Icon name="folder" className="text-4xl mb-4 block" />
              <p>No hay grupos configurados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-mono font-semibold text-gray-900">
                          {group.group_code}
                        </span>
                        {group.is_active ? (
                          <span className="text-xs text-green-600 font-medium">
                            Activo
                          </span>
                        ) : (
                          <span className="text-xs text-red-600 font-medium">
                            Inactivo
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {group.group_name}
                      </h4>
                      {group.group_description && (
                        <p className="text-xs text-gray-500 mt-1">
                          {group.group_description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditGroup(group)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Icon name="edit" className="text-lg" />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Icon name="delete" className="text-lg" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Atributos */}
      {activeTab === "attributes" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Atributos</h3>
            {!showAttributeForm && (
              <button
                onClick={handleAddAttribute}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <Icon name="plus" className="text-sm" />
                Agregar Atributo
              </button>
            )}
          </div>

          {showAttributeForm && (
            <div className="bg-blue-50 rounded-lg p-6 mb-6 border-2 border-blue-200">
              <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">
                {editingAttribute ? "Editar Atributo" : "Nuevo Atributo"}
              </h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código *
                  </label>
                  <input
                    type="text"
                    value={attributeForm.attribute_code}
                    onChange={(e) =>
                      setAttributeForm({
                        ...attributeForm,
                        attribute_code: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                    placeholder="Ej: COLOR"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={attributeForm.attribute_name}
                    onChange={(e) =>
                      setAttributeForm({
                        ...attributeForm,
                        attribute_name: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                    placeholder="Ej: Color"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grupo
                  </label>
                  <select
                    value={attributeForm.attribute_group_id}
                    onChange={(e) =>
                      setAttributeForm({
                        ...attributeForm,
                        attribute_group_id: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                  >
                    <option value="">Sin grupo</option>
                    {groups
                      .filter((g) => g.is_active)
                      .map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.group_name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo
                  </label>
                  <select
                    value={attributeForm.attribute_type}
                    onChange={(e) =>
                      setAttributeForm({
                        ...attributeForm,
                        attribute_type: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                  >
                    <option value="TEXT">Texto</option>
                    <option value="NUMBER">Número</option>
                    <option value="BOOLEAN">Booleano</option>
                    <option value="SELECT">Selección</option>
                    <option value="MULTISELECT">Selección Múltiple</option>
                  </select>
                </div>
                <div className="col-span-2 flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attributeForm.is_required}
                      onChange={(e) =>
                        setAttributeForm({
                          ...attributeForm,
                          is_required: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Requerido</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attributeForm.affects_sku}
                      onChange={(e) =>
                        setAttributeForm({
                          ...attributeForm,
                          affects_sku: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Afecta SKU</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attributeForm.is_active}
                      onChange={(e) =>
                        setAttributeForm({
                          ...attributeForm,
                          is_active: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Activo</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAttributeForm(false)}
                  className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveAttribute}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Icon name="save" className="text-sm" />
                  {editingAttribute ? "Actualizar" : "Agregar"}
                </button>
              </div>
            </div>
          )}

          {attributes.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Icon name="list" className="text-4xl mb-4 block" />
              <p>No hay atributos configurados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {attributes.map((attribute) => (
                <div
                  key={attribute.id}
                  className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-mono font-semibold text-gray-900">
                          {attribute.attribute_code}
                        </span>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                          {attribute.attribute_type}
                        </span>
                        {attribute.is_active ? (
                          <span className="text-xs text-green-600 font-medium">
                            Activo
                          </span>
                        ) : (
                          <span className="text-xs text-red-600 font-medium">
                            Inactivo
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {attribute.attribute_name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Grupo: {getGroupName(attribute.attribute_group_id)}
                        {attribute.is_required && " • Requerido"}
                        {attribute.affects_sku && " • Afecta SKU"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditAttribute(attribute)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Icon name="edit" className="text-lg" />
                      </button>
                      <button
                        onClick={() => handleDeleteAttribute(attribute.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Icon name="delete" className="text-lg" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-6 mt-6 border-t-2 border-gray-200">
        <button
          onClick={onClose}
          className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all font-medium"
        >
          Cancelar
        </button>
        <button
          onClick={handleSaveAll}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium flex items-center gap-2"
        >
          <Icon name="save" className="text-lg" />
          Guardar Todos los Cambios
        </button>
      </div>
    </div>
  );
};

export default AttributesModal;