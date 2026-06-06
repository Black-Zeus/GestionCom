/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Image, Pencil, Plus, Power, Trash2 } from 'lucide-react';
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
import { formatPhone } from '@/utils/phone';
import { formatRut } from '@/utils/rut';
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
  checkLabel: field.checkLabel,
  rows: field.rows,
  mono: field.mono,
  span: field.span,
  icon: field.icon,
  leadingIcon: field.leadingIcon,
  columns: field.columns,
  description: field.description,
  readOnly: field.readOnly,
  disabled: field.disabled,
  validation: field.validation,
  render: field.render,
  localOptions: field.localOptions,
  showOptionDescription: field.showOptionDescription,
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
  const value = item[field.id] ?? (field.fallbackField ? item[field.fallbackField] : undefined);
  if (field.optionsResource) {
    const option = (optionData[field.optionsResource] || []).find((entry) => String(entry.value) === String(value));
    if (option) return option.label;
  }
  if (field.format) return field.format(value, item);
  if (field.options) return field.options.find((option) => String(option.value) === String(value))?.label || value || '-';
  if (field.validation === 'rut' || /(^|_)tax_id$/.test(field.id) || field.id === 'company_rut') return formatRut(value);
  if (field.validation === 'phone' || field.id === 'phone' || field.id === 'mobile') return formatPhone(value);
  if (typeof value === 'boolean') return value ? 'Si' : 'No';
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

const isRowActionDisabled = (action, item) => (
  typeof action.disabled === 'function' ? action.disabled(item) : Boolean(action.disabled)
);

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

const openExpandedMedia = (entry) => ModalManager.show({
  type: 'custom',
  title: entry.label,
  size: entry.label === 'Banner' ? 'fullscreenWide' : 'large',
  showFooter: false,
  content: (
    <div className={`flex items-center justify-center rounded-md bg-slate-950/95 ${entry.label === 'Banner' ? 'p-2' : 'p-3'}`}>
      <img src={entry.fullSrc || entry.src} alt={entry.label} className={`${entry.label === 'Banner' ? 'max-h-[76vh]' : 'max-h-[72vh]'} max-w-full object-contain`} />
    </div>
  ),
});

const EntityMediaViewer = ({ item, entityLabel = 'registro' }) => {
  const media = [
    { label: 'Logo', src: item.logo?.thumb_url, fullSrc: item.logo?.full_url, ratio: 'aspect-square' },
    { label: 'Banner', src: item.banner?.thumb_url, fullSrc: item.banner?.full_url, ratio: 'aspect-[16/5]' },
  ].filter((entry) => entry.src);

  if (!media.length) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
        <Image className="mx-auto h-10 w-10 text-slate-400" />
        <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Sin imagenes cargadas</p>
        <p className="mt-1 text-xs text-slate-500">Puedes agregar logo o banner desde la edicion de {entityLabel}.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {media.map((entry) => (
        <div key={entry.label} className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
          <button
            type="button"
            className={`block w-full overflow-hidden rounded-md bg-slate-100 outline-none transition hover:ring-2 hover:ring-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-slate-900 ${entry.ratio}`}
            onClick={() => openExpandedMedia(entry)}
            aria-label={`Ampliar ${entry.label}`}
          >
            <img src={entry.src} alt={entry.label} className="h-full w-full object-contain p-3" />
          </button>
          <p className="mt-3 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">{entry.label}</p>
        </div>
      ))}
    </div>
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

const displayLabelWithoutCode = (value = '') => String(value).replace(/^[A-Z]+_[A-Z]+_\d+\s*-\s*/, '').trim();

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
  const [relatedData, setRelatedData] = useState({});
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
      const relatedResources = [...new Set(tabs.flatMap((tab) => tab.extraResources || []))];
      if (relatedResources.length) {
        const relatedEntries = await Promise.all(relatedResources.map(async (resource) => [resource, await adminMaintainersService.list(resource)]));
        setRelatedData(Object.fromEntries(relatedEntries));
      } else {
        setRelatedData({});
      }
      const optionResources = [...new Set(tabs.flatMap((tab) => [
        ...tab.fields.map((field) => (field.localOptions ? null : field.optionsResource)).filter(Boolean),
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
  const activeScope = activeConfig.scope;
  const scopedLabel = useMemo(() => {
    if (!activeScope?.field || !activeScope?.optionsResource) return '';
    const scopedValue = routeFilterValues[activeScope.field];
    if (!scopedValue) return '';
    const label = (optionData[activeScope.optionsResource] || []).find((option) => String(option.value) === String(scopedValue))?.label;
    return label ? displayLabelWithoutCode(label) : activeScope.fallback || 'Registro';
  }, [activeScope, optionData, routeFilterValues]);
  const pageTitle = scopedLabel ? `${title} - ${scopedLabel}` : title;
  const pageDescription = scopedLabel && activeConfig.detailDescription ? activeConfig.detailDescription : description;
  const renderTableValue = (item, field) => {
    const detailValue = typeof field.detailResolver === 'function'
      ? field.detailResolver(item, { relatedData, optionData })
      : (field.detailField ? item[field.detailField] : '');
    return (
      <>
        <div className={field.primary ? 'font-medium' : ''}>{formatValue(item, field, optionData)}</div>
        {detailValue && <div className="text-xs text-slate-500">{detailValue}</div>}
        {field.primary && !detailValue && activeConfig.codeField && <div className="font-mono text-xs text-slate-500">{item[activeConfig.codeField]}</div>}
      </>
    );
  };

  const buildFormFields = (item) => {
    const mappedFields = [];
    activeConfig.fields.forEach((field, index) => {
      if (routePrefill[field.id]) {
        const previousField = mappedFields[mappedFields.length - 1];
        const nextField = activeConfig.fields[index + 1];
        if (previousField?.type === 'section' && nextField?.type === 'section') mappedFields.pop();
        return;
      }
      mappedFields.push(defaultFieldClass(field, optionData));
    });
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
            if (field.type === 'section' || field.type === 'custom') return;
            const rawValue = form[field.id];
            if (field.type === 'number' || field.type === 'amount') payload[field.id] = rawValue === '' || rawValue === undefined ? null : Number(String(rawValue).replace(/[^\d.-]/g, ''));
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

  const openMedia = (item) => {
    const title = formatValue(item, activeConfig.tableFields.find((field) => field.primary) || activeConfig.tableFields[0], optionData);
    ModalManager.show({
      type: 'custom',
      title: `Media de ${title}`,
      size: 'large',
      showFooter: true,
      content: <EntityMediaViewer item={item} entityLabel={activeConfig.singular} />,
    });
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
    if (isRowActionDisabled(action, item)) return;
    if (action.type === 'media') {
      openMedia(item);
      return;
    }
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
        <div><h1 className="text-xl font-semibold">{pageTitle}</h1><p className="mt-1 text-sm text-slate-500">{pageDescription}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          {scopedLabel && (
            <ActionButton label="Volver" icon={ArrowLeft} variant="neutral" onClick={() => navigate(activeScope?.backPath || '..')} />
          )}
          <ActionButton label={`Nuevo ${activeConfig.singular}`} icon={Plus} disabled={activeConfig.disabled} onClick={() => openForm()} />
        </div>
      </div>
      <KpiBar items={kpis} className="mb-4" />
      {tabs.length > 1 && <ModuleTabs className="mb-4" activeTab={activeTab} onChange={setActiveTab} tabs={tabs.map((tab) => ({ id: tab.id, label: tab.label, icon: tab.icon, count: (data[tab.id] || []).length }))} />}
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
            render: (item) => (field.primary || field.detailField || field.detailResolver ? renderTableValue(item, field) : formatValue(item, field, optionData)),
          })),
          ...(activeConfig.showStatus === false ? [] : [{ id: 'status', label: 'Estado', render: renderStatus }]),
          {
            id: 'actions',
            label: 'Acciones',
            align: 'right',
            render: (item) => (
              <div className="inline-grid grid-cols-3 gap-2">
                <RowActionButton label="Editar" icon={Pencil} onClick={() => openForm(item)} />
                {(activeConfig.rowActions || []).map((action) => {
                  const disabled = isRowActionDisabled(action, item);
                  return (
                    <RowActionButton
                      key={action.label}
                      label={disabled && action.disabledLabel ? action.disabledLabel : action.label}
                      icon={action.icon}
                      variant={action.variant || 'neutral'}
                      disabled={disabled}
                      onClick={() => runRowAction(action, item)}
                    />
                  );
                })}
                <RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => remove(item)} />
                {(activeConfig.forceStatusToggle || activeConfig.statusField || activeConfig.activeField) && (
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
