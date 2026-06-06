/* eslint-disable react/prop-types */
import { useState } from 'react';

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const selectClassName = `${fieldClassName} bg-white dark:bg-slate-950`;
const textareaClassName = 'min-h-24 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';

const toZonePayload = (form) => ({
  warehouse_id: Number(form.warehouse_id),
  zone_name: String(form.zone_name || '').trim(),
  zone_description: String(form.zone_description || '').trim() || null,
  is_location_tracking_enabled: Boolean(form.is_location_tracking_enabled),
  is_active: Boolean(form.is_active),
});

const WarehouseZoneFormModal = ({
  mode = 'create',
  initialValues = {},
  optionData = {},
  routePrefill = {},
  onSubmit,
  onClose,
}) => {
  const [form, setForm] = useState({
    warehouse_id: initialValues.warehouse_id ? String(initialValues.warehouse_id) : '',
    zone_name: initialValues.zone_name || '',
    zone_description: initialValues.zone_description || '',
    is_location_tracking_enabled: initialValues.is_location_tracking_enabled === true || Number(initialValues.is_location_tracking_enabled) === 1,
    is_active: initialValues.is_active !== false && Number(initialValues.is_active) !== 0,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const isEdit = mode === 'edit';
  const warehouseOptions = optionData['warehouses-options'] || [];
  const isWarehouseScoped = Boolean(routePrefill.warehouse_id);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!form.warehouse_id) {
      setFormError('Debes seleccionar una bodega.');
      return;
    }

    if (form.zone_name.trim().length < 3) {
      setFormError('El nombre de la zona debe tener al menos 3 caracteres.');
      return;
    }

    setSaving(true);

    try {
      await onSubmit(toZonePayload(form));
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        {!isWarehouseScoped && (
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700 dark:text-slate-200">Bodega</span>
            <select className={selectClassName} value={form.warehouse_id} onChange={(event) => updateField('warehouse_id', event.target.value)} required>
              <option value="">Selecciona bodega</option>
              {warehouseOptions.map((warehouse) => (
                <option key={warehouse.value} value={warehouse.value}>{warehouse.label}</option>
              ))}
            </select>
          </label>
        )}

        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">Nombre</span>
          <input className={fieldClassName} value={form.zone_name} onChange={(event) => updateField('zone_name', event.target.value)} required minLength={3} placeholder="Ej: Recepcion, Sala de ventas, Reserva" />
        </label>

        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">Descripcion</span>
          <textarea className={textareaClassName} value={form.zone_description} onChange={(event) => updateField('zone_description', event.target.value)} rows={3} placeholder="Uso o alcance operativo de la zona." />
        </label>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <label className="flex min-h-11 items-start gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
          <input type="checkbox" checked={form.is_location_tracking_enabled} onChange={(event) => updateField('is_location_tracking_enabled', event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
          <span>
            <span className="block font-medium text-slate-800 dark:text-slate-100">Controla ubicaciones internas</span>
            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">Usar cuando la zona se subdivide en posiciones internas.</span>
          </span>
        </label>

        <label className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
          <input type="checkbox" checked={form.is_active} onChange={(event) => updateField('is_active', event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Activo
        </label>
      </div>

      {formError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {formError}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="min-h-5" />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear zona'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default WarehouseZoneFormModal;
