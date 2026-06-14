/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { Barcode, CheckCircle2, Eye, EyeOff, Pencil, QrCode, RefreshCw, Trash2 } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import DataTablePagination from '@/components/common/data/DataTablePagination';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import StatusBadge from '@/components/common/data/StatusBadge';
import { adminMaintainersService } from '@/services/admin/adminMaintainersService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 150, 200];

const BARCODE_TYPES = [
  { value: 'EAN13', label: 'EAN-13', icon: Barcode, description: 'Codigo comercial de 13 digitos para productos de venta.' },
  { value: 'EAN8', label: 'EAN-8', icon: Barcode, description: 'Codigo comercial compacto de 8 digitos.' },
  { value: 'UPC', label: 'UPC-A', icon: Barcode, description: 'Codigo comercial de 12 digitos usado principalmente en retail.' },
  { value: 'CODE128', label: 'Code 128', icon: Barcode, description: 'Codigo alfanumerico flexible para etiquetas internas.' },
  { value: 'QR', label: 'QR', icon: QrCode, description: 'Codigo bidimensional para enlaces o informacion extendida.' },
];

const typeLabels = Object.fromEntries(BARCODE_TYPES.map((type) => [type.value, type.label]));
const typeIcons = Object.fromEntries(BARCODE_TYPES.map((type) => [type.value, type.icon]));

const barcodeFormatByType = {
  EAN13: 'EAN13',
  EAN8: 'EAN8',
  UPC: 'UPC',
  CODE128: 'CODE128',
};

const checkDigitConfig = {
  EAN13: { baseLength: 12, fullLength: 13, weights: [1, 3] },
  EAN8: { baseLength: 7, fullLength: 8, weights: [3, 1] },
  UPC: { baseLength: 11, fullLength: 12, weights: [3, 1] },
};

const normalizeBarcodeValue = (type, value) => {
  const raw = String(value || '').trim();
  if (['EAN13', 'EAN8', 'UPC'].includes(type)) return raw.replace(/\D/g, '');
  return raw;
};

const checkDigit = (digits, weights) => {
  const sum = digits
    .split('')
    .reduce((total, digit, index) => total + Number(digit) * weights[index % weights.length], 0);
  return String((10 - (sum % 10)) % 10);
};

const completeBarcodeValue = (type, value) => {
  const normalized = normalizeBarcodeValue(type, value);
  const config = checkDigitConfig[type];
  if (config && normalized.length === config.baseLength) return `${normalized}${checkDigit(normalized, config.weights)}`;
  return normalized;
};

const editableBarcodeValue = (type, value) => {
  const normalized = normalizeBarcodeValue(type, value);
  const config = checkDigitConfig[type];
  if (!config) return normalized;
  if (normalized.length === config.fullLength) return normalized.slice(0, config.baseLength);
  return normalized.slice(0, config.baseLength);
};

const validateBarcode = (type, value) => {
  const normalized = completeBarcodeValue(type, value);
  if (!type) return 'Selecciona el tipo de codigo.';
  if (!normalized) return 'Ingresa el codigo.';
  if (type === 'EAN13' && !/^\d{13}$/.test(normalized)) return 'EAN-13 debe tener exactamente 13 digitos.';
  if (type === 'EAN13' && checkDigit(normalized.slice(0, 12), [1, 3]) !== normalized[12]) return 'EAN-13 no tiene un digito verificador valido.';
  if (type === 'EAN8' && !/^\d{8}$/.test(normalized)) return 'EAN-8 debe tener exactamente 8 digitos.';
  if (type === 'EAN8' && checkDigit(normalized.slice(0, 7), [3, 1]) !== normalized[7]) return 'EAN-8 no tiene un digito verificador valido.';
  if (type === 'UPC' && !/^\d{12}$/.test(normalized)) return 'UPC-A debe tener exactamente 12 digitos.';
  if (type === 'UPC' && checkDigit(normalized.slice(0, 11), [3, 1]) !== normalized[11]) return 'UPC-A no tiene un digito verificador valido.';
  if (type === 'CODE128' && !/^[\x20-\x7E]{1,80}$/.test(normalized)) return 'Code 128 acepta texto imprimible de hasta 80 caracteres.';
  if (type === 'QR' && normalized.length > 255) return 'QR acepta hasta 255 caracteres.';
  return '';
};

const optionLabel = (row) => {
  if (!row) return '-';
  if (row.variant_name) return row.variant_name;
  if (row.product_name) return row.product_name;
  if (row.unit_name) return `${row.unit_name}${row.unit_symbol ? ` (${row.unit_symbol})` : ''}`;
  return row.label || row.name || String(row.id);
};

const BarcodePreview = ({ type, value, compact = false }) => {
  const svgRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState('');
  const normalizedValue = completeBarcodeValue(type, value);

  useEffect(() => {
    setError('');
    const svg = svgRef.current;
    const canvas = canvasRef.current;
    if (svg) svg.innerHTML = '';
    if (canvas) {
      const context = canvas.getContext('2d');
      context?.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (!type || !normalizedValue) return;
    const validationError = validateBarcode(type, value);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (type === 'QR') {
      if (!canvas) return;
      QRCode.toCanvas(canvas, normalizedValue, {
        width: compact ? 92 : 180,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      }).catch((renderError) => {
        setError(renderError?.message || 'No fue posible generar la imagen del codigo.');
      });
      return;
    }
    if (!svg) return;
    try {
      JsBarcode(svg, normalizedValue, {
        format: barcodeFormatByType[type],
        displayValue: true,
        fontSize: compact ? 10 : 14,
        height: compact ? 42 : 72,
        margin: compact ? 4 : 8,
        lineColor: '#0f172a',
        background: '#ffffff',
      });
    } catch (renderError) {
      setError(renderError?.message || 'No fue posible generar la imagen del codigo.');
    }
  }, [compact, normalizedValue, type, value]);

  return (
    <div className={`flex items-center justify-center rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 ${compact ? 'min-h-16' : 'min-h-28'}`}>
      {type && normalizedValue && !error && type !== 'QR' ? <svg ref={svgRef} className="max-h-28 max-w-full" /> : <svg ref={svgRef} className="hidden" />}
      {type && normalizedValue && !error && type === 'QR' ? <canvas ref={canvasRef} className="max-h-28 max-w-full" /> : <canvas ref={canvasRef} className="hidden" />}
      {(!type || !normalizedValue) && <span className="text-xs text-slate-500">Completa tipo y codigo para previsualizar.</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
};

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const selectClassName = `${fieldClassName} bg-white dark:bg-slate-950`;

const BarcodeFormContent = ({
  mode = 'create',
  initialValues = {},
  variantOptions = [],
  unitOptions = [],
  onSubmit,
  onClose,
}) => {
  const [form, setForm] = useState({
    product_variant_id: initialValues.product_variant_id ? String(initialValues.product_variant_id) : '',
    barcode_type: initialValues.barcode_type || 'EAN13',
    barcode_value: editableBarcodeValue(initialValues.barcode_type || 'EAN13', initialValues.barcode_value || ''),
    measurement_unit_id: initialValues.measurement_unit_id ? String(initialValues.measurement_unit_id) : '',
    is_primary: initialValues.is_primary === true,
    is_active: initialValues.is_active !== false,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const isEdit = mode === 'edit';

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };
  const barcodeConfig = checkDigitConfig[form.barcode_type];
  const barcodeBaseValue = normalizeBarcodeValue(form.barcode_type, form.barcode_value);
  const barcodeDigit = barcodeConfig && barcodeBaseValue.length === barcodeConfig.baseLength
    ? checkDigit(barcodeBaseValue, barcodeConfig.weights)
    : '';

  const updateBarcodeType = (value) => {
    setForm((current) => ({
      ...current,
      barcode_type: value,
      barcode_value: editableBarcodeValue(value, current.barcode_value),
    }));
  };

  const updateBarcodeValue = (value) => {
    const nextValue = barcodeConfig ? normalizeBarcodeValue(form.barcode_type, value).slice(0, barcodeConfig.baseLength) : value;
    updateField('barcode_value', nextValue);
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');

    const barcodeType = form.barcode_type;
    const barcodeValue = completeBarcodeValue(barcodeType, form.barcode_value);
    const validationError = validateBarcode(barcodeType, barcodeValue);

    if (!form.product_variant_id) {
      setFormError('Debes seleccionar un SKU / Variacion.');
      return;
    }

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        product_variant_id: Number(form.product_variant_id),
        barcode_type: barcodeType,
        barcode_value: barcodeValue,
        measurement_unit_id: form.measurement_unit_id ? Number(form.measurement_unit_id) : null,
        is_primary: Boolean(form.is_primary),
        is_active: Boolean(form.is_active),
      });
      onClose?.();
    } catch (requestError) {
      setFormError(getBackendMessage(requestError, 'No fue posible guardar el codigo.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">SKU / Variacion</span>
          <select className={selectClassName} value={form.product_variant_id} onChange={(event) => updateField('product_variant_id', event.target.value)} required>
            <option value="">Selecciona SKU</option>
            {variantOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Tipo</span>
          <select className={selectClassName} value={form.barcode_type} onChange={(event) => updateBarcodeType(event.target.value)} required>
            {BARCODE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </label>

        <div className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">{barcodeConfig ? 'Codigo base' : 'Codigo'}</span>
          <div className={barcodeConfig ? 'grid grid-cols-[minmax(0,1fr)_4.5rem] gap-2' : ''}>
            <input
              className={`${fieldClassName} font-mono`}
              value={form.barcode_value}
              onChange={(event) => updateBarcodeValue(event.target.value)}
              required
              maxLength={barcodeConfig?.baseLength}
              placeholder={barcodeConfig ? `${barcodeConfig.baseLength} digitos` : 'Ingresa el valor del codigo'}
            />
            {barcodeConfig && (
              <input
                aria-label="Digito verificador"
                className={`${fieldClassName} bg-slate-50 text-center font-mono text-slate-500 dark:bg-slate-900`}
                value={barcodeDigit || '-'}
                disabled
                readOnly
              />
            )}
          </div>
        </div>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Unidad</span>
          <select className={selectClassName} value={form.measurement_unit_id} onChange={(event) => updateField('measurement_unit_id', event.target.value)}>
            <option value="">Sin unidad asociada</option>
            {unitOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-1 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">Vista previa</span>
        <BarcodePreview type={form.barcode_type} value={form.barcode_value} />
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <label className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
          <input type="checkbox" checked={form.is_primary} onChange={(event) => updateField('is_primary', event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Codigo principal
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
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Guardar'}
          </button>
        </div>
      </div>
    </form>
  );
};

const BarcodeTypeBadge = ({ type }) => {
  const Icon = typeIcons[type] || Barcode;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
      <Icon className="h-3.5 w-3.5" />
      {typeLabels[type] || type || '-'}
    </span>
  );
};

const AdminProductBarcodes = () => {
  const [barcodes, setBarcodes] = useState([]);
  const [variants, setVariants] = useState([]);
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const formDataLoadedRef = useRef(false);

  const loadMeta = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setBarcodes(await adminMaintainersService.list('product-barcodes'));
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar codigos de barra.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const ensureFormData = useCallback(async () => {
    if (formDataLoadedRef.current) return;
    formDataLoadedRef.current = true;
    try {
      const [nextVariants, nextUnits] = await Promise.all([
        adminMaintainersService.list('product-variants-options'),
        adminMaintainersService.list('measurement-units-options'),
      ]);
      setVariants(nextVariants);
      setUnits(nextUnits);
    } catch {
      formDataLoadedRef.current = false;
    }
  }, []);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { setPage(0); }, [search, status, typeFilter, pageSize]);

  const variantOptions = useMemo(() => variants.map((row) => ({ value: row.id, label: optionLabel(row) })), [variants]);
  const unitOptions = useMemo(() => units.map((row) => ({ value: row.id, label: optionLabel(row) })), [units]);
  const variantLabelById = useMemo(() => Object.fromEntries(variantOptions.map((option) => [String(option.value), option.label])), [variantOptions]);
  const unitLabelById = useMemo(() => Object.fromEntries(unitOptions.map((option) => [String(option.value), option.label])), [unitOptions]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return barcodes.filter((item) => {
      const matchesStatus = status === 'all' || (status === 'active' ? item.is_active !== false : item.is_active === false);
      const matchesType = typeFilter === 'all' || item.barcode_type === typeFilter;
      const matchesSearch = !term || [item.barcode_value, item.barcode_type, variantLabelById[String(item.product_variant_id)], unitLabelById[String(item.measurement_unit_id)]]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [barcodes, search, status, typeFilter, unitLabelById, variantLabelById]);

  const visibleRows = useMemo(() => filtered.slice(page * pageSize, page * pageSize + pageSize), [filtered, page, pageSize]);

  const stats = [
    { id: 'total', label: 'Total', value: barcodes.length, active: true },
    { id: 'active', label: 'Activos', value: barcodes.filter((item) => item.is_active !== false).length },
    { id: 'primary', label: 'Principales', value: barcodes.filter((item) => item.is_primary).length },
    { id: 'types', label: 'Tipos usados', value: new Set(barcodes.map((item) => item.barcode_type)).size },
  ];

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setTypeFilter('all');
  };

  const openForm = async (item = null) => {
    await ensureFormData();
    ModalManager.show({
    type: 'custom',
    title: item ? 'Editar codigo de barra' : 'Nuevo codigo de barra',
    icon: Barcode,
    size: 'large',
    showFooter: false,
    contentComponent: BarcodeFormContent,
    contentProps: {
      mode: item ? 'edit' : 'create',
      initialValues: item ? {
        product_variant_id: item.product_variant_id || '',
        barcode_type: item.barcode_type || 'EAN13',
        barcode_value: item.barcode_value || '',
        measurement_unit_id: item.measurement_unit_id || '',
        is_primary: item.is_primary === true,
        is_active: item.is_active !== false,
      } : { product_variant_id: '', barcode_type: 'EAN13', barcode_value: '', measurement_unit_id: '', is_primary: false, is_active: true },
      variantOptions,
      unitOptions,
      onSubmit: async (payload) => {
        await notifyPromise(item ? adminMaintainersService.update('product-barcodes', item.id, payload) : adminMaintainersService.create('product-barcodes', payload), {
          loading: 'Guardando codigo...',
          success: 'Codigo guardado.',
          error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar el codigo.'),
        });
        await loadMeta();
      },
    },
  });
  };

  const remove = async (item) => {
    const confirmed = await ModalManager.confirm({
      title: 'Eliminar codigo de barra',
      message: `Confirma eliminar ${item.barcode_value}.`,
      buttons: { cancel: 'Cancelar', confirm: 'Eliminar' },
    });
    if (!confirmed) return;
    setBusyId(item.id);
    try {
      await notifyPromise(adminMaintainersService.remove('product-barcodes', item.id), {
        loading: 'Eliminando codigo...',
        success: 'Codigo eliminado.',
        error: (requestError) => getBackendMessage(requestError, 'No fue posible eliminar el codigo.'),
      });
      await loadMeta();
    } finally {
      setBusyId(null);
    }
  };

  const toggle = async (item) => {
    const nextStatus = !item.is_active;
    const confirmed = await ModalManager.confirm({
      title: nextStatus ? 'Activar codigo de barra' : 'Desactivar codigo de barra',
      message: nextStatus ? `Confirma activar ${item.barcode_value}.` : `Confirma desactivar ${item.barcode_value}.`,
      buttons: { cancel: 'Cancelar', confirm: nextStatus ? 'Activar' : 'Desactivar' },
    });
    if (!confirmed) return;
    setBusyId(item.id);
    try {
      await notifyPromise(adminMaintainersService.update('product-barcodes', item.id, { is_active: nextStatus }), {
        loading: nextStatus ? 'Activando codigo...' : 'Desactivando codigo...',
        success: nextStatus ? 'Codigo activo.' : 'Codigo inactivo.',
        error: (requestError) => getBackendMessage(requestError, 'No fue posible cambiar el estado.'),
      });
      await loadMeta();
    } finally {
      setBusyId(null);
    }
  };

  const showPreview = (item) => ModalManager.show({
    type: 'custom',
    title: `${typeLabels[item.barcode_type] || item.barcode_type} - ${item.barcode_value}`,
    size: 'large',
    showFooter: false,
    content: (
      <div className="space-y-4">
        <BarcodePreview type={item.barcode_type} value={item.barcode_value} />
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          <div><span className="font-semibold">SKU:</span> {variantLabelById[String(item.product_variant_id)] || '-'}</div>
          <div className="mt-1"><span className="font-semibold">Unidad:</span> {unitLabelById[String(item.measurement_unit_id)] || '-'}</div>
        </div>
      </div>
    ),
  });

  const columns = [
    { id: 'barcode_value', label: 'Codigo', sortable: true, render: (item) => <div><div className="font-mono font-semibold">{item.barcode_value}</div>{item.is_primary && <div className="text-xs text-slate-500">Principal</div>}</div> },
    { id: 'barcode_type', label: 'Tipo', sortable: true, render: (item) => <BarcodeTypeBadge type={item.barcode_type} /> },
    { id: 'product_variant_id', label: 'SKU / Variacion', render: (item) => variantLabelById[String(item.product_variant_id)] || '-' },
    { id: 'measurement_unit_id', label: 'Unidad', render: (item) => unitLabelById[String(item.measurement_unit_id)] || '-' },
    { id: 'preview', label: 'Vista', align: 'center', render: (item) => <BarcodePreview type={item.barcode_type} value={item.barcode_value} compact /> },
    { id: 'status', label: 'Estado', render: (item) => <StatusBadge variant={item.is_active !== false ? 'active' : 'inactive'}>{item.is_active !== false ? 'Activo' : 'Inactivo'}</StatusBadge> },
    { id: 'actions', label: 'Acciones', align: 'center', render: (item) => <><RowActionButton label="Editar" icon={Pencil} disabled={busyId === item.id} onClick={() => openForm(item)} /><RowActionButton label="Ver codigo" icon={Eye} disabled={busyId === item.id} onClick={() => showPreview(item)} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" disabled={busyId === item.id} onClick={() => remove(item)} /><RowActionButton label={item.is_active !== false ? 'Desactivar' : 'Activar'} icon={item.is_active !== false ? EyeOff : CheckCircle2} variant={item.is_active !== false ? 'danger' : 'neutral'} disabled={busyId === item.id} onClick={() => toggle(item)} /></> },
  ];

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Codigos de barra de productos"
        description="Codigos estandar asociados a SKU / Variaciones y unidades comerciales."
        actions={[{ id: 'new-barcode', label: 'Nuevo codigo', icon: Barcode, onClick: () => openForm() }]}
      />

      <KpiBar items={stats} />

      <FilterBar
        className="mt-4"
        searchValue={search}
        searchPlaceholder="Buscar codigo, SKU o unidad"
        onSearchChange={setSearch}
        onSearchSubmit={() => setPage(0)}
        gridClassName="lg:grid-cols-[minmax(280px,1fr)_220px_190px_auto]"
        fields={[
          { id: 'type', value: typeFilter, onChange: (value) => setTypeFilter(value || 'all'), placeholder: 'Todos los tipos', clearable: false, showIcons: true, options: [{ value: 'all', label: 'Todos los tipos', icon: Barcode }, ...BARCODE_TYPES] },
          { id: 'status', value: status, onChange: (value) => setStatus(value || 'all'), placeholder: 'Todos los estados', clearable: false, options: [{ value: 'all', label: 'Todos los estados' }, { value: 'active', label: 'Activos' }, { value: 'inactive', label: 'Inactivos' }] },
        ]}
        actions={<div className="flex flex-wrap gap-2"><ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={loadMeta} /><ActionButton label="Limpiar" icon={EyeOff} variant="neutral" onClick={clearFilters} /></div>}
      />

      {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</div>}

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={visibleRows}
          loading={loading}
          emptyMessage="No hay codigos de barra para mostrar."
          footer={<DataTablePagination page={page} pageSize={pageSize} pageSizeOptions={PAGE_SIZE_OPTIONS} total={filtered.length} hasMore={(page + 1) * pageSize < filtered.length} loading={loading} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(0); }} />}
        />
      </div>
    </section>
  );
};

export default AdminProductBarcodes;
