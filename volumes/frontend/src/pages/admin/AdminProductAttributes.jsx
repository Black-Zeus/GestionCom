import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers3, ListChecks, Pencil, RefreshCw, Tags, Trash2, XCircle } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import DataTablePagination from '@/components/common/data/DataTablePagination';
import FilterBar from '@/components/common/data/FilterBar';
import SimpleFormContent from '@/components/common/forms/SimpleFormContent';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleTabs from '@/components/common/navigation/ModuleTabs';
import StatusBadge from '@/components/common/data/StatusBadge';
import { productConfigService } from '@/services/admin/productConfigService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';

const typeLabels = { TEXT: 'Texto', NUMBER: 'Numero', BOOLEAN: 'Booleano', SELECT: 'Seleccion', MULTISELECT: 'Multiple' };
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const AdminProductAttributes = () => {
  const [groups, setGroups] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [values, setValues] = useState([]);
  const [activeTab, setActiveTab] = useState('groups');
  const [selectedAttributeId, setSelectedAttributeId] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ groupStatus: 'all', attributeGroup: 'all', attributeType: 'all', valueStatus: 'all' });
  const [page, setPage] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedAttribute = attributes.find((item) => Number(item.id) === Number(selectedAttributeId));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextGroups, nextAttributes, nextValues] = await Promise.all([
        productConfigService.listGroups({ active_only: false }),
        productConfigService.listAttributes({ active_only: false }),
        productConfigService.listValues(),
      ]);
      setGroups(nextGroups);
      setAttributes(nextAttributes);
      setValues(nextValues);
      if (!selectedAttributeId && nextAttributes[0]) setSelectedAttributeId(String(nextAttributes[0].id));
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar atributos.'));
    } finally {
      setLoading(false);
    }
  }, [selectedAttributeId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSearch(''); }, [activeTab]);
  useEffect(() => { setPage(0); }, [activeTab, filters, search, selectedAttributeId, tablePageSize]);

  const groupOptions = groups.map((group) => ({ value: String(group.id), label: `${group.group_code} - ${group.group_name}` }));
  const openGroup = (group = null) => ModalManager.show({
    type: 'custom', title: group ? 'Editar grupo' : 'Nuevo grupo', size: 'medium', showFooter: false, contentComponent: SimpleFormContent,
    contentProps: {
      initialValues: group ? { group_code: group.group_code, group_name: group.group_name, group_description: group.group_description || '', sort_order: group.sort_order || 0, is_active: group.is_active } : { group_name: '', group_description: '', sort_order: 0, is_active: true },
      fields: [
        ...(group ? [{ id: 'group_code', label: 'Codigo', readOnly: true, disabled: true }] : []),
        { id: 'group_name', label: 'Nombre', required: true },
        { id: 'sort_order', label: 'Orden', type: 'number', min: 0 },
        { id: 'group_description', label: 'Descripcion', wide: true },
        { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' },
      ],
      onSubmit: async (form) => {
        const payload = { group_name: form.group_name.trim(), group_description: form.group_description || null, sort_order: Number(form.sort_order || 0), is_active: Boolean(form.is_active) };
        await notifyPromise(group ? productConfigService.updateGroup(group.id, payload) : productConfigService.createGroup(payload), { loading: 'Guardando grupo...', success: 'Grupo guardado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar.') });
        await load();
      },
    },
  });

  const openAttribute = (attribute = null) => ModalManager.show({
    type: 'custom', title: attribute ? 'Editar atributo' : 'Nuevo atributo', size: 'large', showFooter: false, contentComponent: SimpleFormContent,
    contentProps: {
      initialValues: attribute ? { attribute_code: attribute.attribute_code, attribute_group_id: String(attribute.attribute_group_id), attribute_name: attribute.attribute_name, attribute_type: attribute.attribute_type, is_required: attribute.is_required, affects_sku: attribute.affects_sku, sort_order: attribute.sort_order || 0, is_active: attribute.is_active } : { attribute_group_id: groupOptions[0]?.value || '', attribute_name: '', attribute_type: 'TEXT', is_required: false, affects_sku: false, sort_order: 0, is_active: true },
      fields: [
        ...(attribute ? [{ id: 'attribute_code', label: 'Codigo', readOnly: true, disabled: true }] : []),
        { id: 'attribute_group_id', label: 'Grupo', type: 'select', required: true, options: [{ value: '', label: 'Selecciona grupo' }, ...groupOptions] },
        { id: 'attribute_name', label: 'Nombre', required: true },
        { id: 'attribute_type', label: 'Tipo', type: 'select', options: Object.entries(typeLabels).map(([value, label]) => ({ value, label })) },
        { id: 'sort_order', label: 'Orden', type: 'number', min: 0 },
        { id: 'is_required', label: 'Requerido', type: 'checkbox', checkLabel: 'Requerido' },
        { id: 'affects_sku', label: 'SKU', type: 'checkbox', checkLabel: 'Afecta SKU' },
        { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' },
      ],
      onSubmit: async (form) => {
        const payload = { attribute_group_id: Number(form.attribute_group_id), attribute_name: form.attribute_name.trim(), attribute_type: form.attribute_type, is_required: Boolean(form.is_required), affects_sku: Boolean(form.affects_sku), sort_order: Number(form.sort_order || 0), is_active: Boolean(form.is_active) };
        await notifyPromise(attribute ? productConfigService.updateAttribute(attribute.id, payload) : productConfigService.createAttribute(payload), { loading: 'Guardando atributo...', success: 'Atributo guardado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar.') });
        await load();
      },
    },
  });

  const openValue = (value = null) => ModalManager.show({
    type: 'custom', title: value ? 'Editar valor' : 'Nuevo valor', size: 'medium', showFooter: false, contentComponent: SimpleFormContent,
    contentProps: {
      initialValues: value ? { value_code: value.value_code, value_name: value.value_name, sort_order: value.sort_order || 0, is_active: value.is_active } : { value_name: '', sort_order: 0, is_active: true },
      fields: [...(value ? [{ id: 'value_code', label: 'Codigo', readOnly: true, disabled: true }] : []), { id: 'value_name', label: 'Valor', required: true }, { id: 'sort_order', label: 'Orden', type: 'number', min: 0 }, { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' }],
      onSubmit: async (form) => {
        const payload = { attribute_id: Number(selectedAttributeId), value_name: form.value_name.trim(), sort_order: Number(form.sort_order || 0), is_active: Boolean(form.is_active) };
        await notifyPromise(value ? productConfigService.updateValue(value.id, payload) : productConfigService.createValue(payload), { loading: 'Guardando valor...', success: 'Valor guardado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar.') });
        await load();
      },
    },
  });

  const remove = async (label, action) => {
    if (!await ModalManager.confirm({ title: `Eliminar ${label}`, message: `Confirma eliminar ${label}.`, buttons: { cancel: 'Cancelar', confirm: 'Eliminar' } })) return;
    await notifyPromise(action(), { loading: 'Eliminando...', success: 'Eliminado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible eliminar.') });
    await load();
  };

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    return groups.filter((group) => {
      const matchesStatus = filters.groupStatus === 'all' || (filters.groupStatus === 'active' && group.is_active) || (filters.groupStatus === 'inactive' && !group.is_active);
      const matchesSearch = !term || [group.group_code, group.group_name, group.group_description].filter(Boolean).some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [filters.groupStatus, groups, search]);
  const filteredAttributes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return attributes.filter((attribute) => {
      const matchesGroup = filters.attributeGroup === 'all' || String(attribute.attribute_group_id) === filters.attributeGroup;
      const matchesType = filters.attributeType === 'all' || attribute.attribute_type === filters.attributeType;
      const matchesSearch = !term || [attribute.attribute_code, attribute.attribute_name, attribute.group_name, typeLabels[attribute.attribute_type]].filter(Boolean).some((value) => value.toLowerCase().includes(term));
      return matchesGroup && matchesType && matchesSearch;
    });
  }, [attributes, filters.attributeGroup, filters.attributeType, search]);
  const filteredValues = useMemo(() => {
    const term = search.trim().toLowerCase();
    return values.filter((value) => {
      const matchesAttribute = Number(value.attribute_id) === Number(selectedAttributeId);
      const matchesStatus = filters.valueStatus === 'all' || (filters.valueStatus === 'active' && value.is_active) || (filters.valueStatus === 'inactive' && !value.is_active);
      const matchesSearch = !term || [value.value_code, value.value_name].filter(Boolean).some((fieldValue) => fieldValue.toLowerCase().includes(term));
      return matchesAttribute && matchesStatus && matchesSearch;
    });
  }, [filters.valueStatus, search, selectedAttributeId, values]);
  const filterFields = {
    groups: [
      { id: 'groupStatus', value: filters.groupStatus, onChange: (value) => setFilters((current) => ({ ...current, groupStatus: value })), options: [{ value: 'all', label: 'Todos los estados' }, { value: 'active', label: 'Activos' }, { value: 'inactive', label: 'Inactivos' }] },
    ],
    attributes: [
      { id: 'attributeGroup', value: filters.attributeGroup, onChange: (value) => setFilters((current) => ({ ...current, attributeGroup: value })), options: [{ value: 'all', label: 'Todos los grupos' }, ...groupOptions] },
      { id: 'attributeType', value: filters.attributeType, onChange: (value) => setFilters((current) => ({ ...current, attributeType: value })), options: [{ value: 'all', label: 'Todos los tipos' }, ...Object.entries(typeLabels).map(([value, label]) => ({ value, label }))] },
    ],
    values: [
      { id: 'selectedAttributeId', value: selectedAttributeId, onChange: setSelectedAttributeId, options: attributes.map((attribute) => ({ value: String(attribute.id), label: `${attribute.attribute_code} - ${attribute.attribute_name}` })) },
      { id: 'valueStatus', value: filters.valueStatus, onChange: (value) => setFilters((current) => ({ ...current, valueStatus: value })), options: [{ value: 'all', label: 'Todos los estados' }, { value: 'active', label: 'Activos' }, { value: 'inactive', label: 'Inactivos' }] },
    ],
  }[activeTab];
  const clearFilters = () => {
    setSearch('');
    if (activeTab === 'groups') setFilters((current) => ({ ...current, groupStatus: 'all' }));
    if (activeTab === 'attributes') setFilters((current) => ({ ...current, attributeGroup: 'all', attributeType: 'all' }));
    if (activeTab === 'values') setFilters((current) => ({ ...current, valueStatus: 'all' }));
  };
  const activeData = { groups: filteredGroups, attributes: filteredAttributes, values: filteredValues }[activeTab];
  const visibleData = useMemo(() => activeData.slice(page * tablePageSize, page * tablePageSize + tablePageSize), [activeData, page, tablePageSize]);
  const pagination = (
    <DataTablePagination
      page={page}
      pageSize={tablePageSize}
      pageSizeOptions={PAGE_SIZE_OPTIONS}
      total={activeData.length}
      hasMore={(page + 1) * tablePageSize < activeData.length}
      loading={loading}
      onPageChange={setPage}
      onPageSizeChange={(size) => { setTablePageSize(size); setPage(0); }}
    />
  );
  const actionConfig = {
    groups: { label: 'Nuevo grupo', onClick: () => openGroup() },
    attributes: { label: 'Nuevo atributo', onClick: () => openAttribute() },
    values: { label: 'Nuevo valor', onClick: () => openValue(), disabled: !selectedAttributeId },
  }[activeTab];

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mb-5 flex flex-wrap justify-between gap-3">
        <div><h1 className="text-xl font-semibold">Atributos de productos</h1><p className="mt-1 text-sm text-slate-500">Grupos, atributos y valores para variantes.</p></div>
        <ActionButton label={actionConfig.label} disabled={actionConfig.disabled} onClick={actionConfig.onClick} />
      </div>
      <KpiBar items={[{ label: 'Grupos', value: groups.length }, { label: 'Atributos', value: attributes.length }, { label: 'Valores', value: values.length }, { label: 'Afectan SKU', value: attributes.filter((item) => item.affects_sku).length }]} className="mb-4" />
      <ModuleTabs
        className="mb-4"
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'groups', label: 'Grupos', icon: Layers3, count: groups.length },
          { id: 'attributes', label: 'Atributos', icon: Tags, count: attributes.length },
          { id: 'values', label: 'Valores', icon: ListChecks, count: values.length },
        ]}
      />
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <FilterBar
        className="mb-4"
        searchValue={search}
        searchPlaceholder={activeTab === 'values' ? 'Buscar valor o codigo' : 'Buscar nombre, codigo o descripcion'}
        onSearchChange={setSearch}
        onSearchSubmit={() => {}}
        fields={filterFields}
        actions={(
          <>
            <ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={load} className={loading ? '[&>svg]:animate-spin' : ''} />
            <ActionButton label="Limpiar" icon={XCircle} variant="neutral" onClick={clearFilters} />
          </>
        )}
      />
      {activeTab === 'groups' && (
        <DataTable loading={loading} data={visibleData} footer={pagination} columns={[
          { id: 'group', label: 'Grupo', render: (item) => <><div className="font-medium">{item.group_name}</div><div className="font-mono text-xs text-slate-500">{item.group_code}</div></> },
          { id: 'active', label: 'Estado', render: (item) => <StatusBadge variant={item.is_active ? 'active' : 'inactive'}>{item.is_active ? 'Activo' : 'Inactivo'}</StatusBadge> },
          { id: 'actions', label: 'Acciones', align: 'right', render: (item) => <div className="flex justify-end gap-2"><RowActionButton label="Editar" icon={Pencil} onClick={() => openGroup(item)} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => remove('grupo', () => productConfigService.removeGroup(item.id))} /></div> },
        ]} />
      )}
      {activeTab === 'attributes' && (
        <DataTable loading={loading} data={visibleData} footer={pagination} columns={[
          { id: 'attr', label: 'Atributo', render: (item) => <><button type="button" onClick={() => setSelectedAttributeId(String(item.id))} className="font-medium text-blue-700 dark:text-blue-300">{item.attribute_name}</button><div className="font-mono text-xs text-slate-500">{item.attribute_code}</div></> },
          { id: 'group', label: 'Grupo', render: (item) => item.group_name },
          { id: 'type', label: 'Tipo', render: (item) => typeLabels[item.attribute_type] || item.attribute_type },
          { id: 'flags', label: 'Flags', render: (item) => <div className="text-xs text-slate-500">{item.is_required ? 'Requerido' : 'Opcional'} / {item.affects_sku ? 'SKU' : 'No SKU'}</div> },
          { id: 'active', label: 'Estado', render: (item) => <StatusBadge variant={item.is_active ? 'active' : 'inactive'}>{item.is_active ? 'Activo' : 'Inactivo'}</StatusBadge> },
          { id: 'actions', label: 'Acciones', align: 'right', render: (item) => <div className="flex justify-end gap-2"><RowActionButton label="Editar" icon={Pencil} onClick={() => openAttribute(item)} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => remove('atributo', () => productConfigService.removeAttribute(item.id))} /></div> },
        ]} />
      )}
      {activeTab === 'values' && (
        <>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-base font-semibold">Valores de {selectedAttribute?.attribute_name || 'atributo'}</h2><p className="text-sm text-slate-500">Para atributos tipo seleccion.</p></div>
        </div>
        <DataTable loading={loading} data={visibleData} footer={pagination} columns={[
          { id: 'value', label: 'Valor', render: (item) => <><div className="font-medium">{item.value_name}</div><div className="font-mono text-xs text-slate-500">{item.value_code}</div></> },
          { id: 'active', label: 'Estado', render: (item) => <StatusBadge variant={item.is_active ? 'active' : 'inactive'}>{item.is_active ? 'Activo' : 'Inactivo'}</StatusBadge> },
          { id: 'actions', label: 'Acciones', align: 'right', render: (item) => <div className="flex justify-end gap-2"><RowActionButton label="Editar" icon={Pencil} onClick={() => openValue(item)} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => remove('valor', () => productConfigService.removeValue(item.id))} /></div> },
        ]} />
        </>
      )}
    </section>
  );
};

export default AdminProductAttributes;
