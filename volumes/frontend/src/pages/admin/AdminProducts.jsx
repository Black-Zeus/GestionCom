/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Boxes, ImagePlus, Package, Pencil, Plus, Trash2, Wand2, X } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import { adminMaintainersService } from '@/services/admin/adminMaintainersService';
import { businessFoundationService } from '@/services/admin/businessFoundationService';
import { measurementUnitsService } from '@/services/admin/measurementUnitsService';
import { productConfigService } from '@/services/admin/productConfigService';
import { mediaService } from '@/services/media/mediaService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { activeFilter, fieldOptions, filterActions, includesTerm, statusCell, tableFooter } from './businessFoundationShared';

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const selectClassName = `${fieldClassName} bg-white dark:bg-slate-950`;
const textareaClassName = 'min-h-24 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const formatMoney = (value) => (value === null || value === undefined || value === '' ? '-' : Number(value).toLocaleString('es-CL'));

const emptyProductForm = {
  product_code: '',
  category_id: '',
  product_name: '',
  product_description: '',
  brand_id: '',
  product_model_id: '',
  base_measurement_unit_id: '',
  base_price: '',
  cost_price: '',
  has_variants: false,
  is_active: true,
  has_batch_control: false,
  has_expiry_date: false,
  has_serial_numbers: false,
  has_location_tracking: true,
};

const productToForm = (product, defaultUnitId = '') => (product ? {
  product_code: product.product_code || '',
  category_id: product.category_id ? String(product.category_id) : '',
  product_name: product.product_name || '',
  product_description: product.product_description || '',
  brand_id: product.brand_id ? String(product.brand_id) : '',
  product_model_id: product.product_model_id ? String(product.product_model_id) : '',
  base_measurement_unit_id: product.base_measurement_unit_id ? String(product.base_measurement_unit_id) : defaultUnitId,
  base_price: product.base_price ?? '',
  cost_price: product.cost_price ?? '',
  has_variants: product.has_variants === true,
  is_active: product.is_active !== false,
  has_batch_control: product.has_batch_control === true,
  has_expiry_date: product.has_expiry_date === true,
  has_serial_numbers: product.has_serial_numbers === true,
  has_location_tracking: product.has_location_tracking !== false,
} : { ...emptyProductForm, base_measurement_unit_id: defaultUnitId });

const ProductFormModal = ({ product = null, initialValues, categories = [], units = [], brands = [], models = [], onSubmit, onClose }) => {
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [removeImage, setRemoveImage] = useState(false);
  const imageInputRef = useRef(null);
  const currentImageUrl = product?.primary_image?.thumb_url || product?.primary_image?.full_url || '';
  const visibleImageUrl = imagePreview || (!removeImage ? currentImageUrl : '');
  const hasPendingImageChange = Boolean(imageFile || removeImage);
  const selectedBrandId = form.brand_id ? Number(form.brand_id) : null;
  const availableModels = useMemo(
    () => models.filter((model) => model.is_active !== false && (!selectedBrandId || Number(model.brand_id) === selectedBrandId)),
    [models, selectedBrandId],
  );

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('');
      return undefined;
    }
    const nextPreview = URL.createObjectURL(imageFile);
    setImagePreview(nextPreview);
    return () => URL.revokeObjectURL(nextPreview);
  }, [imageFile]);

  useEffect(() => {
    if (form.product_model_id && !availableModels.some((model) => String(model.id) === String(form.product_model_id))) {
      setForm((current) => ({ ...current, product_model_id: '' }));
    }
  }, [availableModels, form.product_model_id]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const selectImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setRemoveImage(false);
  };

  const clearImage = () => {
    if (imageInputRef.current) imageInputRef.current.value = '';
    setImageFile(null);
    setRemoveImage(Boolean(currentImageUrl));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!form.product_name.trim()) {
      setFormError('El nombre del producto es requerido.');
      return;
    }
    if (!form.base_measurement_unit_id) {
      setFormError('Selecciona una unidad base.');
      return;
    }
    if (form.product_model_id && !form.brand_id) {
      setFormError('Selecciona una marca antes de seleccionar modelo.');
      return;
    }

    const selectedBrand = brands.find((brand) => String(brand.id) === String(form.brand_id));
    const selectedModel = models.find((model) => String(model.id) === String(form.product_model_id));
    const payload = {
      category_id: form.category_id ? Number(form.category_id) : null,
      product_name: form.product_name.trim(),
      product_description: form.product_description || null,
      brand_id: form.brand_id ? Number(form.brand_id) : null,
      product_model_id: form.product_model_id ? Number(form.product_model_id) : null,
      brand: selectedBrand?.brand_name || null,
      model: selectedModel?.model_name || null,
      base_measurement_unit_id: Number(form.base_measurement_unit_id),
      base_price: form.base_price === '' ? null : Number(form.base_price),
      cost_price: form.cost_price === '' ? null : Number(form.cost_price),
      has_variants: Boolean(form.has_variants),
      is_active: Boolean(form.is_active),
      has_batch_control: Boolean(form.has_batch_control),
      has_expiry_date: Boolean(form.has_expiry_date),
      has_serial_numbers: Boolean(form.has_serial_numbers),
      has_location_tracking: Boolean(form.has_location_tracking),
    };

    setSaving(true);
    try {
      await onSubmit(payload, { imageFile, removeImage });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <div>
            <div className="text-sm font-semibold text-slate-950 dark:text-white">Imagen</div>
          </div>
          <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={selectImage} className="hidden" />
          <div className="relative">
            <button type="button" onClick={() => imageInputRef.current?.click()} className="group relative h-52 w-full overflow-hidden rounded-md bg-slate-100 text-left outline-none ring-offset-2 transition hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-blue-400 dark:bg-slate-800 dark:ring-offset-slate-950 dark:hover:bg-slate-700">
              {visibleImageUrl ? (
                <img src={visibleImageUrl} alt={form.product_name || 'Producto'} className="h-full w-full object-contain p-3" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-500">
                  <ImagePlus className="h-10 w-10" />
                  <span className="text-sm font-medium">Pulsa para buscar imagen</span>
                </div>
              )}
              {visibleImageUrl && (
                <span className="absolute inset-x-0 bottom-0 bg-slate-950/60 px-3 py-2 text-center text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                  Pulsa para cambiar imagen
                </span>
              )}
            </button>
            {(visibleImageUrl || imageFile) && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  clearImage();
                }}
                className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 shadow-sm transition hover:bg-red-50 dark:border-red-900 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-950/50"
                aria-label="Remover imagen"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:col-span-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Nombre</span>
            <input className={fieldClassName} value={form.product_name} onChange={(event) => updateField('product_name', event.target.value)} minLength={2} required />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Categoria</span>
            <select className={selectClassName} value={form.category_id} onChange={(event) => updateField('category_id', event.target.value)}>
              <option value="">Sin categoria</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.category_code} - {category.category_name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Unidad base</span>
            <select className={selectClassName} value={form.base_measurement_unit_id} onChange={(event) => updateField('base_measurement_unit_id', event.target.value)} required>
              <option value="">Selecciona unidad</option>
              {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.unit_code} - {unit.unit_name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Precio base</span>
            <input className={fieldClassName} type="number" min="0" step="0.01" value={form.base_price} onChange={(event) => updateField('base_price', event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Precio costo</span>
            <input className={fieldClassName} type="number" min="0" step="0.01" value={form.cost_price} onChange={(event) => updateField('cost_price', event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Marca</span>
            <select className={selectClassName} value={form.brand_id} onChange={(event) => setForm((current) => ({ ...current, brand_id: event.target.value, product_model_id: '' }))}>
              <option value="">Sin marca</option>
              {brands.filter((brand) => brand.is_active !== false).map((brand) => <option key={brand.id} value={brand.id}>{brand.brand_code} - {brand.brand_name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Modelo</span>
            <select className={selectClassName} value={form.product_model_id} onChange={(event) => updateField('product_model_id', event.target.value)} disabled={!form.brand_id}>
              <option value="">{form.brand_id ? 'Sin modelo' : 'Selecciona marca primero'}</option>
              {availableModels.map((model) => <option key={model.id} value={model.id}>{model.model_code} - {model.model_name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700 dark:text-slate-200">Descripcion</span>
            <input className={fieldClassName} value={form.product_description} onChange={(event) => updateField('product_description', event.target.value)} />
          </label>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {[
          ['is_active', 'Activo'],
          ['has_variants', 'Usa variantes'],
          ['has_batch_control', 'Controla lotes'],
          ['has_expiry_date', 'Controla vencimiento'],
          ['has_serial_numbers', 'Controla seriales'],
          ['has_location_tracking', 'Controla ubicacion'],
        ].map(([field, label]) => (
          <label key={field} className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
            <input type="checkbox" checked={form[field]} onChange={(event) => updateField(field, event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            {label}
          </label>
        ))}
      </div>

      {formError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{formError}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="min-h-5 text-sm text-amber-600 dark:text-amber-300">
          {hasPendingImageChange ? 'Cambio pendiente de guardar.' : ''}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancelar</button>
          <button type="submit" disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{saving ? 'Guardando...' : 'Guardar producto'}</button>
        </div>
      </div>
    </form>
  );
};

const VariantGeneratorModal = ({ product, attributes = [], onSubmit, onClose }) => {
  const [selected, setSelected] = useState({});
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const usableAttributes = attributes.filter((attribute) => attribute.values?.length);
  const selectedGroups = usableAttributes
    .map((attribute) => ({ attribute, valueIds: selected[String(attribute.id)] || [] }))
    .filter((group) => group.valueIds.length);
  const combinationCount = selectedGroups.reduce((total, group) => total * group.valueIds.length, selectedGroups.length ? 1 : 0);

  const toggleValue = (attributeId, valueId) => {
    const key = String(attributeId);
    setSelected((current) => {
      const currentValues = current[key] || [];
      const nextValues = currentValues.includes(valueId) ? currentValues.filter((item) => item !== valueId) : [...currentValues, valueId];
      return { ...current, [key]: nextValues };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!selectedGroups.length) {
      setFormError('Selecciona al menos un atributo y un valor para generar SKU.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        product_id: Number(product.id),
        is_active: isActive,
        attributes: selectedGroups.map((group) => ({
          attribute_id: Number(group.attribute.id),
          value_ids: group.valueIds.map(Number),
        })),
      });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="text-sm font-semibold text-slate-950 dark:text-white">{product?.product_name}</div>
      </div>

      <div className="grid max-h-[55vh] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
        {usableAttributes.map((attribute) => (
          <section key={attribute.id} className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{attribute.attribute_name}</div>
                <div className="font-mono text-xs text-slate-500">{attribute.attribute_code}</div>
              </div>
              {attribute.is_required && <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-200">Requerido</span>}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {attribute.values.map((value) => (
                <label key={value.id} className="flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">
                  <input
                    type="checkbox"
                    checked={(selected[String(attribute.id)] || []).includes(value.id)}
                    onChange={() => toggleValue(attribute.id, value.id)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span>{value.value_name}</span>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>

      {!usableAttributes.length && <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">No hay atributos activos marcados como SKU.</div>}
      {formError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{formError}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="text-sm text-slate-500">{combinationCount ? `${combinationCount} combinacion${combinationCount === 1 ? '' : 'es'} por generar` : 'Sin combinaciones seleccionadas'}</div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm dark:border-slate-700">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            Activo
          </label>
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancelar</button>
          <button type="submit" disabled={saving || !usableAttributes.length} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{saving ? 'Generando...' : 'Generar SKU'}</button>
        </div>
      </div>
    </form>
  );
};

const VariantFormModal = ({ variant = null, initialValues, productOptions = [], fixedProductId = '', onSubmit, onClose }) => {
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const isEdit = Boolean(variant);
  const isProductLocked = isEdit || Boolean(fixedProductId);
  const resolvedProductOptions = productOptions.some((product) => String(product.value) === String(form.product_id)) || !variant
    ? productOptions
    : [{ value: String(form.product_id), label: variant.product_name || `Producto ${form.product_id}` }, ...productOptions];
  const selectedProductLabel = resolvedProductOptions.find((product) => String(product.value) === String(form.product_id))?.label || variant?.product_name || 'Producto seleccionado';

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!form.product_id) {
      setFormError('Selecciona un producto.');
      return;
    }
    if (!form.variant_name.trim()) {
      setFormError('El nombre de la variacion es requerido.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        product_id: Number(form.product_id),
        variant_name: form.variant_name.trim(),
        variant_description: form.variant_description || null,
        is_default_variant: Boolean(form.is_default_variant),
        is_active: Boolean(form.is_active),
      });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        {isProductLocked ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/60 md:col-span-2">
            <div className="font-medium text-slate-700 dark:text-slate-200">Producto</div>
            <div className="mt-1 text-slate-600 dark:text-slate-300">{selectedProductLabel}</div>
          </div>
        ) : (
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Producto</span>
            <select className={selectClassName} value={form.product_id} onChange={(event) => updateField('product_id', event.target.value)} required>
              <option value="">Selecciona producto</option>
              {resolvedProductOptions.map((product) => <option key={product.value} value={product.value}>{product.label}</option>)}
            </select>
          </label>
        )}
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">Nombre de variacion</span>
          <input className={fieldClassName} value={form.variant_name} onChange={(event) => updateField('variant_name', event.target.value)} minLength={2} required />
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">Descripcion</span>
          <textarea className={textareaClassName} value={form.variant_description} onChange={(event) => updateField('variant_description', event.target.value)} />
        </label>
        {variant?.attribute_summary && (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/60 md:col-span-2">
            <div className="font-medium text-slate-700 dark:text-slate-200">Atributos SKU</div>
            <div className="mt-1 text-slate-500">{variant.attribute_summary}</div>
          </div>
        )}
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {[
          ['is_default_variant', 'Variacion por defecto'],
          ['is_active', 'Activo'],
        ].map(([field, label]) => (
          <label key={field} className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
            <input type="checkbox" checked={form[field]} onChange={(event) => updateField(field, event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            {label}
          </label>
        ))}
      </div>

      {formError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{formError}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="min-h-5" />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancelar</button>
          <button type="submit" disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </form>
  );
};

const AdminProducts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const handledDeepLinkRef = useRef('');
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [skuAttributes, setSkuAttributes] = useState([]);
  const [activeTab, setActiveTab] = useState((searchParams.get('product_code') || searchParams.get('product_id') || searchParams.get('tab') === 'variants') ? 'variants' : 'products');
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextProducts, nextVariants, nextCategories, nextUnits, nextBrands, nextModels, nextSkuAttributes] = await Promise.all([
        businessFoundationService.products.list({ active_only: false }),
        businessFoundationService.variants.list({ active_only: false }),
        productConfigService.listCategories({ active_only: false, limit: 1000 }),
        measurementUnitsService.list({ active_only: false, limit: 1000 }),
        adminMaintainersService.list('product-brands'),
        adminMaintainersService.list('product-models'),
        businessFoundationService.variants.listSkuAttributes(),
      ]);
      setProducts(nextProducts);
      setVariants(nextVariants);
      setCategories(nextCategories);
      setUnits(nextUnits);
      setBrands(nextBrands);
      setModels(nextModels);
      setSkuAttributes(nextSkuAttributes);
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar productos.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [activeTab, search, status, pageSize]);
  useEffect(() => {
    const nextTab = searchParams.get('tab');
    const nextProductCode = searchParams.get('product_code');
    const nextProductId = searchParams.get('product_id');
    const nextSearch = searchParams.get('search') || '';
    const nextActiveTab = nextProductCode || nextProductId || nextTab === 'variants' ? 'variants' : 'products';
    if (nextActiveTab !== activeTab) setActiveTab(nextActiveTab);
    if (nextSearch !== search) setSearch(nextSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const unitOptions = units.map((unit) => ({ value: String(unit.id), label: `${unit.unit_code} - ${unit.unit_name}` }));
  const productOptions = products
    .filter((product) => product.has_variants)
    .map((product) => ({ value: String(product.id), label: product.product_name }));
  const selectedProductCode = searchParams.get('product_code') || '';
  const legacyProductId = searchParams.get('product_id') || '';
  const selectedProduct = products.find((product) => (selectedProductCode && String(product.product_code) === selectedProductCode) || (legacyProductId && String(product.id) === String(legacyProductId)));
  const selectedProductId = selectedProduct?.id ? String(selectedProduct.id) : legacyProductId;

  const openProduct = (product = null) => ModalManager.show({
    type: 'custom', title: product ? 'Editar producto' : 'Nuevo producto', size: 'xlarge', showFooter: false, contentComponent: ProductFormModal,
    contentProps: {
      product,
      initialValues: productToForm(product, unitOptions[0]?.value || ''),
      categories,
      units,
      brands,
      models,
      onSubmit: async (payload, mediaChanges = {}) => {
        await notifyPromise((async () => {
          const savedProduct = product
            ? await businessFoundationService.products.update(product.id, payload)
            : await businessFoundationService.products.create(payload);
          const productId = savedProduct?.id || product?.id;
          if (productId && mediaChanges.removeImage) await mediaService.removeProductImage(productId);
          if (productId && mediaChanges.imageFile) await mediaService.uploadProductImage(productId, mediaChanges.imageFile);
          return savedProduct;
        })(), { loading: 'Guardando producto...', success: 'Producto guardado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar.') });
        await load();
      },
    },
  });

  const openVariant = (variant = null, fixedProductId = selectedProductId) => {
    const resolvedProductId = variant?.product_id ? String(variant.product_id) : fixedProductId || productOptions[0]?.value || '';
    ModalManager.show({
      type: 'custom',
      title: variant ? 'Editar SKU / Variacion' : 'Nueva SKU / Variacion',
      size: 'large',
      showFooter: false,
      contentComponent: VariantFormModal,
      contentProps: {
        variant,
        fixedProductId,
        productOptions,
        initialValues: variant
          ? { product_id: resolvedProductId, variant_name: variant.variant_name, variant_description: variant.variant_description || '', is_default_variant: variant.is_default_variant, is_active: variant.is_active }
          : { product_id: resolvedProductId, variant_name: '', variant_description: '', is_default_variant: false, is_active: true },
        onSubmit: async (payload) => {
          await notifyPromise(variant ? businessFoundationService.variants.update(variant.id, payload) : businessFoundationService.variants.create(payload), { loading: 'Guardando SKU / Variacion...', success: 'SKU / Variacion guardada.', error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar.') });
          await load();
        },
      },
    });
  };

  const openVariantGenerator = () => {
    if (!selectedProduct) return;
    ModalManager.show({
      type: 'custom',
      title: 'Generar SKU / Variaciones',
      size: 'xlarge',
      showFooter: false,
      contentComponent: VariantGeneratorModal,
      contentProps: {
        product: selectedProduct,
        attributes: skuAttributes,
        onSubmit: async (payload) => {
          const result = await notifyPromise(
            businessFoundationService.variants.generate(payload),
            {
              loading: 'Generando SKU...',
              success: (response) => `${response.created_count || 0} SKU generados${response.skipped_count ? `, ${response.skipped_count} ya existian` : ''}.`,
              error: (requestError) => getBackendMessage(requestError, 'No fue posible generar SKU.'),
            },
          );
          await load();
          return result;
        },
      },
    });
  };

  useEffect(() => {
    const openMode = searchParams.get('open');
    const recordId = Number(searchParams.get('id'));
    const tabId = searchParams.get('tab') || activeTab;
    const deepLinkKey = `${tabId}:${openMode}:${recordId}`;
    if (loading || openMode !== 'edit' || !recordId || handledDeepLinkRef.current === deepLinkKey) return;

    if (tabId === 'variants') {
      const targetVariant = variants.find((variant) => Number(variant.id) === recordId);
      if (!targetVariant) return;
      handledDeepLinkRef.current = deepLinkKey;
      setActiveTab('variants');
      openVariant(targetVariant);
    } else {
      const targetProduct = products.find((product) => Number(product.id) === recordId);
      if (!targetProduct) return;
      handledDeepLinkRef.current = deepLinkKey;
      setActiveTab('products');
      openProduct(targetProduct);
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('open');
    nextParams.delete('id');
    setSearchParams(nextParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, products, searchParams, setSearchParams, variants]);

  const remove = async (label, action) => {
    if (!await ModalManager.confirm({ title: `Eliminar ${label}`, message: `Confirma eliminar ${label}.`, buttons: { cancel: 'Cancelar', confirm: 'Eliminar' } })) return;
    await notifyPromise(action(), { loading: 'Eliminando...', success: 'Eliminado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible eliminar.') });
    await load();
  };

  const openSkuView = (product) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('product_code', product.product_code);
    nextParams.delete('product_id');
    nextParams.delete('tab');
    nextParams.delete('open');
    nextParams.delete('id');
    setSearchParams(nextParams);
  };

  const closeSkuView = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('product_code');
    nextParams.delete('product_id');
    nextParams.delete('tab');
    nextParams.delete('open');
    nextParams.delete('id');
    setSearchParams(nextParams);
  };

  const dataByTab = {
    products: products.filter((item) => activeFilter(status)(item) && includesTerm(item, ['product_code', 'product_name', 'brand_name', 'model_name', 'category_name'], search.trim().toLowerCase())),
    variants: variants.filter((item) => (!selectedProductId || String(item.product_id) === String(selectedProductId)) && activeFilter(status)(item) && includesTerm(item, ['variant_sku', 'variant_name', 'product_code', 'product_name', 'attribute_summary'], search.trim().toLowerCase())),
  };
  const activeData = dataByTab[activeTab];
  const visibleData = activeData.slice(page * pageSize, page * pageSize + pageSize);
  const isScopedSkuView = activeTab === 'variants' && Boolean(selectedProductCode || legacyProductId);
  const actionConfig = activeTab === 'products'
    ? { label: 'Nuevo producto', onClick: () => openProduct(), disabled: !unitOptions.length }
    : isScopedSkuView
      ? { label: 'Generar SKU', icon: Wand2, onClick: openVariantGenerator, disabled: !selectedProduct?.has_variants || !skuAttributes.length }
      : { label: 'Nueva SKU / Variacion', onClick: () => openVariant(null, selectedProductId), disabled: !productOptions.length };
  const title = activeTab === 'products' ? 'Catalogo de productos' : `SKU / Variaciones${selectedProduct ? ` - ${selectedProduct.product_name}` : ''}`;
  const description = activeTab === 'products' ? 'Productos base y SKU vendibles.' : 'SKU vendibles asociados al producto seleccionado.';

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title={title}
        description={description}
        actions={[
          activeTab === 'variants' && { id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: closeSkuView },
          { id: 'primary', label: actionConfig.label, icon: actionConfig.icon || Plus, disabled: actionConfig.disabled, onClick: actionConfig.onClick },
        ]}
      />
      <KpiBar items={[{ label: 'Productos', value: products.length }, { label: 'SKU', value: variants.length }, { label: 'Marcas', value: brands.length }, { label: 'Modelos', value: models.length }]} className="mb-4" />
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <FilterBar className="mb-4" searchValue={search} searchPlaceholder={activeTab === 'products' ? 'Buscar producto, codigo o marca' : 'Buscar SKU / Variacion'} onSearchChange={setSearch} fields={[{ id: 'status', value: status, onChange: setStatus, options: fieldOptions.status }]} actions={filterActions({ loading, onRefresh: load, onClear: () => { setSearch(''); setStatus('all'); } })} />
      {activeTab === 'products' && <DataTable loading={loading} data={visibleData} footer={tableFooter({ page, pageSize, total: activeData.length, loading, setPage, setPageSize })} columns={[{ id: 'product', label: 'Producto', render: (item) => <div className="flex items-center gap-3">{item.primary_image?.thumb_url ? <img src={item.primary_image.thumb_url} alt={item.product_name} className="h-10 w-10 rounded-md object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-400 dark:bg-slate-800"><Package className="h-5 w-5" /></div>}<div><div className="font-medium">{item.product_name}</div><div className="font-mono text-xs text-slate-500">{item.product_code}</div></div></div> }, { id: 'category', label: 'Categoria', render: (item) => item.category_name || '-' }, { id: 'brand', label: 'Marca / modelo', render: (item) => [item.brand_name || item.brand, item.model_name || item.model].filter(Boolean).join(' / ') || '-' }, { id: 'unit', label: 'Unidad', render: (item) => item.base_unit_code }, { id: 'base_price', label: 'Precio base', align: 'right', render: (item) => formatMoney(item.base_price) }, { id: 'cost_price', label: 'Precio costo', align: 'right', render: (item) => formatMoney(item.cost_price) }, { id: 'controls', label: 'Control', render: (item) => <span className="text-xs text-slate-500">{[item.has_variants && 'Variaciones', item.has_batch_control && 'Lotes', item.has_serial_numbers && 'Seriales'].filter(Boolean).join(' / ') || 'Simple'}</span> }, { id: 'status', label: 'Estado', render: (item) => statusCell(item.is_active) }, { id: 'actions', label: 'Acciones', align: 'center', render: (item) => <div className="flex justify-center gap-2"><RowActionButton label="Editar" icon={Pencil} onClick={() => openProduct(item)} /><RowActionButton label="SKU / Variaciones" icon={Boxes} disabled={!item.has_variants} onClick={() => openSkuView(item)} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => remove('producto', () => businessFoundationService.products.remove(item.id))} /></div> }]} />}
      {activeTab === 'variants' && <DataTable loading={loading} data={visibleData} footer={tableFooter({ page, pageSize, total: activeData.length, loading, setPage, setPageSize })} columns={[{ id: 'sku', label: 'SKU / Variacion', render: (item) => <div className="font-medium">{item.variant_name}</div> }, { id: 'attributes', label: 'Atributos SKU', render: (item) => item.attribute_summary || '-' }, { id: 'product', label: 'Producto', render: (item) => item.product_name || '-' }, { id: 'default', label: 'Defecto', render: (item) => item.is_default_variant ? 'Si' : 'No' }, { id: 'status', label: 'Estado', render: (item) => statusCell(item.is_active) }, { id: 'actions', label: 'Acciones', align: 'center', render: (item) => <div className="flex justify-center gap-2"><RowActionButton label="Editar" icon={Pencil} onClick={() => openVariant(item, String(item.product_id))} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => remove('SKU / Variacion', () => businessFoundationService.variants.remove(item.id))} /></div> }]} />}
    </section>
  );
};

export default AdminProducts;
