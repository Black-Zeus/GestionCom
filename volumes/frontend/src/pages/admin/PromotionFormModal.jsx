/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import { AlertCircle, Building2, CheckCircle2, XCircle } from 'lucide-react';
import { adminMaintainersService } from '@/services/admin/adminMaintainersService';
import DatePicker from '@/components/common/forms/DatePicker';

const fieldCls = 'h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const checkCls = 'flex min-h-11 items-center gap-3 rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950';

const PROMOTION_TYPES = [
  { value: 'PERCENTAGE_OFF',    label: 'Descuento porcentual' },
  { value: 'FIXED_AMOUNT',      label: 'Descuento monto fijo' },
  { value: 'QUANTITY_DISCOUNT', label: 'Descuento por cantidad' },
  { value: 'BUY_X_GET_Y',       label: 'Compra X lleva Y' },
];

const TARGET_TYPES = [
  { value: 'PRODUCT',  label: 'Producto' },
  { value: 'CATEGORY', label: 'Categoria' },
  { value: 'ALL',      label: 'Todos los productos' },
];

const FIELDS_BY_TYPE = {
  PERCENTAGE_OFF:    { target: true,  minQty: true,  pct: true,  amount: false, buyQty: false, getQty: false },
  FIXED_AMOUNT:      { target: true,  minQty: true,  pct: false, amount: true,  buyQty: false, getQty: false },
  QUANTITY_DISCOUNT: { target: true,  minQty: true,  pct: true,  amount: true,  buyQty: false, getQty: false },
  BUY_X_GET_Y:       { target: false, minQty: false, pct: false, amount: false, buyQty: true,  getQty: true  },
};

const today = new Date().toISOString().slice(0, 10);

const toDateTimeLocal = (raw) =>
  raw ? String(raw).slice(0, 16).replace(' ', 'T') : '';

const PromotionFormModal = ({ initialValues = {}, mode = 'create', onSubmit, onClose }) => {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState({
    promotion_name:         '',
    promotion_type:         'PERCENTAGE_OFF',
    target_type:            'PRODUCT',
    category_id:            '',
    min_quantity:           '',
    discount_percentage:    '',
    discount_amount:        '',
    buy_quantity:           '',
    get_quantity:           '',
    valid_from:             `${today}T00:00`,
    valid_to:               `${today}T23:59`,
    is_combinable:          false,
    is_active:              true,
    applies_all_warehouses: false,
    ...initialValues,
    is_combinable:          !!initialValues.is_combinable,
    is_active:              initialValues.is_active !== undefined ? !!initialValues.is_active : true,
    applies_all_warehouses: initialValues.applies_all_warehouses !== undefined
      ? !!initialValues.applies_all_warehouses
      : false,
    valid_from: toDateTimeLocal(initialValues.valid_from) || `${today}T00:00`,
    valid_to:   toDateTimeLocal(initialValues.valid_to)   || `${today}T23:59`,
  });

  const [saving,       setSaving]       = useState(false);
  const [categories,   setCategories]   = useState([]);
  const [warehouses,   setWarehouses]   = useState([]);
  const [warehouseIds, setWarehouseIds] = useState([]);
  const [error,        setError]        = useState('');

  useEffect(() => {
    adminMaintainersService.list('categories-options', { active_only: true })
      .then((res) => setCategories(res.items ?? res))
      .catch(() => {});
    adminMaintainersService.list('warehouses-options')
      .then((res) => {
        const whs = res.items ?? res;
        setWarehouses(whs);
        if (initialValues.applies_all_warehouses) {
          setWarehouseIds(whs.map((w) => Number(w.id)));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!initialValues.id || initialValues.applies_all_warehouses) return;
    adminMaintainersService.list('promotion-warehouses', { promotion_id: initialValues.id })
      .then((rows) => setWarehouseIds(rows.map((r) => Number(r.warehouse_id))))
      .catch(() => {});
  }, [initialValues.id]);

  const set = (field, value) => setForm((c) => ({ ...c, [field]: value }));
  const vis = FIELDS_BY_TYPE[form.promotion_type] ?? FIELDS_BY_TYPE.PERCENTAGE_OFF;
  const showCategory = vis.target && form.target_type === 'CATEGORY';

  const toggleWarehouse = (id) =>
    setWarehouseIds((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id],
    );

  const syncWarehouses = async (promotionId) => {
    const current    = await adminMaintainersService.list('promotion-warehouses', { promotion_id: promotionId });
    const currentIds = current.map((r) => Number(r.warehouse_id));

    if (form.applies_all_warehouses) {
      await Promise.all(current.map((r) => adminMaintainersService.remove('promotion-warehouses', r.id)));
      return;
    }

    await Promise.all(
      current
        .filter((r) => !warehouseIds.includes(Number(r.warehouse_id)))
        .map((r) => adminMaintainersService.remove('promotion-warehouses', r.id)),
    );
    await Promise.all(
      warehouseIds
        .filter((wid) => !currentIds.includes(wid))
        .map((wid) => adminMaintainersService.create('promotion-warehouses', { promotion_id: promotionId, warehouse_id: wid })),
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (warehouseIds.length === 0) {
      setError('Selecciona al menos una sucursal.');
      return;
    }

    setSaving(true);
    try {
      const saved = await onSubmit({
        promotion_name:         form.promotion_name.trim(),
        promotion_type:         form.promotion_type,
        target_type:            vis.target ? form.target_type : 'ALL',
        category_id:            showCategory && form.category_id !== '' ? Number(form.category_id) : null,
        min_quantity:           vis.minQty  && form.min_quantity !== ''       ? Number(form.min_quantity)       : null,
        discount_percentage:    vis.pct     && form.discount_percentage !== '' ? Number(form.discount_percentage) : null,
        discount_amount:        vis.amount  && form.discount_amount !== ''     ? Number(form.discount_amount)     : null,
        buy_quantity:           vis.buyQty  && form.buy_quantity !== ''        ? Number(form.buy_quantity)        : null,
        get_quantity:           vis.getQty  && form.get_quantity !== ''        ? Number(form.get_quantity)        : null,
        valid_from:             form.valid_from ? `${form.valid_from.replace('T', ' ')}:00` : null,
        valid_to:               form.valid_to   ? `${form.valid_to.replace('T', ' ')}:00`   : null,
        is_combinable:          false,
        is_active:              Boolean(form.is_active),
        applies_all_warehouses: allActive,
      });

      const promotionId = saved?.id ?? initialValues?.id;
      if (promotionId) await syncWarehouses(promotionId);

      onClose?.();
    } catch {
      // notifyPromise already shows the error toast
    } finally {
      setSaving(false);
    }
  };

  const allActive = warehouses.length > 0 && warehouseIds.length === warehouses.length;

  const toggleAll = (checked) => {
    if (checked) setWarehouseIds(warehouses.map((w) => Number(w.id)));
    else setWarehouseIds([]);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
    <div className="flex min-h-0 gap-5">

      {/* ── Columna izquierda: campos del formulario ── */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="grid gap-3 md:grid-cols-2">

          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700 dark:text-slate-200">Nombre de la promocion</span>
            <input className={fieldCls} value={form.promotion_name} onChange={(e) => set('promotion_name', e.target.value)} required placeholder="Ej: Descuento verano 20%" />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">
              Tipo de promocion
              {isEdit && <span className="ml-1.5 text-xs font-normal text-slate-400">(no editable)</span>}
            </span>
            <select
              className={`${fieldCls} bg-white dark:bg-slate-950 ${isEdit ? 'cursor-not-allowed opacity-60' : ''}`}
              value={form.promotion_type}
              onChange={(e) => !isEdit && set('promotion_type', e.target.value)}
              disabled={isEdit}
            >
              {PROMOTION_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>

          {vis.target && (
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">Objetivo</span>
              <select
                className={`${fieldCls} bg-white dark:bg-slate-950`}
                value={form.target_type}
                onChange={(e) => set('target_type', e.target.value)}
              >
                {TARGET_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          )}

          {/* Aviso cuando se cambia el objetivo en edición desde Producto a otro */}
          {isEdit && initialValues.target_type === 'PRODUCT' && form.target_type !== 'PRODUCT' && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400 md:col-span-2">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Los productos asociados a esta promocion quedan sin efecto con el nuevo objetivo. Puedes eliminarlos desde el submodulo <strong>Items</strong>.</span>
            </div>
          )}

          {showCategory && (
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-slate-700 dark:text-slate-200">
                Categoria afectada <span className="text-red-500">*</span>
              </span>
              <select
                className={`${fieldCls} bg-white dark:bg-slate-950`}
                value={form.category_id}
                onChange={(e) => set('category_id', e.target.value)}
                required
              >
                <option value="">Selecciona una categoria...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.category_name}</option>)}
              </select>
            </label>
          )}

          {vis.minQty && (
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">Cantidad minima</span>
              <input className={fieldCls} type="number" min="0" step="1" value={form.min_quantity} onChange={(e) => set('min_quantity', e.target.value)} placeholder="0" />
            </label>
          )}
          {vis.pct && (
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">Descuento %</span>
              <input className={fieldCls} type="number" min="0" max="100" step="0.01" value={form.discount_percentage} onChange={(e) => set('discount_percentage', e.target.value)} placeholder="0.00" />
            </label>
          )}
          {vis.amount && (
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">Descuento monto</span>
              <input className={fieldCls} type="number" min="0" step="1" value={form.discount_amount} onChange={(e) => set('discount_amount', e.target.value)} placeholder="0" />
            </label>
          )}
          {vis.buyQty && (
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">Compra cantidad</span>
              <input className={fieldCls} type="number" min="1" step="1" value={form.buy_quantity} onChange={(e) => set('buy_quantity', e.target.value)} placeholder="2" required />
            </label>
          )}
          {vis.getQty && (
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">Recibe cantidad</span>
              <input className={fieldCls} type="number" min="1" step="1" value={form.get_quantity} onChange={(e) => set('get_quantity', e.target.value)} placeholder="3" required />
            </label>
          )}

          <div className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Vigente desde</span>
            <DatePicker value={form.valid_from} onChange={(v) => set('valid_from', v)} placeholder="Seleccionar fecha de inicio" minDate={today} withTime className="w-full" />
          </div>

          <div className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Vigente hasta</span>
            <DatePicker value={form.valid_to} onChange={(v) => set('valid_to', v)} placeholder="Seleccionar fecha de término" minDate={form.valid_from ? form.valid_from.slice(0, 10) : today} withTime className="w-full" />
          </div>

          {/* TODO: is_combinable siempre se guarda como false hasta implementar lógica de
               combinación/escalamiento de promociones en best_promotion_for (business_foundation.py:1331).
               Hoy el motor aplica solo la mejor promoción (precio más bajo), sin apilar. */}

          <label className={checkCls}>
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Activa</span>
          </label>

        </div>

      </div>

      {/* ── Columna derecha: sucursales ── */}
      <div className="flex w-64 shrink-0 flex-col gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Sucursales
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">

          {/* Header con "Todas" integrado */}
          <label className="grid cursor-pointer grid-cols-[1fr_auto] items-center border-b border-slate-200 bg-slate-100 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Local / Bodega</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Todas</span>
              <input
                type="checkbox"
                checked={allActive}
                onChange={(e) => toggleAll(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
            </div>
          </label>

          {/* Rows */}
          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {warehouses.map((w) => {
              const checked = allActive || warehouseIds.includes(Number(w.id));
              return (
                <label
                  key={w.id}
                  className="grid cursor-pointer grid-cols-[1fr_auto] items-center px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                      <Building2 className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                      {w.warehouse_name}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleWarehouse(Number(w.id))}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                </label>
              );
            })}
          </div>
        </div>
      </div>

    </div>

      {/* ── Footer ancho completo ── */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button type="button" onClick={onClose} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
          <XCircle className="h-4 w-4" /> Cancelar
        </button>
        <button type="submit" disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
          <CheckCircle2 className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
};

export default PromotionFormModal;
