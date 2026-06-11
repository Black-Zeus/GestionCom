/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { adminMaintainersService } from '@/services/admin/adminMaintainersService';

const fieldCls = 'h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const checkCls = 'flex min-h-11 items-center gap-3 rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950';

const PROMOTION_TYPES = [
  { value: 'PERCENTAGE_OFF', label: 'Descuento porcentual' },
  { value: 'FIXED_AMOUNT', label: 'Descuento monto fijo' },
  { value: 'QUANTITY_DISCOUNT', label: 'Descuento por cantidad' },
  { value: 'BUY_X_GET_Y', label: 'Compra X lleva Y' },
];

const TARGET_TYPES = [
  { value: 'PRODUCT', label: 'Producto' },
  { value: 'CATEGORY', label: 'Categoria' },
  { value: 'ALL', label: 'Todos los productos' },
];

const FIELDS_BY_TYPE = {
  PERCENTAGE_OFF:   { target: true,  minQty: true,  pct: true,  amount: false, buyQty: false, getQty: false },
  FIXED_AMOUNT:     { target: true,  minQty: true,  pct: false, amount: true,  buyQty: false, getQty: false },
  QUANTITY_DISCOUNT:{ target: true,  minQty: true,  pct: true,  amount: true,  buyQty: false, getQty: false },
  BUY_X_GET_Y:      { target: false, minQty: false, pct: false, amount: false, buyQty: true,  getQty: true  },
};

const PromotionFormModal = ({ initialValues = {}, onSubmit, onClose }) => {
  const [form, setForm] = useState({
    promotion_name: '',
    promotion_type: 'PERCENTAGE_OFF',
    target_type: 'PRODUCT',
    category_id: '',
    min_quantity: '',
    discount_percentage: '',
    discount_amount: '',
    buy_quantity: '',
    get_quantity: '',
    valid_from: new Date().toISOString().slice(0, 16),
    valid_to: new Date().toISOString().slice(0, 16),
    is_combinable: false,
    is_active: true,
    ...initialValues,
  });
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    adminMaintainersService.list('categories-options', { active_only: true })
      .then((res) => setCategories(res.items ?? res))
      .catch(() => {});
  }, []);

  const set = (field, value) => setForm((c) => ({ ...c, [field]: value }));
  const vis = FIELDS_BY_TYPE[form.promotion_type] ?? FIELDS_BY_TYPE.PERCENTAGE_OFF;
  const showCategory = vis.target && form.target_type === 'CATEGORY';

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        promotion_name: form.promotion_name.trim(),
        promotion_type: form.promotion_type,
        target_type: vis.target ? form.target_type : null,
        category_id: showCategory && form.category_id !== '' ? Number(form.category_id) : null,
        min_quantity: vis.minQty && form.min_quantity !== '' ? Number(form.min_quantity) : null,
        discount_percentage: vis.pct && form.discount_percentage !== '' ? Number(form.discount_percentage) : null,
        discount_amount: vis.amount && form.discount_amount !== '' ? Number(form.discount_amount) : null,
        buy_quantity: vis.buyQty && form.buy_quantity !== '' ? Number(form.buy_quantity) : null,
        get_quantity: vis.getQty && form.get_quantity !== '' ? Number(form.get_quantity) : null,
        valid_from: form.valid_from || null,
        valid_to: form.valid_to || null,
        is_combinable: Boolean(form.is_combinable),
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

        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">Nombre de la promocion</span>
          <input className={fieldCls} value={form.promotion_name} onChange={(e) => set('promotion_name', e.target.value)} required placeholder="Ej: Descuento verano 20%" />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Tipo de promocion</span>
          <select className={`${fieldCls} bg-white dark:bg-slate-950`} value={form.promotion_type} onChange={(e) => set('promotion_type', e.target.value)}>
            {PROMOTION_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>

        {vis.target && (
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Objetivo</span>
            <select className={`${fieldCls} bg-white dark:bg-slate-950`} value={form.target_type} onChange={(e) => set('target_type', e.target.value)}>
              {TARGET_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        )}

        {showCategory && (
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700 dark:text-slate-200">
              Categoria afectada <span className="text-red-500">*</span>
            </span>
            <select className={`${fieldCls} bg-white dark:bg-slate-950`} value={form.category_id} onChange={(e) => set('category_id', e.target.value)} required>
              <option value="">Selecciona una categoria...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.category_name}</option>
              ))}
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

        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Vigente desde</span>
          <input className={fieldCls} type="datetime-local" value={form.valid_from} onChange={(e) => set('valid_from', e.target.value)} required />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Vigente hasta</span>
          <input className={fieldCls} type="datetime-local" value={form.valid_to} onChange={(e) => set('valid_to', e.target.value)} required />
        </label>

        <label className={checkCls}>
          <input type="checkbox" checked={form.is_combinable} onChange={(e) => set('is_combinable', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Permite combinar con otras promociones</span>
        </label>

        <label className={checkCls}>
          <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Activa</span>
        </label>

      </div>

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
