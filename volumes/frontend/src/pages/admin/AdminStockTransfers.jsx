/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, MapPin, PackageCheck, PackagePlus, PackageSearch, Pencil, Plus, RefreshCw, Send, Trash2, XCircle } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import StatusBadge from '@/components/common/data/StatusBadge';
import { adminMaintainersService } from '@/services/admin/adminMaintainersService';
import { stockTransfersService } from '@/services/inventory/stockTransfersService';
import { getBackendMessage, notifyPromise, toast } from '@/services/ui/notify';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { formatDateTime } from '@/utils/dateTime';
import { tableFooter } from './businessFoundationShared';

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const selectClassName = `${fieldClassName} bg-white dark:bg-slate-950`;
const textareaClassName = 'min-h-20 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';

const statusOptions = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'SHIPPED', label: 'Despachada' },
  { value: 'RECEIVED', label: 'Recibida' },
  { value: 'LOCATED', label: 'Ubicada' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

const statusMeta = {
  DRAFT: { label: 'Borrador', variant: 'inactive' },
  SHIPPED: { label: 'Despachada', variant: 'info' },
  RECEIVED: { label: 'Recibida', variant: 'warning' },
  LOCATED: { label: 'Ubicada', variant: 'active' },
  CANCELLED: { label: 'Cancelada', variant: 'danger' },
};

const quantity = (value) => Number(value || 0).toLocaleString('es-CL', { maximumFractionDigits: 4 });
const nameLabel = (item, nameField, fallbackField = 'label') => item?.[nameField] || item?.[fallbackField] || String(item?.id || '-');
const byId = (items) => Object.fromEntries(items.map((item) => [String(item.id), item]));
const ignoreRejected = async (work) => {
  try {
    await work();
    return true;
  } catch {
    // toast.promise already shows the backend-facing message.
    return false;
  }
};

const TransferStatusBadge = ({ status }) => {
  const meta = statusMeta[status] || { label: status || '-', variant: 'inactive' };
  return <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>;
};

const ModalActions = ({ onClose, saving, submitLabel = 'Guardar', message = '', messageTone = 'neutral' }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
    <div className={`min-h-5 text-sm ${messageTone === 'danger' ? 'text-red-600 dark:text-red-300' : messageTone === 'warning' ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}`}>{message}</div>
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancelar</button>
      <button type="submit" disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{saving ? 'Guardando...' : submitLabel}</button>
    </div>
  </div>
);

const TransferFormModal = ({ transfer, warehouses = [], onSubmit, onClose }) => {
  const routeLocked = Number(transfer?.item_count || 0) > 0;
  const [form, setForm] = useState({
    source_warehouse_id: transfer?.source_warehouse_id ? String(transfer.source_warehouse_id) : '',
    target_warehouse_id: transfer?.target_warehouse_id ? String(transfer.target_warehouse_id) : '',
    notes: transfer?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.source_warehouse_id || !form.target_warehouse_id) {
      setError('Selecciona bodega origen y destino.');
      return;
    }
    if (form.source_warehouse_id === form.target_warehouse_id) {
      setError('Origen y destino deben ser distintos.');
      return;
    }
    setSaving(true);
    try {
      const ok = await onSubmit({
        source_warehouse_id: Number(form.source_warehouse_id),
        target_warehouse_id: Number(form.target_warehouse_id),
        notes: form.notes || null,
      });
      if (ok !== false) onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Bodega origen</span>
          <select className={selectClassName} value={form.source_warehouse_id} onChange={(event) => setForm((current) => ({ ...current, source_warehouse_id: event.target.value }))} disabled={routeLocked} required>
            <option value="">Selecciona origen</option>
            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{nameLabel(warehouse, 'warehouse_name', 'warehouse_code')}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Bodega destino</span>
          <select className={selectClassName} value={form.target_warehouse_id} onChange={(event) => setForm((current) => ({ ...current, target_warehouse_id: event.target.value }))} disabled={routeLocked} required>
            <option value="">Selecciona destino</option>
            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{nameLabel(warehouse, 'warehouse_name', 'warehouse_code')}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">Notas</span>
          <textarea className={textareaClassName} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </label>
      </div>
      {routeLocked && <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">No es posible modificar las bodegas origen y destino porque la transferencia tiene productos asociados.</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <ModalActions onClose={onClose} saving={saving} submitLabel={transfer ? 'Guardar cambios' : 'Crear transferencia'} />
    </form>
  );
};

const AddItemModal = ({ transfer, item, variants = [], units = [], zones = [], locations = [], onSubmit, onClose }) => {
  const [form, setForm] = useState({
    product_variant_id: item?.product_variant_id ? String(item.product_variant_id) : '',
    quantity: item?.quantity ? String(item.quantity) : '1',
    measurement_unit_id: item?.measurement_unit_id ? String(item.measurement_unit_id) : '',
    source_warehouse_zone_id: item?.source_warehouse_zone_id ? String(item.source_warehouse_zone_id) : '',
    source_warehouse_zone_location_id: item?.source_warehouse_zone_location_id ? String(item.source_warehouse_zone_location_id) : '',
    batch_lot_number: item?.batch_lot_number || '',
    expiry_date: item?.expiry_date || '',
    serial_number: item?.serial_number || '',
    unit_cost: item?.unit_cost ? String(item.unit_cost) : '',
    notes: item?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [availability, setAvailability] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const zoneOptions = zones.filter((zone) => (
    String(zone.warehouse_id) === String(transfer.source_warehouse_id)
    && !String(zone.zone_code || '').startsWith('REC_')
  ));
  const locationOptions = locations.filter((location) => !form.source_warehouse_zone_id || String(location.warehouse_zone_id) === String(form.source_warehouse_zone_id));
  const selectedVariant = variants.find((variant) => String(variant.id) === String(form.product_variant_id));
  const needsLocation = Boolean(selectedVariant?.has_location_tracking);
  const needsBatch = Boolean(selectedVariant?.has_batch_control || selectedVariant?.has_expiry_date);
  const needsExpiry = Boolean(selectedVariant?.has_expiry_date);
  const needsSerial = Boolean(selectedVariant?.has_serial_numbers);
  const availableQuantity = Number(availability?.available_quantity ?? 0);
  const hasAvailability = Boolean(form.product_variant_id) && availability !== null;
  const availabilityScope = form.source_warehouse_zone_location_id
    ? 'ubicacion seleccionada'
    : form.source_warehouse_zone_id
      ? 'zona seleccionada'
      : 'stock general';
  const message = error
    || (form.product_variant_id
      ? loadingAvailability
        ? 'Consultando stock disponible...'
        : `Disponible origen (${availabilityScope}, base): ${quantity(availableQuantity)}`
      : 'Selecciona SKU / Variacion para ver stock disponible.');
  const messageTone = error ? 'danger' : hasAvailability && Number(form.quantity || 0) > availableQuantity ? 'warning' : 'neutral';

  useEffect(() => {
    if (!form.product_variant_id) {
      setAvailability(null);
      return undefined;
    }
    let active = true;
    setLoadingAvailability(true);
    stockTransfersService.getAvailableStock({
      product_variant_id: Number(form.product_variant_id),
      warehouse_id: Number(transfer.source_warehouse_id),
      warehouse_zone_id: form.source_warehouse_zone_id ? Number(form.source_warehouse_zone_id) : undefined,
      warehouse_zone_location_id: form.source_warehouse_zone_location_id ? Number(form.source_warehouse_zone_location_id) : undefined,
      batch_lot_number: form.batch_lot_number.trim() || undefined,
      expiry_date: form.expiry_date || undefined,
      serial_number: form.serial_number.trim() || undefined,
    })
      .then((nextAvailability) => {
        if (active) setAvailability(nextAvailability);
      })
      .catch(() => {
        if (active) setAvailability(null);
      })
      .finally(() => {
        if (active) setLoadingAvailability(false);
      });
    return () => {
      active = false;
    };
  }, [form.batch_lot_number, form.expiry_date, form.product_variant_id, form.serial_number, form.source_warehouse_zone_id, form.source_warehouse_zone_location_id, transfer.source_warehouse_id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.product_variant_id || Number(form.quantity) <= 0) {
      setError('Selecciona SKU / Variacion e indica cantidad.');
      return;
    }
    if (needsLocation && !form.source_warehouse_zone_location_id) {
      setError('Este producto controla ubicacion; selecciona una ubicacion interna de origen.');
      return;
    }
    if (needsBatch && !form.batch_lot_number.trim()) {
      setError('Este producto controla lote/vencimiento; indica el lote.');
      return;
    }
    if (needsExpiry && !form.expiry_date) {
      setError('Este producto controla vencimiento; indica la fecha.');
      return;
    }
    if (needsSerial && !form.serial_number.trim()) {
      setError('Este producto controla seriales; indica el numero de serie.');
      return;
    }
    if (needsSerial && Number(form.quantity) !== 1) {
      setError('Los productos con serial se transfieren con cantidad 1 por serial.');
      return;
    }
    if (hasAvailability && Number(form.quantity) > availableQuantity) {
      setError(`La cantidad supera el stock disponible en origen (${quantity(availableQuantity)}).`);
      return;
    }
    setSaving(true);
    try {
      const ok = await onSubmit({
        product_variant_id: Number(form.product_variant_id),
        quantity: Number(form.quantity),
        measurement_unit_id: form.measurement_unit_id ? Number(form.measurement_unit_id) : null,
        source_warehouse_zone_id: form.source_warehouse_zone_id ? Number(form.source_warehouse_zone_id) : null,
        source_warehouse_zone_location_id: form.source_warehouse_zone_location_id ? Number(form.source_warehouse_zone_location_id) : null,
        batch_lot_number: form.batch_lot_number.trim() || null,
        expiry_date: form.expiry_date || null,
        serial_number: form.serial_number.trim() || null,
        unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
        notes: form.notes || null,
      });
      if (ok !== false) onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">SKU / Variacion</span>
          <select className={selectClassName} value={form.product_variant_id} onChange={(event) => setForm((current) => ({ ...current, product_variant_id: event.target.value, batch_lot_number: '', expiry_date: '', serial_number: '' }))} required>
            <option value="">Selecciona SKU</option>
            {variants.map((variant) => <option key={variant.id} value={variant.id}>{[variant.product_name, nameLabel(variant, 'variant_name', 'variant_sku')].filter(Boolean).join(' / ')}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Cantidad</span>
          <input className={fieldClassName} type="number" min="0.0001" step="0.0001" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} required />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Unidad</span>
          <select className={selectClassName} value={form.measurement_unit_id} onChange={(event) => setForm((current) => ({ ...current, measurement_unit_id: event.target.value }))}>
            <option value="">Unidad base del producto</option>
            {units.map((unit) => <option key={unit.id} value={unit.id}>{nameLabel(unit, 'unit_name', 'unit_symbol')}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Zona origen</span>
          <select className={selectClassName} value={form.source_warehouse_zone_id} onChange={(event) => setForm((current) => ({ ...current, source_warehouse_zone_id: event.target.value, source_warehouse_zone_location_id: '' }))}>
            <option value="">Stock general</option>
            {zoneOptions.map((zone) => <option key={zone.id} value={zone.id}>{nameLabel(zone, 'zone_name', 'zone_code')}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Ubicacion origen{needsLocation ? ' *' : ''}</span>
          <select className={selectClassName} value={form.source_warehouse_zone_location_id} onChange={(event) => setForm((current) => ({ ...current, source_warehouse_zone_location_id: event.target.value }))} disabled={!form.source_warehouse_zone_id}>
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
          <span className="font-medium text-slate-700 dark:text-slate-200">Costo unitario</span>
          <input className={fieldClassName} type="number" min="0" step="0.0001" value={form.unit_cost} onChange={(event) => setForm((current) => ({ ...current, unit_cost: event.target.value }))} />
        </label>
        <label className="space-y-1 text-sm md:col-span-3">
          <span className="font-medium text-slate-700 dark:text-slate-200">Notas</span>
          <textarea className={textareaClassName} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </label>
      </div>
      <ModalActions onClose={onClose} saving={saving} submitLabel={item ? 'Guardar cambios' : 'Agregar item'} message={message} messageTone={messageTone} />
    </form>
  );
};

const ObserveReceptionModal = ({ item, decision, onSave, onClose }) => {
  const [form, setForm] = useState({
    received_quantity: decision?.received_quantity ?? item.quantity,
    reception_notes: decision?.reception_notes || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (Number(form.received_quantity) < 0 || Number(form.received_quantity) > Number(item.quantity)) {
      setError('La cantidad recibida debe estar entre 0 y lo despachado.');
      return;
    }
    if (!form.reception_notes.trim()) {
      setError('Indica la observacion de la linea.');
      return;
    }
    setSaving(true);
    try {
      const ok = await onSave?.({
        id: item.id,
        reception_status: 'OBSERVED',
        received_quantity: Number(form.received_quantity || 0),
        reception_notes: form.reception_notes.trim(),
      });
      if (ok !== false) onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1 text-sm md:col-span-2">
          <div className="font-medium text-slate-950 dark:text-white">{item.variant_name}</div>
          <div className="text-xs text-slate-500">Despachado: {quantity(item.quantity)}{item.batch_lot_number ? ` / Lote ${item.batch_lot_number}` : ''}{item.expiry_date ? ` / Vence ${item.expiry_date}` : ''}{item.serial_number ? ` / Serial ${item.serial_number}` : ''}</div>
        </div>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Cantidad recibida</span>
          <input className={fieldClassName} type="number" min="0" step="0.0001" max={item.quantity} value={form.received_quantity} onChange={(event) => setForm((current) => ({ ...current, received_quantity: event.target.value }))} required />
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">Observacion</span>
          <textarea className={textareaClassName} value={form.reception_notes} onChange={(event) => setForm((current) => ({ ...current, reception_notes: event.target.value }))} required />
        </label>
      </div>
      <ModalActions onClose={onClose} saving={saving} submitLabel="Guardar observacion" message={error} messageTone={error ? 'danger' : 'neutral'} />
    </form>
  );
};

const ReceiveModal = ({ transfer, receptionDraft = {}, onSubmit, onClose }) => {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const items = transfer.items || [];
  const rows = items.map((item) => ({
    ...item,
    decision: receptionDraft[String(item.id)] || (item.reception_status ? {
      reception_status: item.reception_status,
      received_quantity: item.received_quantity,
      reception_notes: item.reception_notes,
    } : null),
  }));
  const pendingCount = rows.filter((item) => !item.decision).length;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (pendingCount > 0) {
      setError('Debes aceptar u observar todas las lineas antes de recibir.');
      return;
    }
    if (notes.trim().length < 3) {
      setError('Indica una observacion general de recepcion.');
      return;
    }
    setSaving(true);
    try {
      const ok = await onSubmit({
        items: rows.map((item) => ({
          id: item.id,
          reception_status: item.decision.reception_status,
          received_quantity: Number(item.decision.received_quantity || 0),
          reception_notes: item.decision.reception_notes || null,
        })),
        notes: notes.trim(),
      });
      if (ok !== false) onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
            <PackageCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Resumen de recepcion</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Revisa las lineas confirmadas antes de procesar el ingreso a recepcion pendiente.</p>
          </div>
        </div>
        <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">SKU / Variacion</th>
                <th className="px-3 py-2 text-right font-semibold">Despachado</th>
                <th className="px-3 py-2 text-right font-semibold">Recibido</th>
                <th className="px-3 py-2 text-center font-semibold">Confirmacion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-950 dark:text-white">{item.variant_name}</div>
                    <div className="text-xs text-slate-500">{item.product_name}</div>
                    {item.decision?.reception_notes && <div className="mt-1 text-xs text-amber-700 dark:text-amber-300">{item.decision.reception_notes}</div>}
                  </td>
                  <td className="px-3 py-3 text-right font-medium">{quantity(item.quantity)}</td>
                  <td className="px-3 py-3 text-right font-medium">{item.decision ? quantity(item.decision.received_quantity) : '-'}</td>
                  <td className="px-3 py-3 text-center">
                    {item.decision?.reception_status === 'ACCEPTED' && <StatusBadge variant="active">Aceptada</StatusBadge>}
                    {item.decision?.reception_status === 'OBSERVED' && <StatusBadge variant="warning">Observada</StatusBadge>}
                    {!item.decision && <StatusBadge variant="inactive">Pendiente</StatusBadge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
        <div className="mb-3 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Cierre de recepcion</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Registra la observacion general que acompana la confirmacion.</p>
          </div>
        </div>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Observacion general</span>
          <textarea className={textareaClassName} value={notes} onChange={(event) => setNotes(event.target.value)} required />
        </label>
      </div>
      <ModalActions onClose={onClose} saving={saving} submitLabel="Procesar recepcion" message={error || (pendingCount > 0 ? `${pendingCount} linea(s) pendiente(s) de confirmar.` : 'Las lineas confirmadas actualizaran stock en recepcion pendiente.')} messageTone={error ? 'danger' : pendingCount > 0 ? 'warning' : 'neutral'} />
    </form>
  );
};

const PutawayModal = ({ transfer, zones = [], locations = [], onSubmit, onClose }) => {
  const pendingItems = (transfer.items || []).filter((item) => Number(item.pending_putaway_quantity || 0) > 0);
  const [form, setForm] = useState({ stock_transfer_item_id: pendingItems[0]?.id ? String(pendingItems[0].id) : '', warehouse_zone_id: '', warehouse_zone_location_id: '', quantity: pendingItems[0]?.pending_putaway_quantity || '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const selectedItem = pendingItems.find((item) => String(item.id) === String(form.stock_transfer_item_id));
  const needsLocation = Boolean(selectedItem?.has_location_tracking);
  const zoneOptions = zones.filter((zone) => String(zone.warehouse_id) === String(transfer.target_warehouse_id) && !String(zone.zone_code || '').startsWith('REC_'));
  const locationOptions = locations.filter((location) => !form.warehouse_zone_id || String(location.warehouse_zone_id) === String(form.warehouse_zone_id));

  useEffect(() => {
    if (selectedItem && !form.quantity) setForm((current) => ({ ...current, quantity: selectedItem.pending_putaway_quantity || '' }));
  }, [form.quantity, selectedItem]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.stock_transfer_item_id || !form.warehouse_zone_id || Number(form.quantity) <= 0) {
      setError('Selecciona item, ubicacion final y cantidad.');
      return;
    }
    if (needsLocation && !form.warehouse_zone_location_id) {
      setError('Este producto controla ubicacion; selecciona una ubicacion interna final.');
      return;
    }
    setSaving(true);
    try {
      const ok = await onSubmit({
        stock_transfer_item_id: Number(form.stock_transfer_item_id),
        warehouse_zone_id: Number(form.warehouse_zone_id),
        warehouse_zone_location_id: form.warehouse_zone_location_id ? Number(form.warehouse_zone_location_id) : null,
        quantity: Number(form.quantity),
        notes: form.notes || null,
      });
      if (ok !== false) onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">Item pendiente</span>
          <select className={selectClassName} value={form.stock_transfer_item_id} onChange={(event) => {
            const nextItem = pendingItems.find((item) => String(item.id) === event.target.value);
            setForm((current) => ({ ...current, stock_transfer_item_id: event.target.value, quantity: nextItem?.pending_putaway_quantity || '' }));
          }} required>
            {pendingItems.map((item) => <option key={item.id} value={item.id}>{item.variant_name}{item.batch_lot_number ? ` / ${item.batch_lot_number}` : ''}{item.serial_number ? ` / ${item.serial_number}` : ''} - pendiente {quantity(item.pending_putaway_quantity)}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Zona final</span>
          <select className={selectClassName} value={form.warehouse_zone_id} onChange={(event) => setForm((current) => ({ ...current, warehouse_zone_id: event.target.value, warehouse_zone_location_id: '' }))} required>
            <option value="">Selecciona zona</option>
            {zoneOptions.map((zone) => <option key={zone.id} value={zone.id}>{nameLabel(zone, 'zone_name', 'zone_code')}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Ubicacion interna{needsLocation ? ' *' : ''}</span>
          <select className={selectClassName} value={form.warehouse_zone_location_id} onChange={(event) => setForm((current) => ({ ...current, warehouse_zone_location_id: event.target.value }))} disabled={!form.warehouse_zone_id}>
            <option value="">{needsLocation ? 'Selecciona ubicacion' : 'Sin sububicacion'}</option>
            {locationOptions.map((location) => <option key={location.id} value={location.id}>{nameLabel(location, 'location_name', 'location_code')}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Cantidad</span>
          <input className={fieldClassName} type="number" min="0.0001" step="0.0001" max={selectedItem?.pending_putaway_quantity || undefined} value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} required />
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">Notas</span>
          <textarea className={textareaClassName} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </label>
      </div>
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <ModalActions onClose={onClose} saving={saving} submitLabel="Ubicar stock" />
    </form>
  );
};

const TransferDetailView = ({ transferId, variants, units, zones, locations, receptionDraft = {}, onReceptionDraftChange, onChanged, refreshToken = 0 }) => {
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [itemScope, setItemScope] = useState('all');
  const [itemPage, setItemPage] = useState(0);
  const [itemPageSize, setItemPageSize] = useState(10);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTransfer(await stockTransfersService.getTransfer(transferId));
    } finally {
      setLoading(false);
    }
  }, [transferId]);

  useEffect(() => { load(); }, [load, refreshToken]);
  useEffect(() => { setItemPage(0); }, [itemSearch, itemScope, itemPageSize]);
  if (!transfer) return <div className="py-10 text-center text-sm text-slate-500">{loading ? 'Cargando transferencia...' : 'Sin datos'}</div>;

  const filteredItems = (transfer.items || []).filter((item) => {
    const term = itemSearch.trim().toLowerCase();
    const matchesText = !term || [item.product_name, item.variant_name, item.batch_lot_number, item.expiry_date, item.serial_number, item.source_zone_name, item.source_location_name, item.pending_zone_name, item.pending_location_name].filter(Boolean).join(' ').toLowerCase().includes(term);
    const pending = Number(item.pending_putaway_quantity || 0);
    const matchesScope = itemScope === 'all' || (itemScope === 'pending' && pending > 0) || (itemScope === 'located' && pending === 0);
    return matchesText && matchesScope;
  });
  const visibleItems = filteredItems.slice(itemPage * itemPageSize, itemPage * itemPageSize + itemPageSize);

  const refreshAll = async () => {
    await load();
    await onChanged?.();
  };
  const openEditItem = (item) => ModalManager.show({
    type: 'custom', title: 'Editar item', size: 'xlarge', showFooter: false, contentComponent: AddItemModal,
    contentProps: {
      transfer, item, variants, units, zones, locations,
      onSubmit: async (payload) => {
        return ignoreRejected(async () => {
          await notifyPromise(stockTransfersService.updateItem(transfer.id, item.id, payload), { loading: 'Guardando item...', success: 'Item actualizado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible actualizar el item.') });
          await refreshAll();
        });
      },
    },
  });
  const removeItem = async (item) => {
    if (!await ModalManager.confirm({ title: 'Eliminar item', message: `Confirma eliminar ${item.variant_name || 'este item'} de la transferencia.`, buttons: { cancel: 'Cancelar', confirm: 'Eliminar' } })) return;
    await ignoreRejected(async () => {
      await notifyPromise(stockTransfersService.removeItem(transfer.id, item.id), { loading: 'Eliminando item...', success: 'Item eliminado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible eliminar el item.') });
      await refreshAll();
    });
  };
  const acceptReceptionLine = async (item) => {
    if (!await ModalManager.confirm({
      title: 'Aceptar linea recibida',
      message: `Confirma aceptar la recepcion completa de ${item.variant_name || 'esta linea'}.`,
      buttons: { cancel: 'Volver', confirm: 'Aceptar linea' },
    })) return;
    await ignoreRejected(async () => {
      await notifyPromise(
        stockTransfersService.saveReceptionLine(transfer.id, item.id, {
          reception_status: 'ACCEPTED',
          received_quantity: Number(item.quantity || 0),
          reception_notes: null,
        }),
        { loading: 'Guardando linea...', success: 'Linea aceptada.', error: (requestError) => getBackendMessage(requestError, 'No fue posible aceptar la linea.') }
      );
      onReceptionDraftChange?.((current) => {
        const next = { ...current };
        delete next[String(item.id)];
        return next;
      });
      await refreshAll();
    });
  };
  const observeReceptionLine = (item) => ModalManager.show({
    type: 'custom',
    title: 'Observar linea recibida',
    size: 'large',
    showFooter: false,
    contentComponent: ObserveReceptionModal,
    contentProps: {
      item,
      decision: receptionDecision(item),
      onSave: async (decision) => ignoreRejected(async () => {
        await notifyPromise(
          stockTransfersService.saveReceptionLine(transfer.id, item.id, {
            reception_status: decision.reception_status,
            received_quantity: Number(decision.received_quantity || 0),
            reception_notes: decision.reception_notes || null,
          }),
          { loading: 'Guardando observacion...', success: 'Linea observada.', error: (requestError) => getBackendMessage(requestError, 'No fue posible observar la linea.') }
        );
        onReceptionDraftChange?.((current) => {
          const next = { ...current };
          delete next[String(item.id)];
          return next;
        });
        await refreshAll();
      }),
    },
  });
  const receptionDecision = (item) => receptionDraft[String(item.id)] || (item.reception_status ? {
    reception_status: item.reception_status,
    received_quantity: item.received_quantity,
    reception_notes: item.reception_notes,
  } : null);

  return (
    <div className="space-y-5">
      <FilterBar
        searchValue={itemSearch}
        searchPlaceholder="Buscar producto, SKU o ubicacion"
        onSearchChange={setItemSearch}
        gridClassName="lg:grid-cols-[minmax(280px,1fr)_190px_auto_auto]"
        fields={[{
          id: 'itemScope',
          value: itemScope,
          onChange: setItemScope,
          options: [
            { value: 'all', label: 'Todos los items' },
            { value: 'pending', label: 'Pendientes de ubicacion' },
            { value: 'located', label: 'Ubicados' },
          ],
        }]}
        actions={(
          <>
            <ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={refreshAll} className={loading ? '[&>svg]:animate-spin' : ''} />
            <ActionButton label="Limpiar" icon={XCircle} variant="neutral" onClick={() => { setItemSearch(''); setItemScope('all'); setItemPage(0); }} />
          </>
        )}
      />
      <DataTable
        data={visibleItems}
        loading={loading}
        emptyMessage="No hay items para los filtros actuales."
        footer={tableFooter({ page: itemPage, pageSize: itemPageSize, total: filteredItems.length, loading, setPage: setItemPage, setPageSize: setItemPageSize })}
        columns={[
          { id: 'sku', label: 'SKU / Variacion', render: (item) => <div><div className="font-medium">{item.variant_name}</div><div className="text-xs text-slate-500">{item.product_name}</div></div> },
          { id: 'origin', label: 'Origen stock', render: (item) => [item.source_zone_name, item.source_location_name].filter(Boolean).join(' / ') || 'Stock general' },
          { id: 'tracking', label: 'Lote / venc. / serial', render: (item) => [item.batch_lot_number, item.expiry_date, item.serial_number].filter(Boolean).join(' / ') || '-' },
          { id: 'quantity', label: 'Despachado', align: 'right', render: (item) => quantity(item.quantity) },
          { id: 'received', label: 'Recibido', align: 'right', render: (item) => quantity(item.received_quantity) },
          { id: 'reception_status', label: 'Recepcion', render: (item) => {
            const decision = receptionDecision(item);
            if (decision?.reception_status === 'ACCEPTED') return <StatusBadge variant="active">Aceptada</StatusBadge>;
            if (decision?.reception_status === 'OBSERVED') return <StatusBadge variant="warning">Observada</StatusBadge>;
            return <StatusBadge variant="inactive">Pendiente</StatusBadge>;
          } },
          { id: 'pending', label: 'Pendiente ubicar', align: 'right', render: (item) => <span className={Number(item.pending_putaway_quantity || 0) > 0 ? 'font-medium text-amber-700 dark:text-amber-300' : ''}>{quantity(item.pending_putaway_quantity)}</span> },
          { id: 'pending_location', label: 'Recepcion', render: (item) => [item.pending_zone_name, item.pending_location_name].filter(Boolean).join(' / ') || '-' },
          { id: 'actions', label: 'Acciones', align: 'right', render: (item) => (
            <>
              <RowActionButton label="Editar" icon={Pencil} disabled={transfer.status !== 'DRAFT'} onClick={() => openEditItem(item)} />
              <RowActionButton label="Eliminar" icon={Trash2} variant="danger" disabled={transfer.status !== 'DRAFT'} onClick={() => removeItem(item)} />
              <RowActionButton label="Aceptar recepcion" icon={CheckCircle2} disabled={transfer.status !== 'SHIPPED'} onClick={() => acceptReceptionLine(item)} />
              <RowActionButton label="Observar recepcion" icon={AlertTriangle} variant="neutral" disabled={transfer.status !== 'SHIPPED'} onClick={() => observeReceptionLine(item)} />
            </>
          ) },
        ]}
      />
    </div>
  );
};

const AdminStockTransfers = () => {
  const navigate = useNavigate();
  const { transferId } = useParams();
  const timezone = usePreferencesStore((state) => state.timezone);
  const hourFormat = usePreferencesStore((state) => state.hourFormat);
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [zones, setZones] = useState([]);
  const [locations, setLocations] = useState([]);
  const [variants, setVariants] = useState([]);
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [detailRefreshToken, setDetailRefreshToken] = useState(0);
  const [receptionDraft, setReceptionDraft] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const formDataLoadedRef = useRef(false);

  const loadMeta = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextTransfers, nextWarehouses] = await Promise.all([
        stockTransfersService.listTransfers(),
        adminMaintainersService.list('warehouses-options'),
      ]);
      setTransfers(nextTransfers);
      setWarehouses(nextWarehouses);
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar transferencias.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const ensureFormData = useCallback(async () => {
    if (formDataLoadedRef.current) return;
    formDataLoadedRef.current = true;
    try {
      const [nextZones, nextLocations, nextVariants, nextUnits] = await Promise.all([
        adminMaintainersService.list('warehouse-zones-options'),
        adminMaintainersService.list('warehouse-zone-locations-options'),
        stockTransfersService.listVariantOptions(),
        adminMaintainersService.list('measurement-units-options'),
      ]);
      setZones(nextZones);
      setLocations(nextLocations);
      setVariants(nextVariants);
      setUnits(nextUnits);
    } catch {
      formDataLoadedRef.current = false;
    }
  }, []);

  useEffect(() => { loadMeta(); }, [loadMeta]);

  useEffect(() => {
    if (transferId) ensureFormData();
  }, [transferId, ensureFormData]);
  useEffect(() => { setReceptionDraft({}); }, [transferId]);
  useEffect(() => { setPage(0); }, [search, status, warehouseFilter, pageSize]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transfers.filter((transfer) => {
      const matchesStatus = status === 'all' || transfer.status === status;
      const matchesWarehouse = warehouseFilter === 'all' || String(transfer.source_warehouse_id) === String(warehouseFilter) || String(transfer.target_warehouse_id) === String(warehouseFilter);
      const haystack = [transfer.source_warehouse_name, transfer.target_warehouse_name, transfer.notes].filter(Boolean).join(' ').toLowerCase();
      return matchesStatus && matchesWarehouse && (!term || haystack.includes(term));
    });
  }, [search, status, transfers, warehouseFilter]);

  const visibleData = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const warehouseMap = byId(warehouses);
  const openCreate = async () => {
    await ensureFormData();
    ModalManager.show({
      type: 'custom', title: 'Nueva transferencia de stock', size: 'large', showFooter: false, contentComponent: TransferFormModal,
      contentProps: {
        warehouses,
        onSubmit: async (payload) => {
          return ignoreRejected(async () => {
            await notifyPromise(stockTransfersService.createTransfer(payload), { loading: 'Creando transferencia...', success: 'Transferencia creada.', error: (requestError) => getBackendMessage(requestError, 'No fue posible crear.') });
            await loadMeta();
          });
        },
      },
    });
  };
  const openEdit = async (transfer) => {
    await ensureFormData();
    ModalManager.show({
      type: 'custom', title: 'Editar transferencia de stock', size: 'large', showFooter: false, contentComponent: TransferFormModal,
      contentProps: {
        transfer,
        warehouses,
        onSubmit: async (payload) => {
          return ignoreRejected(async () => {
            await notifyPromise(stockTransfersService.updateTransfer(transfer.id, payload), { loading: 'Guardando transferencia...', success: 'Transferencia actualizada.', error: (requestError) => getBackendMessage(requestError, 'No fue posible actualizar.') });
            await loadMeta();
          });
        },
      },
    });
  };
  const openDetail = (transfer) => navigate(`/stock/transfers/${encodeURIComponent(transfer.transfer_code || transfer.id)}`);
  const deleteTransfer = async (transfer) => {
    if (!await ModalManager.confirm({ title: 'Eliminar transferencia', message: `Confirma eliminar la transferencia hacia ${transfer.target_warehouse_name || 'la bodega destino'}.`, buttons: { cancel: 'Cancelar', confirm: 'Eliminar' } })) return;
    await ignoreRejected(async () => {
      await notifyPromise(stockTransfersService.deleteTransfer(transfer.id), { loading: 'Eliminando transferencia...', success: 'Transferencia eliminada.', error: (requestError) => getBackendMessage(requestError, 'No fue posible eliminar.') });
      await loadMeta();
    });
  };
  const shipTransfer = async (transfer) => {
    if (!await ModalManager.confirm({ title: 'Despachar transferencia', message: `Confirma despachar la transferencia hacia ${transfer.target_warehouse_name || 'la bodega destino'}.`, buttons: { cancel: 'Volver', confirm: 'Despachar' } })) return;
    const loadingModalId = ModalManager.show({
      type: 'loading',
      title: 'Despachando transferencia',
      message: 'Procesando salida de stock desde la bodega origen.',
      showCancel: false,
      showProgress: false,
      indeterminate: true,
      closeOnOverlayClick: false,
      closeOnEscape: false,
    });

    try {
      await stockTransfersService.ship(transfer.id);
      ModalManager.close(loadingModalId);
      toast.success('Transferencia despachada.');
      await loadMeta();
    } catch (requestError) {
      ModalManager.close(loadingModalId);
      const message = getBackendMessage(requestError, 'No fue posible despachar la transferencia.');
      toast.error(message);
      ModalManager.error({
        title: 'No fue posible despachar',
        message,
        details: requestError?.response?.data?.error?.details || requestError?.response?.data?.details || message,
      });
    }
  };
  const cancelTransfer = async (transfer) => {
    if (!await ModalManager.confirm({ title: 'Cancelar transferencia', message: `Confirma cancelar la transferencia hacia ${transfer.target_warehouse_name || 'la bodega destino'}.`, buttons: { cancel: 'Volver', confirm: 'Cancelar transferencia' } })) return;
    await ignoreRejected(async () => {
      await notifyPromise(stockTransfersService.cancel(transfer.id), { loading: 'Cancelando transferencia...', success: 'Transferencia cancelada.', error: (requestError) => getBackendMessage(requestError, 'No fue posible cancelar.') });
      await loadMeta();
    });
  };
  const renderTransferActions = (transfer) => (
    <>
      <RowActionButton label="Editar transferencia" icon={Pencil} disabled={transfer.status !== 'DRAFT'} onClick={() => openEdit(transfer)} />
      <RowActionButton label="Productos de transferencia" icon={PackageSearch} onClick={() => openDetail(transfer)} />
      <RowActionButton label="Eliminar" icon={Trash2} variant="danger" disabled={!['DRAFT', 'CANCELLED'].includes(transfer.status)} onClick={() => deleteTransfer(transfer)} />
      {transfer.status === 'DRAFT' && (
        <RowActionButton label="Despachar" icon={Send} disabled={Number(transfer.item_count || 0) === 0} onClick={() => shipTransfer(transfer)} />
      )}
      {transfer.status === 'SHIPPED' && (
        <RowActionButton label="Recibir" icon={PackageCheck} onClick={() => openDetail(transfer)} />
      )}
      {transfer.status === 'RECEIVED' && (
        <RowActionButton label="Ubicar" icon={MapPin} onClick={() => openDetail(transfer)} />
      )}
      {transfer.status === 'DRAFT' && (
        <RowActionButton label="Cancelar" icon={XCircle} variant="danger" onClick={() => cancelTransfer(transfer)} />
      )}
    </>
  );

  const resetListFilters = () => {
    setSearch('');
    setStatus('all');
    setWarehouseFilter('all');
    setPage(0);
  };

  const kpis = [
    { label: 'Transferencias', value: transfers.length, active: status === 'all', onClick: () => setStatus('all') },
    { label: 'Pendientes de despacho', value: transfers.filter((item) => item.status === 'DRAFT').length, active: status === 'DRAFT', onClick: () => setStatus('DRAFT') },
    { label: 'Pendientes de recepcion', value: transfers.filter((item) => item.status === 'SHIPPED').length, active: status === 'SHIPPED', onClick: () => setStatus('SHIPPED') },
    { label: 'Pendientes de ubicacion', value: transfers.filter((item) => item.status === 'RECEIVED').length, active: status === 'RECEIVED', onClick: () => setStatus('RECEIVED') },
  ];

  if (transferId) {
    const decodedTransferKey = decodeURIComponent(transferId || '');
    const currentTransfer = transfers.find((item) => String(item.id) === decodedTransferKey || String(item.transfer_code) === decodedTransferKey);
    const refreshDetail = async () => {
      await loadMeta();
      setDetailRefreshToken((current) => current + 1);
    };
    const loadCurrentTransferDetail = async () => stockTransfersService.getTransfer(decodedTransferKey);
    const openAddItemFromHeader = async () => {
      await ensureFormData();
      const transfer = await loadCurrentTransferDetail();
      ModalManager.show({
        type: 'custom',
        title: 'Nuevo item',
        size: 'xlarge',
        showFooter: false,
        contentComponent: AddItemModal,
        contentProps: {
          transfer,
          variants,
          units,
          zones,
          locations,
          onSubmit: async (payload) => {
            return ignoreRejected(async () => {
              await notifyPromise(stockTransfersService.addItem(transfer.id, payload), { loading: 'Agregando item...', success: 'Item agregado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible agregar item.') });
              await refreshDetail();
            });
          },
        },
      });
    };
    const openReceiveFromHeader = async () => {
      const transfer = await loadCurrentTransferDetail();
      ModalManager.show({
        type: 'custom',
        title: 'Confirmar recepcion',
        size: 'large',
        showFooter: false,
        contentComponent: ReceiveModal,
        contentProps: {
          transfer,
          receptionDraft,
          onSubmit: async (payload) => {
            return ignoreRejected(async () => {
              await notifyPromise(stockTransfersService.receive(transfer.id, payload), { loading: 'Confirmando recepcion...', success: 'Transferencia recibida.', error: (requestError) => getBackendMessage(requestError, 'No fue posible recibir.') });
              setReceptionDraft({});
              await refreshDetail();
            });
          },
        },
      });
    };
    const openPutawayFromHeader = async () => {
      const transfer = await loadCurrentTransferDetail();
      ModalManager.show({
        type: 'custom',
        title: 'Ubicar stock recibido',
        size: 'large',
        showFooter: false,
        contentComponent: PutawayModal,
        contentProps: {
          transfer,
          zones,
          locations,
          onSubmit: async (payload) => {
            return ignoreRejected(async () => {
              await notifyPromise(stockTransfersService.putaway(transfer.id, payload), { loading: 'Ubicando stock...', success: 'Stock ubicado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible ubicar.') });
              await refreshDetail();
            });
          },
        },
      });
    };
    const pendingPutaway = Number(currentTransfer?.total_received_quantity || 0) - Number(currentTransfer?.total_putaway_quantity || 0);
    const detailRoute = currentTransfer
      ? `${currentTransfer.source_warehouse_name || 'Origen'} a ${currentTransfer.target_warehouse_name || 'Destino'}`
      : 'Despacho, recepcion y ubicacion final del stock transferido.';
    const detailKpis = [
      { label: 'Items', value: quantity(currentTransfer?.item_count) },
      { label: 'Despachado', value: quantity(currentTransfer?.total_quantity) },
      { label: 'Recibido', value: quantity(currentTransfer?.total_received_quantity) },
      { label: 'Pendiente ubicar', value: quantity(pendingPutaway) },
    ];
    return (
      <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
        <ModuleHeader
          title={currentTransfer ? `Transferencia a ${currentTransfer.target_warehouse_name || 'bodega destino'}` : 'Transferencia de stock'}
          description={(
            <div className="flex flex-wrap items-center gap-2">
              <span>{detailRoute}</span>
              {currentTransfer && <TransferStatusBadge status={currentTransfer.status} />}
            </div>
          )}
          actions={[
            { id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate('/stock/transfers') },
            { id: 'new-item', label: 'Nuevo item', icon: PackagePlus, disabled: !currentTransfer || currentTransfer.status !== 'DRAFT', onClick: openAddItemFromHeader },
            currentTransfer?.status === 'SHIPPED' && { id: 'receive', label: 'Recibir', icon: PackageCheck, variant: 'neutral', onClick: openReceiveFromHeader },
            currentTransfer?.status === 'RECEIVED' && { id: 'putaway', label: 'Ubicar', icon: MapPin, variant: 'neutral', onClick: openPutawayFromHeader },
          ]}
        />
        <KpiBar items={detailKpis} className="mb-4" />
        {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <TransferDetailView transferId={decodedTransferKey} variants={variants} units={units} zones={zones} locations={locations} receptionDraft={receptionDraft} onReceptionDraftChange={setReceptionDraft} onChanged={loadMeta} refreshToken={detailRefreshToken} />
      </section>
    );
  }

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Transferencias de stock"
        description="Despacho entre bodegas, recepcion en destino y ubicacion interna final."
        actions={[{ id: 'new-transfer', label: 'Nueva transferencia', icon: Plus, disabled: !warehouses.length, onClick: openCreate }]}
      />

      <KpiBar items={kpis} className="mb-4" />
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <FilterBar
        className="mb-4"
        searchValue={search}
        searchPlaceholder="Buscar origen, destino o notas"
        onSearchChange={setSearch}
        gridClassName="lg:grid-cols-[minmax(280px,1fr)_180px_220px_auto_auto]"
        fields={[
          { id: 'status', value: status, onChange: setStatus, options: statusOptions },
          { id: 'warehouse', value: warehouseFilter, onChange: setWarehouseFilter, options: [{ value: 'all', label: 'Todas las bodegas' }, ...warehouses.map((warehouse) => ({ value: String(warehouse.id), label: warehouse.warehouse_name || warehouse.warehouse_code || String(warehouse.id) }))] },
        ]}
        actions={(
          <>
            <ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={loadMeta} className={loading ? '[&>svg]:animate-spin' : ''} />
            <ActionButton label="Limpiar" icon={XCircle} variant="neutral" onClick={resetListFilters} />
          </>
        )}
      />
      <DataTable
        loading={loading}
        data={visibleData}
        footer={tableFooter({ page, pageSize, total: filtered.length, loading, setPage, setPageSize })}
        columns={[
          { id: 'transfer', label: 'Transferencia', sortable: true, sortValue: (item) => item.requested_at || item.created_at || '', render: (item) => <div><div className="font-medium">{item.target_warehouse_name || warehouseMap[String(item.target_warehouse_id)]?.warehouse_name || '-'}</div><div className="text-xs text-slate-500">{formatDateTime(item.requested_at || item.created_at, timezone, { hourFormat })}</div></div> },
          { id: 'route', label: 'Ruta', render: (item) => <div><div>{item.source_warehouse_name || warehouseMap[String(item.source_warehouse_id)]?.warehouse_name || '-'}</div><div className="text-xs text-slate-500">a {item.target_warehouse_name || warehouseMap[String(item.target_warehouse_id)]?.warehouse_name || '-'}</div></div> },
          { id: 'items', label: 'Items', align: 'right', render: (item) => quantity(item.item_count) },
          { id: 'quantity', label: 'Despachado', align: 'right', render: (item) => quantity(item.total_quantity) },
          { id: 'received', label: 'Recibido', align: 'right', render: (item) => quantity(item.total_received_quantity) },
          { id: 'putaway', label: 'Ubicado', align: 'right', render: (item) => quantity(item.total_putaway_quantity) },
          { id: 'status', label: 'Estado', render: (item) => <TransferStatusBadge status={item.status} /> },
          { id: 'actions', label: 'Acciones', align: 'right', render: renderTransferActions },
        ]}
      />
    </section>
  );
};

export default AdminStockTransfers;
