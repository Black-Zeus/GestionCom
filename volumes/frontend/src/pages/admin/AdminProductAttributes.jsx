import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Layers3, ListChecks, Pencil, Power, RefreshCw, Tags, Trash2, XCircle } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import DataTablePagination from '@/components/common/data/DataTablePagination';
import FilterBar from '@/components/common/data/FilterBar';
import SimpleFormContent from '@/components/common/forms/SimpleFormContent';
import KpiBar from '@/components/common/data/KpiBar';
import StatusBadge from '@/components/common/data/StatusBadge';
import { productConfigService } from '@/services/admin/productConfigService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';

const typeLabels = { TEXT: 'Texto', NUMBER: 'Numero', BOOLEAN: 'Booleano', SELECT: 'Seleccion', MULTISELECT: 'Multiple' };
const selectableAttributeTypes = ['SELECT', 'MULTISELECT'];
const typeOptions = [
  { value: 'TEXT', label: typeLabels.TEXT, description: 'Dato libre de texto. No usa lista de valores.' },
  { value: 'NUMBER', label: typeLabels.NUMBER, description: 'Dato numerico libre. No usa lista de valores.' },
  { value: 'BOOLEAN', label: typeLabels.BOOLEAN, description: 'Dato Si / No. No usa lista de valores.' },
  { value: 'SELECT', label: typeLabels.SELECT, description: 'Usa una lista administrada desde la vista Valores del atributo.' },
  { value: 'MULTISELECT', label: typeLabels.MULTISELECT, description: 'Permite seleccionar mas de un valor desde la vista Valores del atributo.' },
];
const typeHelpMessages = {
  TEXT: 'Texto libre para caracteristicas descriptivas, sin lista de valores.',
  NUMBER: 'Numero libre para medidas o cantidades propias del producto.',
  BOOLEAN: 'Respuesta Si/No para caracteristicas binarias del producto.',
  SELECT: 'Seleccion unica desde valores del atributo, como color o talla.',
  MULTISELECT: 'Seleccion multiple desde valores del atributo, para combinaciones no exclusivas.',
};
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const AdminProductAttributes = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [groups, setGroups] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [values, setValues] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ groupStatus: 'all', attributeType: 'all', valueStatus: 'all' });
  const [page, setPage] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedGroupCode = searchParams.get('group') || '';
  const selectedAttributeCode = searchParams.get('attribute') || '';
  const selectedGroup = groups.find((group) => group.group_code === selectedGroupCode);
  const selectedAttribute = attributes.find((item) => item.attribute_code === selectedAttributeCode && (!selectedGroup || Number(item.attribute_group_id) === Number(selectedGroup.id)));
  const selectedAttributeAcceptsValues = selectedAttribute && selectableAttributeTypes.includes(selectedAttribute.attribute_type);
  const activeLevel = selectedAttributeCode ? 'values' : selectedGroupCode ? 'attributes' : 'groups';
  const activeAttributeCountByGroup = useMemo(() => attributes.reduce((counts, attribute) => {
    if (!attribute.is_active) return counts;
    const groupId = String(attribute.attribute_group_id);
    counts[groupId] = (counts[groupId] || 0) + 1;
    return counts;
  }, {}), [attributes]);
  const activeValueCountByAttribute = useMemo(() => values.reduce((counts, value) => {
    if (!value.is_active) return counts;
    const attributeId = String(value.attribute_id);
    counts[attributeId] = (counts[attributeId] || 0) + 1;
    return counts;
  }, {}), [values]);

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
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar atributos.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSearch(''); }, [activeLevel]);
  useEffect(() => { setPage(0); }, [activeLevel, filters, search, tablePageSize]);

  const openGroup = (group = null) => ModalManager.show({
    type: 'custom', title: group ? 'Editar grupo' : 'Nuevo grupo', size: 'xlarge', showFooter: false, contentComponent: SimpleFormContent,
    contentProps: {
      initialValues: group ? { group_code: group.group_code, group_name: group.group_name, group_description: group.group_description || '', sort_order: group.sort_order || 0, is_active: group.is_active } : { group_name: '', group_description: '', sort_order: 0, is_active: true },
      fields: [
        { type: 'section', id: 'identity', label: 'Datos del grupo', description: 'Agrupa atributos relacionados para ordenar su uso en productos y SKU / Variedades.', icon: Layers3, columns: 3 },
        { id: 'group_name', label: 'Nombre', required: true },
        { id: 'sort_order', label: 'Orden', type: 'number', min: 0 },
        { id: 'group_description', label: 'Descripcion', type: 'textarea', rows: 2, span: 'full', placeholder: 'Ejemplo: caracteristicas fisicas, presentacion, informacion comercial.' },
        { type: 'section', id: 'status', label: 'Estado operativo', description: 'Controla si el grupo queda disponible para nuevos atributos.', icon: ListChecks, columns: 3 },
        { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' },
      ],
      onSubmit: async (form) => {
        const payload = { group_name: form.group_name.trim(), group_description: form.group_description || null, sort_order: Number(form.sort_order || 0), is_active: Boolean(form.is_active) };
        await notifyPromise(group ? productConfigService.updateGroup(group.id, payload) : productConfigService.createGroup(payload), { loading: 'Guardando grupo...', success: 'Grupo guardado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar.') });
        await load();
      },
    },
  });

  const openAttribute = (attribute = null) => {
    const lockedGroupId = selectedGroup?.id ? String(selectedGroup.id) : '';
    ModalManager.show({
      type: 'custom', title: attribute ? 'Editar atributo' : 'Nuevo atributo', size: 'xlarge', showFooter: false, contentComponent: SimpleFormContent,
      contentProps: {
        initialValues: attribute ? { attribute_name: attribute.attribute_name, attribute_type: attribute.attribute_type, is_required: attribute.is_required, affects_sku: attribute.affects_sku, sort_order: attribute.sort_order || 0, is_active: attribute.is_active } : { attribute_name: '', attribute_type: 'TEXT', is_required: false, affects_sku: false, sort_order: 0, is_active: true },
        fields: [
          { type: 'section', id: 'identity', label: 'Datos del atributo', description: `Define como se captura esta caracteristica dentro de ${selectedGroup?.group_name || 'este grupo'}.`, icon: Tags, columns: 3 },
          { id: 'attribute_name', label: 'Nombre', required: true },
          { id: 'attribute_type', label: 'Tipo', type: 'autocomplete', options: typeOptions, placeholder: 'Selecciona tipo', searchPlaceholder: 'Buscar tipo', showOptionDescription: false },
          { id: 'sort_order', label: 'Orden', type: 'number', min: 0 },
          {
            id: 'value_source_help',
            type: 'custom',
          span: 'full',
          render: ({ form }) => {
            return (
                <div className="truncate rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
                  {typeHelpMessages[form.attribute_type] || 'Define como se captura este atributo en productos y SKU / Variedades.'}
                </div>
            );
          },
          },
          { type: 'section', id: 'behavior', label: 'Comportamiento', description: 'Controla si el atributo es obligatorio, visible para SKU y operativo.', icon: ListChecks, columns: 3 },
          { id: 'is_required', label: 'Requerido', type: 'checkbox', checkLabel: 'Requerido', help: 'Obliga a informar este atributo cuando el flujo lo use.' },
          { id: 'affects_sku', label: 'SKU / Variedades', type: 'checkbox', checkLabel: 'Afecta SKU / Variedades', help: 'Participa en la diferenciacion de variedades vendibles.' },
          { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' },
        ],
        onSubmit: async (form) => {
          const payload = { attribute_group_id: Number(attribute?.attribute_group_id || lockedGroupId), attribute_name: form.attribute_name.trim(), attribute_type: form.attribute_type, is_required: Boolean(form.is_required), affects_sku: Boolean(form.affects_sku), sort_order: Number(form.sort_order || 0), is_active: Boolean(form.is_active) };
          await notifyPromise(attribute ? productConfigService.updateAttribute(attribute.id, payload) : productConfigService.createAttribute(payload), { loading: 'Guardando atributo...', success: 'Atributo guardado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar.') });
          await load();
        },
      },
    });
  };

  const openValue = (value = null) => ModalManager.show({
    type: 'custom', title: value ? 'Editar valor' : 'Nuevo valor', size: 'xlarge', showFooter: false, contentComponent: SimpleFormContent,
    contentProps: {
      initialValues: value ? { value_code: value.value_code, value_name: value.value_name, sort_order: value.sort_order || 0, is_active: value.is_active } : { value_name: '', sort_order: 0, is_active: true },
      fields: [
        { type: 'section', id: 'value', label: `Valor para ${selectedAttribute?.attribute_name || 'atributo'}`, description: 'Lista usada por atributos de tipo seleccion o multiple.', icon: ListChecks, columns: 3 },
        { id: 'value_name', label: 'Valor', required: true },
        { id: 'sort_order', label: 'Orden', type: 'number', min: 0 },
        { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' },
      ],
      onSubmit: async (form) => {
        const payload = { attribute_id: Number(selectedAttribute?.id), value_name: form.value_name.trim(), sort_order: Number(form.sort_order || 0), is_active: Boolean(form.is_active) };
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

  const toggleStatus = async ({ label, item, payload, action }) => {
    const nextStatus = !item.is_active;
    const confirmed = await ModalManager.confirm({
      title: nextStatus ? `Activar ${label.toLowerCase()}` : `Desactivar ${label.toLowerCase()}`,
      message: nextStatus ? `Confirma activar este ${label.toLowerCase()}.` : `Confirma desactivar este ${label.toLowerCase()}.`,
      buttons: { cancel: 'Cancelar', confirm: nextStatus ? 'Activar' : 'Desactivar' },
    });
    if (!confirmed) return;
    await notifyPromise(action({ ...payload, is_active: nextStatus }), {
      loading: nextStatus ? 'Activando...' : 'Desactivando...',
      success: nextStatus ? `${label} activo.` : `${label} inactivo.`,
      error: (requestError) => getBackendMessage(requestError, 'No fue posible cambiar el estado.'),
    });
    await load();
  };

  const openGroupAttributes = (group) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('group', group.group_code);
    nextParams.delete('attribute');
    setSearchParams(nextParams);
  };

  const openAttributeValues = (attribute) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('group', attribute.group_code || selectedGroup?.group_code || '');
    nextParams.set('attribute', attribute.attribute_code);
    setSearchParams(nextParams);
  };

  const goBack = () => {
    const nextParams = new URLSearchParams(searchParams);
    if (activeLevel === 'values') {
      nextParams.delete('attribute');
    } else if (activeLevel === 'attributes') {
      nextParams.delete('group');
    }
    setSearchParams(nextParams);
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
      const matchesGroup = selectedGroup ? Number(attribute.attribute_group_id) === Number(selectedGroup.id) : true;
      const matchesType = filters.attributeType === 'all' || attribute.attribute_type === filters.attributeType;
      const matchesSearch = !term || [attribute.attribute_code, attribute.attribute_name, attribute.group_name, typeLabels[attribute.attribute_type]].filter(Boolean).some((value) => value.toLowerCase().includes(term));
      return matchesGroup && matchesType && matchesSearch;
    });
  }, [attributes, filters.attributeType, search, selectedGroup]);
  const filteredValues = useMemo(() => {
    const term = search.trim().toLowerCase();
    return values.filter((value) => {
      const matchesAttribute = selectedAttribute ? Number(value.attribute_id) === Number(selectedAttribute.id) : false;
      const matchesStatus = filters.valueStatus === 'all' || (filters.valueStatus === 'active' && value.is_active) || (filters.valueStatus === 'inactive' && !value.is_active);
      const matchesSearch = !term || [value.value_code, value.value_name].filter(Boolean).some((fieldValue) => fieldValue.toLowerCase().includes(term));
      return matchesAttribute && matchesStatus && matchesSearch;
    });
  }, [filters.valueStatus, search, selectedAttribute, values]);
  const filterFields = {
    groups: [
      { id: 'groupStatus', value: filters.groupStatus, onChange: (value) => setFilters((current) => ({ ...current, groupStatus: value })), options: [{ value: 'all', label: 'Todos los estados' }, { value: 'active', label: 'Activos' }, { value: 'inactive', label: 'Inactivos' }] },
    ],
    attributes: [
      { id: 'attributeType', value: filters.attributeType, onChange: (value) => setFilters((current) => ({ ...current, attributeType: value })), options: [{ value: 'all', label: 'Todos los tipos' }, ...typeOptions.map(({ value, label }) => ({ value, label }))] },
    ],
    values: [
      { id: 'valueStatus', value: filters.valueStatus, onChange: (value) => setFilters((current) => ({ ...current, valueStatus: value })), options: [{ value: 'all', label: 'Todos los estados' }, { value: 'active', label: 'Activos' }, { value: 'inactive', label: 'Inactivos' }] },
    ],
  }[activeLevel];
  const clearFilters = () => {
    setSearch('');
    if (activeLevel === 'groups') setFilters((current) => ({ ...current, groupStatus: 'all' }));
    if (activeLevel === 'attributes') setFilters((current) => ({ ...current, attributeType: 'all' }));
    if (activeLevel === 'values') setFilters((current) => ({ ...current, valueStatus: 'all' }));
  };
  const activeData = { groups: filteredGroups, attributes: filteredAttributes, values: filteredValues }[activeLevel];
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
    attributes: { label: 'Nuevo atributo', onClick: () => openAttribute(), disabled: !selectedGroup },
    values: { label: 'Nuevo valor', onClick: () => openValue(), disabled: !selectedAttribute || !selectedAttributeAcceptsValues },
  }[activeLevel];
  const title = activeLevel === 'groups'
    ? 'Atributos de productos'
    : activeLevel === 'attributes'
      ? `Atributos - ${selectedGroup?.group_name || selectedGroupCode}`
      : `Valores - ${selectedAttribute?.attribute_name || selectedAttributeCode}`;
  const description = activeLevel === 'groups'
    ? 'Grupos, atributos y valores para SKU / Variedades.'
    : activeLevel === 'attributes'
      ? 'Atributos asociados al grupo seleccionado.'
      : 'Valores disponibles para el atributo seleccionado.';

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mb-5 flex flex-wrap justify-between gap-3">
        <div><h1 className="text-xl font-semibold">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>
        <div className="flex flex-wrap gap-2">
          {activeLevel !== 'groups' && <ActionButton label="Volver" icon={ArrowLeft} variant="neutral" onClick={goBack} />}
          <ActionButton label={actionConfig.label} disabled={actionConfig.disabled} onClick={actionConfig.onClick} />
        </div>
      </div>
      <KpiBar items={[{ label: 'Grupos', value: groups.length }, { label: 'Atributos', value: attributes.length }, { label: 'Valores', value: values.length }, { label: 'Afectan SKU', value: attributes.filter((item) => item.affects_sku).length }]} className="mb-4" />
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <FilterBar
        className="mb-4"
        searchValue={search}
        searchPlaceholder={activeLevel === 'values' ? 'Buscar valor o codigo' : 'Buscar nombre, codigo o descripcion'}
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
      {activeLevel === 'groups' && (
        <DataTable loading={loading} data={visibleData} footer={pagination} columns={[
          { id: 'group', label: 'Grupo', render: (item) => <span className="font-medium">{item.group_name}</span> },
          { id: 'description', label: 'Descripcion', render: (item) => <span className="text-sm text-slate-600 dark:text-slate-300">{item.group_description || '-'}</span> },
          { id: 'attributes_count', label: 'Atributos activos', render: (item) => activeAttributeCountByGroup[String(item.id)] || 0 },
          { id: 'sort_order', label: 'Orden', render: (item) => item.sort_order ?? 0 },
          { id: 'active', label: 'Estado', render: (item) => <StatusBadge variant={item.is_active ? 'active' : 'inactive'}>{item.is_active ? 'Activo' : 'Inactivo'}</StatusBadge> },
          { id: 'actions', label: 'Acciones', align: 'center', render: (item) => <div className="flex justify-center gap-2"><RowActionButton label="Editar" icon={Pencil} onClick={() => openGroup(item)} /><RowActionButton label="Atributos" icon={Tags} onClick={() => openGroupAttributes(item)} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => remove('grupo', () => productConfigService.removeGroup(item.id))} /><RowActionButton label={item.is_active ? 'Desactivar' : 'Activar'} icon={Power} onClick={() => toggleStatus({ label: 'Grupo', item, payload: { group_name: item.group_name, group_description: item.group_description || null, sort_order: Number(item.sort_order || 0) }, action: (payload) => productConfigService.updateGroup(item.id, payload) })} /></div> },
        ]} />
      )}
      {activeLevel === 'attributes' && (
        <DataTable loading={loading} data={visibleData} footer={pagination} columns={[
          { id: 'attr', label: 'Atributo', render: (item) => <span className="font-medium">{item.attribute_name}</span> },
          { id: 'type', label: 'Tipo', render: (item) => typeLabels[item.attribute_type] || item.attribute_type },
          { id: 'flags', label: 'Uso', render: (item) => <div className="text-xs text-slate-500">{item.is_required ? 'Requerido' : 'Opcional'} / {item.affects_sku ? 'SKU / Variedades' : 'No afecta SKU'}</div> },
          { id: 'values_count', label: 'Valores activos', render: (item) => selectableAttributeTypes.includes(item.attribute_type) ? (activeValueCountByAttribute[String(item.id)] || 0) : '-' },
          { id: 'sort_order', label: 'Orden', render: (item) => item.sort_order ?? 0 },
          { id: 'active', label: 'Estado', render: (item) => <StatusBadge variant={item.is_active ? 'active' : 'inactive'}>{item.is_active ? 'Activo' : 'Inactivo'}</StatusBadge> },
          { id: 'actions', label: 'Acciones', align: 'center', render: (item) => <div className="flex justify-center gap-2"><RowActionButton label="Editar" icon={Pencil} onClick={() => openAttribute(item)} /><RowActionButton label="Valores" icon={ListChecks} disabled={!selectableAttributeTypes.includes(item.attribute_type)} onClick={() => openAttributeValues(item)} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => remove('atributo', () => productConfigService.removeAttribute(item.id))} /><RowActionButton label={item.is_active ? 'Desactivar' : 'Activar'} icon={Power} onClick={() => toggleStatus({ label: 'Atributo', item, payload: { attribute_group_id: Number(item.attribute_group_id), attribute_name: item.attribute_name, attribute_type: item.attribute_type, is_required: Boolean(item.is_required), affects_sku: Boolean(item.affects_sku), sort_order: Number(item.sort_order || 0) }, action: (payload) => productConfigService.updateAttribute(item.id, payload) })} /></div> },
        ]} />
      )}
      {activeLevel === 'values' && (
        <>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-base font-semibold">Valores de {selectedAttribute?.attribute_name || 'atributo'}</h2><p className="text-sm text-slate-500">Para atributos tipo seleccion o multiple. Colores y tallas se cargan aca; unidades de medida se administran en su propio mantenedor.</p></div>
        </div>
        {!selectedAttributeAcceptsValues && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            Selecciona un atributo de tipo Seleccion o Multiple para administrar valores.
          </div>
        )}
        <DataTable loading={loading} data={visibleData} footer={pagination} columns={[
          { id: 'value', label: 'Valor', render: (item) => <span className="font-medium">{item.value_name}</span> },
          { id: 'sort_order', label: 'Orden', render: (item) => item.sort_order ?? 0 },
          { id: 'active', label: 'Estado', render: (item) => <StatusBadge variant={item.is_active ? 'active' : 'inactive'}>{item.is_active ? 'Activo' : 'Inactivo'}</StatusBadge> },
          { id: 'actions', label: 'Acciones', align: 'center', render: (item) => <div className="flex justify-center gap-2"><RowActionButton label="Editar" icon={Pencil} onClick={() => openValue(item)} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => remove('valor', () => productConfigService.removeValue(item.id))} /><RowActionButton label={item.is_active ? 'Desactivar' : 'Activar'} icon={Power} onClick={() => toggleStatus({ label: 'Valor', item, payload: { value_name: item.value_name, sort_order: Number(item.sort_order || 0) }, action: (payload) => productConfigService.updateValue(item.id, payload) })} /></div> },
        ]} />
        </>
      )}
    </section>
  );
};

export default AdminProductAttributes;
