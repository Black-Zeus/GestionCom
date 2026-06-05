/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import BottomActionBar from '@/components/common/actions/BottomActionBar';
import DataTable from '@/components/common/data/DataTable';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleTabs from '@/components/common/navigation/ModuleTabs';
import SimpleFormContent from '@/components/common/forms/SimpleFormContent';
import StatusBadge from '@/components/common/data/StatusBadge';
import { adminMaintainersService } from '@/services/admin/adminMaintainersService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { fieldOptions, filterActions, statusCell, tableFooter } from './businessFoundationShared';

const defaultFieldClass = (field, optionData = {}) => ({
  id: field.id,
  label: field.label,
  type: field.type,
  required: field.required,
  options: field.optionsResource ? optionData[field.optionsResource] || [] : field.options || [],
  min: field.min,
  wide: field.wide,
  placeholder: field.placeholder,
  help: field.help,
  rows: field.rows,
  mono: field.mono,
  span: field.span,
  icon: field.icon,
  leadingIcon: field.leadingIcon,
  columns: field.columns,
  description: field.description,
  readOnly: field.readOnly,
  disabled: field.disabled,
});

const getStatusOption = (item, config, optionData = {}) => {
  if (!config.statusField || !config.statusOptionsResource) return null;
  const value = item[config.statusField];
  return (optionData[config.statusOptionsResource] || []).find((entry) => String(entry.value) === String(value)) || null;
};

const getStatus = (item, config, optionData = {}) => {
  if (config.statusField) {
    const option = getStatusOption(item, config, optionData);
    return option ? option.code === (config.activeValue || 'ACTIVE') : item[config.statusField] === (config.activeValue || 'ACTIVE');
  }
  if (config.activeField) return item[config.activeField] !== false;
  return true;
};

const formatValue = (item, field, optionData = {}) => {
  const value = item[field.id];
  if (field.optionsResource) {
    const option = (optionData[field.optionsResource] || []).find((entry) => String(entry.value) === String(value));
    if (option) return option.label;
  }
  if (field.format) return field.format(value, item);
  if (field.options) return field.options.find((option) => String(option.value) === String(value))?.label || value || '-';
  if (typeof value === 'boolean') return value ? 'Si' : 'No';
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

const statusVariantByValue = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BLOCKED: 'danger',
  DEFAULTED: 'warning',
};

const StatusChangeContent = ({
  currentValue,
  options = [],
  onSubmit,
  onClose,
}) => {
  const [selectedStatus, setSelectedStatus] = useState(currentValue || options[0]?.value || '');
  const [saving, setSaving] = useState(false);
  const selectedOption = options.find((option) => String(option.value) === String(selectedStatus));

  const submitSelected = async () => {
    setSaving(true);
    try {
      await onSubmit(selectedStatus);
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    await submitSelected();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="space-y-1 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">Estado</span>
        <select
          className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
          value={selectedStatus}
          onChange={(event) => setSelectedStatus(event.target.value)}
          required
        >
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>

      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
        <div className="mb-1 font-semibold text-slate-800 dark:text-slate-100">{selectedOption?.label || 'Estado seleccionado'}</div>
        <p>{selectedOption?.description || 'Selecciona el estado operativo que debe quedar asociado al registro.'}</p>
      </div>

      <BottomActionBar
        className="-mx-6 -mb-6"
        leftContent="El cambio se aplicara inmediatamente al guardar."
        actions={[
          { id: 'cancel', label: 'Cancelar', variant: 'neutral', onClick: onClose },
          { id: 'save', label: saving ? 'Guardando...' : 'Guardar estado', icon: Check, variant: 'primary', disabled: saving || String(selectedStatus) === String(currentValue), onClick: submitSelected },
        ]}
      />
    </form>
  );
};

const optionLabel = (row) => {
  if (row.currency_code) return `${row.currency_code} - ${row.currency_symbol || ''} - ${row.currency_name || ''}`.replace(/\s+-\s+$/, '');
  if (row.bank_name) return `${row.bank_code ? `${row.bank_code} - ` : ''}${row.bank_name}`;
  if (row.account_name) return `${row.account_code ? `${row.account_code} - ` : ''}${row.account_name}`;
  if (row.warehouse_name) return `${row.warehouse_code ? `${row.warehouse_code} - ` : ''}${row.warehouse_name}`;
  if (row.product_name) return `${row.product_code ? `${row.product_code} - ` : ''}${row.product_name}`;
  if (row.brand_name) return `${row.brand_code ? `${row.brand_code} - ` : ''}${row.brand_name}`;
  if (row.variant_sku || row.variant_name) return `${row.variant_sku || row.id} - ${row.variant_name || 'SKU'}`;
  if (row.category_name) return `${row.category_code ? `${row.category_code} - ` : ''}${row.category_name}`;
  if (row.unit_name) return `${row.unit_code ? `${row.unit_code} - ` : ''}${row.unit_name}`;
  if (row.promotion_name) return `${row.promotion_code ? `${row.promotion_code} - ` : ''}${row.promotion_name}`;
  if (row.type_name) return `${row.type_code ? `${row.type_code} - ` : ''}${row.type_name}`;
  if (row.status_display_es) return row.status_display_es;
  if (row.document_type_name) return `${row.document_type_code ? `${row.document_type_code} - ` : ''}${row.document_type_name}`;
  if (row.legal_name) return `${row.customer_code || row.supplier_code ? `${row.customer_code || row.supplier_code} - ` : ''}${row.legal_name}`;
  if (row.username) return `${row.username} - ${[row.first_name, row.last_name].filter(Boolean).join(' ') || row.email || 'Usuario'}`;
  return row.name || row.label || String(row.id);
};

const filterItems = (items, config, search, status, optionData = {}) => {
  const term = search.trim().toLowerCase();
  return items.filter((item) => {
    const matchesStatus = status === 'all' || (status === 'active' ? getStatus(item, config, optionData) : !getStatus(item, config, optionData));
    const values = config.searchFields || config.tableFields.map((field) => field.id);
    const matchesSearch = !term || values.some((field) => String(item[field] || '').toLowerCase().includes(term));
    return matchesStatus && matchesSearch;
  });
};

const AdminGenericMaintainers = ({ title, description, tabs, initialTab }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const handledDeepLinkRef = useRef('');
  const initialTabId = searchParams.get('tab') || initialTab || tabs[0].id;
  const [activeTab, setActiveTab] = useState(tabs.some((tab) => tab.id === initialTabId) ? initialTabId : tabs[0].id);
  const [data, setData] = useState({});
  const [optionData, setOptionData] = useState({});
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeConfig = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const routeFilters = useMemo(() => activeConfig.routeFilters || [], [activeConfig]);
  const routeFilterValues = useMemo(() => Object.fromEntries(
    routeFilters.map((filter) => [filter.field, searchParams.get(filter.param || filter.field)]).filter(([, value]) => value)
  ), [routeFilters, searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const entries = await Promise.all(tabs.map(async (tab) => [tab.id, await adminMaintainersService.list(tab.resource)]));
      setData(Object.fromEntries(entries));
      const optionResources = [...new Set(tabs.flatMap((tab) => [
        ...tab.fields.map((field) => field.optionsResource).filter(Boolean),
        tab.statusOptionsResource,
      ].filter(Boolean)))];
      if (optionResources.length) {
        const optionEntries = await Promise.all(optionResources.map(async (resource) => [resource, await adminMaintainersService.list(resource)]));
        setOptionData(Object.fromEntries(optionEntries.map(([resource, rows]) => [
          resource,
          rows.filter((row) => row.is_active !== false).map((row) => ({
            value: String(row.currency_code || row.id),
            label: optionLabel(row),
            code: row.status_code,
            variant: statusVariantByValue[row.status_code],
            description: row.status_display_es,
          })),
        ])));
      }
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar mantenedores.'));
    } finally {
      setLoading(false);
    }
  }, [tabs]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [activeTab, search, status, pageSize]);
  useEffect(() => {
    const nextTab = searchParams.get('tab');
    const nextSearch = searchParams.get('search') || '';
    if (nextTab && tabs.some((tab) => tab.id === nextTab) && nextTab !== activeTab) setActiveTab(nextTab);
    if (nextSearch !== search) setSearch(nextSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, tabs]);

  const activeItems = useMemo(() => data[activeTab] || [], [activeTab, data]);
  const scopedItems = useMemo(() => activeItems.filter((item) => Object.entries(routeFilterValues).every(([field, value]) => String(item[field]) === String(value))), [activeItems, routeFilterValues]);
  const filteredItems = useMemo(() => filterItems(scopedItems, activeConfig, search, status, optionData), [activeConfig, scopedItems, search, status, optionData]);
  const visibleItems = filteredItems.slice(page * pageSize, page * pageSize + pageSize);
  const routePrefill = useMemo(() => Object.fromEntries(Object.entries(routeFilterValues)), [routeFilterValues]);
  const scopedLabel = useMemo(() => {
    const customerId = routeFilterValues.customer_id;
    if (!customerId) return '';
    return (optionData.customers || []).find((option) => String(option.value) === String(customerId))?.label || `Cliente ${customerId}`;
  }, [optionData, routeFilterValues]);

  const buildFormFields = (item) => {
    const mappedFields = activeConfig.fields.map((field) => defaultFieldClass(field, optionData));
    const codeField = item && activeConfig.codeField
      ? { id: activeConfig.codeField, label: 'Codigo', readOnly: true, disabled: true, mono: true }
      : null;

    if (!codeField) return mappedFields;
    if (mappedFields[0]?.type === 'section') return [mappedFields[0], codeField, ...mappedFields.slice(1)];
    return [codeField, ...mappedFields];
  };

  const openForm = (item = null) => {
    if (activeConfig.formMode === 'page') {
      const path = item
        ? (typeof activeConfig.editPath === 'function' ? activeConfig.editPath(item) : activeConfig.editPath)
        : activeConfig.createPath;
      if (path) navigate(path);
      return;
    }

    ModalManager.show({
      type: 'custom',
      title: item ? `Editar ${activeConfig.singular}` : `Nuevo ${activeConfig.singular}`,
      icon: activeConfig.formIcon || activeConfig.icon,
      size: activeConfig.size || 'large',
      showFooter: false,
      contentComponent: SimpleFormContent,
      contentProps: {
        initialValues: item ? { ...item } : { ...activeConfig.empty, ...routePrefill },
        fields: buildFormFields(item),
        submitLabel: item ? 'Guardar cambios' : 'Crear registro',
        onSubmit: async (form) => {
          const payload = {};
          activeConfig.fields.forEach((field) => {
            if (field.type === 'section') return;
            const rawValue = form[field.id];
            if (field.type === 'number') payload[field.id] = rawValue === '' || rawValue === undefined ? null : Number(rawValue);
            else if (field.type === 'checkbox') payload[field.id] = Boolean(rawValue);
            else payload[field.id] = rawValue === '' ? null : rawValue;
          });
          await notifyPromise(item ? adminMaintainersService.update(activeConfig.resource, item.id, payload) : adminMaintainersService.create(activeConfig.resource, payload), {
            loading: 'Guardando registro...',
            success: 'Registro guardado.',
            error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar.'),
          });
          await load();
        },
      },
    });
  };

  useEffect(() => {
    const openMode = searchParams.get('open');
    const recordId = Number(searchParams.get('id'));
    const tabId = searchParams.get('tab') || activeTab;
    const deepLinkKey = `${tabId}:${openMode}:${recordId}`;
    if (loading || openMode !== 'edit' || !recordId || handledDeepLinkRef.current === deepLinkKey) return;

    const targetItems = data[tabId] || [];
    const targetItem = targetItems.find((item) => Number(item.id) === recordId);
    if (!targetItem) return;

    handledDeepLinkRef.current = deepLinkKey;
    if (tabId !== activeTab) setActiveTab(tabId);
    openForm(targetItem);
    if ((tabs.find((tab) => tab.id === tabId) || activeConfig).formMode === 'page') return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('open');
    nextParams.delete('id');
    setSearchParams(nextParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, data, loading, searchParams, setSearchParams]);

  const remove = async (item) => {
    if (!await ModalManager.confirm({ title: `Eliminar ${activeConfig.singular}`, message: `Confirma eliminar este registro.`, buttons: { cancel: 'Cancelar', confirm: 'Eliminar' } })) return;
    await notifyPromise(adminMaintainersService.remove(activeConfig.resource, item.id), {
      loading: 'Eliminando...',
      success: 'Registro eliminado.',
      error: (requestError) => getBackendMessage(requestError, 'No fue posible eliminar.'),
    });
    await load();
  };

  const changeStatus = async (item) => {
    const isActive = getStatus(item, activeConfig, optionData);
    const field = activeConfig.statusField || activeConfig.activeField;
    if (!field) return;

    const configuredStatusOptions = activeConfig.statusOptionsResource
      ? (optionData[activeConfig.statusOptionsResource] || []).map((option) => {
        const metadata = activeConfig.statusChangeOptions?.find((entry) => entry.value === option.code);
        return { ...metadata, ...option, label: metadata?.label || option.label?.replace(/^[^-]+ - /, '') || option.code };
      })
      : activeConfig.statusChangeOptions;

    if (configuredStatusOptions?.length) {
      ModalManager.show({
        type: 'custom',
        title: `Cambiar estado de ${activeConfig.singular}`,
        size: 'medium',
        showFooter: false,
        contentComponent: StatusChangeContent,
        contentProps: {
          currentValue: item[field],
          options: configuredStatusOptions,
          onSubmit: async (nextValue) => {
            await notifyPromise(adminMaintainersService.update(activeConfig.resource, item.id, { [field]: nextValue }), {
              loading: 'Actualizando estado...',
              success: 'Estado actualizado.',
              error: (requestError) => getBackendMessage(requestError, 'No fue posible actualizar el estado.'),
            });
            await load();
          },
        },
      });
      return;
    }

    const nextValue = activeConfig.statusField ? (isActive ? 'INACTIVE' : (activeConfig.activeValue || 'ACTIVE')) : !isActive;
    const nextLabel = isActive ? 'inactivo' : 'activo';
    if (!await ModalManager.confirm({
      title: `Forzar estado de ${activeConfig.singular}`,
      message: `Confirma cambiar este registro a estado ${nextLabel}.`,
      buttons: { cancel: 'Cancelar', confirm: isActive ? 'Inactivar' : 'Activar' },
    })) return;

    await notifyPromise(adminMaintainersService.update(activeConfig.resource, item.id, { [field]: nextValue }), {
      loading: 'Actualizando estado...',
      success: `Registro ${nextLabel}.`,
      error: (requestError) => getBackendMessage(requestError, 'No fue posible actualizar el estado.'),
    });
    await load();
  };

  const renderStatus = (item) => {
    if (activeConfig.statusField && (activeConfig.statusChangeOptions?.length || activeConfig.statusOptionsResource)) {
      const currentValue = item[activeConfig.statusField];
      const catalogOption = getStatusOption(item, activeConfig, optionData);
      const configuredOption = activeConfig.statusChangeOptions?.find((entry) => entry.value === catalogOption?.code || String(entry.value) === String(currentValue));
      const option = configuredOption || catalogOption;
      const label = configuredOption?.label || catalogOption?.label?.replace(/^[^-]+ - /, '') || currentValue || '-';
      return <StatusBadge variant={option?.variant || statusVariantByValue[catalogOption?.code || currentValue] || (getStatus(item, activeConfig, optionData) ? 'active' : 'inactive')}>{label}</StatusBadge>;
    }
    return statusCell(getStatus(item, activeConfig, optionData));
  };

  const runRowAction = (action, item) => {
    if (action.onClick) {
      action.onClick(item, { navigate });
      return;
    }
    if (!action.path) return;

    const params = typeof action.params === 'function' ? action.params(item) : action.params || {};
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
    });
    navigate({ pathname: action.path, search: search.toString() });
  };

  const kpis = [
    { label: 'Total', value: scopedItems.length },
    { label: 'Activos', value: scopedItems.filter((item) => getStatus(item, activeConfig, optionData)).length },
    { label: 'Inactivos', value: scopedItems.filter((item) => !getStatus(item, activeConfig, optionData)).length },
    { label: 'Filtrados', value: filteredItems.length },
  ];

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mb-5 flex flex-wrap justify-between gap-3">
        <div><h1 className="text-xl font-semibold">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>
        <ActionButton label={`Nuevo ${activeConfig.singular}`} icon={Plus} disabled={activeConfig.disabled} onClick={() => openForm()} />
      </div>
      <KpiBar items={kpis} className="mb-4" />
      {tabs.length > 1 && <ModuleTabs className="mb-4" activeTab={activeTab} onChange={setActiveTab} tabs={tabs.map((tab) => ({ id: tab.id, label: tab.label, icon: tab.icon, count: (data[tab.id] || []).length }))} />}
      {scopedLabel && (
        <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
          Vista filtrada por cliente: <span className="font-semibold">{scopedLabel}</span>
        </div>
      )}
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <FilterBar className="mb-4" searchValue={search} searchPlaceholder={activeConfig.searchPlaceholder || 'Buscar registro'} onSearchChange={setSearch} fields={[{ id: 'status', value: status, onChange: setStatus, options: fieldOptions.status }]} actions={filterActions({ loading, onRefresh: load, onClear: () => { setSearch(''); setStatus('all'); } })} />
      <DataTable
        loading={loading}
        data={visibleItems}
        footer={tableFooter({ page, pageSize, total: filteredItems.length, loading, setPage, setPageSize })}
        columns={[
          ...activeConfig.tableFields.map((field) => ({
            id: field.id,
            label: field.label,
            render: (item) => field.primary ? <><div className="font-medium">{formatValue(item, field, optionData)}</div>{activeConfig.codeField && <div className="font-mono text-xs text-slate-500">{item[activeConfig.codeField]}</div>}</> : formatValue(item, field, optionData),
          })),
          ...(activeConfig.showStatus === false ? [] : [{ id: 'status', label: 'Estado', render: renderStatus }]),
          {
            id: 'actions',
            label: 'Acciones',
            align: 'right',
            render: (item) => (
              <div className="flex justify-end gap-2">
                <RowActionButton label="Editar" icon={Pencil} onClick={() => openForm(item)} />
                {(activeConfig.rowActions || []).map((action) => (
                  <RowActionButton key={action.label} label={action.label} icon={action.icon} variant={action.variant || 'neutral'} onClick={() => runRowAction(action, item)} />
                ))}
                <RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => remove(item)} />
                {activeConfig.forceStatusToggle && (
                  <RowActionButton label="Cambiar estado" icon={Power} onClick={() => changeStatus(item)} />
                )}
              </div>
            ),
          },
        ]}
      />
    </section>
  );
};

export default AdminGenericMaintainers;
