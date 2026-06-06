/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, EyeOff, FileText, Pencil, RefreshCw, Trash2, XCircle } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import DataTablePagination from '@/components/common/data/DataTablePagination';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleTabs from '@/components/common/navigation/ModuleTabs';
import StatusBadge from '@/components/common/data/StatusBadge';
import { documentConfigService } from '@/services/admin/documentConfigService';
import { warehousesService } from '@/services/admin/warehousesService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-950';
const categoryLabels = { PURCHASE: 'Compra', SALE: 'Venta', INVENTORY: 'Inventario', TRANSFER: 'Transferencia' };
const movementLabels = { IN: 'Entrada', OUT: 'Salida', TRANSFER: 'Transferencia', ADJUSTMENT: 'Ajuste' };
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 150, 200];

const SeriesModal = ({ initialValues, types, warehouses, onSubmit, onClose }) => {
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        document_type_id: Number(form.document_type_id),
        warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : null,
        series_prefix: form.series_prefix.trim() || null,
        current_number: Number(form.current_number || 0),
        min_number: Number(form.min_number || 1),
        max_number: Number(form.max_number || 999999999),
        number_length: Number(form.number_length || 8),
        is_active: Boolean(form.is_active),
      });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        {form.series_code && <label className="space-y-1 text-sm"><span className="font-medium">Codigo</span><input className={`${fieldClassName} font-mono`} value={form.series_code} disabled readOnly /></label>}
        <label className="space-y-1 text-sm"><span className="font-medium">Tipo documento</span><select className={`${fieldClassName} bg-white dark:bg-slate-950`} value={form.document_type_id} onChange={(event) => setField('document_type_id', event.target.value)} required><option value="">Selecciona tipo</option>{types.map((type) => <option key={type.id} value={type.id}>{type.document_type_code} - {type.document_type_name}</option>)}</select></label>
        <label className="space-y-1 text-sm"><span className="font-medium">Bodega</span><select className={`${fieldClassName} bg-white dark:bg-slate-950`} value={form.warehouse_id} onChange={(event) => setField('warehouse_id', event.target.value)}><option value="">Global</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.warehouse_code} - {warehouse.warehouse_name}</option>)}</select></label>
        <label className="space-y-1 text-sm"><span className="font-medium">Prefijo</span><input className={fieldClassName} value={form.series_prefix} onChange={(event) => setField('series_prefix', event.target.value.toUpperCase())} maxLength={10} /></label>
        <label className="space-y-1 text-sm"><span className="font-medium">Actual</span><input className={fieldClassName} type="number" min="0" value={form.current_number} onChange={(event) => setField('current_number', event.target.value)} /></label>
        <label className="space-y-1 text-sm"><span className="font-medium">Minimo</span><input className={fieldClassName} type="number" min="1" value={form.min_number} onChange={(event) => setField('min_number', event.target.value)} /></label>
        <label className="space-y-1 text-sm"><span className="font-medium">Maximo</span><input className={fieldClassName} type="number" min="1" value={form.max_number} onChange={(event) => setField('max_number', event.target.value)} /></label>
        <label className="space-y-1 text-sm"><span className="font-medium">Largo numero</span><input className={fieldClassName} type="number" min="1" max="18" value={form.number_length} onChange={(event) => setField('number_length', event.target.value)} /></label>
        <label className="flex h-11 items-center gap-2 rounded-md border px-3 text-sm dark:border-slate-700"><input type="checkbox" checked={form.is_active} onChange={(event) => setField('is_active', event.target.checked)} />Activa</label>
      </div>
      <div className="flex justify-end gap-2 border-t pt-4 dark:border-slate-800"><button type="button" onClick={onClose} className="h-10 rounded-md border px-4 text-sm dark:border-slate-700">Cancelar</button><button disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm text-white dark:bg-white dark:text-slate-950">{saving ? 'Guardando...' : 'Guardar'}</button></div>
    </form>
  );
};

const TypeModal = ({ initialValues, onSubmit, onClose }) => {
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ document_type_name: form.document_type_name.trim(), document_category: form.document_category, requires_approval: Boolean(form.requires_approval), generates_movement: Boolean(form.generates_movement), movement_type: form.generates_movement ? form.movement_type || null : null, is_active: Boolean(form.is_active) });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm"><span className="font-medium">Codigo</span><input className={`${fieldClassName} font-mono`} value={form.document_type_code} disabled readOnly /></label>
        <label className="space-y-1 text-sm"><span className="font-medium">Nombre</span><input className={fieldClassName} value={form.document_type_name} onChange={(event) => setField('document_type_name', event.target.value)} required /></label>
        <label className="space-y-1 text-sm"><span className="font-medium">Categoria</span><select className={`${fieldClassName} bg-white dark:bg-slate-950`} value={form.document_category} onChange={(event) => setField('document_category', event.target.value)}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="space-y-1 text-sm"><span className="font-medium">Movimiento</span><select className={`${fieldClassName} bg-white dark:bg-slate-950`} value={form.movement_type || ''} onChange={(event) => setField('movement_type', event.target.value)} disabled={!form.generates_movement}><option value="">Sin movimiento</option>{Object.entries(movementLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="flex h-11 items-center gap-2 rounded-md border px-3 text-sm dark:border-slate-700"><input type="checkbox" checked={form.requires_approval} onChange={(event) => setField('requires_approval', event.target.checked)} />Requiere aprobacion</label>
        <label className="flex h-11 items-center gap-2 rounded-md border px-3 text-sm dark:border-slate-700"><input type="checkbox" checked={form.generates_movement} onChange={(event) => setField('generates_movement', event.target.checked)} />Genera movimiento</label>
        <label className="flex h-11 items-center gap-2 rounded-md border px-3 text-sm dark:border-slate-700"><input type="checkbox" checked={form.is_active} onChange={(event) => setField('is_active', event.target.checked)} />Activo</label>
      </div>
      <div className="flex justify-end gap-2 border-t pt-4 dark:border-slate-800"><button type="button" onClick={onClose} className="h-10 rounded-md border px-4 text-sm dark:border-slate-700">Cancelar</button><button disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm text-white dark:bg-white dark:text-slate-950">{saving ? 'Guardando...' : 'Guardar'}</button></div>
    </form>
  );
};

const seriesToForm = (series = {}) => ({ series_code: series.series_code || '', document_type_id: series.document_type_id ? String(series.document_type_id) : '', warehouse_id: series.warehouse_id ? String(series.warehouse_id) : '', series_prefix: series.series_prefix || '', current_number: String(series.current_number ?? 0), min_number: String(series.min_number ?? 1), max_number: String(series.max_number ?? 999999999), number_length: String(series.number_length ?? 8), is_active: series.is_active !== false });

const AdminDocumentSeries = () => {
  const [types, setTypes] = useState([]);
  const [series, setSeries] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [activeTab, setActiveTab] = useState('types');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ typeStatus: 'all', category: 'all', seriesStatus: 'all', warehouseId: 'all' });
  const [page, setPage] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextTypes, nextSeries, nextWarehouses] = await Promise.all([
        documentConfigService.listTypes({ active_only: false }),
        documentConfigService.listSeries({ active_only: false }),
        warehousesService.list({ active_only: true, limit: 1000 }).catch(() => []),
      ]);
      setTypes(nextTypes);
      setSeries(nextSeries);
      setWarehouses(nextWarehouses);
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar documentos.'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { setSearch(''); }, [activeTab]);
  useEffect(() => { setPage(0); }, [activeTab, filters, search, tablePageSize]);

  const openType = (type) => ModalManager.show({ type: 'custom', title: 'Editar tipo de documento', size: 'large', showFooter: false, contentComponent: TypeModal, contentProps: { initialValues: type, onSubmit: async (payload) => { await notifyPromise(documentConfigService.updateType(type.id, payload), { loading: 'Guardando tipo...', success: 'Tipo guardado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar.') }); await load(); } } });
  const openSeries = (item = null) => ModalManager.show({ type: 'custom', title: item ? 'Editar serie' : 'Nueva serie', size: 'large', showFooter: false, contentComponent: SeriesModal, contentProps: { initialValues: seriesToForm(item), types, warehouses, onSubmit: async (payload) => { await notifyPromise(item ? documentConfigService.updateSeries(item.id, payload) : documentConfigService.createSeries(payload), { loading: 'Guardando serie...', success: 'Serie guardada.', error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar.') }); await load(); } } });
  const removeSeries = async (item) => {
    if (!await ModalManager.confirm({ title: 'Eliminar serie', message: `Eliminar ${item.series_code}.`, buttons: { cancel: 'Cancelar', confirm: 'Eliminar' } })) return;
    await notifyPromise(documentConfigService.removeSeries(item.id), { loading: 'Eliminando...', success: 'Serie eliminada.', error: (requestError) => getBackendMessage(requestError, 'No fue posible eliminar.') });
    await load();
  };

  const stats = useMemo(() => ({ types: types.length, activeTypes: types.filter((item) => item.is_active).length, series: series.length, activeSeries: series.filter((item) => item.is_active).length }), [series, types]);
  const filteredTypes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return types.filter((item) => {
      const matchesStatus = filters.typeStatus === 'all' || (filters.typeStatus === 'active' && item.is_active) || (filters.typeStatus === 'inactive' && !item.is_active);
      const matchesCategory = filters.category === 'all' || item.document_category === filters.category;
      const matchesSearch = !term || [item.document_type_code, item.document_type_name, categoryLabels[item.document_category], movementLabels[item.movement_type]].filter(Boolean).some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [filters.category, filters.typeStatus, search, types]);
  const filteredSeries = useMemo(() => {
    const term = search.trim().toLowerCase();
    return series.filter((item) => {
      const matchesStatus = filters.seriesStatus === 'all' || (filters.seriesStatus === 'active' && item.is_active) || (filters.seriesStatus === 'inactive' && !item.is_active);
      const matchesWarehouse = filters.warehouseId === 'all' || String(item.warehouse_id || '') === filters.warehouseId;
      const matchesSearch = !term || [item.series_code, item.series_prefix, item.document_type_code, item.document_type_name, item.warehouse_code, item.warehouse_name].filter(Boolean).some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesWarehouse && matchesSearch;
    });
  }, [filters.seriesStatus, filters.warehouseId, search, series]);
  const filterFields = activeTab === 'types'
    ? [
      { id: 'typeStatus', value: filters.typeStatus, onChange: (value) => setFilters((current) => ({ ...current, typeStatus: value })), options: [{ value: 'all', label: 'Todos los estados' }, { value: 'active', label: 'Activos' }, { value: 'inactive', label: 'Inactivos' }] },
      { id: 'category', value: filters.category, onChange: (value) => setFilters((current) => ({ ...current, category: value })), options: [{ value: 'all', label: 'Todas las categorias' }, ...Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))] },
    ]
    : [
      { id: 'seriesStatus', value: filters.seriesStatus, onChange: (value) => setFilters((current) => ({ ...current, seriesStatus: value })), options: [{ value: 'all', label: 'Todos los estados' }, { value: 'active', label: 'Activas' }, { value: 'inactive', label: 'Inactivas' }] },
      { id: 'warehouseId', value: filters.warehouseId, onChange: (value) => setFilters((current) => ({ ...current, warehouseId: value })), options: [{ value: 'all', label: 'Todas las bodegas' }, { value: '', label: 'Global' }, ...warehouses.map((warehouse) => ({ value: String(warehouse.id), label: `${warehouse.warehouse_code} - ${warehouse.warehouse_name}` }))] },
    ];
  const activeData = activeTab === 'types' ? filteredTypes : filteredSeries;
  const visibleData = activeData.slice(page * tablePageSize, page * tablePageSize + tablePageSize);
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

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mb-5 flex flex-wrap justify-between gap-3">
        <div><h1 className="text-xl font-semibold">Tipos y series de documentos</h1><p className="mt-1 text-sm text-slate-500">Catalogo funcional de tipos y numeracion operacional.</p></div>
        {activeTab === 'series' && <ActionButton label="Nueva serie" onClick={() => openSeries()} />}
      </div>
      <KpiBar items={[{ label: 'Tipos', value: stats.types }, { label: 'Tipos activos', value: stats.activeTypes }, { label: 'Series', value: stats.series }, { label: 'Series activas', value: stats.activeSeries }]} className="mb-4" />
      <ModuleTabs
        className="mb-4"
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'types', label: 'Tipos', icon: FileText, count: types.length },
          { id: 'series', label: 'Series', icon: ClipboardList, count: series.length },
        ]}
      />
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {activeTab === 'types' && (
        <>
        <FilterBar
          className="mb-4"
          searchValue={search}
          searchPlaceholder="Buscar tipo, codigo o movimiento"
          onSearchChange={setSearch}
          onSearchSubmit={() => {}}
          fields={filterFields}
          actions={<><ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={load} className={loading ? '[&>svg]:animate-spin' : ''} /><ActionButton label="Limpiar" icon={XCircle} variant="neutral" onClick={() => { setSearch(''); setFilters((current) => ({ ...current, typeStatus: 'all', category: 'all' })); }} /></>}
        />
        <DataTable loading={loading} data={visibleData} footer={pagination} columns={[
          { id: 'type', label: 'Tipo', render: (item) => <><div className="font-medium">{item.document_type_name}</div><div className="font-mono text-xs text-slate-500">{item.document_type_code}</div></> },
          { id: 'category', label: 'Categoria', render: (item) => categoryLabels[item.document_category] || item.document_category },
          { id: 'movement', label: 'Movimiento', render: (item) => item.generates_movement ? movementLabels[item.movement_type] || item.movement_type : 'No genera' },
          { id: 'status', label: 'Estado', render: (item) => <StatusBadge variant={item.is_active ? 'active' : 'inactive'}>{item.is_active ? 'Activo' : 'Inactivo'}</StatusBadge> },
          { id: 'actions', label: 'Acciones', align: 'right', render: (item) => <RowActionButton label="Editar" icon={Pencil} onClick={() => openType(item)} /> },
        ]} />
        </>
      )}
      {activeTab === 'series' && (
        <>
        <FilterBar
          className="mb-4"
          searchValue={search}
          searchPlaceholder="Buscar serie, tipo o bodega"
          onSearchChange={setSearch}
          onSearchSubmit={() => {}}
          fields={filterFields}
          actions={<><ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={load} className={loading ? '[&>svg]:animate-spin' : ''} /><ActionButton label="Limpiar" icon={XCircle} variant="neutral" onClick={() => { setSearch(''); setFilters((current) => ({ ...current, seriesStatus: 'all', warehouseId: 'all' })); }} /></>}
        />
        <DataTable loading={loading} data={visibleData} footer={pagination} columns={[
          { id: 'series', label: 'Serie', render: (item) => <><div className="font-medium">{item.series_code}</div><div className="text-xs text-slate-500">{item.series_prefix || 'Sin prefijo'}</div></> },
          { id: 'type', label: 'Tipo', render: (item) => item.document_type_name },
          { id: 'warehouse', label: 'Bodega', render: (item) => item.warehouse_name || 'Global' },
          { id: 'range', label: 'Rango', render: (item) => <span className="text-xs">{item.current_number} / {item.max_number}</span> },
          { id: 'status', label: 'Estado', render: (item) => <StatusBadge variant={item.is_active ? 'active' : 'inactive'}>{item.is_active ? 'Activa' : 'Inactiva'}</StatusBadge> },
          { id: 'actions', label: 'Acciones', align: 'right', render: (item) => <div className="flex justify-end gap-2"><RowActionButton label="Editar" icon={Pencil} onClick={() => openSeries(item)} /><RowActionButton label={item.is_active ? 'Desactivar' : 'Activar'} icon={item.is_active ? EyeOff : CheckCircle2} onClick={() => openSeries({ ...item, is_active: !item.is_active })} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => removeSeries(item)} /></div> },
        ]} />
        </>
      )}
    </section>
  );
};

export default AdminDocumentSeries;
