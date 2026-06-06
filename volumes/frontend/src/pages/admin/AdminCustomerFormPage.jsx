/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Camera, UserRound } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import SimpleFormContent from '@/components/common/forms/SimpleFormContent';
import RecordNotFoundState from '@/components/common/states/RecordNotFoundState';
import { businessFoundationService } from '@/services/admin/businessFoundationService';
import { adminMaintainersService } from '@/services/admin/adminMaintainersService';
import { profileService } from '@/services/profile/profileService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { customerMaintainerConfig } from './foundationMaintainerConfigs';

const mapStatusOption = (row) => ({
  value: String(row.id),
  label: row.status_display_es || row.status_code || String(row.id),
  code: row.status_code,
});

const mapCurrencyOption = (row) => ({
  value: String(row.currency_code),
  label: `${row.currency_code} - ${row.currency_symbol || ''} - ${row.currency_name || ''}`.replace(/\s+-\s+$/, ''),
});

const mapAuthorizedContactOption = (row) => ({
  value: row.authorized_name,
  label: [row.authorized_name, row.position].filter(Boolean).join(' - '),
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
    help: field.help || (contactWithoutOptions ? 'Disponible cuando el cliente tenga personas autorizadas.' : undefined),
    checkLabel: field.checkLabel,
    clearable: field.clearable,
    rows: field.rows,
    mono: field.mono,
    span: field.span,
    icon: field.icon,
    leadingIcon: field.leadingIcon,
    columns: field.columns,
    description: field.description,
    hideLabel: field.hideLabel,
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
  const mappedFields = customerMaintainerConfig.fields.map((field) => defaultFieldClass(field, optionData));
  const logoField = optionData.customerLogoField;
  const logoSection = logoField ? [
    { id: 'visual_identity_section', type: 'section', label: 'Identidad visual', icon: UserRound, columns: 2, description: 'Logo o avatar visible para identificar al cliente en el sistema.' },
    logoField,
  ] : [];

  const insertLogoSection = (fields) => {
    const contactIndex = fields.findIndex((field) => field.id === 'contact_section');
    if (contactIndex === -1) return [...fields, ...logoSection];
    return [...fields.slice(0, contactIndex), ...logoSection, ...fields.slice(contactIndex)];
  };

  return insertLogoSection(mappedFields);
};

const buildPayload = (form) => {
  const payload = {};
  customerMaintainerConfig.fields.forEach((field) => {
    if (field.type === 'section' || field.type === 'custom') return;
    const rawValue = form[field.id];
    if (field.type === 'number' || field.type === 'amount') payload[field.id] = rawValue === '' || rawValue === undefined ? null : Number(String(rawValue).replace(/[^\d.-]/g, ''));
    else if (field.type === 'checkbox') payload[field.id] = Boolean(rawValue);
    else payload[field.id] = rawValue === '' ? null : rawValue;
  });
  return payload;
};

const AdminCustomerFormPage = ({ mode = 'create' }) => {
  const navigate = useNavigate();
  const { customerCode } = useParams();
  const isEdit = mode === 'edit';
  const [customer, setCustomer] = useState(null);
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
        const [customers, authorizedUsers, statuses, currencies, companies] = await Promise.all([
          isEdit ? adminMaintainersService.list(customerMaintainerConfig.resource) : Promise.resolve([]),
          isEdit ? adminMaintainersService.list('customer-authorized-users') : Promise.resolve([]),
          adminMaintainersService.list(customerMaintainerConfig.statusOptionsResource),
          adminMaintainersService.list('currencies'),
          businessFoundationService.companies.list().catch(() => []),
        ]);
        if (!mounted) return;

        const mappedStatuses = statuses.filter((row) => row.is_active !== false).map(mapStatusOption);
        const mappedCurrencies = currencies.filter((row) => row.is_active !== false).map(mapCurrencyOption);
        setActiveCompany(companies.find((company) => company.is_active) || null);

        if (isEdit) {
          const normalizedCode = decodeURIComponent(customerCode || '').trim();
          const target = customers.find((row) => String(row.customer_code) === normalizedCode);
          if (!target) {
            setError('No existen datos para el codigo buscado.');
            return;
          }
          const customerAuthorizedUsers = authorizedUsers
            .filter((row) => String(row.customer_id) === String(target.id) && row.is_active !== false);
          const authorizedContactOptions = customerAuthorizedUsers.map(mapAuthorizedContactOption);
          const hasStoredContact = authorizedContactOptions.some((option) => String(option.value) === String(target.contact_person || ''));
          const primaryContact = customerAuthorizedUsers.find((row) => row.is_primary_contact === true || Number(row.is_primary_contact) === 1);
          setOptionData({
            [customerMaintainerConfig.statusOptionsResource]: mappedStatuses,
            currencies: mappedCurrencies,
            'customer-authorized-contact-options': authorizedContactOptions,
          });
          setCustomer({
            ...target,
            contact_person: hasStoredContact ? target.contact_person : primaryContact?.authorized_name || '',
          });
        } else {
          setOptionData({
            [customerMaintainerConfig.statusOptionsResource]: mappedStatuses,
            currencies: mappedCurrencies,
            'customer-authorized-contact-options': [],
          });
          setCustomer(null);
        }
      } catch (requestError) {
        if (mounted) setError(getBackendMessage(requestError, 'No fue posible cargar el formulario de cliente.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [customerCode, isEdit]);

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
      if (!customer) return null;
      const contactOptions = optionData['customer-authorized-contact-options'] || [];
      const hasAuthorizedContact = contactOptions.some((option) => String(option.value) === String(customer.contact_person || ''));
      return {
        ...customer,
        contact_person: hasAuthorizedContact ? customer.contact_person : '',
      };
    }
    const activeStatus = optionData[customerMaintainerConfig.statusOptionsResource]?.find((option) => option.code === customerMaintainerConfig.activeValue);
    return {
      ...customerMaintainerConfig.empty,
      status_id: activeStatus?.value || customerMaintainerConfig.empty.status_id,
      default_currency_code: activeCompany?.default_customer_currency_code || customerMaintainerConfig.empty.default_currency_code || 'CLP',
    };
  }, [activeCompany?.default_customer_currency_code, customer, isEdit, optionData]);

  const selectLogo = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPendingLogoFile(file);
  };

  const selectBanner = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPendingBannerFile(file);
  };

  const logoField = useMemo(() => ({
    id: 'customer_media',
    label: 'Logo/avatar y banner',
    type: 'custom',
    span: 2,
    render: ({ form }) => (
      <div className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
          <div className="h-48 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
            {pendingLogoPreview || customer?.logo?.thumb_url ? (
              <img
                src={pendingLogoPreview || customer?.logo?.thumb_url}
                alt={form.commercial_name || form.legal_name || 'Cliente'}
                className="h-full w-full object-contain p-3"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-500">
                <UserRound className="h-12 w-12" />
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
            {pendingBannerPreview || customer?.banner?.thumb_url ? (
              <img src={pendingBannerPreview || customer?.banner?.thumb_url} alt="Banner de cliente" className="h-full w-full object-contain p-3" />
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
  }), [customer?.banner?.thumb_url, customer?.logo?.thumb_url, pendingBannerPreview, pendingLogoPreview]);

  const fields = useMemo(() => buildFields(isEdit ? customer : null, { ...optionData, customerLogoField: logoField }), [customer, isEdit, logoField, optionData]);
  const backToList = () => navigate('/customers');

  const save = async (form) => {
    const payload = buildPayload(form);
    await notifyPromise((async () => {
      const savedCustomer = isEdit
        ? await adminMaintainersService.update(customerMaintainerConfig.resource, customer.id, payload)
        : await adminMaintainersService.create(customerMaintainerConfig.resource, payload);

      if (pendingLogoFile) {
        await profileService.uploadCustomerMedia(savedCustomer.id || customer?.id, 'logo', pendingLogoFile);
      }
      if (pendingBannerFile) {
        await profileService.uploadCustomerMedia(savedCustomer.id || customer?.id, 'banner', pendingBannerFile);
      }

      return savedCustomer;
    })(), {
      loading: 'Guardando cliente...',
      success: 'Cliente guardado.',
      error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar el cliente.'),
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

  if (!initialValues && !error) {
    return null;
  }

  if (error) {
    return (
      <RecordNotFoundState
        title="Cliente no encontrado"
        description={error}
        actionLabel="Volver a clientes"
        onAction={backToList}
        logos={[
          { src: '/assets/logo.png', alt: 'Logo del sistema' },
          { src: activeCompany?.logo?.thumb_url, alt: 'Logo de empresa activa' },
        ]}
      />
    );
  }

  return (
    <section className="space-y-5 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
            <UserRound className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{isEdit ? 'Editar cliente' : 'Nuevo cliente'}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {isEdit ? 'Actualiza la informacion del cliente y guarda los cambios.' : 'Completa la informacion base para crear el cliente.'}
            </p>
          </div>
        </div>
        <button type="button" onClick={backToList} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
      </div>

      {!error && (
        <div className="w-full">
          <SimpleFormContent
            fields={fields}
            initialValues={initialValues}
            onSubmit={save}
            onClose={backToList}
            submitLabel={isEdit ? 'Guardar cambios' : 'Crear cliente'}
            actionBarClassName="rounded-md shadow-sm"
          />
        </div>
      )}
    </section>
  );
};

export default AdminCustomerFormPage;
