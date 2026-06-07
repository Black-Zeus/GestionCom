/* eslint-disable react/prop-types */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, BadgeDollarSign, CalendarDays, CheckCircle2, EyeOff, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import SimpleFormContent from '@/components/common/forms/SimpleFormContent';
import { adminMaintainersService } from '@/services/admin/adminMaintainersService';
import { businessFoundationService } from '@/services/admin/businessFoundationService';
import { measurementUnitsService } from '@/services/admin/measurementUnitsService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { activeFilter, fieldOptions, filterActions, includesTerm, statusCell, tableFooter } from './businessFoundationShared';

const adjustmentLabels = { PERCENTAGE: 'Porcentaje', FIXED: 'Monto fijo' };
const priorityOptions = [
  { value: '1', label: 'Principal' },
  { value: '50', label: 'Alternativa' },
  { value: '100', label: 'Respaldo' },
];
const localDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const today = () => localDate();
const nextMonth = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return localDate(date);
};
const formatMoney = (value) => Number(value || 0).toLocaleString('es-CL');
const calculateMarginPercentage = (salePrice, costPrice) => {
  const sale = Number(salePrice || 0);
  const cost = Number(costPrice || 0);
  if (!sale || !cost) return null;
  return ((sale - cost) / sale) * 100;
};

const CostReferenceInput = ({ form, setField, symbol }) => {
  const [reference, setReference] = useState(null);
  const [loadingReference, setLoadingReference] = useState(false);

  useEffect(() => {
    let active = true;
    const variantId = form.product_variant_id;
    const unitId = form.measurement_unit_id;
    if (!variantId || !unitId) {
      setReference(null);
      return undefined;
    }

    setLoadingReference(true);
    businessFoundationService.variants.pricingReference(variantId, { measurement_unit_id: unitId })
      .then((nextReference) => {
        if (!active) return;
        setReference(nextReference);
        if (nextReference?.suggested_cost !== null && nextReference?.suggested_cost !== undefined) {
          setField('cost_price', nextReference.suggested_cost);
        }
      })
      .catch(() => {
        if (active) setReference(null);
      })
      .finally(() => {
        if (active) setLoadingReference(false);
      });

    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.product_variant_id, form.measurement_unit_id]);

  const hasReference = reference?.suggested_cost !== null && reference?.suggested_cost !== undefined;
  const costLabel = loadingReference
    ? 'Costo (Buscando referencia)'
    : hasReference
      ? `Costo (${reference.cost_source_label})`
      : 'Costo (Sin costo de referencia)';

  return (
    <div className="space-y-1.5">
      <span className="font-medium text-slate-800 dark:text-slate-100">{costLabel}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">{symbol}</span>
        <input
          className={`h-11 w-full rounded-md border border-slate-300 px-3 pl-10 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 read-only:bg-slate-50 read-only:text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:read-only:bg-slate-900 dark:read-only:text-slate-300 dark:focus:border-blue-500 dark:focus:ring-blue-950`}
          type="number"
          min="0"
          value={form.cost_price ?? ''}
          onChange={(event) => setField('cost_price', event.target.value)}
          readOnly={hasReference || loadingReference}
        />
      </div>
    </div>
  );
};

const BasePriceReferenceInput = ({ form, setField, symbol, lists, items }) => {
  const activeList = lists.find((list) => String(list.id) === String(form.price_list_id));
  const baseList = activeList?.base_price_list_id ? lists.find((list) => Number(list.id) === Number(activeList.base_price_list_id)) : null;
  const baseItem = baseList
    ? items.find((item) => (
      Number(item.price_list_id) === Number(baseList.id)
      && Number(item.product_variant_id) === Number(form.product_variant_id)
      && Number(item.measurement_unit_id) === Number(form.measurement_unit_id)
      && item.is_active !== false
    ))
    : null;
  const hasReference = Boolean(baseItem);
  const label = hasReference
    ? `Precio base (${baseList.price_list_name})`
    : activeList?.base_price_list_id
      ? 'Precio base (Sin referencia en lista base)'
      : 'Precio base (Manual)';

  useEffect(() => {
    if (baseItem?.sale_price !== null && baseItem?.sale_price !== undefined) {
      setField('base_price', baseItem.sale_price);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseItem?.id]);

  return (
    <div className="space-y-1.5">
      <span className="font-medium text-slate-800 dark:text-slate-100">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">{symbol}</span>
        <input
          className="h-11 w-full rounded-md border border-slate-300 px-3 pl-10 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 read-only:bg-slate-50 read-only:text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:read-only:bg-slate-900 dark:read-only:text-slate-300 dark:focus:border-blue-500 dark:focus:ring-blue-950"
          type="number"
          min="0"
          value={form.base_price ?? ''}
          onChange={(event) => setField('base_price', event.target.value)}
          readOnly={hasReference}
          required
        />
      </div>
    </div>
  );
};

const AdminPriceLists = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const handledDeepLinkRef = useRef('');
  const [categories, setCategories] = useState([]);
  const [lists, setLists] = useState([]);
  const [items, setItems] = useState([]);
  const [variants, setVariants] = useState([]);
  const [units, setUnits] = useState([]);
  const [unitsByVariant, setUnitsByVariant] = useState({});
  const [currencies, setCurrencies] = useState([]);
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [status, setStatus] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextCategories, nextLists, nextItems, nextVariants, nextUnits, nextCurrencies] = await Promise.all([
        businessFoundationService.priceCategories.list({ active_only: false }),
        businessFoundationService.priceLists.list({ active_only: false }),
        businessFoundationService.priceItems.list({ active_only: false }),
        businessFoundationService.variants.list({ active_only: false }),
        measurementUnitsService.list({ active_only: false, limit: 1000 }),
        adminMaintainersService.list('currencies'),
      ]);
      setCategories(nextCategories);
      setLists(nextLists);
      setItems(nextItems);
      setVariants(nextVariants);
      setUnits(nextUnits);
      setCurrencies(nextCurrencies);

      const variantUnitsEntries = await Promise.all(nextVariants.map(async (variant) => {
        try {
          return [String(variant.id), await businessFoundationService.variants.units(variant.id)];
        } catch {
          return [String(variant.id), []];
        }
      }));
      setUnitsByVariant(Object.fromEntries(variantUnitsEntries));
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar listas de precios.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [search, status, categoryFilter, pageSize, searchParams]);

  useEffect(() => {
    const nextSearch = searchParams.get('search') || '';
    if (nextSearch !== search) setSearch(nextSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const selectedListId = searchParams.get('price_list_id') || '';
  const selectedList = lists.find((list) => String(list.id) === String(selectedListId));
  const isScopedPriceView = Boolean(selectedListId);
  const categoryOptions = categories.map((category) => ({ value: String(category.id), label: category.category_name || category.group_name, description: category.category_description || category.group_description || '' }));
  const listOptions = lists.map((list) => ({ value: String(list.id), label: list.price_list_name }));
  const variantOptions = variants.map((variant) => ({ value: String(variant.id), label: variant.variant_name }));
  const unitOptions = units.map((unit) => ({ value: String(unit.id), label: `${unit.unit_code} - ${unit.unit_name}` }));
  const currencyOptions = currencies.filter((currency) => currency.is_active !== false).map((currency) => ({ value: currency.currency_code, label: `${currency.currency_code} - ${currency.currency_symbol} - ${currency.currency_name}` }));
  const currencySymbolFor = (currencyCode) => currencies.find((currency) => currency.currency_code === currencyCode)?.currency_symbol || currencyCode || '$';

  const unitOptionsForVariant = (variantId) => {
    const scopedUnits = unitsByVariant[String(variantId)] || [];
    return scopedUnits.length
      ? scopedUnits.map((unit) => ({ value: String(unit.measurement_unit_id || unit.id), label: `${unit.unit_code} - ${unit.unit_name}` }))
      : unitOptions;
  };

  const openList = (list = null) => ModalManager.show({
    type: 'custom',
    title: list ? 'Editar lista' : 'Nueva lista',
    size: 'xlarge',
    showFooter: false,
    contentComponent: SimpleFormContent,
    contentProps: {
      initialValues: list
        ? {
          price_list_group_id: list.price_list_group_id ? String(list.price_list_group_id) : '',
          price_list_name: list.price_list_name,
          base_price_list_id: list.base_price_list_id ? String(list.base_price_list_id) : '',
          base_adjustment_type: list.base_adjustment_type || '',
          base_adjustment_value: list.base_adjustment_value ?? '',
          currency_code: list.currency_code || 'CLP',
          valid_from: list.valid_from || today(),
          valid_to: list.valid_to || nextMonth(),
          priority: String(list.priority || 1),
          applies_to: 'ALL_PRODUCTS',
          is_active: list.is_active,
        }
        : {
          price_list_group_id: categoryOptions[0]?.value || '',
          price_list_name: '',
          base_price_list_id: '',
          base_adjustment_type: '',
          base_adjustment_value: '',
          currency_code: 'CLP',
          valid_from: today(),
          valid_to: nextMonth(),
          priority: '1',
          applies_to: 'ALL_PRODUCTS',
          is_active: true,
        },
      fields: [
        { type: 'section', id: 'identity', label: 'Datos de la lista', description: 'Identifica la lista, su categoria comercial, moneda y disponibilidad.', icon: BadgeDollarSign, columns: 3 },
        { id: 'price_list_name', label: 'Nombre', required: true },
        { id: 'price_list_group_id', label: 'Categoria', type: 'select', required: true, options: categoryOptions, showOptionDescription: false },
        { id: 'currency_code', label: 'Moneda', type: 'select', options: currencyOptions },
        { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activa' },
        {
          id: 'category_description',
          label: 'Descripcion de categoria',
          type: 'custom',
          span: 2,
          collapseLabel: true,
          render: ({ form }) => {
            const selectedCategory = categoryOptions.find((option) => String(option.value) === String(form.price_list_group_id));
            return (
              <div className="mt-3 flex min-h-16 items-center rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
                {selectedCategory?.description || 'La categoria ayuda a clasificar la lista para ventas, busqueda y reportes.'}
              </div>
            );
          },
        },
        { type: 'section', id: 'rules', label: 'Vigencia y reglas', description: 'Define desde cuando se usa la lista y si hereda precios desde otra lista.', icon: CalendarDays, columns: 3 },
        { id: 'valid_from', label: 'Vigente desde', type: 'date', required: true },
        { id: 'valid_to', label: 'Vigente hasta', type: 'date' },
        { id: 'priority', label: 'Preferencia de uso', type: 'select', options: priorityOptions },
        { id: 'base_price_list_id', label: 'Lista base', type: 'select', emptyLabel: 'Sin lista base', options: listOptions.filter((option) => !list || Number(option.value) !== Number(list.id)) },
        {
          id: 'base_adjustment_type',
          label: 'Ajuste base',
          type: 'custom',
          render: ({ form, setField }) => (
            <select
              className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950"
              value={form.base_adjustment_type || ''}
              onChange={(event) => {
                const nextType = event.target.value;
                setField('base_adjustment_type', nextType);
                if (!nextType) setField('base_adjustment_value', '');
              }}
            >
              <option value="">Sin ajuste</option>
              {Object.entries(adjustmentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          ),
        },
        {
          id: 'base_adjustment_value',
          label: 'Valor ajuste',
          type: 'custom',
          render: ({ form, setField }) => {
            const adjustmentType = form.base_adjustment_type || '';
            const disabled = !adjustmentType;
            const isPercentage = adjustmentType === 'PERCENTAGE';
            const isFixed = adjustmentType === 'FIXED';
            const adjustmentHelp = isPercentage
              ? 'Se aplica sobre el precio de la lista base.'
              : isFixed
                ? 'Se suma al precio de la lista base.'
                : '';
            return (
              <div>
                <div className="relative">
                  {isFixed && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">{currencySymbolFor(form.currency_code)}</span>}
                  <input
                    className={`h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:disabled:bg-slate-900 dark:focus:border-blue-500 dark:focus:ring-blue-950 ${isFixed ? 'pl-10' : ''} ${isPercentage ? 'pr-9' : ''}`}
                    type="number"
                    min="0"
                    value={form.base_adjustment_value ?? ''}
                    onChange={(event) => setField('base_adjustment_value', event.target.value)}
                    disabled={disabled}
                    placeholder={disabled ? 'Sin ajuste' : '0'}
                  />
                  {isPercentage && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">%</span>}
                </div>
                {adjustmentHelp && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{adjustmentHelp}</span>}
              </div>
            );
          },
        },
      ],
      onSubmit: async (form) => {
        const payload = {
          ...form,
          price_list_group_id: form.price_list_group_id ? Number(form.price_list_group_id) : null,
          base_price_list_id: form.base_price_list_id ? Number(form.base_price_list_id) : null,
          base_adjustment_type: form.base_adjustment_type || null,
          base_adjustment_value: form.base_adjustment_type && form.base_adjustment_value !== '' ? Number(form.base_adjustment_value) : null,
          valid_to: form.valid_to || null,
          applies_to: 'ALL_PRODUCTS',
          priority: Number(form.priority || 1),
        };
        await notifyPromise(
          list ? businessFoundationService.priceLists.update(list.id, payload) : businessFoundationService.priceLists.create(payload),
          { loading: 'Guardando lista...', success: 'Lista guardada.', error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar.') },
        );
        await load();
      },
    },
  });

  const openItem = (item = null) => ModalManager.show({
    type: 'custom',
    title: item ? 'Editar precio' : 'Nuevo precio',
    size: 'xlarge',
    showFooter: false,
    contentComponent: SimpleFormContent,
    contentProps: {
      initialValues: item
        ? { price_list_id: String(item.price_list_id), product_variant_id: String(item.product_variant_id), measurement_unit_id: String(item.measurement_unit_id), base_price: item.base_price, sale_price: item.sale_price, cost_price: item.cost_price ?? '', is_active: item.is_active }
        : { price_list_id: selectedListId || listOptions[0]?.value || '', product_variant_id: variantOptions[0]?.value || '', measurement_unit_id: unitOptionsForVariant(variantOptions[0]?.value || '')[0]?.value || unitOptions[0]?.value || '', base_price: '', sale_price: '', cost_price: '', is_active: true },
      fields: [
        { type: 'section', id: 'context', label: 'Datos del precio', description: 'Selecciona el SKU y unidad comercial que recibira el precio.', icon: ListChecks, columns: 3 },
        ...(!selectedListId ? [{ id: 'price_list_id', label: 'Lista', type: 'select', required: true, options: listOptions }] : []),
        {
          id: 'product_variant_id',
          label: 'SKU',
          type: 'custom',
          render: ({ form, setField }) => (
            <select
              className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950"
              value={form.product_variant_id || ''}
              onChange={(event) => {
                const nextVariantId = event.target.value;
                setField('product_variant_id', nextVariantId);
                const firstUnit = unitOptionsForVariant(nextVariantId)[0]?.value || '';
                setField('measurement_unit_id', firstUnit);
              }}
              required
            >
              <option value="">Seleccione SKU</option>
              {variantOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          ),
        },
        {
          id: 'measurement_unit_id',
          label: 'Unidad',
          type: 'custom',
          render: ({ form, setField }) => {
            const options = unitOptionsForVariant(form.product_variant_id);
            return (
              <select
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                value={form.measurement_unit_id || ''}
                onChange={(event) => setField('measurement_unit_id', event.target.value)}
                required
                disabled={!form.product_variant_id}
              >
                <option value="">Seleccione unidad</option>
                {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            );
          },
        },
        { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' },
        { type: 'section', id: 'values', label: 'Valores comerciales', description: 'Define los precios usados para venta y analisis comercial.', icon: BadgeDollarSign, columns: 3 },
        {
          id: 'base_price',
          label: 'Precio base',
          collapseLabel: true,
          type: 'custom',
          render: ({ form, setField }) => {
            const activeList = lists.find((list) => String(list.id) === String(form.price_list_id));
            const symbol = currencySymbolFor(activeList?.currency_code || 'CLP');
            return <BasePriceReferenceInput form={form} setField={setField} symbol={symbol} lists={lists} items={items} />;
          },
        },
        {
          id: 'cost_price',
          label: 'Costo',
          collapseLabel: true,
          type: 'custom',
          render: ({ form, setField }) => {
            const activeList = lists.find((list) => String(list.id) === String(form.price_list_id));
            const symbol = currencySymbolFor(activeList?.currency_code || 'CLP');
            return <CostReferenceInput form={form} setField={setField} symbol={symbol} />;
          },
        },
        {
          id: 'sale_price',
          label: 'Precio venta',
          type: 'custom',
          render: ({ form, setField }) => {
            const activeList = lists.find((list) => String(list.id) === String(form.price_list_id));
            const symbol = currencySymbolFor(activeList?.currency_code || 'CLP');
            return (
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">{symbol}</span>
                <input
                  className="h-11 w-full rounded-md border border-slate-300 px-3 pl-10 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                  type="number"
                  min="0"
                  value={form.sale_price ?? ''}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setField('sale_price', nextValue);
                    const selectedList = lists.find((list) => String(list.id) === String(form.price_list_id));
                    if (!selectedList?.base_price_list_id && (form.base_price === '' || form.base_price === null || form.base_price === undefined || Number(form.base_price) === 0)) {
                      setField('base_price', nextValue);
                    }
                  }}
                  required
                />
              </div>
            );
          },
        },
        {
          id: 'margin_preview',
          label: 'Margen bruto ((PV - PC) / PV * 100)',
          type: 'custom',
          render: ({ form }) => {
            const margin = calculateMarginPercentage(form.sale_price, form.cost_price);
            return (
              <div className="flex h-11 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                {margin === null ? '-' : `${margin.toFixed(2)} %`}
              </div>
            );
          },
        },
      ],
      onSubmit: async (form) => {
        if (!form.product_variant_id || !form.measurement_unit_id) {
          throw new Error('SKU y unidad son requeridos.');
        }
        const marginPercentage = calculateMarginPercentage(form.sale_price, form.cost_price);
        const payload = { price_list_id: Number(form.price_list_id || selectedListId), product_variant_id: Number(form.product_variant_id), measurement_unit_id: Number(form.measurement_unit_id), base_price: Number(form.base_price || 0), sale_price: Number(form.sale_price || 0), cost_price: form.cost_price === '' ? null : Number(form.cost_price), margin_percentage: marginPercentage === null ? null : Number(marginPercentage.toFixed(2)), is_active: Boolean(form.is_active) };
        await notifyPromise(
          item ? businessFoundationService.priceItems.update(item.id, payload) : businessFoundationService.priceItems.create(payload),
          { loading: 'Guardando precio...', success: 'Precio guardado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar.') },
        );
        await load();
      },
    },
  });

  useEffect(() => {
    const openMode = searchParams.get('open');
    const recordId = Number(searchParams.get('id'));
    const requestedTab = searchParams.get('tab') || 'lists';
    const deepLinkKey = `${requestedTab}:${openMode}:${recordId}`;
    if (loading || openMode !== 'edit' || !recordId || handledDeepLinkRef.current === deepLinkKey) return;

    if (requestedTab === 'items') {
      const targetItem = items.find((item) => Number(item.id) === recordId);
      if (!targetItem) return;
      handledDeepLinkRef.current = deepLinkKey;
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('price_list_id', String(targetItem.price_list_id));
      nextParams.delete('tab');
      setSearchParams(nextParams, { replace: true });
      openItem(targetItem);
      return;
    }

    const targetList = lists.find((item) => Number(item.id) === recordId);
    if (!targetList) return;
    handledDeepLinkRef.current = deepLinkKey;
    openList(targetList);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('open');
    nextParams.delete('id');
    setSearchParams(nextParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, lists, loading, searchParams, setSearchParams]);

  const remove = async (label, action) => {
    if (!await ModalManager.confirm({ title: `Eliminar ${label}`, message: `Confirma eliminar ${label}.`, buttons: { cancel: 'Cancelar', confirm: 'Eliminar' } })) return;
    await notifyPromise(action(), { loading: 'Eliminando...', success: 'Eliminado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible eliminar.') });
    await load();
  };

  const toggleListStatus = async (list) => {
    const nextActive = !list.is_active;
    const actionLabel = nextActive ? 'activar' : 'desactivar';
    const confirmed = await ModalManager.confirm({
      title: `${nextActive ? 'Activar' : 'Desactivar'} lista`,
      message: `Confirma ${actionLabel} ${list.price_list_name}.`,
      buttons: { cancel: 'Cancelar', confirm: nextActive ? 'Activar' : 'Desactivar' },
    });
    if (!confirmed) return;

    await notifyPromise(
      businessFoundationService.priceLists.update(list.id, { is_active: nextActive }),
      {
        loading: 'Actualizando estado...',
        success: nextActive ? 'Lista activada.' : 'Lista desactivada.',
        error: (requestError) => getBackendMessage(requestError, 'No fue posible actualizar el estado.'),
      },
    );
    await load();
  };

  const openPriceView = (list) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('price_list_id', String(list.id));
    nextParams.delete('tab');
    nextParams.delete('open');
    nextParams.delete('id');
    setSearchParams(nextParams);
    setPage(0);
  };

  const closePriceView = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('price_list_id');
    nextParams.delete('open');
    nextParams.delete('id');
    setSearchParams(nextParams);
    setPage(0);
  };

  const toggleItemStatus = async (item) => {
    const nextActive = !item.is_active;
    const actionLabel = nextActive ? 'activar' : 'desactivar';
    if (!await ModalManager.confirm({
      title: `${nextActive ? 'Activar' : 'Desactivar'} precio`,
      message: `Confirma ${actionLabel} el precio de ${item.variant_name || 'este SKU'}.`,
      buttons: { cancel: 'Cancelar', confirm: nextActive ? 'Activar' : 'Desactivar' },
    })) return;
    await notifyPromise(
      businessFoundationService.priceItems.update(item.id, { is_active: nextActive }),
      {
        loading: 'Actualizando estado...',
        success: nextActive ? 'Precio activo.' : 'Precio desactivado.',
        error: (requestError) => getBackendMessage(requestError, 'No fue posible actualizar el estado.'),
      },
    );
    await load();
  };

  const filteredLists = lists.filter((item) => {
    const matchesStatus = activeFilter(status)(item);
    const matchesCategory = categoryFilter === 'all' || String(item.price_list_group_id) === String(categoryFilter);
    const matchesSearch = includesTerm(item, ['price_list_name', 'category_name', 'group_name', 'currency_code'], search.trim().toLowerCase());
    return matchesStatus && matchesCategory && matchesSearch;
  });
  const filteredItems = items.filter((item) => (!selectedListId || String(item.price_list_id) === String(selectedListId)) && activeFilter(status)(item) && includesTerm(item, ['price_list_name', 'variant_name', 'product_name', 'unit_code'], search.trim().toLowerCase()));
  const activeData = isScopedPriceView ? filteredItems : filteredLists;
  const visibleData = activeData.slice(page * pageSize, page * pageSize + pageSize);
  const actionConfig = isScopedPriceView
    ? { label: 'Nuevo precio', onClick: () => openItem(), disabled: !selectedList || !variantOptions.length || !unitOptions.length }
    : { label: 'Nueva lista', onClick: () => openList(), disabled: !categoryOptions.length };
  const title = isScopedPriceView ? `Precios SKU - ${selectedList?.price_list_name || 'Lista no encontrada'}` : 'Listas de precios';
  const description = isScopedPriceView ? 'Precios vigentes por SKU y unidad para la lista seleccionada.' : 'Categorias comerciales fijas, listas vigentes y precios por SKU.';
  const searchPlaceholder = isScopedPriceView ? 'Buscar producto, SKU o unidad' : 'Buscar lista, categoria o moneda';
  const filterFields = isScopedPriceView
    ? [{ id: 'status', value: status, onChange: setStatus, options: fieldOptions.status }]
    : [
      { id: 'status', value: status, onChange: setStatus, options: fieldOptions.status },
      { id: 'category', value: categoryFilter, onChange: setCategoryFilter, options: [{ value: 'all', label: 'Todas las categorias' }, ...categoryOptions] },
    ];

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mb-5 flex flex-wrap justify-between gap-3">
        <div><h1 className="text-xl font-semibold">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>
        <div className="flex flex-wrap gap-2">
          {isScopedPriceView && <ActionButton label="Volver" icon={ArrowLeft} variant="neutral" onClick={closePriceView} />}
          <ActionButton label={actionConfig.label} icon={Plus} disabled={actionConfig.disabled} onClick={actionConfig.onClick} />
        </div>
      </div>
      <KpiBar items={[{ label: 'Categorias', value: categories.filter((item) => item.is_active).length }, { label: 'Listas', value: lists.length }, { label: 'Activas', value: lists.filter((item) => item.is_active).length }, { label: 'Precios SKU', value: items.length }]} className="mb-4" />
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <FilterBar className="mb-4" searchValue={search} searchPlaceholder={searchPlaceholder} onSearchChange={setSearch} fields={filterFields} actions={filterActions({ loading, onRefresh: load, onClear: () => { setSearch(''); setStatus('all'); setCategoryFilter('all'); } })} />
      {!isScopedPriceView && <DataTable loading={loading} data={visibleData} footer={tableFooter({ page, pageSize, total: activeData.length, loading, setPage, setPageSize })} columns={[{ id: 'list', label: 'Lista', render: (item) => <div className="font-medium">{item.price_list_name}</div> }, { id: 'category', label: 'Categoria', render: (item) => item.category_name || item.group_name || '-' }, { id: 'currency', label: 'Moneda', render: (item) => item.currency_code }, { id: 'validity', label: 'Vigencia', render: (item) => `${item.valid_from || '-'} / ${item.valid_to || 'sin termino'}` }, { id: 'status', label: 'Estado', render: (item) => statusCell(item.is_active) }, { id: 'actions', label: 'Acciones', align: 'center', render: (item) => <div className="flex justify-center gap-2"><RowActionButton label="Editar" icon={Pencil} onClick={() => openList(item)} /><RowActionButton label="Precios SKU" icon={ListChecks} onClick={() => openPriceView(item)} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => remove('lista', () => businessFoundationService.priceLists.remove(item.id))} /><RowActionButton label={item.is_active ? 'Desactivar' : 'Activar'} icon={item.is_active ? EyeOff : CheckCircle2} onClick={() => toggleListStatus(item)} /></div> }]} />}
      {isScopedPriceView && <DataTable loading={loading} data={visibleData} footer={tableFooter({ page, pageSize, total: activeData.length, loading, setPage, setPageSize })} columns={[{ id: 'sku', label: 'SKU / Variacion', render: (item) => <><div className="font-medium">{item.variant_name}</div><div className="text-xs text-slate-500">{item.product_name || '-'}</div></> }, { id: 'unit', label: 'Unidad', render: (item) => item.unit_code }, { id: 'base', label: 'Base', align: 'right', render: (item) => formatMoney(item.base_price) }, { id: 'sale', label: 'Venta', align: 'right', render: (item) => formatMoney(item.sale_price) }, { id: 'cost', label: 'Costo', align: 'right', render: (item) => item.cost_price === null || item.cost_price === undefined ? '-' : formatMoney(item.cost_price) }, { id: 'status', label: 'Estado', render: (item) => statusCell(item.is_active) }, { id: 'actions', label: 'Acciones', align: 'center', render: (item) => <div className="flex justify-center gap-2"><RowActionButton label="Editar" icon={Pencil} onClick={() => openItem(item)} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => remove('precio', () => businessFoundationService.priceItems.remove(item.id))} /><RowActionButton label={item.is_active ? 'Desactivar' : 'Activar'} icon={item.is_active ? EyeOff : CheckCircle2} onClick={() => toggleItemStatus(item)} /></div> }]} />}
    </section>
  );
};

export default AdminPriceLists;
