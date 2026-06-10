/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ClipboardCheck, Eye, Play, Plus, RefreshCw, Send, ShieldCheck, XCircle } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import DataTablePagination from '@/components/common/data/DataTablePagination';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import StatusBadge from '@/components/common/data/StatusBadge';
import { adminMaintainersService } from '@/services/admin/adminMaintainersService';
import { physicalInventoryService } from '@/services/inventory/physicalInventoryService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const selectClassName = `${fieldClassName} bg-white dark:bg-slate-950`;
const textareaClassName = 'min-h-24 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';

const countTypes = [
  { value: 'PARTIAL', label: 'Parcial' },
  { value: 'FULL', label: 'Completo' },
  { value: 'CYCLE', label: 'Ciclico' },
  { value: 'RANDOM', label: 'Aleatorio' },
];

const statusOptions = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'COUNTING', label: 'En conteo' },
  { value: 'REVIEW', label: 'En revision' },
  { value: 'APPROVED', label: 'Aprobado' },
  { value: 'POSTED', label: 'Contabilizado' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

const statusVariants = {
  DRAFT: 'inactive',
  COUNTING: 'info',
  REVIEW: 'warning',
  APPROVED: 'active',
  POSTED: 'active',
  CANCELLED: 'danger',
};

const statusLabels = {
  DRAFT: 'Borrador',
  COUNTING: 'En conteo',
  REVIEW: 'En revision',
  APPROVED: 'Aprobado',
  POSTED: 'Contabilizado',
  CANCELLED: 'Cancelado',
};

const quantity = (value) => Number(value || 0).toLocaleString('es-CL', { maximumFractionDigits: 4 });
const byId = (items) => Object.fromEntries(items.map((item) => [String(item.id), item]));
const optionLabel = (item, codeField, nameField) => [item?.[codeField], item?.[nameField]].filter(Boolean).join(' - ') || item?.label || '-';

const CountStatusBadge = ({ status }) => (
  <StatusBadge variant={statusVariants[status] || 'inactive'} icon={false}>
    {statusLabels[status] || status || '-'}
  </StatusBadge>
);

const tableFooter = ({ page, pageSize, total, loading, setPage, setPageSize }) => (
  <DataTablePagination
    page={page}
    pageSize={pageSize}
    pageSizeOptions={PAGE_SIZE_OPTIONS}
    total={total}
    hasMore={(page + 1) * pageSize < total}
    loading={loading}
    onPageChange={setPage}
    onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
  />
);

const CreateCountModal = ({ warehouses = [], zones = [], locations = [], onSubmit, onClose }) => {
  const [form, setForm] = useState({
    warehouse_id: warehouses[0]?.id ? String(warehouses[0].id) : '',
    warehouse_zone_id: '',
    warehouse_zone_location_id: '',
    count_type: 'PARTIAL',
    scheduled_date: '',
    scope_description: '',
    freeze_stock: false,
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const zoneOptions = zones.filter((zone) => !form.warehouse_id || String(zone.warehouse_id) === String(form.warehouse_id));
  const zoneById = byId(zones);
  const availableZoneIds = new Set(zoneOptions.map((zone) => String(zone.id)));
  const locationOptions = locations.filter((location) => {
    if (form.warehouse_zone_id) return String(location.warehouse_zone_id) === String(form.warehouse_zone_id);
    if (form.warehouse_id) return availableZoneIds.has(String(location.warehouse_zone_id));
    return false;
  });
  const updateField = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'warehouse_id') {
        next.warehouse_zone_id = '';
        next.warehouse_zone_location_id = '';
      }
      if (field === 'warehouse_zone_id') next.warehouse_zone_location_id = '';
      if (field === 'warehouse_zone_location_id' && value && !current.warehouse_zone_id) {
        const selectedLocation = locations.find((location) => String(location.id) === String(value));
        next.warehouse_zone_id = selectedLocation?.warehouse_zone_id ? String(selectedLocation.warehouse_zone_id) : '';
      }
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!form.warehouse_id) {
      setFormError('Selecciona una bodega.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        warehouse_id: Number(form.warehouse_id),
        warehouse_zone_id: form.warehouse_zone_id ? Number(form.warehouse_zone_id) : null,
        warehouse_zone_location_id: form.warehouse_zone_location_id ? Number(form.warehouse_zone_location_id) : null,
        count_type: form.count_type,
        scheduled_date: form.scheduled_date || null,
        scope_description: form.scope_description || null,
        freeze_stock: Boolean(form.freeze_stock),
        notes: form.notes || null,
      });
      onClose?.();
    } catch (requestError) {
      setFormError(getBackendMessage(requestError, 'No fue posible crear el inventario fisico.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Bodega</span>
          <select className={selectClassName} value={form.warehouse_id} onChange={(event) => updateField('warehouse_id', event.target.value)} required>
            <option value="">Selecciona bodega</option>
            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{optionLabel(warehouse, 'warehouse_code', 'warehouse_name')}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Zona</span>
          <select className={selectClassName} value={form.warehouse_zone_id} onChange={(event) => updateField('warehouse_zone_id', event.target.value)} disabled={!form.warehouse_id}>
            <option value="">Toda la bodega</option>
            {zoneOptions.map((zone) => <option key={zone.id} value={zone.id}>{optionLabel(zone, 'zone_code', 'zone_name')}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Ubicacion interna</span>
          <select className={selectClassName} value={form.warehouse_zone_location_id} onChange={(event) => updateField('warehouse_zone_location_id', event.target.value)} disabled={!form.warehouse_id || !locationOptions.length}>
            <option value="">{form.warehouse_zone_id ? 'Toda la zona' : 'Sin ubicacion especifica'}</option>
            {locationOptions.map((location) => (
              <option key={location.id} value={location.id}>
                {form.warehouse_zone_id ? optionLabel(location, 'location_code', 'location_name') : `${zoneById[String(location.warehouse_zone_id)]?.zone_name || 'Zona'} / ${optionLabel(location, 'location_code', 'location_name')}`}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Tipo</span>
          <select className={selectClassName} value={form.count_type} onChange={(event) => updateField('count_type', event.target.value)}>
            {countTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Fecha programada</span>
          <input className={fieldClassName} type="date" value={form.scheduled_date} onChange={(event) => updateField('scheduled_date', event.target.value)} />
        </label>
        <label className="flex h-11 items-center gap-2 self-end rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
          <input type="checkbox" checked={form.freeze_stock} onChange={(event) => updateField('freeze_stock', event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Congelar stock
        </label>
        <label className="space-y-1 text-sm xl:col-span-3">
          <span className="font-medium text-slate-700 dark:text-slate-200">Alcance</span>
          <input className={fieldClassName} value={form.scope_description} onChange={(event) => updateField('scope_description', event.target.value)} placeholder="Ej: Conteo inicial local Santa Filomena / Estanterias" />
        </label>
        <label className="space-y-1 text-sm xl:col-span-3">
          <span className="font-medium text-slate-700 dark:text-slate-200">Notas</span>
          <textarea className={textareaClassName} value={form.notes} onChange={(event) => updateField('notes', event.target.value)} />
        </label>
      </div>

      {formError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{formError}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="min-h-5" />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancelar</button>
          <button type="submit" disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{saving ? 'Creando...' : 'Crear inventario'}</button>
        </div>
      </div>
    </form>
  );
};

const CountDetailModal = ({ countId, variants = [], zones = [], locations = [], onChanged, onClose }) => {
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [itemForm, setItemForm] = useState({ product_variant_id: '', warehouse_zone_id: '', warehouse_zone_location_id: '', batch_lot_number: '', expiry_date: '', serial_number: '', counted_quantity: '', notes: '' });
  const [countDrafts, setCountDrafts] = useState({});
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCount(await physicalInventoryService.getCount(countId));
    } finally {
      setLoading(false);
    }
  }, [countId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!count?.items) return;
    setCountDrafts(Object.fromEntries(count.items.map((item) => [String(item.id), item.counted_quantity ?? ''])));
  }, [count?.items]);

  const canAddItems = ['DRAFT', 'COUNTING'].includes(count?.status_code);
  const canCount = count?.status_code === 'COUNTING';
  const canStart = count?.status_code === 'DRAFT';
  const canReview = count?.status_code === 'COUNTING';
  const canApprove = count?.status_code === 'REVIEW';
  const canPost = count?.status_code === 'APPROVED';
  const canCancel = count && count.status_code !== 'POSTED' && count.status_code !== 'CANCELLED';
  const selectedVariant = variants.find((variant) => String(variant.id) === String(itemForm.product_variant_id));
  const needsLocation = Boolean(selectedVariant?.has_location_tracking);
  const needsBatch = Boolean(selectedVariant?.has_batch_control || selectedVariant?.has_expiry_date);
  const needsExpiry = Boolean(selectedVariant?.has_expiry_date);
  const needsSerial = Boolean(selectedVariant?.has_serial_numbers);
  const zoneOptions = zones.filter((zone) => !count?.warehouse_id || String(zone.warehouse_id) === String(count.warehouse_id));
  const locationOptions = locations.filter((location) => !itemForm.warehouse_zone_id || String(location.warehouse_zone_id) === String(itemForm.warehouse_zone_id));

  const runAction = async (promiseFactory, messages) => {
    setBusy(true);
    try {
      await notifyPromise(promiseFactory(), messages);
      await load();
      await onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  const addItem = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!itemForm.product_variant_id) {
      setFormError('Selecciona un SKU / Variacion.');
      return;
    }
    if (needsBatch && !itemForm.batch_lot_number.trim()) {
      setFormError('Este producto controla lote/vencimiento; indica el lote.');
      return;
    }
    if (needsLocation && !count?.warehouse_zone_location_id && !itemForm.warehouse_zone_location_id) {
      setFormError('Este producto controla ubicacion; selecciona una ubicacion interna.');
      return;
    }
    if (needsExpiry && !itemForm.expiry_date) {
      setFormError('Este producto controla vencimiento; indica la fecha.');
      return;
    }
    if (needsSerial && !itemForm.serial_number.trim()) {
      setFormError('Este producto controla seriales; indica el numero de serie.');
      return;
    }
    if (needsSerial && itemForm.counted_quantity !== '' && Number(itemForm.counted_quantity) !== 1) {
      setFormError('Los productos con serial se cuentan con cantidad 1 por serial.');
      return;
    }
    await runAction(
      () => physicalInventoryService.addItem(countId, {
        product_variant_id: Number(itemForm.product_variant_id),
        warehouse_zone_id: itemForm.warehouse_zone_id ? Number(itemForm.warehouse_zone_id) : null,
        warehouse_zone_location_id: itemForm.warehouse_zone_location_id ? Number(itemForm.warehouse_zone_location_id) : null,
        batch_lot_number: itemForm.batch_lot_number.trim() || null,
        expiry_date: itemForm.expiry_date || null,
        serial_number: itemForm.serial_number.trim() || null,
        counted_quantity: itemForm.counted_quantity === '' ? null : Number(itemForm.counted_quantity),
        notes: itemForm.notes || null,
      }),
      { loading: 'Agregando item...', success: 'Item agregado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible agregar item.') },
    );
    setItemForm({ product_variant_id: '', warehouse_zone_id: '', warehouse_zone_location_id: '', batch_lot_number: '', expiry_date: '', serial_number: '', counted_quantity: '', notes: '' });
  };

  const updateItemCount = async (item) => {
    const rawValue = countDrafts[String(item.id)];
    const nextValue = Number(rawValue);
    if (Number.isNaN(nextValue) || nextValue < 0) {
      setFormError('Ingresa una cantidad valida.');
      return;
    }
    if (item.has_serial_numbers && nextValue !== 1) {
      setFormError('Los productos con serial se cuentan con cantidad 1 por serial.');
      return;
    }
    await runAction(
      () => physicalInventoryService.updateItemCount(countId, item.id, { counted_quantity: nextValue, notes: item.notes || null }),
      { loading: 'Registrando cantidad...', success: 'Cantidad registrada.', error: (requestError) => getBackendMessage(requestError, 'No fue posible registrar cantidad.') },
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <div className="text-xs font-medium uppercase text-slate-500">Codigo</div>
          <div className="mt-1 font-mono text-sm text-slate-900 dark:text-white">{count?.count_code || '-'}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase text-slate-500">Estado</div>
          <div className="mt-1"><CountStatusBadge status={count?.status_code} /></div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase text-slate-500">Bodega</div>
          <div className="mt-1 text-sm text-slate-900 dark:text-white">{count?.warehouse_name || '-'}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase text-slate-500">Alcance</div>
          <div className="mt-1 text-sm text-slate-900 dark:text-white">{[count?.zone_name, count?.location_name].filter(Boolean).join(' / ') || 'Toda la bodega'}</div>
        </div>
      </div>

      {canAddItems && (
        <form onSubmit={addItem} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60 md:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">SKU / Variacion</span>
            <select className={selectClassName} value={itemForm.product_variant_id} onChange={(event) => setItemForm((current) => ({ ...current, product_variant_id: event.target.value, batch_lot_number: '', expiry_date: '', serial_number: '' }))}>
              <option value="">Selecciona SKU</option>
              {variants.map((variant) => <option key={variant.id} value={variant.id}>{[variant.product_name, variant.variant_name || variant.variant_sku].filter(Boolean).join(' / ')}</option>)}
            </select>
          </label>
          {needsBatch && (
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">Lote *</span>
              <input className={fieldClassName} value={itemForm.batch_lot_number} onChange={(event) => setItemForm((current) => ({ ...current, batch_lot_number: event.target.value.toUpperCase() }))} maxLength={100} required />
            </label>
          )}
          {needsExpiry && (
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">Vencimiento *</span>
              <input className={fieldClassName} type="date" value={itemForm.expiry_date} onChange={(event) => setItemForm((current) => ({ ...current, expiry_date: event.target.value }))} required />
            </label>
          )}
          {needsSerial && (
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">Serial *</span>
              <input className={fieldClassName} value={itemForm.serial_number} onChange={(event) => setItemForm((current) => ({ ...current, serial_number: event.target.value.toUpperCase() }))} maxLength={100} required />
            </label>
          )}
          {needsLocation && !count?.warehouse_zone_location_id && (
            <>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Zona</span>
                <select className={selectClassName} value={itemForm.warehouse_zone_id} onChange={(event) => setItemForm((current) => ({ ...current, warehouse_zone_id: event.target.value, warehouse_zone_location_id: '' }))}>
                  <option value="">Selecciona zona</option>
                  {zoneOptions.map((zone) => <option key={zone.id} value={zone.id}>{optionLabel(zone, 'zone_code', 'zone_name')}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Ubicacion *</span>
                <select className={selectClassName} value={itemForm.warehouse_zone_location_id} onChange={(event) => setItemForm((current) => ({ ...current, warehouse_zone_location_id: event.target.value }))} disabled={!itemForm.warehouse_zone_id} required>
                  <option value="">Selecciona ubicacion</option>
                  {locationOptions.map((location) => <option key={location.id} value={location.id}>{optionLabel(location, 'location_code', 'location_name')}</option>)}
                </select>
              </label>
            </>
          )}
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Cantidad</span>
            <input className={fieldClassName} type="number" min="0" step="0.0001" value={itemForm.counted_quantity} onChange={(event) => setItemForm((current) => ({ ...current, counted_quantity: event.target.value }))} placeholder={canCount ? 'Contada' : 'Opcional'} />
          </label>
          <div className="flex items-end">
            <ActionButton type="submit" label="Agregar" icon={Plus} disabled={busy} className="w-full" />
          </div>
        </form>
      )}

      {formError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{formError}</div>}

      <DataTable
        loading={loading}
        data={count?.items || []}
        emptyMessage="No hay items en este conteo."
        columns={[
          { id: 'product', label: 'SKU / Variacion', render: (item) => <div><div className="font-medium">{item.variant_name}</div><div className="text-xs text-slate-500">{item.product_name}</div></div> },
          { id: 'location', label: 'Ubicacion', render: (item) => [item.zone_name, item.location_name].filter(Boolean).join(' / ') || '-' },
          { id: 'tracking', label: 'Lote / venc. / serial', render: (item) => [item.batch_lot_number, item.expiry_date, item.serial_number].filter(Boolean).join(' / ') || '-' },
          { id: 'system_quantity', label: 'Sistema', align: 'right', render: (item) => quantity(item.system_quantity) },
          {
            id: 'counted_quantity',
            label: 'Contado',
            align: 'right',
            render: (item) => canCount ? (
              <input
                className="h-9 w-28 rounded-md border border-slate-300 px-2 text-right text-sm dark:border-slate-700 dark:bg-slate-950"
                type="number"
                min="0"
                step="0.0001"
                value={countDrafts[String(item.id)] ?? ''}
                onChange={(event) => setCountDrafts((current) => ({ ...current, [String(item.id)]: event.target.value }))}
              />
            ) : item.counted_quantity === null || item.counted_quantity === undefined ? '-' : quantity(item.counted_quantity),
          },
          { id: 'difference_quantity', label: 'Diferencia', align: 'right', render: (item) => <span className={Number(item.difference_quantity || 0) ? 'font-medium text-amber-700 dark:text-amber-300' : ''}>{quantity(item.difference_quantity)}</span> },
          { id: 'review_status', label: 'Revision', render: (item) => item.review_status || '-' },
          { id: 'actions', label: 'Acciones', align: 'center', render: (item) => <RowActionButton label="Registrar conteo" icon={Check} disabled={!canCount || busy} onClick={() => updateItemCount(item)} /> },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="min-h-5 text-sm text-slate-500">
          {count ? `${count.counted_item_count || 0} de ${count.item_count || 0} items contados` : ''}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {canCancel && <ActionButton label="Cancelar conteo" icon={XCircle} variant="danger" disabled={busy} onClick={() => runAction(() => physicalInventoryService.cancel(countId), { loading: 'Cancelando...', success: 'Conteo cancelado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible cancelar.') })} />}
          {canStart && <ActionButton label="Iniciar" icon={Play} disabled={busy} onClick={() => runAction(() => physicalInventoryService.start(countId), { loading: 'Iniciando conteo...', success: 'Conteo iniciado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible iniciar.') })} />}
          {canReview && <ActionButton label="Enviar a revision" icon={Send} disabled={busy} onClick={() => runAction(() => physicalInventoryService.sendToReview(countId), { loading: 'Enviando...', success: 'Conteo enviado a revision.', error: (requestError) => getBackendMessage(requestError, 'No fue posible enviar a revision.') })} />}
          {canApprove && <ActionButton label="Aprobar" icon={ShieldCheck} disabled={busy} onClick={() => runAction(() => physicalInventoryService.approve(countId), { loading: 'Aprobando...', success: 'Conteo aprobado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible aprobar.') })} />}
          {canPost && <ActionButton label="Contabilizar" icon={ClipboardCheck} disabled={busy} onClick={() => runAction(() => physicalInventoryService.post(countId), { loading: 'Contabilizando...', success: 'Inventario contabilizado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible contabilizar.') })} />}
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cerrar</button>
        </div>
      </div>
    </div>
  );
};

const AdminPhysicalInventory = () => {
  const [counts, setCounts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [zones, setZones] = useState([]);
  const [locations, setLocations] = useState([]);
  const [variants, setVariants] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const formDataLoadedRef = useRef(false);

  const loadMeta = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextCounts, nextWarehouses] = await Promise.all([
        physicalInventoryService.listCounts({ limit: 500 }),
        adminMaintainersService.list('warehouses-options'),
      ]);
      setCounts(nextCounts);
      setWarehouses(nextWarehouses);
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar inventarios fisicos.'));
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
        physicalInventoryService.listVariantOptions(),
      ]);
      setZones(nextZones);
      setLocations(nextLocations);
      setVariants(nextVariants);
    } catch {
      formDataLoadedRef.current = false;
    }
  }, []);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { setPage(0); }, [search, status, warehouseFilter, pageSize]);

  const warehouseMap = useMemo(() => byId(warehouses), [warehouses]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return counts.filter((item) => {
      const matchesStatus = status === 'all' || item.status_code === status;
      const matchesWarehouse = warehouseFilter === 'all' || String(item.warehouse_id) === String(warehouseFilter);
      const matchesSearch = !term || [item.count_code, item.warehouse_name, item.zone_name, item.location_name, item.scope_description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
      return matchesStatus && matchesWarehouse && matchesSearch;
    });
  }, [counts, search, status, warehouseFilter]);
  const visibleData = filtered.slice(page * pageSize, page * pageSize + pageSize);

  const openCreate = async () => {
    await ensureFormData();
    ModalManager.show({
      type: 'custom',
      title: 'Nuevo inventario fisico',
      icon: ClipboardCheck,
      size: 'xlarge',
      showFooter: false,
      contentComponent: CreateCountModal,
      contentProps: {
        warehouses,
        zones,
        locations,
        onSubmit: async (payload) => {
          await notifyPromise(physicalInventoryService.createCount(payload), {
            loading: 'Creando inventario...',
            success: 'Inventario creado.',
            error: (requestError) => getBackendMessage(requestError, 'No fue posible crear inventario.'),
          });
          await loadMeta();
        },
      },
    });
  };

  const openDetail = async (item) => {
    await ensureFormData();
    ModalManager.show({
      type: 'custom',
      title: `Inventario fisico ${item.count_code}`,
      icon: ClipboardCheck,
      size: 'xlarge',
      showFooter: false,
      contentComponent: CountDetailModal,
      contentProps: {
        countId: item.id,
        variants,
        zones,
        locations,
        onChanged: loadMeta,
      },
    });
  };

  const kpis = [
    { label: 'Conteos', value: counts.length },
    { label: 'En proceso', value: counts.filter((item) => ['DRAFT', 'COUNTING', 'REVIEW'].includes(item.status_code)).length },
    { label: 'Con diferencias', value: counts.filter((item) => Number(item.difference_item_count || 0) > 0).length },
    { label: 'Contabilizados', value: counts.filter((item) => item.status_code === 'POSTED').length },
  ];

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Inventario fisico"
        description="Conteos fisicos, diferencias y conciliacion de stock."
        actions={[{ id: 'new-count', label: 'Nuevo inventario', icon: Plus, disabled: !warehouses.length, onClick: openCreate }]}
      />

      <KpiBar items={kpis} className="mb-4" />
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <FilterBar
        className="mb-4"
        searchValue={search}
        searchPlaceholder="Buscar codigo, bodega o alcance"
        onSearchChange={setSearch}
        gridClassName="lg:grid-cols-[minmax(280px,1fr)_180px_220px_auto_auto]"
        fields={[
          { id: 'status', value: status, onChange: setStatus, options: statusOptions },
          { id: 'warehouse', value: warehouseFilter, onChange: setWarehouseFilter, options: [{ value: 'all', label: 'Todas las bodegas' }, ...warehouses.map((warehouse) => ({ value: String(warehouse.id), label: optionLabel(warehouse, 'warehouse_code', 'warehouse_name') }))] },
        ]}
        actions={(
          <>
            <ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={loadMeta} className={loading ? '[&>svg]:animate-spin' : ''} />
            <ActionButton label="Limpiar" icon={XCircle} variant="neutral" onClick={() => { setSearch(''); setStatus('all'); setWarehouseFilter('all'); }} />
          </>
        )}
      />

      <DataTable
        loading={loading}
        data={visibleData}
        footer={tableFooter({ page, pageSize, total: filtered.length, loading, setPage, setPageSize })}
        columns={[
          { id: 'count', label: 'Inventario', sortable: true, render: (item) => <div><div className="font-medium">{item.count_code}</div><div className="text-xs text-slate-500">{countTypes.find((type) => type.value === item.count_type)?.label || item.count_type}</div></div> },
          { id: 'warehouse', label: 'Bodega', render: (item) => <div><div>{item.warehouse_name || warehouseMap[String(item.warehouse_id)]?.warehouse_name || '-'}</div><div className="text-xs text-slate-500">{[item.zone_name, item.location_name].filter(Boolean).join(' / ') || 'Toda la bodega'}</div></div> },
          { id: 'scheduled_date', label: 'Programado', render: (item) => item.scheduled_date || '-' },
          { id: 'items', label: 'Items', align: 'right', render: (item) => quantity(item.item_count) },
          { id: 'counted', label: 'Contados', align: 'right', render: (item) => quantity(item.counted_item_count) },
          { id: 'differences', label: 'Diferencias', align: 'right', render: (item) => <span className={Number(item.difference_item_count || 0) ? 'font-medium text-amber-700 dark:text-amber-300' : ''}>{quantity(item.difference_item_count)}</span> },
          { id: 'status', label: 'Estado', render: (item) => <CountStatusBadge status={item.status_code} /> },
          { id: 'actions', label: 'Acciones', align: 'center', render: (item) => <RowActionButton label="Ver detalle" icon={Eye} onClick={() => openDetail(item)} /> },
        ]}
      />
    </section>
  );
};

export default AdminPhysicalInventory;
