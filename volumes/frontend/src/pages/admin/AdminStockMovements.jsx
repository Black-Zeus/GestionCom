/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, FileText, Plus, RefreshCw, XCircle } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import StatusBadge from '@/components/common/data/StatusBadge';
import { adminMaintainersService } from '@/services/admin/adminMaintainersService';
import { stockMovementsService } from '@/services/inventory/stockMovementsService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { formatDateTime } from '@/utils/dateTime';
import { tableFooter } from './businessFoundationShared';

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const selectClassName = `${fieldClassName} bg-white dark:bg-slate-950`;
const textareaClassName = 'min-h-20 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';

const movementTypeOptions = [
  { value: 'MANUAL_IN', label: 'Ingreso manual', direction: 'in' },
  { value: 'MANUAL_OUT', label: 'Salida manual', direction: 'out' },
  { value: 'ADJUST_POSITIVE', label: 'Ajuste positivo', direction: 'in' },
  { value: 'ADJUST_NEGATIVE', label: 'Ajuste negativo', direction: 'out' },
  { value: 'DAMAGE', label: 'Merma', direction: 'out' },
  { value: 'RETURN_IN', label: 'Devolucion a stock', direction: 'in' },
];

const movementTypeMap = {
  INITIAL_IN: { value: 'INITIAL_IN', label: 'Ingreso manual', direction: 'in' },
  UNIT_CONVERSION_OUT: { value: 'UNIT_CONVERSION_OUT', label: 'Conversion salida', direction: 'out' },
  UNIT_CONVERSION_IN: { value: 'UNIT_CONVERSION_IN', label: 'Conversion entrada', direction: 'in' },
  ...Object.fromEntries(movementTypeOptions.map((item) => [item.value, item])),
};
const movementDirection = (movement) => {
  if (movement.manual_movement_type && movementTypeMap[movement.manual_movement_type]) {
    return movementTypeMap[movement.manual_movement_type].direction;
  }
  return Number(movement.quantity || 0) >= 0 ? 'in' : 'out';
};
const movementLabel = (movement) => movementTypeMap[movement.manual_movement_type]?.label || movement.manual_movement_type || movement.movement_type || '-';
const quantity = (value) => Number(value || 0).toLocaleString('es-CL', { maximumFractionDigits: 4 });
const money = (value) => Number(value || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const nameLabel = (item, nameField, fallbackField = 'label') => item?.[nameField] || item?.[fallbackField] || String(item?.id || '-');
const unitLabel = (unit) => unit?.unit_symbol || unit?.unit_name || '';
const movementUnitQuantity = (movement) => movement.movement_unit_quantity ?? Math.abs(Number(movement.quantity || 0));
const locationLabel = (movement) => [movement.warehouse_name, movement.zone_name, movement.location_name].filter(Boolean).join(' / ') || 'Stock general';

const MovementTypeBadge = ({ movement }) => {
  const direction = movementDirection(movement);
  return (
    <StatusBadge variant={direction === 'in' ? 'active' : 'danger'}>
      {movementLabel(movement)}
    </StatusBadge>
  );
};

const StockMovementModal = ({ variants = [], warehouses = [], zones = [], locations = [], onSubmit, onClose }) => {
  const [form, setForm] = useState({
    manual_movement_type: 'MANUAL_IN',
    product_variant_id: '',
    measurement_unit_id: '',
    warehouse_id: '',
    warehouse_zone_id: '',
    warehouse_zone_location_id: '',
    batch_lot_number: '',
    expiry_date: '',
    serial_number: '',
    quantity: '1',
    unit_cost: '',
    notes: '',
  });
  const [unitOptions, setUnitOptions] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const zoneOptions = zones.filter((zone) => !form.warehouse_id || String(zone.warehouse_id) === String(form.warehouse_id));
  const locationOptions = locations.filter((location) => !form.warehouse_zone_id || String(location.warehouse_zone_id) === String(form.warehouse_zone_id));
  const selectedVariant = variants.find((variant) => String(variant.id) === String(form.product_variant_id));
  const needsLocation = Boolean(selectedVariant?.has_location_tracking);
  const needsBatch = Boolean(selectedVariant?.has_batch_control || selectedVariant?.has_expiry_date);
  const needsExpiry = Boolean(selectedVariant?.has_expiry_date);
  const needsSerial = Boolean(selectedVariant?.has_serial_numbers);
  const selectedType = movementTypeMap[form.manual_movement_type];

  useEffect(() => {
    if (!form.product_variant_id) {
      setUnitOptions([]);
      setForm((current) => ({ ...current, measurement_unit_id: '' }));
      return undefined;
    }
    let active = true;
    setLoadingUnits(true);
    stockMovementsService.listVariantUnits(form.product_variant_id)
      .then((nextUnits) => {
        if (!active) return;
        setUnitOptions(nextUnits);
        setForm((current) => {
          const hasCurrent = nextUnits.some((unit) => String(unit.id) === String(current.measurement_unit_id));
          return {
            ...current,
            measurement_unit_id: hasCurrent ? current.measurement_unit_id : String(nextUnits[0]?.id || ''),
          };
        });
      })
      .catch(() => {
        if (!active) return;
        setUnitOptions([]);
        setForm((current) => ({ ...current, measurement_unit_id: '' }));
      })
      .finally(() => {
        if (active) setLoadingUnits(false);
      });
    return () => {
      active = false;
    };
  }, [form.product_variant_id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.product_variant_id || !form.measurement_unit_id || !form.warehouse_id || Number(form.quantity) <= 0 || form.notes.trim().length < 3) {
      setError('Selecciona producto, unidad, bodega, cantidad y motivo.');
      return;
    }
    if (needsLocation && !form.warehouse_zone_location_id) {
      setError('Este producto controla ubicacion; selecciona una ubicacion interna.');
      return;
    }
    if (needsBatch && !form.batch_lot_number.trim()) {
      setError('Este producto controla lote/vencimiento; indica el lote.');
      return;
    }
    if (needsExpiry && !form.expiry_date) {
      setError('Este producto controla vencimiento; indica la fecha de vencimiento.');
      return;
    }
    if (needsSerial && !form.serial_number.trim()) {
      setError('Este producto controla seriales; indica el numero de serie.');
      return;
    }
    if (needsSerial && Number(form.quantity) !== 1) {
      setError('Los productos con serial se registran con cantidad 1 por serial.');
      return;
    }
    setSaving(true);
    try {
      const ok = await onSubmit({
        manual_movement_type: form.manual_movement_type,
        product_variant_id: Number(form.product_variant_id),
        measurement_unit_id: Number(form.measurement_unit_id),
        warehouse_id: Number(form.warehouse_id),
        warehouse_zone_id: form.warehouse_zone_id ? Number(form.warehouse_zone_id) : null,
        warehouse_zone_location_id: form.warehouse_zone_location_id ? Number(form.warehouse_zone_location_id) : null,
        batch_lot_number: form.batch_lot_number.trim() || null,
        expiry_date: form.expiry_date || null,
        serial_number: form.serial_number.trim() || null,
        quantity: Number(form.quantity),
        unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
        notes: form.notes.trim(),
      });
      if (ok !== false) onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Tipo</span>
          <select className={selectClassName} value={form.manual_movement_type} onChange={(event) => setForm((current) => ({ ...current, manual_movement_type: event.target.value }))} required>
            {movementTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">SKU / Variacion</span>
          <select className={selectClassName} value={form.product_variant_id} onChange={(event) => setForm((current) => ({ ...current, product_variant_id: event.target.value, measurement_unit_id: '', batch_lot_number: '', expiry_date: '', serial_number: '' }))} required>
            <option value="">Selecciona SKU</option>
            {variants.map((variant) => <option key={variant.id} value={variant.id}>{[variant.product_name, nameLabel(variant, 'variant_name', 'variant_sku')].filter(Boolean).join(' / ')}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Bodega</span>
          <select className={selectClassName} value={form.warehouse_id} onChange={(event) => setForm((current) => ({ ...current, warehouse_id: event.target.value, warehouse_zone_id: '', warehouse_zone_location_id: '' }))} required>
            <option value="">Selecciona bodega</option>
            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{nameLabel(warehouse, 'warehouse_name', 'warehouse_code')}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Zona</span>
          <select className={selectClassName} value={form.warehouse_zone_id} onChange={(event) => setForm((current) => ({ ...current, warehouse_zone_id: event.target.value, warehouse_zone_location_id: '' }))} disabled={!form.warehouse_id}>
            <option value="">Stock general</option>
            {zoneOptions.map((zone) => <option key={zone.id} value={zone.id}>{nameLabel(zone, 'zone_name', 'zone_code')}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Ubicacion interna{needsLocation ? ' *' : ''}</span>
          <select className={selectClassName} value={form.warehouse_zone_location_id} onChange={(event) => setForm((current) => ({ ...current, warehouse_zone_location_id: event.target.value }))} disabled={!form.warehouse_zone_id}>
            <option value="">Sin ubicacion interna</option>
            {locationOptions.map((location) => <option key={location.id} value={location.id}>{nameLabel(location, 'location_name', 'location_code')}</option>)}
          </select>
        </label>
        {needsBatch && (
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Lote *</span>
            <input className={fieldClassName} value={form.batch_lot_number} onChange={(event) => setForm((current) => ({ ...current, batch_lot_number: event.target.value.toUpperCase() }))} maxLength={100} required />
          </label>
        )}
        {needsExpiry && (
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Vencimiento *</span>
            <input className={fieldClassName} type="date" value={form.expiry_date} onChange={(event) => setForm((current) => ({ ...current, expiry_date: event.target.value }))} required />
          </label>
        )}
        {needsSerial && (
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Serial *</span>
            <input className={fieldClassName} value={form.serial_number} onChange={(event) => setForm((current) => ({ ...current, serial_number: event.target.value.toUpperCase() }))} maxLength={100} required />
          </label>
        )}
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Cantidad</span>
          <input className={fieldClassName} type="number" min="0.0001" step="0.0001" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} required />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Unidad</span>
          <select className={selectClassName} value={form.measurement_unit_id} onChange={(event) => setForm((current) => ({ ...current, measurement_unit_id: event.target.value }))} disabled={!form.product_variant_id || loadingUnits} required>
            <option value="">{loadingUnits ? 'Cargando unidades...' : 'Selecciona unidad'}</option>
            {unitOptions.map((unit) => <option key={unit.id} value={unit.id}>{nameLabel(unit, 'unit_name', 'unit_symbol')}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Costo unitario</span>
          <input className={fieldClassName} type="number" min="0" step="0.0001" value={form.unit_cost} onChange={(event) => setForm((current) => ({ ...current, unit_cost: event.target.value }))} disabled={selectedType?.direction === 'out'} />
        </label>
        <label className="space-y-1 text-sm md:col-span-3">
          <span className="font-medium text-slate-700 dark:text-slate-200">Motivo</span>
          <textarea className={textareaClassName} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} required />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className={`min-h-5 text-sm ${error ? 'text-red-600 dark:text-red-300' : selectedType?.direction === 'in' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'}`}>
          {error || (selectedType?.direction === 'in' ? 'Este movimiento aumenta stock.' : 'Este movimiento descuenta stock.')}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancelar</button>
          <button type="submit" disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{saving ? 'Guardando...' : 'Guardar movimiento'}</button>
        </div>
      </div>
    </form>
  );
};

const StockMovementDetail = ({ movement, timezone, hourFormat, onClose }) => {
  const detailRows = [
    ['Producto', movement.variant_name || '-'],
    ['Producto base', movement.product_name || '-'],
    ['Tipo', movementLabel(movement)],
    ['Ubicacion', locationLabel(movement)],
    ['Lote', movement.batch_lot_number || '-'],
    ['Vencimiento', movement.expiry_date || '-'],
    ['Serial', movement.serial_number || '-'],
    ['Cantidad', `${quantity(movementUnitQuantity(movement))} ${unitLabel(movement)}`.trim()],
    ['Cantidad base', quantity(Math.abs(Number(movement.quantity || 0)))],
    ['Saldo anterior', quantity(movement.quantity_before)],
    ['Saldo posterior', quantity(movement.quantity_after)],
    ['Costo unitario', movement.unit_cost ? money(movement.unit_cost) : '-'],
    ['Costo total', movement.total_cost ? money(movement.total_cost) : '-'],
    ['Registrado por', movement.created_by_username || '-'],
    ['Fecha', formatDateTime(movement.created_at, timezone, { hourFormat })],
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        {detailRows.map(([label, value]) => (
          <div key={label} className="space-y-1 text-sm">
            <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{label}</div>
            <div className="min-h-10 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">{value}</div>
          </div>
        ))}
        <div className="space-y-1 text-sm md:col-span-2">
          <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Motivo</div>
          <div className="min-h-20 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">{movement.notes || '-'}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="min-h-5 text-sm text-slate-500">Registro historico de stock.</div>
        <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cerrar</button>
      </div>
    </div>
  );
};

const dateInputClass = 'h-10 rounded-md border border-slate-200 bg-white px-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';

const AdminStockMovements = () => {
  const timezone = usePreferencesStore((state) => state.timezone);
  const hourFormat = usePreferencesStore((state) => state.hourFormat);
  const [movements, setMovements] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [zones, setZones] = useState([]);
  const [locations, setLocations] = useState([]);
  const [variants, setVariants] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateError, setDateError] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const formDataLoadedRef = useRef(false);
  const dateChangedRef = useRef(false);
  const validDateParamsRef = useRef({});

  const loadMeta = useCallback(async (params = {}) => {
    setLoading(true);
    setError('');
    try {
      const [nextMovements, nextWarehouses] = await Promise.all([
        stockMovementsService.listMovements(params),
        adminMaintainersService.list('warehouses-options'),
      ]);
      setMovements(nextMovements);
      setWarehouses(nextWarehouses);
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar movimientos.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const ensureFormData = useCallback(async () => {
    if (formDataLoadedRef.current) return;
    formDataLoadedRef.current = true;
    try {
      const [nextZones, nextLocations, nextVariants] = await Promise.all([
        adminMaintainersService.list('warehouse-zones-options'),
        adminMaintainersService.list('warehouse-zone-locations-options'),
        stockMovementsService.listVariantOptions(),
      ]);
      setZones(nextZones);
      setLocations(nextLocations);
      setVariants(nextVariants);
    } catch {
      formDataLoadedRef.current = false;
    }
  }, []);

  useEffect(() => { loadMeta(); ensureFormData(); }, [loadMeta, ensureFormData]);
  useEffect(() => { setPage(0); }, [search, typeFilter, warehouseFilter, dateFrom, dateTo, pageSize]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!dateChangedRef.current) return;
    if (!dateFrom && !dateTo) {
      setDateError('');
      validDateParamsRef.current = {};
      loadMeta();
      return;
    }
    if (!dateFrom || !dateTo) { setDateError(''); return; }
    const from = new Date(`${dateFrom}T00:00:00`);
    const to = new Date(`${dateTo}T00:00:00`);
    if (to < from) { setDateError('La fecha hasta debe ser mayor o igual a la fecha desde.'); validDateParamsRef.current = {}; return; }
    const diff = (to - from) / 86400000;
    if (diff > 31) { setDateError('El rango no puede superar 31 días.'); validDateParamsRef.current = {}; return; }
    setDateError('');
    validDateParamsRef.current = { date_from: dateFrom, date_to: dateTo };
    loadMeta({ date_from: dateFrom, date_to: dateTo });
  }, [dateFrom, dateTo]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return movements.filter((movement) => {
      const matchesType = typeFilter === 'all' || movement.manual_movement_type === typeFilter || movementDirection(movement) === typeFilter;
      const matchesWarehouse = warehouseFilter === 'all' || String(movement.warehouse_id) === String(warehouseFilter);
      const haystack = [movement.product_name, movement.variant_name, movement.warehouse_name, movement.zone_name, movement.location_name, movement.batch_lot_number, movement.expiry_date, movement.serial_number, movement.notes].filter(Boolean).join(' ').toLowerCase();
      return matchesType && matchesWarehouse && (!term || haystack.includes(term));
    });
  }, [movements, search, typeFilter, warehouseFilter]);

  const visibleData = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const totalIn = movements.filter((movement) => movementDirection(movement) === 'in').reduce((sum, item) => sum + Math.abs(Number(item.quantity || 0)), 0);
  const totalOut = movements.filter((movement) => movementDirection(movement) === 'out').reduce((sum, item) => sum + Math.abs(Number(item.quantity || 0)), 0);

  const openCreate = async () => {
    await ensureFormData();
    ModalManager.show({
      type: 'custom',
      title: 'Nuevo movimiento de stock',
      size: 'xlarge',
      showFooter: false,
      contentComponent: StockMovementModal,
      contentProps: {
        variants,
        warehouses,
        zones,
        locations,
        onSubmit: async (payload) => {
          try {
            await notifyPromise(stockMovementsService.createMovement(payload), { loading: 'Registrando movimiento...', success: 'Movimiento registrado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible registrar el movimiento.') });
            await loadMeta();
            return true;
          } catch {
            return false;
          }
        },
      },
    });
  };

  const openDetail = (movement) => ModalManager.show({
    type: 'custom',
    title: 'Detalle de movimiento',
    size: 'large',
    showFooter: false,
    contentComponent: StockMovementDetail,
    contentProps: { movement, timezone, hourFormat },
  });

  const handleRefresh = useCallback(() => loadMeta(validDateParamsRef.current), [loadMeta]);

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setWarehouseFilter('all');
    setDateFrom('');
    setDateTo('');
    setDateError('');
    validDateParamsRef.current = {};
    setPage(0);
    loadMeta();
  };

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Movimientos de stock"
        description="Ingresos, egresos y ajustes manuales controlados por bodega y ubicacion."
        actions={[{ id: 'new-movement', label: 'Nuevo movimiento', icon: Plus, disabled: !warehouses.length, onClick: openCreate }]}
      />

      <KpiBar
        className="mb-4"
        items={[
          { label: 'Movimientos', value: movements.length, active: typeFilter === 'all', onClick: () => setTypeFilter('all') },
          { label: 'Ingresos', value: quantity(totalIn), active: typeFilter === 'in', onClick: () => setTypeFilter('in') },
          { label: 'Egresos', value: quantity(totalOut), active: typeFilter === 'out', onClick: () => setTypeFilter('out') },
          { label: 'Ajustes', value: movements.filter((item) => String(item.manual_movement_type || '').startsWith('ADJUST')).length, active: typeFilter === 'ADJUST_POSITIVE', onClick: () => setTypeFilter('ADJUST_POSITIVE') },
        ]}
      />
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <FilterBar
        className="mb-4"
        searchValue={search}
        searchPlaceholder="Buscar producto, bodega, ubicacion o motivo"
        onSearchChange={setSearch}
        gridClassName="lg:grid-cols-[minmax(280px,1fr)_190px_190px_auto_auto_auto]"
        fields={[
          { id: 'type', value: typeFilter, onChange: setTypeFilter, options: [{ value: 'all', label: 'Todos los tipos' }, { value: 'in', label: 'Ingresos' }, { value: 'out', label: 'Egresos' }, ...movementTypeOptions] },
          { id: 'warehouse', value: warehouseFilter, onChange: setWarehouseFilter, options: [{ value: 'all', label: 'Todas las bodegas' }, ...warehouses.map((warehouse) => ({ value: String(warehouse.id), label: warehouse.warehouse_name || warehouse.warehouse_code || String(warehouse.id) }))] },
        ]}
        actions={(
          <>
            <div className="flex items-center gap-1">
              <input
                type="date"
                className={dateInputClass}
                value={dateFrom}
                title="Fecha desde"
                onChange={(e) => { dateChangedRef.current = true; setDateFrom(e.target.value); }}
              />
              <span className="shrink-0 text-xs text-slate-400">—</span>
              <input
                type="date"
                className={dateInputClass}
                value={dateTo}
                title="Fecha hasta"
                min={dateFrom || undefined}
                onChange={(e) => { dateChangedRef.current = true; setDateTo(e.target.value); }}
              />
            </div>
            <ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={handleRefresh} className={loading ? '[&>svg]:animate-spin' : ''} />
            <ActionButton label="Limpiar" icon={XCircle} variant="neutral" onClick={resetFilters} />
          </>
        )}
      />
      {dateError && <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">{dateError}</div>}

      <DataTable
        loading={loading}
        data={visibleData}
        footer={tableFooter({ page, pageSize, total: filtered.length, loading, setPage, setPageSize })}
        columns={[
          { id: 'product', label: 'Producto', render: (item) => <div><div className="font-medium">{item.variant_name}</div><div className="text-xs text-slate-500">{item.product_name}</div></div> },
          { id: 'type', label: 'Tipo', render: (item) => <MovementTypeBadge movement={item} /> },
          { id: 'warehouse', label: 'Ubicacion', render: (item) => <div><div>{item.warehouse_name}</div><div className="text-xs text-slate-500">{[item.zone_name, item.location_name].filter(Boolean).join(' / ') || 'Stock general'}</div></div> },
          { id: 'tracking', label: 'Lote / venc. / serial', render: (item) => [item.batch_lot_number, item.expiry_date, item.serial_number].filter(Boolean).join(' / ') || '-' },
          { id: 'quantity', label: 'Cantidad', align: 'right', render: (item) => <span className={movementDirection(item) === 'in' ? 'font-medium text-emerald-700 dark:text-emerald-300' : 'font-medium text-red-700 dark:text-red-300'}>{movementDirection(item) === 'in' ? <ArrowUpCircle className="mr-1 inline h-4 w-4" /> : <ArrowDownCircle className="mr-1 inline h-4 w-4" />}{quantity(movementUnitQuantity(item))} {unitLabel(item)}</span> },
          { id: 'balance', label: 'Saldo base', align: 'right', render: (item) => quantity(item.quantity_after) },
          { id: 'cost', label: 'Costo total', align: 'right', render: (item) => item.total_cost ? money(item.total_cost) : '-' },
          { id: 'date', label: 'Fecha', render: (item) => formatDateTime(item.created_at, timezone, { hourFormat }) },
          { id: 'notes', label: 'Motivo', render: (item) => <span className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{item.notes || '-'}</span> },
          { id: 'actions', label: 'Acciones', align: 'center', render: (item) => <RowActionButton label="Ver detalle" icon={FileText} onClick={() => openDetail(item)} /> },
        ]}
      />
    </section>
  );
};

export default AdminStockMovements;
