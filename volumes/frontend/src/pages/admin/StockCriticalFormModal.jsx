/* eslint-disable react/prop-types */
import { useMemo, useState } from 'react';

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const selectClassName = `${fieldClassName} bg-white dark:bg-slate-950`;

const toNumber = (value, fallback = 0) => {
  if (value === '' || value === null || value === undefined) return fallback;
  return Number(value);
};

const calculateReorderQuantity = (form) => {
  if (form.maximum_stock === '' || form.maximum_stock === null || form.maximum_stock === undefined) return null;
  const reorderPoint = toNumber(form.minimum_stock) + toNumber(form.safety_stock);
  return Math.max(Number(form.maximum_stock) - reorderPoint, 0);
};

const toStockPayload = (form) => ({
  product_variant_id: Number(form.product_variant_id),
  warehouse_id: Number(form.warehouse_id),
  minimum_stock: toNumber(form.minimum_stock),
  maximum_stock: form.maximum_stock === '' ? null : Number(form.maximum_stock),
  safety_stock: toNumber(form.safety_stock),
  reorder_quantity: calculateReorderQuantity(form),
  lead_time_days: toNumber(form.lead_time_days, 0),
  avg_daily_sales: toNumber(form.avg_daily_sales),
  last_calculated_date: form.last_calculated_date || null,
  alert_enabled: Boolean(form.alert_enabled),
  alert_frequency_hours: toNumber(form.alert_frequency_hours, 24),
  is_active: Boolean(form.is_active),
});

const StockCriticalFormModal = ({
  mode = 'create',
  initialValues = {},
  optionData = {},
  onSubmit,
  onClose,
}) => {
  const [form, setForm] = useState({
    product_variant_id: initialValues.product_variant_id ? String(initialValues.product_variant_id) : '',
    warehouse_id: initialValues.warehouse_id ? String(initialValues.warehouse_id) : '',
    minimum_stock: initialValues.minimum_stock ?? 0,
    maximum_stock: initialValues.maximum_stock ?? '',
    safety_stock: initialValues.safety_stock ?? 0,
    lead_time_days: initialValues.lead_time_days ?? 7,
    avg_daily_sales: initialValues.avg_daily_sales ?? 0,
    last_calculated_date: initialValues.last_calculated_date || '',
    alert_enabled: initialValues.alert_enabled !== false && Number(initialValues.alert_enabled) !== 0,
    alert_frequency_hours: initialValues.alert_frequency_hours ?? 24,
    is_active: initialValues.is_active !== false && Number(initialValues.is_active) !== 0,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const isEdit = mode === 'edit';
  const skuOptions = optionData['product-variants-options'] || [];
  const warehouseOptions = optionData['warehouses-options'] || [];
  const reorderPoint = useMemo(() => (
    toNumber(form.minimum_stock) + toNumber(form.safety_stock)
  ), [form.minimum_stock, form.safety_stock]);
  const reorderQuantity = useMemo(() => calculateReorderQuantity(form), [form]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!form.product_variant_id) {
      setFormError('Debes seleccionar un SKU.');
      return;
    }

    if (!form.warehouse_id) {
      setFormError('Debes seleccionar una bodega.');
      return;
    }

    const numericFields = ['minimum_stock', 'safety_stock', 'lead_time_days', 'avg_daily_sales', 'alert_frequency_hours'];
    const hasInvalidNumber = numericFields.some((field) => Number(form[field]) < 0 || Number.isNaN(Number(form[field])));
    if (hasInvalidNumber || (form.maximum_stock !== '' && Number(form.maximum_stock) < 0)) {
      setFormError('Los valores numericos no pueden ser negativos.');
      return;
    }

    if (form.maximum_stock !== '' && Number(form.maximum_stock) < reorderPoint) {
      setFormError('El stock maximo no puede ser menor que el punto de reorden.');
      return;
    }

    if (Number(form.alert_frequency_hours) < 1) {
      setFormError('La frecuencia de alerta debe ser de al menos 1 hora.');
      return;
    }

    setSaving(true);

    try {
      await onSubmit(toStockPayload(form));
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">SKU / Variacion</span>
          <select className={selectClassName} value={form.product_variant_id} onChange={(event) => updateField('product_variant_id', event.target.value)} required>
            <option value="">Selecciona SKU</option>
            {skuOptions.map((sku) => (
              <option key={sku.value} value={sku.value}>{sku.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Bodega</span>
          <select className={selectClassName} value={form.warehouse_id} onChange={(event) => updateField('warehouse_id', event.target.value)} required>
            <option value="">Selecciona bodega</option>
            {warehouseOptions.map((warehouse) => (
              <option key={warehouse.value} value={warehouse.value}>{warehouse.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Stock minimo</span>
          <input className={fieldClassName} type="number" min="0" step="0.0001" value={form.minimum_stock} onChange={(event) => updateField('minimum_stock', event.target.value)} />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Stock seguridad</span>
          <input className={fieldClassName} type="number" min="0" step="0.0001" value={form.safety_stock} onChange={(event) => updateField('safety_stock', event.target.value)} />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Punto reorden</span>
          <input className={`${fieldClassName} bg-slate-50 text-slate-500 dark:bg-slate-900`} value={reorderPoint.toLocaleString('es-CL')} disabled readOnly />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Stock maximo</span>
          <input className={fieldClassName} type="number" min="0" step="0.0001" value={form.maximum_stock} onChange={(event) => updateField('maximum_stock', event.target.value)} placeholder="Opcional" />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Cantidad reorden</span>
          <input
            className={`${fieldClassName} bg-slate-50 text-slate-500 dark:bg-slate-900`}
            value={reorderQuantity === null ? 'Sin maximo' : reorderQuantity.toLocaleString('es-CL')}
            disabled
            readOnly
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Lead time dias</span>
          <input className={fieldClassName} type="number" min="0" value={form.lead_time_days} onChange={(event) => updateField('lead_time_days', event.target.value)} />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Venta diaria prom.</span>
          <input className={fieldClassName} type="number" min="0" step="0.0001" value={form.avg_daily_sales} onChange={(event) => updateField('avg_daily_sales', event.target.value)} />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Ultimo calculo</span>
          <input className={fieldClassName} type="date" value={form.last_calculated_date} onChange={(event) => updateField('last_calculated_date', event.target.value)} />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Frecuencia alerta</span>
          <input className={fieldClassName} type="number" min="1" value={form.alert_frequency_hours} onChange={(event) => updateField('alert_frequency_hours', event.target.value)} />
        </label>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <label className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
          <input type="checkbox" checked={form.alert_enabled} onChange={(event) => updateField('alert_enabled', event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Alerta activa
        </label>

        <label className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
          <input type="checkbox" checked={form.is_active} onChange={(event) => updateField('is_active', event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Regla activa
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
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear regla'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default StockCriticalFormModal;
