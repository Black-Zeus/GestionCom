/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Boxes, ImageUp, Package, Pencil, Plus, Trash2 } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import SimpleFormContent from '@/components/common/forms/SimpleFormContent';
import { adminMaintainersService } from '@/services/admin/adminMaintainersService';
import { businessFoundationService } from '@/services/admin/businessFoundationService';
import { measurementUnitsService } from '@/services/admin/measurementUnitsService';
import { productConfigService } from '@/services/admin/productConfigService';
import { profileService } from '@/services/profile/profileService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { activeFilter, fieldOptions, filterActions, includesTerm, statusCell, tableFooter } from './businessFoundationShared';

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const selectClassName = `${fieldClassName} bg-white dark:bg-slate-950`;

const pickImage = (onSelect) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png,image/jpeg,image/webp';
  input.onchange = () => {
    const file = input.files?.[0];
    if (file) onSelect(file);
  };
  input.click();
};

const emptyProductForm = {
  product_code: '',
  category_id: '',
  product_name: '',
  product_description: '',
  brand_id: '',
  product_model_id: '',
  base_measurement_unit_id: '',
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
  has_variants: product.has_variants === true,
  is_active: product.is_active !== false,
  has_batch_control: product.has_batch_control === true,
  has_expiry_date: product.has_expiry_date === true,
  has_serial_numbers: product.has_serial_numbers === true,
  has_location_tracking: product.has_location_tracking !== false,
} : { ...emptyProductForm, base_measurement_unit_id: defaultUnitId });

const ProductFormModal = ({ mode = 'create', initialValues, categories = [], units = [], brands = [], models = [], onSubmit, onClose }) => {
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const isEdit = mode === 'edit';
  const selectedBrandId = form.brand_id ? Number(form.brand_id) : null;
  const availableModels = useMemo(
    () => models.filter((model) => model.is_active !== false && (!selectedBrandId || Number(model.brand_id) === selectedBrandId)),
    [models, selectedBrandId],
  );

  useEffect(() => {
    if (form.product_model_id && !availableModels.some((model) => String(model.id) === String(form.product_model_id))) {
      setForm((current) => ({ ...current, product_model_id: '' }));
    }
  }, [availableModels, form.product_model_id]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

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
      has_variants: Boolean(form.has_variants),
      is_active: Boolean(form.is_active),
      has_batch_control: Boolean(form.has_batch_control),
      has_expiry_date: Boolean(form.has_expiry_date),
      has_serial_numbers: Boolean(form.has_serial_numbers),
      has_location_tracking: Boolean(form.has_location_tracking),
    };

    setSaving(true);
    try {
      await onSubmit(payload);
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-950 dark:text-white">{isEdit ? 'Producto' : 'Nuevo producto'}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Marca y modelo se seleccionan desde mantenedores; no se ingresan como texto libre.</div>
          </div>
          <label className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
            <input type="checkbox" checked={form.is_active} onChange={(event) => updateField('is_active', event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            Activo
          </label>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {isEdit && (
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Codigo</span>
            <input className={`${fieldClassName} font-mono uppercase disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-slate-900`} value={form.product_code} disabled readOnly />
          </label>
        )}
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
        <div className="grid gap-2 md:col-span-2 md:grid-cols-2">
          {[
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
      </div>

      {formError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{formError}</div>}

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancelar</button>
        <button type="submit" disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{saving ? 'Guardando...' : 'Guardar producto'}</button>
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
      const [nextProducts, nextVariants, nextCategories, nextUnits, nextBrands, nextModels] = await Promise.all([
        businessFoundationService.products.list({ active_only: false }),
        businessFoundationService.variants.list({ active_only: false }),
        productConfigService.listCategories({ active_only: false, limit: 1000 }),
        measurementUnitsService.list({ active_only: false, limit: 1000 }),
        adminMaintainersService.list('product-brands'),
        adminMaintainersService.list('product-models'),
      ]);
      setProducts(nextProducts);
      setVariants(nextVariants);
      setCategories(nextCategories);
      setUnits(nextUnits);
      setBrands(nextBrands);
      setModels(nextModels);
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
  const productOptions = products.map((product) => ({ value: String(product.id), label: `${product.product_code} - ${product.product_name}` }));
  const selectedProductCode = searchParams.get('product_code') || '';
  const legacyProductId = searchParams.get('product_id') || '';
  const selectedProduct = products.find((product) => (selectedProductCode && String(product.product_code) === selectedProductCode) || (legacyProductId && String(product.id) === String(legacyProductId)));
  const selectedProductId = selectedProduct?.id ? String(selectedProduct.id) : legacyProductId;

  const openProduct = (product = null) => ModalManager.show({
    type: 'custom', title: product ? 'Editar producto' : 'Nuevo producto', size: 'large', showFooter: false, contentComponent: ProductFormModal,
    contentProps: {
      mode: product ? 'edit' : 'create',
      initialValues: productToForm(product, unitOptions[0]?.value || ''),
      categories,
      units,
      brands,
      models,
      onSubmit: async (payload) => {
        await notifyPromise(product ? businessFoundationService.products.update(product.id, payload) : businessFoundationService.products.create(payload), { loading: 'Guardando producto...', success: 'Producto guardado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar.') });
        await load();
      },
    },
  });

  const openVariant = (variant = null, fixedProductId = selectedProductId) => {
    const resolvedProductId = variant?.product_id ? String(variant.product_id) : fixedProductId || productOptions[0]?.value || '';
    ModalManager.show({
      type: 'custom', title: variant ? 'Editar SKU / Variedad' : 'Nueva SKU / Variedad', size: 'large', showFooter: false, contentComponent: SimpleFormContent,
    contentProps: {
      initialValues: variant ? { variant_sku: variant.variant_sku, product_id: resolvedProductId, variant_name: variant.variant_name, variant_description: variant.variant_description || '', is_default_variant: variant.is_default_variant, is_active: variant.is_active } : { product_id: resolvedProductId, variant_name: '', variant_description: '', is_default_variant: false, is_active: true },
      fields: [
        ...(variant ? [{ id: 'variant_sku', label: 'SKU', readOnly: true, disabled: true }] : []),
        { id: 'product_id', label: 'Producto', type: 'select', required: true, disabled: Boolean(fixedProductId), options: productOptions },
        { id: 'variant_name', label: 'Nombre SKU / Variedad', required: true },
        { id: 'variant_description', label: 'Descripcion', wide: true },
        { id: 'is_default_variant', label: 'Defecto', type: 'checkbox', checkLabel: 'SKU / Variedad por defecto' },
        { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' },
      ],
      onSubmit: async (form) => {
        const payload = { product_id: Number(form.product_id), variant_name: form.variant_name.trim(), variant_description: form.variant_description || null, is_default_variant: Boolean(form.is_default_variant), is_active: Boolean(form.is_active) };
        await notifyPromise(variant ? businessFoundationService.variants.update(variant.id, payload) : businessFoundationService.variants.create(payload), { loading: 'Guardando SKU / Variedad...', success: 'SKU / Variedad guardada.', error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar.') });
        await load();
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

  const uploadProductImage = (product) => pickImage(async (file) => {
    await notifyPromise(profileService.uploadProductImage(product.id, file), {
      loading: 'Procesando imagen...',
      success: 'Imagen de producto actualizada.',
      error: (requestError) => getBackendMessage(requestError, 'No fue posible cargar la imagen.'),
    });
    await load();
  });

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
    variants: variants.filter((item) => (!selectedProductId || String(item.product_id) === String(selectedProductId)) && activeFilter(status)(item) && includesTerm(item, ['variant_sku', 'variant_name', 'product_code', 'product_name'], search.trim().toLowerCase())),
  };
  const activeData = dataByTab[activeTab];
  const visibleData = activeData.slice(page * pageSize, page * pageSize + pageSize);
  const isScopedSkuView = activeTab === 'variants' && Boolean(selectedProductCode || legacyProductId);
  const actionConfig = activeTab === 'products'
    ? { label: 'Nuevo producto', onClick: () => openProduct(), disabled: !unitOptions.length }
    : { label: 'Nueva SKU / Variedad', onClick: () => openVariant(null, selectedProductId), disabled: isScopedSkuView ? !selectedProductId : !productOptions.length };
  const title = activeTab === 'products' ? 'Catalogo de productos' : `SKU / Variedades${selectedProduct ? ` - ${selectedProduct.product_name}` : ''}`;
  const description = activeTab === 'products' ? 'Productos base y SKU vendibles.' : 'SKU vendibles asociados al producto seleccionado.';

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mb-5 flex flex-wrap justify-between gap-3">
        <div><h1 className="text-xl font-semibold">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>
        <div className="flex flex-wrap gap-2">
          {activeTab === 'variants' && <ActionButton label="Volver" icon={ArrowLeft} variant="neutral" onClick={closeSkuView} />}
          <ActionButton label={actionConfig.label} icon={Plus} disabled={actionConfig.disabled} onClick={actionConfig.onClick} />
        </div>
      </div>
      <KpiBar items={[{ label: 'Productos', value: products.length }, { label: 'SKU', value: variants.length }, { label: 'Marcas', value: brands.length }, { label: 'Modelos', value: models.length }]} className="mb-4" />
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <FilterBar className="mb-4" searchValue={search} searchPlaceholder={activeTab === 'products' ? 'Buscar producto, codigo o marca' : 'Buscar SKU / Variedad'} onSearchChange={setSearch} fields={[{ id: 'status', value: status, onChange: setStatus, options: fieldOptions.status }]} actions={filterActions({ loading, onRefresh: load, onClear: () => { setSearch(''); setStatus('all'); } })} />
      {activeTab === 'products' && <DataTable loading={loading} data={visibleData} footer={tableFooter({ page, pageSize, total: activeData.length, loading, setPage, setPageSize })} columns={[{ id: 'product', label: 'Producto', render: (item) => <div className="flex items-center gap-3">{item.primary_image?.thumb_url ? <img src={item.primary_image.thumb_url} alt={item.product_name} className="h-10 w-10 rounded-md object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-400 dark:bg-slate-800"><Package className="h-5 w-5" /></div>}<div><div className="font-medium">{item.product_name}</div><div className="font-mono text-xs text-slate-500">{item.product_code}</div></div></div> }, { id: 'category', label: 'Categoria', render: (item) => item.category_name || '-' }, { id: 'brand', label: 'Marca / modelo', render: (item) => [item.brand_name || item.brand, item.model_name || item.model].filter(Boolean).join(' / ') || '-' }, { id: 'unit', label: 'Unidad', render: (item) => item.base_unit_code }, { id: 'controls', label: 'Control', render: (item) => <span className="text-xs text-slate-500">{[item.has_variants && 'Variedades', item.has_batch_control && 'Lotes', item.has_serial_numbers && 'Seriales'].filter(Boolean).join(' / ') || 'Simple'}</span> }, { id: 'status', label: 'Estado', render: (item) => statusCell(item.is_active) }, { id: 'actions', label: 'Acciones', align: 'center', render: (item) => <div className="flex justify-center gap-2"><RowActionButton label="Editar" icon={Pencil} onClick={() => openProduct(item)} /><RowActionButton label="Cargar imagen" icon={ImageUp} onClick={() => uploadProductImage(item)} /><RowActionButton label="SKU / Variedades" icon={Boxes} onClick={() => openSkuView(item)} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => remove('producto', () => businessFoundationService.products.remove(item.id))} /></div> }]} />}
      {activeTab === 'variants' && <DataTable loading={loading} data={visibleData} footer={tableFooter({ page, pageSize, total: activeData.length, loading, setPage, setPageSize })} columns={[{ id: 'sku', label: 'SKU / Variedad', render: (item) => <><div className="font-medium">{item.variant_name}</div><div className="font-mono text-xs text-slate-500">{item.variant_sku}</div></> }, { id: 'product', label: 'Producto', render: (item) => <><div>{item.product_name}</div><div className="font-mono text-xs text-slate-500">{item.product_code}</div></> }, { id: 'default', label: 'Defecto', render: (item) => item.is_default_variant ? 'Si' : 'No' }, { id: 'status', label: 'Estado', render: (item) => statusCell(item.is_active) }, { id: 'actions', label: 'Acciones', align: 'center', render: (item) => <div className="flex justify-center gap-2"><RowActionButton label="Editar" icon={Pencil} onClick={() => openVariant(item, String(item.product_id))} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => remove('SKU / Variedad', () => businessFoundationService.variants.remove(item.id))} /></div> }]} />}
    </section>
  );
};

export default AdminProducts;
