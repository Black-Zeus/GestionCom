/* eslint-disable react/prop-types */
import { useState } from 'react';

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const selectClassName = `${fieldClassName} bg-white dark:bg-slate-950`;
const textareaClassName = 'min-h-24 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';

const locationTypeOptions = [
  { value: 'GENERAL', label: 'General' },
  { value: 'AISLE', label: 'Pasillo' },
  { value: 'RACK', label: 'Rack' },
  { value: 'SHELF', label: 'Repisa' },
  { value: 'BIN', label: 'Casillero' },
  { value: 'DISPLAY', label: 'Exhibicion' },
  { value: 'OTHER', label: 'Otro' },
];

const toLocationPayload = (form) => ({
  warehouse_zone_id: Number(form.warehouse_zone_id),
  location_name: String(form.location_name || '').trim(),
  location_description: String(form.location_description || '').trim() || null,
  location_type: form.location_type || 'GENERAL',
  sort_order: form.sort_order === '' ? 0 : Number(form.sort_order),
  is_active: Boolean(form.is_active),
});

const WarehouseZoneLocationFormModal = ({
  mode = 'create',
  initialValues = {},
  optionData = {},
  routePrefill = {},
  onSubmit,
  onClose,
}) => {
  const [form, setForm] = useState({
    warehouse_zone_id: initialValues.warehouse_zone_id ? String(initialValues.warehouse_zone_id) : '',
    location_name: initialValues.location_name || '',
    location_description: initialValues.location_description || '',
    location_type: initialValues.location_type || 'GENERAL',
    sort_order: initialValues.sort_order ?? 0,
    is_active: initialValues.is_active !== false && Number(initialValues.is_active) !== 0,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const isEdit = mode === 'edit';
  const zoneOptions = (optionData['warehouse-zones-options'] || []).filter((zone) => (
    Number(zone.is_location_tracking_enabled) === 1 || zone.is_location_tracking_enabled === true || String(zone.value) === String(form.warehouse_zone_id)
  ));
  const isZoneScoped = Boolean(routePrefill.warehouse_zone_id);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!form.warehouse_zone_id) {
      setFormError('Debes seleccionar una zona.');
      return;
    }

    if (form.location_name.trim().length < 2) {
      setFormError('El nombre de la ubicacion debe tener al menos 2 caracteres.');
      return;
    }

    setSaving(true);

    try {
      await onSubmit(toLocationPayload(form));
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        {!isZoneScoped && (
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700 dark:text-slate-200">Zona</span>
            <select className={selectClassName} value={form.warehouse_zone_id} onChange={(event) => updateField('warehouse_zone_id', event.target.value)} required>
              <option value="">Selecciona zona</option>
              {zoneOptions.map((zone) => (
                <option key={zone.value} value={zone.value}>{zone.label}</option>
              ))}
            </select>
          </label>
        )}

        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">Nombre</span>
          <input className={fieldClassName} value={form.location_name} onChange={(event) => updateField('location_name', event.target.value)} required minLength={2} placeholder="Ej: Pasillo 1, Rack A, Repisa superior" />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Tipo</span>
          <select className={selectClassName} value={form.location_type} onChange={(event) => updateField('location_type', event.target.value)}>
            {locationTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Orden</span>
          <input className={fieldClassName} type="number" min="0" value={form.sort_order} onChange={(event) => updateField('sort_order', event.target.value)} />
        </label>

        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">Descripcion</span>
          <textarea className={textareaClassName} value={form.location_description} onChange={(event) => updateField('location_description', event.target.value)} rows={3} placeholder="Referencia fisica visible para operacion interna." />
        </label>
      </div>

      <label className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
        <input type="checkbox" checked={form.is_active} onChange={(event) => updateField('is_active', event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
        Activo
      </label>

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
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear ubicacion'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default WarehouseZoneLocationFormModal;
