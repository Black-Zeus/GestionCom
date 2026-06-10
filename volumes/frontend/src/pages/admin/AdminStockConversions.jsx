import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, RefreshCw, XCircle } from 'lucide-react';
import { ActionButton } from '@/components/common/actions/ActionButton';
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

const initialForm = {
  product_variant_id: '',
  warehouse_id: '',
  warehouse_zone_id: '',
  warehouse_zone_location_id: '',
  from_measurement_unit_id: '',
  to_measurement_unit_id: '',
  from_quantity: '1',
  batch_lot_number: '',
  expiry_date: '',
  serial_number: '',
  notes: '',
};

const quantity = (value) => Number(value || 0).toLocaleString('es-CL', { maximumFractionDigits: 4 });
const nameLabel = (item, nameField, fallbackField = 'label') => item?.[nameField] || item?.[fallbackField] || String(item?.id || '-');
const unitText = (unit) => unit?.unit_symbol || unit?.unit_name || '';
const unitName = (unit) => [unit?.unit_name, unit?.unit_symbol].filter(Boolean).join(' - ') || String(unit?.id || '-');

const AdminStockConversions = () => {
  const timezone = usePreferencesStore((state) => state.timezone);
  const hourFormat = usePreferencesStore((state) => state.hourFormat);
  const [conversions, setConversions] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [zones, setZones] = useState([]);
  const [locations, setLocations] = useState([]);
  const [variants, setVariants] = useState([]);
  const [unitOptions, setUnitOptions] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const selectedVariant = variants.find((variant) => String(variant.id) === String(form.product_variant_id));
  const fromUnit = unitOptions.find((unit) => String(unit.id) === String(form.from_measurement_unit_id));
  const toUnit = unitOptions.find((unit) => String(unit.id) === String(form.to_measurement_unit_id));
  const zoneOptions = zones.filter((zone) => !form.warehouse_id || String(zone.warehouse_id) === String(form.warehouse_id));
  const locationOptions = locations.filter((location) => !form.warehouse_zone_id || String(location.warehouse_zone_id) === String(form.warehouse_zone_id));
  const needsLocation = Boolean(selectedVariant?.has_location_tracking);
  const needsBatch = Boolean(selectedVariant?.has_batch_control || selectedVariant?.has_expiry_date);
  const needsExpiry = Boolean(selectedVariant?.has_expiry_date);
  const hasSerial = Boolean(selectedVariant?.has_serial_numbers);
  const computedToQuantity = useMemo(() => {
    const amount = Number(form.from_quantity || 0);
    const fromFactor = Number(fromUnit?.conversion_factor || 0);
    const toFactor = Number(toUnit?.conversion_factor || 0);
    if (!amount || !fromFactor || !toFactor) return 0;
    return (amount * fromFactor) / toFactor;
  }, [form.from_quantity, fromUnit, toUnit]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextConversions, nextWarehouses, nextZones, nextLocations, nextVariants] = await Promise.all([
        stockMovementsService.listUnitConversions(),
        adminMaintainersService.list('warehouses-options'),
        adminMaintainersService.list('warehouse-zones-options'),
        adminMaintainersService.list('warehouse-zone-locations-options'),
        stockMovementsService.listVariantOptions(),
      ]);
      setConversions(nextConversions);
      setWarehouses(nextWarehouses);
      setZones(nextZones);
      setLocations(nextLocations);
      setVariants(nextVariants);
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar conversiones.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [search, warehouseFilter, pageSize]);

  useEffect(() => {
    if (!form.product_variant_id) {
      setUnitOptions([]);
      setForm((current) => ({ ...current, from_measurement_unit_id: '', to_measurement_unit_id: '' }));
      return undefined;
    }
    let active = true;
    setLoadingUnits(true);
    stockMovementsService.listVariantUnits(form.product_variant_id)
      .then((nextUnits) => {
        if (!active) return;
        setUnitOptions(nextUnits);
        setForm((current) => {
          const fromExists = nextUnits.some((unit) => String(unit.id) === String(current.from_measurement_unit_id));
          const toExists = nextUnits.some((unit) => String(unit.id) === String(current.to_measurement_unit_id));
          return {
            ...current,
            from_measurement_unit_id: fromExists ? current.from_measurement_unit_id : String(nextUnits[1]?.id || nextUnits[0]?.id || ''),
            to_measurement_unit_id: toExists ? current.to_measurement_unit_id : String(nextUnits[0]?.id || ''),
          };
        });
      })
      .catch(() => {
        if (!active) return;
        setUnitOptions([]);
        setForm((current) => ({ ...current, from_measurement_unit_id: '', to_measurement_unit_id: '' }));
      })
      .finally(() => {
        if (active) setLoadingUnits(false);
      });
    return () => {
      active = false;
    };
  }, [form.product_variant_id]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return conversions.filter((conversion) => {
      const matchesWarehouse = warehouseFilter === 'all' || String(conversion.warehouse_id) === String(warehouseFilter);
      const haystack = [
        conversion.product_name,
        conversion.variant_name,
        conversion.variant_sku,
        conversion.warehouse_name,
        conversion.zone_name,
        conversion.location_name,
        conversion.batch_lot_number,
        conversion.expiry_date,
        conversion.notes,
      ].filter(Boolean).join(' ').toLowerCase();
      return matchesWarehouse && (!term || haystack.includes(term));
    });
  }, [conversions, search, warehouseFilter]);

  const resetForm = () => {
    setForm(initialForm);
    setFormError('');
  };

  const validateForm = () => {
    if (!form.product_variant_id || !form.warehouse_id || !form.from_measurement_unit_id || !form.to_measurement_unit_id) {
      return 'Selecciona SKU, bodega, unidad origen y unidad destino.';
    }
    if (String(form.from_measurement_unit_id) === String(form.to_measurement_unit_id)) {
      return 'La unidad origen y destino deben ser distintas.';
    }
    if (Number(form.from_quantity) <= 0) {
      return 'La cantidad a convertir debe ser mayor a cero.';
    }
    if (needsLocation && !form.warehouse_zone_location_id) {
      return 'Este producto controla ubicacion; selecciona una ubicacion interna.';
    }
    if (needsBatch && !form.batch_lot_number.trim()) {
      return 'Este producto controla lote/vencimiento; indica el lote.';
    }
    if (needsExpiry && !form.expiry_date) {
      return 'Este producto controla vencimiento; indica la fecha.';
    }
    if (hasSerial) {
      return 'Los productos con serial no se convierten entre unidades.';
    }
    if (form.notes.trim().length < 3) {
      return 'Indica un motivo para la conversion.';
    }
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationMessage = validateForm();
    setFormError(validationMessage);
    if (validationMessage) return;
    setSaving(true);
    try {
      await notifyPromise(stockMovementsService.createUnitConversion({
        product_variant_id: Number(form.product_variant_id),
        warehouse_id: Number(form.warehouse_id),
        warehouse_zone_id: form.warehouse_zone_id ? Number(form.warehouse_zone_id) : null,
        warehouse_zone_location_id: form.warehouse_zone_location_id ? Number(form.warehouse_zone_location_id) : null,
        from_measurement_unit_id: Number(form.from_measurement_unit_id),
        to_measurement_unit_id: Number(form.to_measurement_unit_id),
        from_quantity: Number(form.from_quantity),
        batch_lot_number: form.batch_lot_number.trim() || null,
        expiry_date: form.expiry_date || null,
        serial_number: form.serial_number.trim() || null,
        notes: form.notes.trim(),
      }), {
        loading: 'Registrando conversion...',
        success: 'Conversion registrada.',
        error: (requestError) => getBackendMessage(requestError, 'No fue posible registrar la conversion.'),
      });
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setWarehouseFilter('all');
    setPage(0);
  };

  const visibleData = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const totalBaseConverted = conversions.reduce((sum, item) => sum + Number(item.base_quantity || 0), 0);

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Conversion de stock"
        description="Transforma stock entre unidades de inventario del mismo SKU manteniendo trazabilidad en movimientos."
        actions={[{ id: 'refresh', label: 'Refrescar', icon: RefreshCw, onClick: load, disabled: loading }]}
      />

      <KpiBar
        className="mb-4"
        items={[
          { label: 'Conversiones', value: conversions.length },
          { label: 'Base convertida', value: quantity(totalBaseConverted) },
          { label: 'SKUs habilitados', value: variants.length },
        ]}
      />

      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="mb-5 space-y-4 border-y border-slate-200 bg-white py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 px-4 md:grid-cols-4">
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700 dark:text-slate-200">SKU / Variacion</span>
            <select className={selectClassName} value={form.product_variant_id} onChange={(event) => setForm((current) => ({ ...current, product_variant_id: event.target.value, from_measurement_unit_id: '', to_measurement_unit_id: '', batch_lot_number: '', expiry_date: '', serial_number: '' }))} required>
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
            <span className="font-medium text-slate-700 dark:text-slate-200">Cantidad origen</span>
            <input className={fieldClassName} type="number" min="0.0001" step="0.0001" value={form.from_quantity} onChange={(event) => setForm((current) => ({ ...current, from_quantity: event.target.value }))} required />
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
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Desde unidad</span>
            <select className={selectClassName} value={form.from_measurement_unit_id} onChange={(event) => setForm((current) => ({ ...current, from_measurement_unit_id: event.target.value }))} disabled={!form.product_variant_id || loadingUnits} required>
              <option value="">{loadingUnits ? 'Cargando unidades...' : 'Unidad origen'}</option>
              {unitOptions.map((unit) => <option key={unit.id} value={unit.id}>{unitName(unit)}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Hacia unidad</span>
            <select className={selectClassName} value={form.to_measurement_unit_id} onChange={(event) => setForm((current) => ({ ...current, to_measurement_unit_id: event.target.value }))} disabled={!form.product_variant_id || loadingUnits} required>
              <option value="">{loadingUnits ? 'Cargando unidades...' : 'Unidad destino'}</option>
              {unitOptions.map((unit) => <option key={unit.id} value={unit.id}>{unitName(unit)}</option>)}
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
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700 dark:text-slate-200">Resultado calculado</span>
            <div className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-800 dark:bg-slate-950">
              <ArrowRightLeft className="h-4 w-4 text-slate-500" />
              <span className="font-medium">{quantity(form.from_quantity)} {unitText(fromUnit) || 'origen'}</span>
              <span className="text-slate-500">=</span>
              <span className="font-medium">{quantity(computedToQuantity)} {unitText(toUnit) || 'destino'}</span>
            </div>
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700 dark:text-slate-200">Motivo</span>
            <textarea className={textareaClassName} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} required />
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 pt-4 dark:border-slate-800">
          <div className={`min-h-5 text-sm ${formError || hasSerial ? 'text-red-600 dark:text-red-300' : 'text-slate-500 dark:text-slate-400'}`}>
            {formError || (hasSerial ? 'Producto serializado: conversion no disponible.' : 'Se registrara una salida y una entrada enlazadas en movimientos.')}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetForm} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Limpiar</button>
            <button type="submit" disabled={saving || hasSerial} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{saving ? 'Convirtiendo...' : 'Convertir stock'}</button>
          </div>
        </div>
      </form>

      <FilterBar
        className="mb-4"
        searchValue={search}
        searchPlaceholder="Buscar producto, bodega, lote o motivo"
        onSearchChange={setSearch}
        gridClassName="lg:grid-cols-[minmax(280px,1fr)_220px_auto_auto]"
        fields={[
          { id: 'warehouse', value: warehouseFilter, onChange: setWarehouseFilter, options: [{ value: 'all', label: 'Todas las bodegas' }, ...warehouses.map((warehouse) => ({ value: String(warehouse.id), label: warehouse.warehouse_name || warehouse.warehouse_code || String(warehouse.id) }))] },
        ]}
        actions={(
          <>
            <ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={load} className={loading ? '[&>svg]:animate-spin' : ''} />
            <ActionButton label="Limpiar" icon={XCircle} variant="neutral" onClick={resetFilters} />
          </>
        )}
      />

      <DataTable
        loading={loading}
        data={visibleData}
        footer={tableFooter({ page, pageSize, total: filtered.length, loading, setPage, setPageSize })}
        columns={[
          { id: 'product', label: 'Producto', render: (item) => <div><div className="font-medium">{item.variant_name}</div><div className="text-xs text-slate-500">{item.product_name}</div></div> },
          { id: 'conversion', label: 'Conversion', render: (item) => <div className="flex flex-wrap items-center gap-2"><StatusBadge variant="active">{quantity(item.from_quantity)} {item.from_unit_symbol || item.from_unit_name}</StatusBadge><ArrowRightLeft className="h-4 w-4 text-slate-500" /><StatusBadge variant="neutral">{quantity(item.to_quantity)} {item.to_unit_symbol || item.to_unit_name}</StatusBadge></div> },
          { id: 'warehouse', label: 'Ubicacion', render: (item) => <div><div>{item.warehouse_name}</div><div className="text-xs text-slate-500">{[item.zone_name, item.location_name].filter(Boolean).join(' / ') || 'Stock general'}</div></div> },
          { id: 'tracking', label: 'Lote / venc.', render: (item) => [item.batch_lot_number, item.expiry_date].filter(Boolean).join(' / ') || '-' },
          { id: 'base', label: 'Cantidad base', align: 'right', render: (item) => quantity(item.base_quantity) },
          { id: 'user', label: 'Usuario', render: (item) => item.created_by_username || '-' },
          { id: 'date', label: 'Fecha', render: (item) => formatDateTime(item.created_at, timezone, { hourFormat }) },
          { id: 'notes', label: 'Motivo', render: (item) => <span className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{item.notes || '-'}</span> },
        ]}
      />
    </section>
  );
};

export default AdminStockConversions;
