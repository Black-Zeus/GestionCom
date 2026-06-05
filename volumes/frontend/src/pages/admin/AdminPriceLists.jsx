import { useCallback, useEffect, useRef, useState } from 'react';
import { BadgeDollarSign, Layers3, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleTabs from '@/components/common/navigation/ModuleTabs';
import SimpleFormContent from '@/components/common/forms/SimpleFormContent';
import { adminMaintainersService } from '@/services/admin/adminMaintainersService';
import { businessFoundationService } from '@/services/admin/businessFoundationService';
import { measurementUnitsService } from '@/services/admin/measurementUnitsService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { activeFilter, fieldOptions, filterActions, includesTerm, statusCell, tableFooter } from './businessFoundationShared';

const scopeLabels = { ALL_PRODUCTS: 'Todos', CATEGORY: 'Categoria', SPECIFIC: 'Especificos' };
const adjustmentLabels = { PERCENTAGE: 'Porcentaje', FIXED: 'Monto fijo' };
const today = () => new Date().toISOString().slice(0, 10);

const AdminPriceLists = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const handledDeepLinkRef = useRef('');
  const [groups, setGroups] = useState([]);
  const [lists, setLists] = useState([]);
  const [items, setItems] = useState([]);
  const [variants, setVariants] = useState([]);
  const [units, setUnits] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'lists');
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextGroups, nextLists, nextItems, nextVariants, nextUnits, nextCurrencies] = await Promise.all([
        businessFoundationService.priceGroups.list({ active_only: false }),
        businessFoundationService.priceLists.list({ active_only: false }),
        businessFoundationService.priceItems.list({ active_only: false }),
        businessFoundationService.variants.list({ active_only: false }),
        measurementUnitsService.list({ active_only: false, limit: 1000 }),
        adminMaintainersService.list('currencies'),
      ]);
      setGroups(nextGroups);
      setLists(nextLists);
      setItems(nextItems);
      setVariants(nextVariants);
      setUnits(nextUnits);
      setCurrencies(nextCurrencies);
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar listas de precios.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [activeTab, search, status, pageSize]);

  useEffect(() => {
    const nextTab = searchParams.get('tab');
    const nextSearch = searchParams.get('search') || '';
    if (nextTab && ['groups', 'lists', 'items'].includes(nextTab) && nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
    if (nextSearch !== search) {
      setSearch(nextSearch);
      setPage(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const groupOptions = groups.map((group) => ({ value: String(group.id), label: `${group.group_code} - ${group.group_name}` }));
  const listOptions = lists.map((list) => ({ value: String(list.id), label: `${list.price_list_code} - ${list.price_list_name}` }));
  const variantOptions = variants.map((variant) => ({ value: String(variant.id), label: `${variant.variant_sku} - ${variant.product_name || variant.variant_name}` }));
  const unitOptions = units.map((unit) => ({ value: String(unit.id), label: `${unit.unit_code} - ${unit.unit_name}` }));
  const currencyOptions = currencies.filter((currency) => currency.is_active !== false).map((currency) => ({ value: currency.currency_code, label: `${currency.currency_code} - ${currency.currency_symbol} - ${currency.currency_name}` }));

  const openGroup = (group = null) => ModalManager.show({
    type: 'custom', title: group ? 'Editar grupo' : 'Nuevo grupo', size: 'medium', showFooter: false, contentComponent: SimpleFormContent,
    contentProps: {
      initialValues: group ? { group_code: group.group_code, group_name: group.group_name, group_description: group.group_description || '', is_active: group.is_active } : { group_name: '', group_description: '', is_active: true },
      fields: [...(group ? [{ id: 'group_code', label: 'Codigo', readOnly: true, disabled: true }] : []), { id: 'group_name', label: 'Nombre', required: true }, { id: 'group_description', label: 'Descripcion', wide: true }, { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' }],
      onSubmit: async (form) => {
        const payload = { group_name: form.group_name.trim(), group_description: form.group_description || null, is_active: Boolean(form.is_active) };
        await notifyPromise(group ? businessFoundationService.priceGroups.update(group.id, payload) : businessFoundationService.priceGroups.create(payload), { loading: 'Guardando grupo...', success: 'Grupo guardado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar.') });
        await load();
      },
    },
  });

  const openList = (list = null) => ModalManager.show({
    type: 'custom', title: list ? 'Editar lista' : 'Nueva lista', size: 'large', showFooter: false, contentComponent: SimpleFormContent,
    contentProps: {
      initialValues: list ? { price_list_code: list.price_list_code, price_list_group_id: list.price_list_group_id ? String(list.price_list_group_id) : '', price_list_name: list.price_list_name, base_price_list_id: list.base_price_list_id ? String(list.base_price_list_id) : '', base_adjustment_type: list.base_adjustment_type || '', base_adjustment_value: list.base_adjustment_value ?? '', currency_code: list.currency_code || 'CLP', valid_from: list.valid_from, valid_to: list.valid_to || '', priority: list.priority || 1, applies_to: list.applies_to || 'ALL_PRODUCTS', is_active: list.is_active } : { price_list_group_id: '', price_list_name: '', base_price_list_id: '', base_adjustment_type: '', base_adjustment_value: '', currency_code: 'CLP', valid_from: today(), valid_to: '', priority: 1, applies_to: 'ALL_PRODUCTS', is_active: true },
      fields: [
        ...(list ? [{ id: 'price_list_code', label: 'Codigo', readOnly: true, disabled: true }] : []),
        { id: 'price_list_name', label: 'Nombre', required: true },
        { id: 'price_list_group_id', label: 'Grupo', type: 'select', options: [{ value: '', label: 'Sin grupo' }, ...groupOptions] },
        { id: 'currency_code', label: 'Moneda', type: 'select', options: currencyOptions },
        { id: 'valid_from', label: 'Vigente desde', type: 'date', required: true },
        { id: 'valid_to', label: 'Vigente hasta', type: 'date' },
        { id: 'priority', label: 'Prioridad', type: 'number', min: 1 },
        { id: 'applies_to', label: 'Aplica a', type: 'select', options: Object.entries(scopeLabels).map(([value, label]) => ({ value, label })) },
        { id: 'base_price_list_id', label: 'Lista base', type: 'select', options: [{ value: '', label: 'Sin lista base' }, ...listOptions.filter((option) => !list || Number(option.value) !== Number(list.id))] },
        { id: 'base_adjustment_type', label: 'Ajuste base', type: 'select', options: [{ value: '', label: 'Sin ajuste' }, ...Object.entries(adjustmentLabels).map(([value, label]) => ({ value, label }))] },
        { id: 'base_adjustment_value', label: 'Valor ajuste', type: 'number' },
        { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activa' },
      ],
      onSubmit: async (form) => {
        const payload = { ...form, price_list_group_id: form.price_list_group_id ? Number(form.price_list_group_id) : null, base_price_list_id: form.base_price_list_id ? Number(form.base_price_list_id) : null, base_adjustment_type: form.base_adjustment_type || null, base_adjustment_value: form.base_adjustment_value === '' ? null : Number(form.base_adjustment_value), valid_to: form.valid_to || null, priority: Number(form.priority || 1) };
        delete payload.price_list_code;
        await notifyPromise(list ? businessFoundationService.priceLists.update(list.id, payload) : businessFoundationService.priceLists.create(payload), { loading: 'Guardando lista...', success: 'Lista guardada.', error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar.') });
        await load();
      },
    },
  });

  const openItem = (item = null) => ModalManager.show({
    type: 'custom', title: item ? 'Editar precio' : 'Nuevo precio', size: 'large', showFooter: false, contentComponent: SimpleFormContent,
    contentProps: {
      initialValues: item ? { price_list_id: String(item.price_list_id), product_variant_id: String(item.product_variant_id), measurement_unit_id: String(item.measurement_unit_id), base_price: item.base_price, sale_price: item.sale_price, cost_price: item.cost_price ?? '', margin_percentage: item.margin_percentage ?? '', is_active: item.is_active } : { price_list_id: listOptions[0]?.value || '', product_variant_id: variantOptions[0]?.value || '', measurement_unit_id: unitOptions[0]?.value || '', base_price: 0, sale_price: 0, cost_price: '', margin_percentage: '', is_active: true },
      fields: [
        { id: 'price_list_id', label: 'Lista', type: 'select', required: true, options: listOptions },
        { id: 'product_variant_id', label: 'SKU', type: 'select', required: true, options: variantOptions },
        { id: 'measurement_unit_id', label: 'Unidad', type: 'select', required: true, options: unitOptions },
        { id: 'base_price', label: 'Precio base', type: 'number', min: 0, required: true },
        { id: 'sale_price', label: 'Precio venta', type: 'number', min: 0, required: true },
        { id: 'cost_price', label: 'Costo', type: 'number', min: 0 },
        { id: 'margin_percentage', label: 'Margen %', type: 'number' },
        { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' },
      ],
      onSubmit: async (form) => {
        const payload = { price_list_id: Number(form.price_list_id), product_variant_id: Number(form.product_variant_id), measurement_unit_id: Number(form.measurement_unit_id), base_price: Number(form.base_price || 0), sale_price: Number(form.sale_price || 0), cost_price: form.cost_price === '' ? null : Number(form.cost_price), margin_percentage: form.margin_percentage === '' ? null : Number(form.margin_percentage), is_active: Boolean(form.is_active) };
        await notifyPromise(item ? businessFoundationService.priceItems.update(item.id, payload) : businessFoundationService.priceItems.create(payload), { loading: 'Guardando precio...', success: 'Precio guardado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar.') });
        await load();
      },
    },
  });

  useEffect(() => {
    const openMode = searchParams.get('open');
    const recordId = Number(searchParams.get('id'));
    const requestedTab = searchParams.get('tab') || activeTab;
    const deepLinkKey = `${requestedTab}:${openMode}:${recordId}`;
    if (loading || openMode !== 'edit' || !recordId || handledDeepLinkRef.current === deepLinkKey) return;

    const dataByDeepLinkTab = { groups, lists, items };
    const targetItem = dataByDeepLinkTab[requestedTab]?.find((item) => Number(item.id) === recordId);
    if (!targetItem) return;

    handledDeepLinkRef.current = deepLinkKey;
    if (requestedTab !== activeTab) {
      setActiveTab(requestedTab);
    }
    if (requestedTab === 'groups') openGroup(targetItem);
    if (requestedTab === 'lists') openList(targetItem);
    if (requestedTab === 'items') openItem(targetItem);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('open');
    nextParams.delete('id');
    setSearchParams(nextParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, items, lists, loading, searchParams, setSearchParams]);

  const remove = async (label, action) => {
    if (!await ModalManager.confirm({ title: `Eliminar ${label}`, message: `Confirma eliminar ${label}.`, buttons: { cancel: 'Cancelar', confirm: 'Eliminar' } })) return;
    await notifyPromise(action(), { loading: 'Eliminando...', success: 'Eliminado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible eliminar.') });
    await load();
  };

  const dataByTab = {
    groups: groups.filter((item) => activeFilter(status)(item) && includesTerm(item, ['group_code', 'group_name', 'group_description'], search.trim().toLowerCase())),
    lists: lists.filter((item) => activeFilter(status)(item) && includesTerm(item, ['price_list_code', 'price_list_name', 'group_name', 'currency_code'], search.trim().toLowerCase())),
    items: items.filter((item) => activeFilter(status)(item) && includesTerm(item, ['price_list_code', 'price_list_name', 'variant_sku', 'variant_name', 'product_name'], search.trim().toLowerCase())),
  };
  const activeData = dataByTab[activeTab];
  const visibleData = activeData.slice(page * pageSize, page * pageSize + pageSize);
  const actionConfig = { groups: { label: 'Nuevo grupo', onClick: () => openGroup() }, lists: { label: 'Nueva lista', onClick: () => openList() }, items: { label: 'Nuevo precio', onClick: () => openItem(), disabled: !listOptions.length || !variantOptions.length || !unitOptions.length } }[activeTab];

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mb-5 flex flex-wrap justify-between gap-3">
        <div><h1 className="text-xl font-semibold">Listas de precios</h1><p className="mt-1 text-sm text-slate-500">Grupos, listas vigentes y precios por SKU.</p></div>
        <ActionButton label={actionConfig.label} icon={Plus} disabled={actionConfig.disabled} onClick={actionConfig.onClick} />
      </div>
      <KpiBar items={[{ label: 'Listas', value: lists.length }, { label: 'Activas', value: lists.filter((item) => item.is_active).length }, { label: 'Grupos', value: groups.length }, { label: 'Precios SKU', value: items.length }]} className="mb-4" />
      <ModuleTabs className="mb-4" activeTab={activeTab} onChange={setActiveTab} tabs={[{ id: 'lists', label: 'Listas', icon: BadgeDollarSign, count: lists.length }, { id: 'items', label: 'Precios SKU', icon: ListChecks, count: items.length }, { id: 'groups', label: 'Grupos', icon: Layers3, count: groups.length }]} />
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <FilterBar className="mb-4" searchValue={search} searchPlaceholder="Buscar codigo, nombre o SKU" onSearchChange={setSearch} fields={[{ id: 'status', value: status, onChange: setStatus, options: fieldOptions.status }]} actions={filterActions({ loading, onRefresh: load, onClear: () => { setSearch(''); setStatus('all'); } })} />
      {activeTab === 'groups' && <DataTable loading={loading} data={visibleData} footer={tableFooter({ page, pageSize, total: activeData.length, loading, setPage, setPageSize })} columns={[{ id: 'group', label: 'Grupo', render: (item) => <><div className="font-medium">{item.group_name}</div><div className="font-mono text-xs text-slate-500">{item.group_code}</div></> }, { id: 'description', label: 'Descripcion', render: (item) => item.group_description || '-' }, { id: 'status', label: 'Estado', render: (item) => statusCell(item.is_active) }, { id: 'actions', label: 'Acciones', align: 'right', render: (item) => <div className="flex justify-end gap-2"><RowActionButton label="Editar" icon={Pencil} onClick={() => openGroup(item)} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => remove('grupo', () => businessFoundationService.priceGroups.remove(item.id))} /></div> }]} />}
      {activeTab === 'lists' && <DataTable loading={loading} data={visibleData} footer={tableFooter({ page, pageSize, total: activeData.length, loading, setPage, setPageSize })} columns={[{ id: 'list', label: 'Lista', render: (item) => <><div className="font-medium">{item.price_list_name}</div><div className="font-mono text-xs text-slate-500">{item.price_list_code}</div></> }, { id: 'group', label: 'Grupo', render: (item) => item.group_name || '-' }, { id: 'currency', label: 'Moneda', render: (item) => item.currency_code }, { id: 'scope', label: 'Aplica a', render: (item) => scopeLabels[item.applies_to] || item.applies_to }, { id: 'validity', label: 'Vigencia', render: (item) => `${item.valid_from || '-'} / ${item.valid_to || 'sin termino'}` }, { id: 'status', label: 'Estado', render: (item) => statusCell(item.is_active) }, { id: 'actions', label: 'Acciones', align: 'right', render: (item) => <div className="flex justify-end gap-2"><RowActionButton label="Editar" icon={Pencil} onClick={() => openList(item)} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => remove('lista', () => businessFoundationService.priceLists.remove(item.id))} /></div> }]} />}
      {activeTab === 'items' && <DataTable loading={loading} data={visibleData} footer={tableFooter({ page, pageSize, total: activeData.length, loading, setPage, setPageSize })} columns={[{ id: 'list', label: 'Lista', render: (item) => <><div className="font-medium">{item.price_list_name}</div><div className="font-mono text-xs text-slate-500">{item.price_list_code}</div></> }, { id: 'sku', label: 'SKU', render: (item) => <><div className="font-medium">{item.product_name || item.variant_name}</div><div className="font-mono text-xs text-slate-500">{item.variant_sku}</div></> }, { id: 'unit', label: 'Unidad', render: (item) => item.unit_code }, { id: 'base', label: 'Base', render: (item) => Number(item.base_price || 0).toLocaleString('es-CL') }, { id: 'sale', label: 'Venta', render: (item) => Number(item.sale_price || 0).toLocaleString('es-CL') }, { id: 'status', label: 'Estado', render: (item) => statusCell(item.is_active) }, { id: 'actions', label: 'Acciones', align: 'right', render: (item) => <div className="flex justify-end gap-2"><RowActionButton label="Editar" icon={Pencil} onClick={() => openItem(item)} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => remove('precio', () => businessFoundationService.priceItems.remove(item.id))} /></div> }]} />}
    </section>
  );
};

export default AdminPriceLists;
