/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, Camera, FileText, Landmark, MapPin } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import SimpleFormContent from '@/components/common/forms/SimpleFormContent';
import RecordNotFoundState from '@/components/common/states/RecordNotFoundState';
import { businessFoundationService } from '@/services/admin/businessFoundationService';
import { profileService } from '@/services/profile/profileService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';

const environmentOptions = [
  { value: 'CERTIFICACION', label: 'Certificacion' },
  { value: 'PRODUCCION', label: 'Produccion' },
];

const emptyCompany = {
  company_rut: '',
  company_name: '',
  company_business_name: '',
  company_address: '',
  company_comuna: '',
  company_city: '',
  company_region: '',
  economic_activity_code: '',
  economic_activity_name: '',
  dte_environment: 'CERTIFICACION',
  sii_user: '',
  is_active: false,
};

const buildPayload = (form) => ({
  company_rut: form.company_rut || null,
  company_name: form.company_name || null,
  company_business_name: form.company_business_name || null,
  company_address: form.company_address || null,
  company_comuna: form.company_comuna || null,
  company_city: form.company_city || null,
  company_region: form.company_region || null,
  economic_activity_code: form.economic_activity_code || null,
  economic_activity_name: form.economic_activity_name || null,
  dte_environment: form.dte_environment || 'CERTIFICACION',
  sii_user: form.sii_user || null,
  is_active: Boolean(form.is_active),
});

const AdminCompanyFormPage = ({ mode = 'create' }) => {
  const navigate = useNavigate();
  const { companyRut } = useParams();
  const isEdit = mode === 'edit';
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingLogoFile, setPendingLogoFile] = useState(null);
  const [pendingLogoPreview, setPendingLogoPreview] = useState('');
  const [pendingBannerFile, setPendingBannerFile] = useState(null);
  const [pendingBannerPreview, setPendingBannerPreview] = useState('');
  const [activeCompany, setActiveCompany] = useState(null);

  const backToList = () => navigate('/config/company');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const companies = await businessFoundationService.companies.list();
        if (!mounted) return;
        setActiveCompany(companies.find((row) => row.is_active) || null);
        if (isEdit) {
          const normalizedRut = decodeURIComponent(companyRut || '').trim();
          const target = companies.find((row) => String(row.company_rut) === normalizedRut);
          if (!target) {
            setError('No existen datos para el codigo buscado.');
            return;
          }
          setCompany(target);
          return;
        }
        setCompany(null);
      } catch (requestError) {
        if (mounted) setError(getBackendMessage(requestError, 'No fue posible cargar la empresa.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [companyRut, isEdit]);

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

  const initialValues = useMemo(() => (isEdit ? company : { ...emptyCompany, is_active: !activeCompany }), [activeCompany, company, isEdit]);

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
    id: 'company_media',
    label: 'Logo y banner',
    type: 'custom',
    span: 2,
    render: ({ form }) => (
      <div className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
            <div className="h-48 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
              {pendingLogoPreview || company?.logo?.thumb_url ? (
                <img src={pendingLogoPreview || company?.logo?.thumb_url} alt={form.company_name || 'Logo empresa'} className="h-full w-full object-contain p-3" />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-500"><Building2 className="h-12 w-12" /></div>
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
              {pendingBannerPreview || company?.banner?.thumb_url ? (
                <img src={pendingBannerPreview || company?.banner?.thumb_url} alt="Banner empresa" className="h-full w-full object-contain p-3" />
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
          Adjuntos permitidos: JPG, PNG o WebP, maximo 5 MB por archivo. Logo genera full 1024x1024 y thumb 128x128; banner genera full 1600x500 y thumb 320x100.
        </p>
      </div>
    ),
  }), [company?.banner?.thumb_url, company?.logo?.thumb_url, pendingBannerPreview, pendingLogoPreview]);

  const fields = useMemo(() => [
    { id: 'legal_section', type: 'section', label: 'Datos generales', icon: Building2, columns: 3, description: 'Identificacion legal y nombre visible de la empresa.' },
    { id: 'company_rut', label: 'RUT', required: true, disabled: isEdit, readOnly: isEdit, mono: true },
    { id: 'company_name', label: 'Nombre fantasia', required: true },
    { id: 'company_business_name', label: 'Razon social', required: true },
    { id: 'media_section', type: 'section', label: 'Identidad visual', icon: Building2, columns: 2, description: 'Logo y banner visibles para la empresa.' },
    mediaField,
    { id: 'address_section', type: 'section', label: 'Ubicacion', icon: MapPin, columns: 3, description: 'Direccion tributaria y ciudad base.' },
    { id: 'company_address', label: 'Direccion', required: true, span: 'full' },
    { id: 'company_comuna', label: 'Comuna', required: true },
    { id: 'company_city', label: 'Ciudad', required: true },
    { id: 'company_region', label: 'Region', required: true },
    { id: 'tax_section', type: 'section', label: 'Datos tributarios', icon: FileText, columns: 2, description: 'Actividad economica y usuario SII.' },
    { id: 'economic_activity_code', label: 'Codigo actividad', required: true },
    { id: 'economic_activity_name', label: 'Actividad economica', required: true },
    { id: 'sii_user', label: 'Usuario SII' },
    { id: 'operation_section', type: 'section', label: 'Operacion', icon: Landmark, columns: 2, description: 'Estado operativo y ambiente DTE.' },
    { id: 'dte_environment', label: 'Ambiente DTE', type: 'select', options: environmentOptions },
    { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Empresa activa', help: 'Solo una empresa puede estar activa a la vez.' },
  ], [isEdit, mediaField]);

  const save = async (form) => {
    const payload = buildPayload(form);
    await notifyPromise((async () => {
      const savedCompany = isEdit
        ? await businessFoundationService.companies.update(company.id, payload)
        : await businessFoundationService.companies.create(payload);
      if (pendingLogoFile) await profileService.uploadCompanyMedia(savedCompany.id || company?.id, 'logo', pendingLogoFile);
      if (pendingBannerFile) await profileService.uploadCompanyMedia(savedCompany.id || company?.id, 'banner', pendingBannerFile);
      return savedCompany;
    })(), {
      loading: 'Guardando empresa...',
      success: payload.is_active || payload.dte_environment === 'PRODUCCION' ? 'Empresa guardada y regla unica aplicada.' : 'Empresa guardada.',
      error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar empresa.'),
    });
    window.dispatchEvent(new CustomEvent('company-media:updated'));
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

    return <RecordNotFoundState title="Empresa no encontrada" description={error} actionLabel="Volver a empresas" onAction={backToList} logos={logos} />;
  }

  if (!initialValues) return null;

  return (
    <section className="space-y-5 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{isEdit ? 'Editar empresa' : 'Nueva empresa'}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {isEdit ? 'Actualiza los datos legales, visuales y operativos de la empresa.' : 'Completa los datos base para crear la empresa.'}
            </p>
          </div>
        </div>
        <button type="button" onClick={backToList} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
      </div>

      <div className="max-w-6xl">
        <SimpleFormContent
          fields={fields}
          initialValues={initialValues}
          onSubmit={save}
          onClose={backToList}
          submitLabel={isEdit ? 'Guardar cambios' : 'Crear empresa'}
          actionBarClassName="rounded-md shadow-sm"
        />
      </div>
    </section>
  );
};

export default AdminCompanyFormPage;
