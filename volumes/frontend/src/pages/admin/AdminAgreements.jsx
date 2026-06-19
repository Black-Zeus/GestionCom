/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Handshake, Pencil, Plus, ToggleLeft, ToggleRight, Trash2, Users, X } from 'lucide-react';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import DataTable from '@/components/common/data/DataTable';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import { RowActionButton } from '@/components/common/actions/ActionButton';
import ModalManager from '@/components/ui/modal';
import { agreementsService } from '@/services/sales/agreementsService';
import DatePicker from '@/components/common/forms/DatePicker';
import { getBackendMessage, notifyPromise, toast } from '@/services/ui/notify';
import { mediaService } from '@/services/media/mediaService';
import { formatRut, isValidRut, normalizeRutForStorage } from '@/utils/rut';
import { activeFilter, fieldOptions, filterActions, includesTerm, statusCell, tableFooter } from './businessFoundationShared';

const fieldClassName = 'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const selectClassName = `${fieldClassName} bg-white dark:bg-slate-950`;

const money = (value) => Number(value || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const parseMoneyInput = (value) => {
  const digits = String(value || '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
};
const formatMoneyInput = (value) => {
  const num = parseMoneyInput(value);
  return num ? num.toLocaleString('es-CL') : '';
};

const agreementTypeLabel = { CREDIT: 'Credito', DISCOUNT: 'Descuento' };

const today = () => new Date().toISOString().slice(0, 10);
const oneMonthFromNow = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

const emptyAgreement = {
  agreement_name: '',
  agreement_type: 'DISCOUNT',
  company_tax_id: '',
  company_name: '',
  valid_from: today(),
  valid_to: oneMonthFromNow(),
  discount_percent: '',
  benefit_amount: '',
  single_purchase: true,
  is_active: true,
};

const emptyBeneficiary = {
  identifier_type: 'RUT',
  beneficiary_identifier: '',
  beneficiary_name: '',
  benefit_amount: '',
  is_active: true,
};

const toAgreementForm = (item) => ({
  agreement_name: item?.agreement_name || '',
  agreement_type: item?.agreement_type || 'DISCOUNT',
  company_tax_id: item?.company_tax_id || '',
  company_name: item?.company_name || '',
  valid_from: item?.valid_from || today(),
  valid_to: item?.valid_to || oneMonthFromNow(),
  discount_percent: item?.discount_percent ?? '',
  benefit_amount: item?.benefit_amount ?? '',
  single_purchase: item?.single_purchase !== false,
  is_active: item?.is_active !== false,
});

const toBeneficiaryForm = (item) => ({
  identifier_type: item?.identifier_type || 'RUT',
  beneficiary_identifier: item?.beneficiary_identifier || '',
  beneficiary_name: item?.beneficiary_name || '',
  benefit_amount: item?.benefit_amount ?? '',
  is_active: item?.is_active !== false,
});

const AgreementLogoCell = ({ src, alt }) => {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Handshake className="h-4 w-4" />
      </div>
    );
  }
  return <img src={src} alt={alt} onError={() => setError(true)} className="h-9 w-9 shrink-0 rounded-md object-contain" />;
};


const BeneficiaryForm = ({ value, onChange, agreement = null, disabled = false }) => {
  const [rutError, setRutError] = useState('');
  const [benefitFocused, setBenefitFocused] = useState(false);
  const update = (field, nextValue) => onChange((current) => ({ ...current, [field]: nextValue }));

  const handleIdentifierTypeChange = (nextType) => {
    setRutError('');
    update('identifier_type', nextType);
  };

  const handleIdentifierChange = (rawValue) => {
    setRutError('');
    update('beneficiary_identifier', rawValue);
  };

  const handleIdentifierBlur = () => {
    if (value.identifier_type !== 'RUT' || !value.beneficiary_identifier) return;
    const formatted = formatRut(value.beneficiary_identifier);
    update('beneficiary_identifier', formatted);
    setRutError(isValidRut(formatted) ? '' : 'Ingresa un RUT valido.');
  };

  const benefitHint = agreement?.agreement_type === 'DISCOUNT'
    ? 'Si se especifica, el descuento de este beneficiario no superará este monto (tope individual). Sin valor, aplica el tope del convenio.'
    : 'Si se especifica, este es el crédito disponible para este beneficiario. Sin valor, aplica el monto del convenio.';

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {value.identifier_type === 'RUT' ? 'RUT beneficiario' : 'Codigo usuario'}
          </span>
          <div className="flex gap-1">
            <select
              className="h-10 shrink-0 rounded-md border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              value={value.identifier_type}
              onChange={(event) => handleIdentifierTypeChange(event.target.value)}
              disabled={disabled}
            >
              <option value="RUT">RUT</option>
              <option value="CODE">Codigo</option>
            </select>
            <input
              className={rutError ? `${fieldClassName} border-red-400 focus:border-red-400 focus:ring-red-100 dark:border-red-600` : fieldClassName}
              value={value.beneficiary_identifier}
              onChange={(event) => handleIdentifierChange(event.target.value)}
              onBlur={handleIdentifierBlur}
              disabled={disabled}
              required
            />
          </div>
          {rutError && <p className="text-xs text-red-600 dark:text-red-400">{rutError}</p>}
        </div>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Nombre beneficiario</span>
          <input className={fieldClassName} value={value.beneficiary_name} onChange={(event) => update('beneficiary_name', event.target.value)} disabled={disabled} required />
        </label>
      </div>
      <div className="space-y-1 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">Monto beneficio individual</span>
        <input
          className={fieldClassName}
          type="text"
          inputMode="numeric"
          value={benefitFocused ? value.benefit_amount : formatMoneyInput(value.benefit_amount)}
          onChange={(event) => update('benefit_amount', event.target.value.replace(/[^\d]/g, ''))}
          onFocus={(event) => { setBenefitFocused(true); requestAnimationFrame(() => event.target.select()); }}
          onBlur={() => setBenefitFocused(false)}
          disabled={disabled}
          placeholder="Sin valor — aplica regla del convenio"
        />
        {agreement && <p className="text-xs text-slate-500 dark:text-slate-400">{benefitHint}</p>}
      </div>
      <div className="grid gap-2">
        <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm dark:border-slate-700">
          <input type="checkbox" checked={value.is_active} onChange={(event) => update('is_active', event.target.checked)} disabled={disabled} />
          Beneficiario activo
        </label>
      </div>
    </div>
  );
};

const AgreementFormModal = ({ agreement = null, onSubmit, onClose }) => {
  const [form, setForm] = useState(() => toAgreementForm(agreement));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [rutError, setRutError] = useState('');
  const [benefitFocused, setBenefitFocused] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [removeImage, setRemoveImage] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const imageInputRef = useRef(null);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const currentLogoUrl = agreement?.logo?.thumb_url || agreement?.logo?.full_url || '';
  const visibleLogo = imagePreview || (!removeImage ? currentLogoUrl : '');
  const hasPendingLogoChange = Boolean(imageFile || removeImage);

  useEffect(() => {
    if (!imageFile) { setImagePreview(''); return undefined; }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const selectImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setRemoveImage(false);
    setImageLoadError(false);
  };

  const clearImage = () => {
    if (imageInputRef.current) imageInputRef.current.value = '';
    setImageFile(null);
    setRemoveImage(Boolean(currentLogoUrl));
    setImageLoadError(false);
  };

  const handleRutChange = (rawValue) => { setRutError(''); update('company_tax_id', rawValue); };
  const handleRutBlur = () => {
    if (!form.company_tax_id) return;
    const formatted = formatRut(form.company_tax_id);
    update('company_tax_id', formatted);
    setRutError(isValidRut(formatted) ? '' : 'Ingresa un RUT valido.');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (form.company_tax_id && !isValidRut(form.company_tax_id)) {
      setFormError('El RUT de la empresa no es valido.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(
        {
          ...form,
          company_tax_id: form.company_tax_id ? normalizeRutForStorage(form.company_tax_id) : form.company_tax_id,
          valid_to: form.valid_to || null,
          discount_percent: form.agreement_type === 'DISCOUNT' ? Number(form.discount_percent || 0) : null,
          benefit_amount: Number(form.benefit_amount || 0),
        },
        { imageFile, removeImage },
      );
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Fila superior: imagen (col 1) + campos identidad (col 2) */}
      <div className="grid gap-5 md:grid-cols-[180px_1fr]">
        <div className="space-y-2">
          <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={selectImage} className="hidden" />
          <div className="relative">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="group relative h-44 w-full overflow-hidden rounded-md border border-dashed border-slate-300 bg-slate-100 text-left outline-none ring-offset-2 transition hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:ring-offset-slate-950 dark:hover:bg-slate-700"
            >
              {visibleLogo ? (
                imageLoadError && !imageFile ? (
                  <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center">
                    <AlertTriangle className="h-7 w-7 text-amber-500" />
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Imagen no disponible</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Reemplazar o remover</span>
                  </div>
                ) : (
                  <img src={visibleLogo} alt="Logo convenio" onError={() => setImageLoadError(true)} onLoad={() => setImageLoadError(false)} className="h-full w-full object-contain p-2" />
                )
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-500">
                  <Handshake className="h-9 w-9" />
                  <span className="text-xs font-medium">Buscar logo</span>
                </div>
              )}
              {visibleLogo && !imageLoadError && (
                <span className="absolute inset-x-0 bottom-0 bg-slate-950/60 py-1 text-center text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">Cambiar</span>
              )}
            </button>
            {(visibleLogo || imageFile) && (
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); clearImage(); }}
                className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 shadow-sm transition hover:bg-red-50 dark:border-red-900 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-950/50"
                aria-label="Remover logo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-center gap-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Nombre convenio</span>
            <input className={fieldClassName} value={form.agreement_name} onChange={(event) => update('agreement_name', event.target.value)} disabled={saving} required />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Tipo convenio</span>
            <select className={selectClassName} value={form.agreement_type} onChange={(event) => update('agreement_type', event.target.value)} disabled={saving}>
              <option value="DISCOUNT">Descuento</option>
              <option value="CREDIT">Credito</option>
            </select>
          </label>
        </div>
      </div>

      {/* Fila inferior: resto de campos */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">RUT empresa / agrupacion</span>
          <input
            className={rutError ? `${fieldClassName} border-red-400 focus:border-red-400 focus:ring-red-100 dark:border-red-600` : fieldClassName}
            value={form.company_tax_id}
            onChange={(event) => handleRutChange(event.target.value)}
            onBlur={handleRutBlur}
            disabled={saving}
            required
          />
          {rutError && <p className="text-xs text-red-600 dark:text-red-400">{rutError}</p>}
        </div>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Nombre empresa / agrupacion</span>
          <input className={fieldClassName} value={form.company_name} onChange={(event) => update('company_name', event.target.value)} disabled={saving} required />
        </label>
        {form.agreement_type === 'DISCOUNT' && (
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">% descuento</span>
            <input className={fieldClassName} type="number" min="0" max="100" step="0.01" value={form.discount_percent} onChange={(event) => update('discount_percent', event.target.value)} disabled={saving} required />
          </label>
        )}
        <label className={`space-y-1 text-sm${form.agreement_type === 'CREDIT' ? ' md:col-span-2' : ''}`}>
          <span className="font-medium text-slate-700 dark:text-slate-200">{form.agreement_type === 'DISCOUNT' ? 'Tope máximo de descuento' : 'Monto crédito'}</span>
          <input
            className={fieldClassName}
            type="text"
            inputMode="numeric"
            value={benefitFocused ? form.benefit_amount : formatMoneyInput(form.benefit_amount)}
            onChange={(event) => update('benefit_amount', event.target.value.replace(/[^\d]/g, ''))}
            onFocus={(event) => { setBenefitFocused(true); requestAnimationFrame(() => event.target.select()); }}
            onBlur={() => setBenefitFocused(false)}
            disabled={saving}
          />
        </label>
        <div className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Vigencia desde</span>
          <DatePicker value={form.valid_from} onChange={(date) => update('valid_from', date)} placeholder="Seleccionar fecha" minDate={today()} />
        </div>
        <div className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Vigencia hasta</span>
          <DatePicker value={form.valid_to || ''} onChange={(date) => update('valid_to', date)} placeholder="Sin fecha de termino" minDate={form.valid_from > today() ? form.valid_from : today()} />
        </div>
        <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm dark:border-slate-700">
          <input type="checkbox" checked={form.single_purchase} onChange={(event) => update('single_purchase', event.target.checked)} disabled={saving} />
          Compra unica por beneficiario
        </label>
        <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm dark:border-slate-700">
          <input type="checkbox" checked={form.is_active} onChange={(event) => update('is_active', event.target.checked)} disabled={saving} />
          Convenio activo
        </label>
      </div>

      {formError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{formError}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="min-h-5">
          {hasPendingLogoChange && <p className="text-xs text-amber-600 dark:text-amber-300">Cambio pendiente de guardar.</p>}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancelar</button>
          <button type="submit" disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{saving ? 'Guardando...' : 'Guardar convenio'}</button>
        </div>
      </div>
    </form>
  );
};

const BeneficiaryFormModal = ({ beneficiary = null, agreement = null, onSubmit, onClose }) => {
  const [form, setForm] = useState(() => toBeneficiaryForm(beneficiary));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const usageCount = Number(beneficiary?.interactions_count || 0);
  const consumedAmount = Number(beneficiary?.consumed_amount || 0);
  const isMultiUse = agreement && !agreement.single_purchase;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (form.identifier_type === 'RUT' && form.beneficiary_identifier && !isValidRut(form.beneficiary_identifier)) {
      setFormError('El RUT del beneficiario no es valido.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        beneficiary_identifier: form.identifier_type === 'RUT' && form.beneficiary_identifier
          ? normalizeRutForStorage(form.beneficiary_identifier)
          : form.beneficiary_identifier,
        benefit_amount: form.benefit_amount === '' ? null : Number(form.benefit_amount || 0),
      });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {usageCount > 0 && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm dark:border-blue-800 dark:bg-blue-950/40">
          <span className="font-medium text-blue-800 dark:text-blue-200">Beneficio utilizado</span>
          {isMultiUse
            ? <span className="ml-1 text-blue-700 dark:text-blue-300">— {usageCount} {usageCount === 1 ? 'vez' : 'veces'}, consumido {money(consumedAmount)}</span>
            : <span className="ml-1 text-blue-700 dark:text-blue-300">— 1 vez, consumido {money(consumedAmount)}</span>}
        </div>
      )}
      <BeneficiaryForm value={form} onChange={setForm} agreement={agreement} disabled={saving} />
      {formError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{formError}</div>}
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancelar</button>
        <button type="submit" disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{saving ? 'Guardando...' : 'Guardar beneficiario'}</button>
      </div>
    </form>
  );
};

const AdminAgreements = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [agreements, setAgreements] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [usage, setUsage] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingBeneficiaries, setLoadingBeneficiaries] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const agreementId = searchParams.get('agreement_id') || '';
  const selectedAgreement = useMemo(
    () => agreements.find((item) => String(item.id) === agreementId) || null,
    [agreements, agreementId],
  );
  const isBeneficiaryView = Boolean(agreementId);

  const loadAgreements = useCallback(async () => {
    setLoading(true);
    try {
      const [nextAgreements, nextUsage] = await Promise.all([
        agreementsService.list(),
        agreementsService.usage(),
      ]);
      setAgreements(nextAgreements);
      setUsage(nextUsage);
    } catch (error) {
      toast.error(getBackendMessage(error, 'No fue posible cargar convenios.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBeneficiaries = useCallback(async (agId) => {
    if (!agId) { setBeneficiaries([]); return; }
    setLoadingBeneficiaries(true);
    try {
      setBeneficiaries(await agreementsService.listBeneficiaries(agId));
    } catch (error) {
      toast.error(getBackendMessage(error, 'No fue posible cargar beneficiarios.'));
    } finally {
      setLoadingBeneficiaries(false);
    }
  }, []);

  useEffect(() => { loadAgreements(); }, [loadAgreements]);
  useEffect(() => { loadBeneficiaries(agreementId); }, [loadBeneficiaries, agreementId]);
  useEffect(() => { setPage(0); setSearch(''); setStatus('all'); }, [isBeneficiaryView]);
  useEffect(() => { setPage(0); }, [search, status, pageSize]);

  const openBeneficiaryView = (agreement) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('agreement_id', String(agreement.id));
    setSearchParams(nextParams);
  };

  const closeBeneficiaryView = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('agreement_id');
    setSearchParams(nextParams);
  };

  const openAgreement = (agreement = null) => {
    ModalManager.show({
      type: 'custom',
      title: agreement ? 'Editar convenio' : 'Nuevo convenio',
      size: 'large',
      showFooter: false,
      contentComponent: AgreementFormModal,
      contentProps: {
        agreement,
        onSubmit: async (payload, mediaChanges) => {
          const savePromise = agreement
            ? agreementsService.update(agreement.id, payload)
            : agreementsService.create(payload);
          notifyPromise(savePromise, {
            loading: 'Guardando convenio...',
            success: 'Convenio guardado.',
            error: (err) => getBackendMessage(err, 'No fue posible guardar el convenio.'),
          });
          const saved = await savePromise;
          const agId = saved?.id || agreement?.id;
          if (agId && mediaChanges?.removeImage) await mediaService.removeAgreementLogo(agId);
          if (agId && mediaChanges?.imageFile) await mediaService.uploadAgreementLogo(agId, mediaChanges.imageFile);
          await loadAgreements();
        },
      },
    });
  };

  const openBeneficiary = (beneficiary = null) => {
    if (!selectedAgreement) return;
    ModalManager.show({
      type: 'custom',
      title: beneficiary ? 'Editar beneficiario' : 'Nuevo beneficiario',
      size: 'medium',
      showFooter: false,
      contentComponent: BeneficiaryFormModal,
      contentProps: {
        beneficiary,
        agreement: selectedAgreement,
        onSubmit: async (payload) => {
          await notifyPromise(
            beneficiary
              ? agreementsService.updateBeneficiary(selectedAgreement.id, beneficiary.id, payload)
              : agreementsService.createBeneficiary(selectedAgreement.id, payload),
            { loading: 'Guardando beneficiario...', success: 'Beneficiario guardado.', error: (err) => getBackendMessage(err, 'No fue posible guardar el beneficiario.') },
          );
          await loadBeneficiaries(agreementId);
        },
      },
    });
  };

  const removeAgreement = async (agreement) => {
    if (!await ModalManager.confirm({ title: 'Eliminar convenio', message: `Confirma eliminar ${agreement.agreement_name}.`, buttons: { cancel: 'Cancelar', confirm: 'Eliminar' } })) return;
    await notifyPromise(
      agreementsService.remove(agreement.id),
      { loading: 'Eliminando...', success: 'Convenio eliminado.', error: (err) => getBackendMessage(err, 'No fue posible eliminar el convenio.') },
    );
    if (agreementId === String(agreement.id)) closeBeneficiaryView();
    await loadAgreements();
  };

  const removeBeneficiary = async (beneficiary) => {
    if (!selectedAgreement) return;
    if (!await ModalManager.confirm({ title: 'Eliminar beneficiario', message: `Confirma eliminar ${beneficiary.beneficiary_name}.`, buttons: { cancel: 'Cancelar', confirm: 'Eliminar' } })) return;
    await notifyPromise(
      agreementsService.removeBeneficiary(selectedAgreement.id, beneficiary.id),
      { loading: 'Eliminando...', success: 'Beneficiario eliminado.', error: (err) => getBackendMessage(err, 'No fue posible eliminar el beneficiario.') },
    );
    await loadBeneficiaries(agreementId);
  };

  const toggleAgreementStatus = async (agreement) => {
    const nextActive = !agreement.is_active;
    if (!await ModalManager.confirm({
      title: nextActive ? 'Activar convenio' : 'Desactivar convenio',
      message: `Confirma ${nextActive ? 'activar' : 'desactivar'} el convenio "${agreement.agreement_name}".`,
      buttons: { cancel: 'Cancelar', confirm: nextActive ? 'Activar' : 'Desactivar' },
    })) return;
    await notifyPromise(
      agreementsService.update(agreement.id, {
        agreement_name: agreement.agreement_name,
        agreement_type: agreement.agreement_type,
        company_tax_id: agreement.company_tax_id,
        company_name: agreement.company_name,
        valid_from: agreement.valid_from,
        valid_to: agreement.valid_to || null,
        discount_percent: agreement.discount_percent ?? null,
        benefit_amount: Number(agreement.benefit_amount || 0),
        single_purchase: agreement.single_purchase,
        is_active: nextActive,
      }),
      { loading: 'Actualizando...', success: `Convenio ${nextActive ? 'activado' : 'desactivado'}.`, error: (err) => getBackendMessage(err, 'No fue posible actualizar el convenio.') },
    );
    await loadAgreements();
  };

  const toggleBeneficiaryStatus = async (beneficiary) => {
    if (!selectedAgreement) return;
    const nextActive = !beneficiary.is_active;
    if (!await ModalManager.confirm({
      title: nextActive ? 'Activar beneficiario' : 'Desactivar beneficiario',
      message: `Confirma ${nextActive ? 'activar' : 'desactivar'} a "${beneficiary.beneficiary_name}".`,
      buttons: { cancel: 'Cancelar', confirm: nextActive ? 'Activar' : 'Desactivar' },
    })) return;
    await notifyPromise(
      agreementsService.updateBeneficiary(selectedAgreement.id, beneficiary.id, {
        identifier_type: beneficiary.identifier_type,
        beneficiary_identifier: beneficiary.beneficiary_identifier,
        beneficiary_name: beneficiary.beneficiary_name,
        benefit_amount: beneficiary.benefit_amount ?? null,
        is_active: nextActive,
      }),
      { loading: 'Actualizando...', success: `Beneficiario ${nextActive ? 'activado' : 'desactivado'}.`, error: (err) => getBackendMessage(err, 'No fue posible actualizar el beneficiario.') },
    );
    await loadBeneficiaries(agreementId);
  };

  const filteredAgreements = useMemo(
    () => agreements.filter((item) => activeFilter(status)(item) && includesTerm(item, ['agreement_name', 'company_name', 'company_tax_id'], search.trim().toLowerCase())),
    [agreements, status, search],
  );
  const filteredBeneficiaries = useMemo(
    () => beneficiaries.filter((item) => activeFilter(status)(item) && includesTerm(item, ['beneficiary_identifier', 'beneficiary_name'], search.trim().toLowerCase())),
    [beneficiaries, status, search],
  );

  const activeData = isBeneficiaryView ? filteredBeneficiaries : filteredAgreements;
  const visibleData = activeData.slice(page * pageSize, page * pageSize + pageSize);
  const isLoading = isBeneficiaryView ? loadingBeneficiaries : loading;

  const kpiItems = isBeneficiaryView ? [
    { label: 'Beneficiarios', value: beneficiaries.length },
    { label: 'Activos', value: beneficiaries.filter((b) => b.is_active).length },
    { label: 'Monto consumido', value: money(beneficiaries.reduce((sum, b) => sum + Number(b.consumed_amount || 0), 0)) },
  ] : [
    { label: 'Convenios', value: agreements.length },
    { label: 'Activos', value: agreements.filter((a) => a.is_active).length },
    { label: 'Descuentos', value: agreements.filter((a) => a.agreement_type === 'DISCOUNT').length },
    { label: 'Creditos', value: agreements.filter((a) => a.agreement_type === 'CREDIT').length },
  ];

  const title = isBeneficiaryView
    ? `Beneficiarios${selectedAgreement ? ` - ${selectedAgreement.agreement_name}` : ''}`
    : 'Convenios';
  const description = isBeneficiaryView
    ? 'Beneficiarios habilitados para usar el convenio.'
    : 'Convenios comerciales y control de beneficiarios.';

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title={title}
        description={description}
        actions={[
          isBeneficiaryView && { id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: closeBeneficiaryView },
          {
            id: 'primary',
            label: isBeneficiaryView ? 'Nuevo beneficiario' : 'Nuevo convenio',
            icon: Plus,
            onClick: isBeneficiaryView ? () => openBeneficiary() : () => openAgreement(),
          },
        ]}
      />

      <KpiBar items={kpiItems} className="mb-4" />

      <FilterBar
        className="mb-4"
        gridClassName="lg:grid-cols-[minmax(280px,1fr)_180px_auto_auto]"
        searchValue={search}
        searchPlaceholder={isBeneficiaryView ? 'Buscar beneficiario' : 'Buscar convenio o empresa'}
        onSearchChange={setSearch}
        fields={[{ id: 'status', value: status, onChange: setStatus, options: fieldOptions.status }]}
        actions={filterActions({
          loading: isLoading,
          onRefresh: isBeneficiaryView ? () => loadBeneficiaries(agreementId) : loadAgreements,
          onClear: () => { setSearch(''); setStatus('all'); },
        })}
      />

      {isBeneficiaryView ? (
        <DataTable
          loading={loadingBeneficiaries}
          data={visibleData}
          emptyMessage="Sin beneficiarios registrados."
          footer={tableFooter({ page, pageSize, total: activeData.length, loading: loadingBeneficiaries, setPage, setPageSize })}
          columns={[
            { id: 'beneficiary_identifier', label: 'Codigo / RUT', sortable: true },
            { id: 'beneficiary_name', label: 'Nombre', sortable: true },
            { id: 'benefit_amount', label: 'Beneficio', align: 'right', sortable: true, render: (item) => (item.benefit_amount == null ? <span className="text-slate-400">Convenio</span> : money(item.benefit_amount)) },
            { id: 'consumed_amount', label: 'Consumido', align: 'right', sortable: true, render: (item) => money(item.consumed_amount) },
            { id: 'interactions_count', label: 'Usos', align: 'right', sortable: true, render: (item) => {
              const n = Number(item.interactions_count || 0);
              if (!n) return <span className="text-slate-400">—</span>;
              return <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">{n} {n === 1 ? 'vez' : 'veces'}</span>;
            } },
            { id: 'status', label: 'Estado', render: (item) => statusCell(item.is_active) },
            { id: 'actions', label: 'Acciones', align: 'center', render: (item) => <div className="flex justify-center gap-2"><RowActionButton label="Editar" icon={Pencil} onClick={() => openBeneficiary(item)} /><RowActionButton label={item.is_active ? 'Desactivar' : 'Activar'} icon={item.is_active ? ToggleRight : ToggleLeft} variant={item.is_active ? 'neutral' : 'neutral'} onClick={() => toggleBeneficiaryStatus(item)} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => removeBeneficiary(item)} /></div> },
          ]}
        />
      ) : (
        <DataTable
          loading={loading}
          data={visibleData}
          emptyMessage="Sin convenios registrados."
          footer={tableFooter({ page, pageSize, total: activeData.length, loading, setPage, setPageSize })}
          columns={[
            { id: 'company_name', label: 'Empresa', sortable: true, render: (item) => (
              <div className="flex items-center gap-3">
                <AgreementLogoCell src={item.logo?.thumb_url} alt={item.company_name} />
                <div className="grid grid-cols-[4rem_1fr] gap-x-1 text-sm uppercase leading-snug">
                  <span className="text-slate-400 dark:text-slate-500">rut:</span><span>{formatRut(item.company_tax_id)}</span>
                  <span className="text-slate-400 dark:text-slate-500">nombre:</span><span>{item.company_name}</span>
                </div>
              </div>
            ) },
            { id: 'agreement_name', label: 'Convenio', sortable: true, render: (item) => <span className="font-medium">{item.agreement_name}</span> },
            { id: 'agreement_type', label: 'Tipo', sortable: true, render: (item) => (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${item.agreement_type === 'DISCOUNT' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300'}`}>
                {agreementTypeLabel[item.agreement_type] || item.agreement_type}
              </span>
            ) },
            { id: 'single_purchase', label: 'Compra única', align: 'center', sortable: true, render: (item) => (
              item.single_purchase
                ? <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">Única</span>
                : <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">Múltiple</span>
            ) },
            { id: 'benefit', label: 'Beneficio', render: (item) => item.agreement_type === 'DISCOUNT'
              ? <span className="tabular-nums">{item.discount_percent != null ? `${Number(item.discount_percent).toLocaleString('es-CL')}%` : '—'}{item.benefit_amount > 0 ? <span className="ml-1 text-xs text-slate-400">(tope {money(item.benefit_amount)})</span> : null}</span>
              : <span className="tabular-nums">{money(item.benefit_amount)}</span> },
            { id: 'validity', label: 'Vigencia', render: (item) => [item.valid_from, item.valid_to].filter(Boolean).join(' – ') || item.valid_from || '-' },
            { id: 'status', label: 'Estado', render: (item) => statusCell(item.is_active) },
            { id: 'actions', label: 'Acciones', align: 'center', render: (item) => <div className="flex justify-center gap-2"><RowActionButton label="Editar" icon={Pencil} onClick={() => openAgreement(item)} /><RowActionButton label="Beneficiarios" icon={Users} onClick={() => openBeneficiaryView(item)} /><RowActionButton label={item.is_active ? 'Desactivar' : 'Activar'} icon={item.is_active ? ToggleRight : ToggleLeft} variant="neutral" onClick={() => toggleAgreementStatus(item)} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => removeAgreement(item)} /></div> },
          ]}
        />
      )}
    </section>
  );
};

export default AdminAgreements;
