/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { adminMaintainersService } from '@/services/admin/adminMaintainersService';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';

const ALL_VARIANTS_VALUE = '__ALL__';
const ALL_VARIANTS_OPTION = { value: ALL_VARIANTS_VALUE, label: 'Todas las variantes' };

const PromotionItemFormModal = ({ initialValues = {}, onSubmit, onClose }) => {
  const [products, setProducts] = useState([]);
  const [variantOptions, setVariantOptions] = useState([ALL_VARIANTS_OPTION]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [productId, setProductId] = useState(String(initialValues.product_id ?? ''));
  const [variantId, setVariantId] = useState(
    initialValues.product_variant_id != null && initialValues.product_variant_id !== ''
      ? String(initialValues.product_variant_id)
      : ALL_VARIANTS_VALUE
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminMaintainersService.list('products-options').then((rows) =>
      setProducts(rows.map((p) => ({ value: String(p.id), label: `${p.product_code} - ${p.product_name}` })))
    ).catch(() => {});
  }, []);

  useEffect(() => {
    if (!productId) {
      setVariantOptions([ALL_VARIANTS_OPTION]);
      setVariantId(ALL_VARIANTS_VALUE);
      return;
    }
    setLoadingVariants(true);
    adminMaintainersService.list('product-variants-options', { product_id: productId })
      .then((rows) => {
        const opts = rows.map((v) => ({ value: String(v.id), label: `${v.variant_sku} - ${v.variant_name}` }));
        setVariantOptions([ALL_VARIANTS_OPTION, ...opts]);
      })
      .catch(() => setVariantOptions([ALL_VARIANTS_OPTION]))
      .finally(() => setLoadingVariants(false));
  }, [productId]);

  const handleProductChange = (val) => {
    setProductId(val ?? '');
    setVariantId(ALL_VARIANTS_VALUE);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!productId) return;
    setSaving(true);
    try {
      await onSubmit({
        promotion_id: Number(initialValues.promotion_id),
        product_id: Number(productId),
        product_variant_id: variantId !== ALL_VARIANTS_VALUE ? Number(variantId) : null,
      });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">

      <div className="space-y-1 text-sm">
        <label className="font-medium text-slate-700 dark:text-slate-200">
          Producto base <span className="text-red-500">*</span>
        </label>
        <AutocompleteSelect
          value={productId}
          onChange={handleProductChange}
          options={products}
          placeholder="Buscar producto..."
          searchPlaceholder="Buscar por nombre o codigo"
          clearable
        />
      </div>

      <div className="space-y-1 text-sm">
        <label className="font-medium text-slate-700 dark:text-slate-200">
          Variante
        </label>
        <AutocompleteSelect
          value={variantId}
          onChange={(val) => setVariantId(val ?? ALL_VARIANTS_VALUE)}
          options={variantOptions}
          placeholder={loadingVariants ? 'Cargando variantes...' : 'Selecciona una variante'}
          searchPlaceholder="Buscar por SKU o nombre"
          disabled={!productId || loadingVariants}
        />
        {!productId && (
          <p className="text-xs text-slate-400 dark:text-slate-500">Selecciona un producto primero</p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <XCircle className="h-4 w-4" /> Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || !productId}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
};

export default PromotionItemFormModal;
