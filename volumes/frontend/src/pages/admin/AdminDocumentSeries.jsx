/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, EyeOff, Pencil, Trash2, XCircle } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import StatusBadge from '@/components/common/data/StatusBadge';
import { documentConfigService } from '@/services/admin/documentConfigService';
import { warehousesService } from '@/services/admin/warehousesService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { tableFooter, filterActions, PAGE_SIZE_OPTIONS } from '@/pages/admin/businessFoundationShared';

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-950';

const seriesToForm = (series = {}) => ({
  series_code: series.series_code || '',
  document_type_id: series.document_type_id ? String(series.document_type_id) : '',
  warehouse_id: series.warehouse_id ? String(series.warehouse_id) : '',
  series_prefix: series.series_prefix || '',
  current_number: String(series.current_number ?? 0),
  min_number: String(series.min_number ?? 1),
  max_number: String(series.max_number ?? 999999999),
  number_length: String(series.number_length ?? 8),
  is_active: series.is_active !== false,
});

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
        <label className="space-y-1 text-sm">
          <span className="font-medium">Tipo documento</span>
          <select className={`${fieldClassName} bg-white dark:bg-slate-950`} value={form.document_type_id} onChange={(e) => setField('document_type_id', e.target.value)} required>
            <option value="">Selecciona tipo</option>
            {types.map((type) => <option key={type.id} value={type.id}>{type.document_type_code} - {type.document_type_name}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Bodega</span>
          <select className={`${fieldClassName} bg-white dark:bg-slate-950`} value={form.warehouse_id} onChange={(e) => setField('warehouse_id', e.target.value)}>
            <option value="">Global</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.warehouse_code} - {w.warehouse_name}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Prefijo</span>
          <input className={fieldClassName} value={form.series_prefix} onChange={(e) => setField('series_prefix', e.target.value.toUpperCase())} maxLength={10} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Actual</span>
          <input className={fieldClassName} type="number" min="0" value={form.current_number} onChange={(e) => setField('current_number', e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Minimo</span>
          <input className={fieldClassName} type="number" min="1" value={form.min_number} onChange={(e) => setField('min_number', e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Maximo</span>
          <input className={fieldClassName} type="number" min="1" value={form.max_number} onChange={(e) => setField('max_number', e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Largo numero</span>
          <input className={fieldClassName} type="number" min="1" max="18" value={form.number_length} onChange={(e) => setField('number_length', e.target.value)} />
        </label>
        <label className="flex h-11 items-center gap-2 rounded-md border px-3 text-sm dark:border-slate-700">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setField('is_active', e.target.checked)} />
          Activa
        </label>
      </div>
      <div className="flex justify-end gap-2 border-t pt-4 dark:border-slate-800">
        <button type="button" onClick={onClose} className="h-10 rounded-md border px-4 text-sm dark:border-slate-700">Cancelar</button>
        <button disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm text-white dark:bg-white dark:text-slate-950">{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </form>
  );
};

const AdminDocumentSeries = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeId = searchParams.get('typeId');
  const typeName = searchParams.get('typeName');

  const [series, setSeries] = useState([]);
  const [types, setTypes] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ seriesStatus: 'all', warehouseId: 'all' });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [nextSeries, nextTypes, nextWarehouses] = await Promise.all([
        documentConfigService.listSeries({ active_only: false }),
        documentConfigService.listTypes({ active_only: false }),
        warehousesService.list({ active_only: true, limit: 1000 }).catch(() => []),
      ]);
      setSeries(nextSeries);
      setTypes(nextTypes);
      setWarehouses(nextWarehouses);
      setPage(0);
    } catch (err) {
      ModalManager.error({ title: 'Error', message: getBackendMessage(err, 'No fue posible cargar series.') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    total: series.length,
    active: series.filter((s) => s.is_active).length,
  }), [series]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return series.filter((item) => {
      if (typeId && String(item.document_type_id) !== typeId) return false;
      const matchStatus = filters.seriesStatus === 'all' || (filters.seriesStatus === 'active' && item.is_active) || (filters.seriesStatus === 'inactive' && !item.is_active);
      const matchWarehouse = filters.warehouseId === 'all' || String(item.warehouse_id || '') === filters.warehouseId;
      const matchSearch = !term || [item.series_code, item.series_prefix, item.document_type_code, item.document_type_name, item.warehouse_code, item.warehouse_name].filter(Boolean).some((v) => v.toLowerCase().includes(term));
      return matchStatus && matchWarehouse && matchSearch;
    });
  }, [series, search, filters, typeId]);

  const visible = useMemo(() => filtered.slice(page * pageSize, page * pageSize + pageSize), [filtered, page, pageSize]);

  const resetFilters = () => { setSearch(''); setFilters({ seriesStatus: 'all', warehouseId: 'all' }); setPage(0); };

  const openSeries = (item = null) => ModalManager.show({
    type: 'custom',
    title: item ? 'Editar serie' : 'Nueva serie',
    size: 'large',
    showFooter: false,
    contentComponent: SeriesModal,
    contentProps: {
      initialValues: seriesToForm(item || { document_type_id: typeId || '' }),
      types,
      warehouses,
      onSubmit: async (payload) => {
        await notifyPromise(
          item ? documentConfigService.updateSeries(item.id, payload) : documentConfigService.createSeries(payload),
          { loading: 'Guardando serie...', success: 'Serie guardada.', error: (err) => getBackendMessage(err, 'No fue posible guardar.') },
        );
        await load();
      },
    },
  });

  const removeSeries = async (item) => {
    if (!await ModalManager.confirm({ title: 'Eliminar serie', message: `Eliminar ${item.series_code}.`, buttons: { cancel: 'Cancelar', confirm: 'Eliminar' } })) return;
    await notifyPromise(documentConfigService.removeSeries(item.id), {
      loading: 'Eliminando...',
      success: 'Serie eliminada.',
      error: (err) => getBackendMessage(err, 'No fue posible eliminar.'),
    });
    await load();
  };

  const descriptionParts = [typeName && `Tipo: ${typeName}`, 'Series de numeracion por bodega o global.'].filter(Boolean);

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Series de documentos"
        description={descriptionParts.join(' — ')}
        actions={[
          { id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate('/documents/series') },
          { id: 'new-series', label: 'Nueva serie', onClick: () => openSeries() },
        ]}
      />

      <KpiBar
        className="mb-4"
        items={[
          { label: 'Series', value: stats.total },
          { label: 'Activas', value: stats.active },
        ]}
      />

      <FilterBar
        className="mb-4"
        searchValue={search}
        searchPlaceholder="Buscar serie, tipo o bodega"
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
        fields={[
          {
            id: 'seriesStatus',
            value: filters.seriesStatus,
            onChange: (v) => { setFilters((c) => ({ ...c, seriesStatus: v })); setPage(0); },
            options: [
              { value: 'all', label: 'Todos los estados' },
              { value: 'active', label: 'Activas' },
              { value: 'inactive', label: 'Inactivas' },
            ],
          },
          {
            id: 'warehouseId',
            value: filters.warehouseId,
            onChange: (v) => { setFilters((c) => ({ ...c, warehouseId: v })); setPage(0); },
            options: [
              { value: 'all', label: 'Todas las bodegas' },
              { value: '', label: 'Global' },
              ...warehouses.map((w) => ({ value: String(w.id), label: `${w.warehouse_code} - ${w.warehouse_name}` })),
            ],
          },
        ]}
        actions={filterActions({ loading, onRefresh: load, onClear: resetFilters })}
      />

      <DataTable
        loading={loading}
        data={visible}
        getRowKey={(row) => row.id}
        emptyMessage="No hay series configuradas."
        footer={tableFooter({ page, pageSize, total: filtered.length, loading, setPage, setPageSize })}
        columns={[
          {
            id: 'series',
            label: 'Serie',
            render: (item) => (
              <div>
                <div className="font-medium">{item.series_code}</div>
                <div className="text-xs text-slate-500">{item.series_prefix || 'Sin prefijo'}</div>
              </div>
            ),
          },
          { id: 'type', label: 'Tipo', render: (item) => item.document_type_name },
          { id: 'warehouse', label: 'Bodega', render: (item) => item.warehouse_name || 'Global' },
          {
            id: 'range',
            label: 'Rango',
            render: (item) => <span className="text-xs tabular-nums">{item.current_number} / {item.max_number}</span>,
          },
          {
            id: 'status',
            label: 'Estado',
            render: (item) => <StatusBadge variant={item.is_active ? 'active' : 'inactive'}>{item.is_active ? 'Activa' : 'Inactiva'}</StatusBadge>,
          },
          {
            id: 'actions',
            label: 'Acciones',
            align: 'center',
            render: (item) => (
              <div className="flex justify-center gap-1">
                <RowActionButton label="Editar" icon={Pencil} onClick={() => openSeries(item)} />
                <RowActionButton
                  label={item.is_active ? 'Desactivar' : 'Activar'}
                  icon={item.is_active ? EyeOff : CheckCircle2}
                  onClick={() => openSeries({ ...item, is_active: !item.is_active })}
                />
                <RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => removeSeries(item)} />
              </div>
            ),
          },
        ]}
      />
    </section>
  );
};

export default AdminDocumentSeries;
