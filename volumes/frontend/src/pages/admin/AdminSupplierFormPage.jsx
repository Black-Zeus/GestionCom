/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Camera, Truck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import SimpleFormContent from '@/components/common/forms/SimpleFormContent';
import RecordNotFoundState from '@/components/common/states/RecordNotFoundState';
import { businessFoundationService } from '@/services/admin/businessFoundationService';
import { adminMaintainersService } from '@/services/admin/adminMaintainersService';
import { mediaService } from '@/services/media/mediaService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { supplierMaintainerConfig } from './foundationMaintainerConfigs';

const optionLabel = (row) => {
  if (row.currency_code) return `${row.currency_code} ${row.currency_symbol || ''}`.trim();
  if (row.status_display_es) return row.status_display_es;
  if (row.legal_name) return `${row.supplier_code ? `${row.supplier_code} - ` : ''}${row.legal_name}`;
  return row.name || row.label || String(row.id);
};

const mapSupplierContactOption = (row) => ({
  value: row.contact_name,
  label: [row.contact_name, row.position].filter(Boolean).join(' - '),
});

const defaultFieldClass = (field, optionData = {}) => {
  const options = field.optionsResource ? optionData[field.optionsResource] || [] : field.options || [];
  const contactWithoutOptions = field.id === 'contact_person' && options.length === 0;
  return {
    id: field.id,
    label: field.label,
    type: field.type,
    required: field.required,
    options,
    min: field.min,
    wide: field.wide,
    placeholder: field.placeholder,
    searchPlaceholder: field.searchPlaceholder,
    help: field.help || (contactWithoutOptions ? 'Disponible cuando el proveedor tenga contactos registrados.' : undefined),
    checkLabel: field.checkLabel,
    clearable: field.clearable,
    rows: field.rows,
    mono: field.mono,
    span: field.span,
    icon: field.icon,
    leadingIcon: field.leadingIcon,
    columns: field.columns,
    description: field.description,
    readOnly: field.readOnly,
    disabled: field.disabled || contactWithoutOptions,
    validation: field.validation,
    render: field.render,
    localOptions: field.localOptions,
    showIcons: field.showIcons,
    showOptionDescription: field.showOptionDescription,
  };
};

const buildFields = (item, optionData) => {
  const mappedFields = supplierMaintainerConfig.fields.map((field) => defaultFieldClass(field, optionData));
  const mediaField = optionData.supplierMediaField;
  const mediaSection = mediaField ? [
    { id: 'visual_identity_section', type: 'section', label: 'Identidad visual', icon: Truck, columns: 2, description: 'Logo o avatar y banner visibles para identificar al proveedor.' },
    mediaField,
  ] : [];

  const insertMediaSection = (fields) => {
    const contactIndex = fields.findIndex((field) => field.id === 'contact_section');
    if (contactIndex === -1) return [...fields, ...mediaSection];
    return [...fields.slice(0, contactIndex), ...mediaSection, ...fields.slice(contactIndex)];
  };

  return insertMediaSection(mappedFields);
};

const buildPayload = (form) => {
  const payload = {};
  supplierMaintainerConfig.fields.forEach((field) => {
    if (field.type === 'section' || field.type === 'custom') return;
    const rawValue = form[field.id];
    if (field.type === 'number' || field.type === 'amount') payload[field.id] = rawValue === '' || rawValue === undefined ? null : Number(String(rawValue).replace(/[^\d.-]/g, ''));
    else if (field.type === 'checkbox') payload[field.id] = Boolean(rawValue);
    else payload[field.id] = rawValue === '' ? null : rawValue;
  });
  return payload;
};

const AdminSupplierFormPage = ({ mode = 'create' }) => {
  const navigate = useNavigate();
  const { supplierCode } = useParams();
  const isEdit = mode === 'edit';
  const [supplier, setSupplier] = useState(null);
  const [optionData, setOptionData] = useState({});
  const [pendingLogoFile, setPendingLogoFile] = useState(null);
  const [pendingLogoPreview, setPendingLogoPreview] = useState('');
  const [pendingBannerFile, setPendingBannerFile] = useState(null);
  const [pendingBannerPreview, setPendingBannerPreview] = useState('');
  const [activeCompany, setActiveCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const optionResources = [...new Set(supplierMaintainerConfig.fields.map((field) => (field.localOptions ? null : field.optionsResource)).filter(Boolean))];
        const [suppliers, supplierContacts, companies, ...optionEntries] = await Promise.all([
          isEdit ? adminMaintainersService.list(supplierMaintainerConfig.resource) : Promise.resolve([]),
          isEdit ? adminMaintainersService.list('supplier-contacts') : Promise.resolve([]),
          businessFoundationService.companies.list().catch(() => []),
          ...optionResources.map(async (resource) => [resource, await adminMaintainersService.list(resource)]),
        ]);
        if (!mounted) return;

        const baseOptionData = Object.fromEntries(optionEntries.map(([resource, rows]) => [
          resource,
          rows.filter((row) => row.is_active !== false).map((row) => ({
            value: String(row.currency_code || row.id),
            label: optionLabel(row),
            code: row.status_code,
          })),
        ]));
        setActiveCompany(companies.find((company) => company.is_active) || null);

        if (isEdit) {
          const normalizedCode = decodeURIComponent(supplierCode || '').trim();
          const target = suppliers.find((row) => String(row.supplier_code) === normalizedCode);
          if (!target) {
            setError('No existen datos para el codigo buscado.');
            return;
          }
          const targetContacts = supplierContacts
            .filter((row) => String(row.supplier_id) === String(target.id) && row.is_active !== false);
          const contactOptions = targetContacts.map(mapSupplierContactOption);
          const hasStoredContact = contactOptions.some((option) => String(option.value) === String(target.contact_person || ''));
          const primaryContact = targetContacts.find((row) => row.is_primary === true || Number(row.is_primary) === 1);
          setOptionData({
            ...baseOptionData,
            'supplier-contact-options': contactOptions,
          });
          setSupplier({
            ...target,
            contact_person: hasStoredContact ? target.contact_person : primaryContact?.contact_name || '',
          });
        } else {
          setOptionData({
            ...baseOptionData,
            'supplier-contact-options': [],
          });
          setSupplier(null);
        }
      } catch (requestError) {
        if (mounted) setError(getBackendMessage(requestError, 'No fue posible cargar el formulario de proveedor.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [isEdit, supplierCode]);

  useEffect(() => {
    if (!pendingLogoFile) {
      setPendingLogoPreview('');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(pendingLogoFile);
    setPendingLogoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [pendingLogoFile]);

  useEffect(() => {
    if (!pendingBannerFile) {
      setPendingBannerPreview('');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(pendingBannerFile);
    setPendingBannerPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [pendingBannerFile]);

  const initialValues = useMemo(() => {
    if (isEdit) {
      if (!supplier) return null;
      const contactOptions = optionData['supplier-contact-options'] || [];
      const hasContact = contactOptions.some((option) => String(option.value) === String(supplier.contact_person || ''));
      return {
        ...supplier,
        contact_person: hasContact ? supplier.contact_person : '',
      };
    }
    const activeStatus = optionData[supplierMaintainerConfig.statusOptionsResource]?.find((option) => option.code === supplierMaintainerConfig.activeValue);
    return {
      ...supplierMaintainerConfig.empty,
      default_currency_code: activeCompany?.default_supplier_currency_code || supplierMaintainerConfig.empty.default_currency_code || 'CLP',
      status_id: activeStatus?.value || supplierMaintainerConfig.empty.status_id,
    };
  }, [activeCompany?.default_supplier_currency_code, isEdit, optionData, supplier]);
  const backToList = () => navigate('/suppliers');

  const selectLogo = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) setPendingLogoFile(file);
  };

  const selectBanner = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) setPendingBannerFile(file);
  };

  const mediaField = useMemo(() => ({
    id: 'supplier_media',
    label: 'Logo/avatar y banner',
    type: 'custom',
    span: 2,
    render: ({ form }) => (
      <div className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
            <div className="h-48 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
              {pendingLogoPreview || supplier?.logo?.thumb_url ? (
                <img src={pendingLogoPreview || supplier?.logo?.thumb_url} alt={form.commercial_name || form.legal_name || 'Proveedor'} className="h-full w-full object-contain p-3" />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-500">
                  <Truck className="h-12 w-12" />
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-col items-center gap-2 text-center">
              <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
                <Camera className="h-4 w-4" />
                Seleccionar logo
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={selectLogo} />
              </label>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
            <div className="h-48 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
              {pendingBannerPreview || supplier?.banner?.thumb_url ? (
                <img src={pendingBannerPreview || supplier?.banner?.thumb_url} alt="Banner de proveedor" className="h-full w-full object-contain p-3" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs font-medium text-slate-500">Sin banner</div>
              )}
            </div>
            <div className="mt-3 flex flex-col items-center gap-2 text-center">
              <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
                <Camera className="h-4 w-4" />
                Seleccionar banner
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={selectBanner} />
              </label>
            </div>
          </div>
        </div>
        <p className="text-xs leading-5 text-slate-500">
          Adjuntos permitidos: JPG, PNG o WebP, maximo 5 MB por archivo. Logo/avatar genera full 1024x1024 y thumb 128x128; banner genera full 1600x500 y thumb 320x100.
        </p>
      </div>
    ),
  }), [pendingBannerPreview, pendingLogoPreview, supplier?.banner?.thumb_url, supplier?.logo?.thumb_url]);

  const fields = useMemo(() => buildFields(isEdit ? supplier : null, { ...optionData, supplierMediaField: mediaField }), [isEdit, mediaField, optionData, supplier]);

  const save = async (form) => {
    const payload = buildPayload(form);
    await notifyPromise((async () => {
      const savedSupplier = isEdit
        ? await adminMaintainersService.update(supplierMaintainerConfig.resource, supplier.id, payload)
        : await adminMaintainersService.create(supplierMaintainerConfig.resource, payload);

      if (pendingLogoFile) await mediaService.uploadSupplierMedia(savedSupplier.id || supplier?.id, 'logo', pendingLogoFile);
      if (pendingBannerFile) await mediaService.uploadSupplierMedia(savedSupplier.id || supplier?.id, 'banner', pendingBannerFile);

      return savedSupplier;
    })(), {
      loading: 'Guardando proveedor...',
      success: 'Proveedor guardado.',
      error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar el proveedor.'),
    });
    setPendingLogoFile(null);
    setPendingBannerFile(null);
    backToList();
  };

  if (loading && !error) {
    return (
      <section className="space-y-4">
        <div className="h-24 animate-pulse rounded-md bg-slate-100 dark:bg-slate-900" />
        <div className="h-96 animate-pulse rounded-md bg-slate-100 dark:bg-slate-900" />
      </section>
    );
  }

  if (error) {
    const logos = [
      { src: '/assets/logo.png', alt: 'GestionCom' },
      activeCompany?.logo?.thumb_url ? { src: activeCompany.logo.thumb_url, alt: activeCompany.company_name } : null,
    ].filter(Boolean);

    return <RecordNotFoundState title="Proveedor no encontrado" description={error} actionLabel="Volver a proveedores" onAction={backToList} logos={logos} />;
  }

  if (!initialValues) return null;

  return (
    <section className="space-y-5 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
            <Truck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {isEdit ? 'Actualiza los datos comerciales y visuales del proveedor.' : 'Completa los datos base para crear el proveedor.'}
            </p>
          </div>
        </div>
        <button type="button" onClick={backToList} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
      </div>

      <div className="w-full">
        <SimpleFormContent
          fields={fields}
          initialValues={initialValues}
          onSubmit={save}
          onClose={backToList}
          submitLabel={isEdit ? 'Guardar cambios' : 'Crear proveedor'}
          actionBarClassName="rounded-md shadow-sm"
        />
      </div>
    </section>
  );
};

export default AdminSupplierFormPage;
