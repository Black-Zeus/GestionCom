/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, EyeOff, Pencil, RefreshCw, Ruler, Trash2, XCircle } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import DataTablePagination from '@/components/common/data/DataTablePagination';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import StatusBadge from '@/components/common/data/StatusBadge';
import { measurementUnitsService } from '@/services/admin/measurementUnitsService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { PAGE_SIZE_OPTIONS, usePreferencesStore } from '@/store/usePreferencesStore';
import { formatDateTime } from '@/utils/dateTime';

const emptyUnitForm = {
  unit_code: '',
  unit_name: '',
  unit_symbol: '',
  unit_type: 'BASE',
  base_unit_id: '',
  conversion_factor: '1',
  allow_decimals: false,
  is_active: true,
};

const unitTypeLabels = {
  BASE: 'Base',
  DERIVED: 'Derivada',
};

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const selectClassName = `${fieldClassName} bg-white dark:bg-slate-950`;

const unitToForm = (unit) => ({
  unit_code: unit.unit_code || '',
  unit_name: unit.unit_name || '',
  unit_symbol: unit.unit_symbol || '',
  unit_type: unit.unit_type || 'BASE',
  base_unit_id: unit.base_unit_id ? String(unit.base_unit_id) : '',
  conversion_factor: String(unit.conversion_factor ?? '1'),
  allow_decimals: unit.allow_decimals === true,
  is_active: unit.is_active !== false,
});

const toUnitPayload = (form) => ({
  unit_name: form.unit_name.trim(),
  unit_symbol: form.unit_symbol.trim().toUpperCase(),
  unit_type: form.unit_type,
  base_unit_id: form.unit_type === 'DERIVED' ? Number(form.base_unit_id) : null,
  conversion_factor: Number(form.conversion_factor || 1),
  allow_decimals: Boolean(form.allow_decimals),
  is_active: Boolean(form.is_active),
});

const getUnitLabel = (unit) => (unit ? `${unit.unit_code} - ${unit.unit_name}` : 'Sin unidad');

const UnitFormModal = ({ mode = 'create', initialValues = emptyUnitForm, baseUnitOptions = [], currentUnitId = null, onSubmit, onClose }) => {
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const isEdit = mode === 'edit';
  const isDerived = form.unit_type === 'DERIVED';

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (isDerived && !form.base_unit_id) {
      setFormError('Las unidades derivadas requieren una unidad base.');
      return;
    }
    if (Number(form.conversion_factor || 0) <= 0) {
      setFormError('El factor de conversion debe ser mayor que cero.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(toUnitPayload(form));
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-950 dark:text-white">{isEdit ? 'Unidad de medida' : 'Nueva unidad de medida'}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">El codigo lo genera el backend; los codigos estandar quedan solo lectura.</div>
          </div>
          <label className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
            <input type="checkbox" checked={form.is_active} onChange={(event) => updateField('is_active', event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            Activa
          </label>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {isEdit && (
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Codigo</span>
            <input className={`${fieldClassName} font-mono uppercase disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-slate-900`} value={form.unit_code} disabled readOnly />
          </label>
        )}
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Nombre</span>
          <input className={fieldClassName} value={form.unit_name} onChange={(event) => updateField('unit_name', event.target.value)} minLength={2} required />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Simbolo</span>
          <input className={`${fieldClassName} uppercase`} value={form.unit_symbol} onChange={(event) => updateField('unit_symbol', event.target.value.toUpperCase())} maxLength={10} required />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Tipo</span>
          <select className={selectClassName} value={form.unit_type} onChange={(event) => updateField('unit_type', event.target.value)} required>
            {Object.entries(unitTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {isDerived && (
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Unidad base</span>
            <select className={selectClassName} value={form.base_unit_id} onChange={(event) => updateField('base_unit_id', event.target.value)} required>
              <option value="">Selecciona unidad base</option>
              {baseUnitOptions.filter((unit) => Number(unit.id) !== Number(currentUnitId)).map((unit) => <option key={unit.id} value={unit.id}>{getUnitLabel(unit)}</option>)}
            </select>
          </label>
        )}
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Factor conversion</span>
          <input className={fieldClassName} type="number" min="0.000001" step="0.000001" value={form.conversion_factor} onChange={(event) => updateField('conversion_factor', event.target.value)} required />
        </label>
        <label className="flex h-11 items-center gap-2 self-end rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
          <input type="checkbox" checked={form.allow_decimals} onChange={(event) => updateField('allow_decimals', event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Permite decimales
        </label>
      </div>

      {formError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{formError}</div>}

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancelar</button>
        <button type="submit" disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{saving ? 'Guardando...' : 'Guardar unidad'}</button>
      </div>
    </form>
  );
};

const AdminMeasurementUnits = () => {
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: 'all', type: 'all' });
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyUnitId, setBusyUnitId] = useState(null);
  const [error, setError] = useState('');
  const tablePageSize = usePreferencesStore((state) => state.tablePageSize);
  const setTablePageSize = usePreferencesStore((state) => state.setTablePageSize);
  const timezone = usePreferencesStore((state) => state.timezone);
  const hourFormat = usePreferencesStore((state) => state.hourFormat);

  const stats = useMemo(() => {
    const total = units.length;
    const active = units.filter((unit) => unit.is_active).length;
    const base = units.filter((unit) => unit.unit_type === 'BASE').length;
    const derived = units.filter((unit) => unit.unit_type === 'DERIVED').length;
    return { total, active, inactive: total - active, base, derived };
  }, [units]);

  const baseUnitOptions = useMemo(() => units.filter((unit) => unit.is_active), [units]);

  const filteredUnits = useMemo(() => {
    const term = search.trim().toLowerCase();
    return units.filter((unit) => {
      const matchesStatus = filters.status === 'all' || (filters.status === 'active' && unit.is_active) || (filters.status === 'inactive' && !unit.is_active);
      const matchesType = filters.type === 'all' || unit.unit_type === filters.type;
      const matchesSearch = !term || [unit.unit_code, unit.unit_name, unit.unit_symbol, unit.base_unit_code, unit.base_unit_name].filter(Boolean).some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [filters.status, filters.type, search, units]);

  const visibleUnits = useMemo(() => {
    const start = page * tablePageSize;
    return filteredUnits.slice(start, start + tablePageSize);
  }, [filteredUnits, page, tablePageSize]);

  const setFilter = (field, value) => {
    setPage(0);
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const loadUnits = async () => {
    setLoading(true);
    setError('');
    try {
      setUnits(await measurementUnitsService.list({ active_only: false, limit: 1000 }));
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar unidades de medida.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnits();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [search]);

  const openCreateModal = () => {
    ModalManager.show({
      type: 'custom',
      title: 'Nueva unidad de medida',
      size: 'large',
      showFooter: false,
      contentComponent: UnitFormModal,
      contentProps: {
        mode: 'create',
        initialValues: emptyUnitForm,
        baseUnitOptions,
        onSubmit: async (payload) => {
          await notifyPromise(measurementUnitsService.create(payload), {
            loading: 'Creando unidad...',
            success: 'Unidad creada correctamente.',
            error: (requestError) => getBackendMessage(requestError, 'No fue posible crear la unidad.'),
          });
          await loadUnits();
        },
      },
    });
  };

  const openEditModal = (unit) => {
    ModalManager.show({
      type: 'custom',
      title: 'Editar unidad de medida',
      size: 'large',
      showFooter: false,
      contentComponent: UnitFormModal,
      contentProps: {
        mode: 'edit',
        initialValues: unitToForm(unit),
        baseUnitOptions,
        currentUnitId: unit.id,
        onSubmit: async (payload) => {
          await notifyPromise(measurementUnitsService.update(unit.id, payload), {
            loading: 'Actualizando unidad...',
            success: 'Unidad actualizada correctamente.',
            error: (requestError) => getBackendMessage(requestError, 'No fue posible actualizar la unidad.'),
          });
          await loadUnits();
        },
      },
    });
  };

  const toggleUnit = async (unit) => {
    const nextState = !unit.is_active;
    const confirmed = await ModalManager.confirm({
      title: `${nextState ? 'Activar' : 'Desactivar'} unidad`,
      message: `Confirma que deseas ${nextState ? 'activar' : 'desactivar'} ${unit.unit_name}.`,
      buttons: { cancel: 'Cancelar', confirm: nextState ? 'Activar' : 'Desactivar' },
    });
    if (!confirmed) return;
    setBusyUnitId(unit.id);
    try {
      await notifyPromise(measurementUnitsService.changeActivation(unit, nextState), {
        loading: `${nextState ? 'Activando' : 'Desactivando'} unidad...`,
        success: `Unidad ${nextState ? 'activada' : 'desactivada'}.`,
        error: (requestError) => getBackendMessage(requestError, 'No fue posible cambiar el estado.'),
      });
      await loadUnits();
    } finally {
      setBusyUnitId(null);
    }
  };

  const removeUnit = async (unit) => {
    const confirmed = await ModalManager.confirm({
      title: 'Eliminar unidad de medida',
      message: `Esta accion eliminara ${unit.unit_name} del mantenedor. Productos historicos mantienen sus referencias.`,
      buttons: { cancel: 'Cancelar', confirm: 'Eliminar' },
    });
    if (!confirmed) return;
    setBusyUnitId(unit.id);
    try {
      await notifyPromise(measurementUnitsService.remove(unit.id), {
        loading: 'Eliminando unidad...',
        success: 'Unidad eliminada correctamente.',
        error: (requestError) => getBackendMessage(requestError, 'No fue posible eliminar la unidad.'),
      });
      await loadUnits();
    } finally {
      setBusyUnitId(null);
    }
  };

  const kpiItems = [
    { id: 'total', label: 'Total', value: stats.total, active: filters.status === 'all' && filters.type === 'all', onClick: () => { setPage(0); setFilters({ status: 'all', type: 'all' }); } },
    { id: 'active', label: 'Activas', value: stats.active, active: filters.status === 'active', onClick: () => setFilter('status', 'active') },
    { id: 'base', label: 'Base', value: stats.base, active: filters.type === 'BASE', onClick: () => setFilter('type', 'BASE') },
    { id: 'derived', label: 'Derivadas', value: stats.derived, hint: `${stats.inactive} inactivas`, active: filters.type === 'DERIVED', onClick: () => setFilter('type', 'DERIVED') },
  ];

  const filterFields = [
    { id: 'status', value: filters.status, onChange: (value) => setFilter('status', value), options: [{ value: 'all', label: 'Todos los estados' }, { value: 'active', label: 'Activas' }, { value: 'inactive', label: 'Inactivas' }] },
    { id: 'type', value: filters.type, onChange: (value) => setFilter('type', value), options: [{ value: 'all', label: 'Todos los tipos' }, ...Object.entries(unitTypeLabels).map(([value, label]) => ({ value, label }))] },
  ];

  const columns = [
    { id: 'unit', label: 'Unidad', sortable: true, sortValue: (unit) => unit.unit_name, render: (unit) => <><div className="font-medium text-slate-950 dark:text-white">{unit.unit_name}</div><div className="font-mono text-xs text-slate-500">{unit.unit_code}</div></> },
    { id: 'symbol', label: 'Simbolo', sortable: true, sortValue: (unit) => unit.unit_symbol, render: (unit) => <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"><Ruler className="h-3.5 w-3.5" />{unit.unit_symbol}</span> },
    { id: 'type', label: 'Tipo', sortable: true, sortValue: (unit) => unit.unit_type, render: (unit) => unitTypeLabels[unit.unit_type] || unit.unit_type },
    { id: 'base', label: 'Base', sortable: true, sortValue: (unit) => unit.base_unit_code || '', render: (unit) => unit.unit_type === 'DERIVED' ? <><div>{unit.base_unit_name || 'Sin base'}</div><div className="font-mono text-xs text-slate-500">{unit.base_unit_code || ''}</div></> : <span className="text-slate-500">No aplica</span> },
    { id: 'factor', label: 'Factor', sortable: true, sortValue: (unit) => unit.conversion_factor, render: (unit) => Number(unit.conversion_factor || 1).toLocaleString('es-CL', { maximumFractionDigits: 6 }) },
    { id: 'decimals', label: 'Decimales', sortable: true, sortValue: (unit) => unit.allow_decimals, render: (unit) => unit.allow_decimals ? 'Si' : 'No' },
    { id: 'status', label: 'Estado', sortable: true, sortValue: (unit) => unit.is_active, render: (unit) => <StatusBadge variant={unit.is_active ? 'active' : 'inactive'}>{unit.is_active ? 'Activa' : 'Inactiva'}</StatusBadge> },
    { id: 'updated', label: 'Actualizada', sortable: true, sortValue: (unit) => unit.updated_at || '', render: (unit) => formatDateTime(unit.updated_at, timezone, { hourFormat }) },
    { id: 'actions', label: 'Acciones', align: 'right', render: (unit) => <div className="flex justify-end gap-2"><RowActionButton label="Editar unidad" icon={Pencil} disabled={busyUnitId === unit.id} onClick={() => openEditModal(unit)} /><RowActionButton label={unit.is_active ? 'Desactivar unidad' : 'Activar unidad'} icon={unit.is_active ? EyeOff : CheckCircle2} disabled={busyUnitId === unit.id} variant={unit.is_active ? 'danger' : 'neutral'} onClick={() => toggleUnit(unit)} /><RowActionButton label="Eliminar unidad" icon={Trash2} disabled={busyUnitId === unit.id} variant="danger" onClick={() => removeUnit(unit)} /></div> },
  ];

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Unidades de medida"
        description="Mantenedor de unidades base y conversiones para productos, compras e inventario."
        actions={[{ id: 'new-unit', label: 'Nueva', onClick: openCreateModal }]}
      />

      <KpiBar items={kpiItems} className="mb-4" />

      <FilterBar className="mb-4" gridClassName="lg:grid-cols-[minmax(280px,1fr)_180px_180px_auto_auto]" searchValue={search} searchPlaceholder="Buscar unidad, codigo, simbolo o base" onSearchChange={setSearch} onSearchSubmit={() => setPage(0)} fields={filterFields} actions={<><ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={loadUnits} className={loading ? '[&>svg]:animate-spin' : ''} /><ActionButton label="Limpiar" icon={XCircle} variant="neutral" onClick={() => { setSearch(''); setPage(0); setFilters({ status: 'all', type: 'all' }); }} /></>} />

      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}

      <DataTable columns={columns} data={visibleUnits} loading={loading} emptyMessage="No hay unidades de medida para mostrar." footer={<DataTablePagination page={page} pageSize={tablePageSize} pageSizeOptions={PAGE_SIZE_OPTIONS} total={filteredUnits.length} hasMore={(page + 1) * tablePageSize < filteredUnits.length} loading={loading} onPageChange={setPage} onPageSizeChange={(size) => { setTablePageSize(size); setPage(0); }} />} />
    </section>
  );
};

export default AdminMeasurementUnits;
