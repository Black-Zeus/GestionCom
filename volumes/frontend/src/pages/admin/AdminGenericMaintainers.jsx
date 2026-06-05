/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleTabs from '@/components/common/navigation/ModuleTabs';
import SimpleFormContent from '@/components/common/forms/SimpleFormContent';
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
});

const getStatus = (item, config) => {
  if (config.statusField) return item[config.statusField] === (config.activeValue || 'ACTIVE');
  if (config.activeField) return item[config.activeField] !== false;
  return true;
};

const formatValue = (item, field) => {
  const value = item[field.id];
  if (field.format) return field.format(value, item);
  if (field.options) return field.options.find((option) => String(option.value) === String(value))?.label || value || '-';
  if (typeof value === 'boolean') return value ? 'Si' : 'No';
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
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
  if (row.document_type_name) return `${row.document_type_code ? `${row.document_type_code} - ` : ''}${row.document_type_name}`;
  if (row.legal_name) return `${row.customer_code || row.supplier_code ? `${row.customer_code || row.supplier_code} - ` : ''}${row.legal_name}`;
  if (row.username) return `${row.username} - ${[row.first_name, row.last_name].filter(Boolean).join(' ') || row.email || 'Usuario'}`;
  return row.name || row.label || String(row.id);
};

const filterItems = (items, config, search, status) => {
  const term = search.trim().toLowerCase();
  return items.filter((item) => {
    const matchesStatus = status === 'all' || (status === 'active' ? getStatus(item, config) : !getStatus(item, config));
    const values = config.searchFields || config.tableFields.map((field) => field.id);
    const matchesSearch = !term || values.some((field) => String(item[field] || '').toLowerCase().includes(term));
    return matchesStatus && matchesSearch;
  });
};

const AdminGenericMaintainers = ({ title, description, tabs, initialTab }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const handledDeepLinkRef = useRef('');
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || initialTab || tabs[0].id);
  const [data, setData] = useState({});
  const [optionData, setOptionData] = useState({});
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeConfig = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const entries = await Promise.all(tabs.map(async (tab) => [tab.id, await adminMaintainersService.list(tab.resource)]));
      setData(Object.fromEntries(entries));
      const optionResources = [...new Set(tabs.flatMap((tab) => tab.fields.map((field) => field.optionsResource).filter(Boolean)))];
      if (optionResources.length) {
        const optionEntries = await Promise.all(optionResources.map(async (resource) => [resource, await adminMaintainersService.list(resource)]));
        setOptionData(Object.fromEntries(optionEntries.map(([resource, rows]) => [
          resource,
          rows.filter((row) => row.is_active !== false).map((row) => ({
            value: String(row.currency_code || row.id),
            label: optionLabel(row),
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
  const filteredItems = useMemo(() => filterItems(activeItems, activeConfig, search, status), [activeConfig, activeItems, search, status]);
  const visibleItems = filteredItems.slice(page * pageSize, page * pageSize + pageSize);

  const openForm = (item = null) => ModalManager.show({
    type: 'custom',
    title: item ? `Editar ${activeConfig.singular}` : `Nuevo ${activeConfig.singular}`,
    size: activeConfig.size || 'large',
    showFooter: false,
    contentComponent: SimpleFormContent,
    contentProps: {
      initialValues: item ? { ...item } : activeConfig.empty,
      fields: [
        ...(item && activeConfig.codeField ? [{ id: activeConfig.codeField, label: 'Codigo', readOnly: true, disabled: true }] : []),
        ...activeConfig.fields.map((field) => defaultFieldClass(field, optionData)),
      ],
      onSubmit: async (form) => {
        const payload = {};
        activeConfig.fields.forEach((field) => {
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

  const kpis = [
    { label: 'Total', value: activeItems.length },
    { label: 'Activos', value: activeItems.filter((item) => getStatus(item, activeConfig)).length },
    { label: 'Inactivos', value: activeItems.filter((item) => !getStatus(item, activeConfig)).length },
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
            render: (item) => field.primary ? <><div className="font-medium">{formatValue(item, field)}</div>{activeConfig.codeField && <div className="font-mono text-xs text-slate-500">{item[activeConfig.codeField]}</div>}</> : formatValue(item, field),
          })),
          ...(activeConfig.showStatus === false ? [] : [{ id: 'status', label: 'Estado', render: (item) => statusCell(getStatus(item, activeConfig)) }]),
          { id: 'actions', label: 'Acciones', align: 'right', render: (item) => <div className="flex justify-end gap-2"><RowActionButton label="Editar" icon={Pencil} onClick={() => openForm(item)} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => remove(item)} /></div> },
        ]}
      />
    </section>
  );
};

export default AdminGenericMaintainers;
