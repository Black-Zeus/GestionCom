import { useEffect, useMemo, useState } from 'react';
import { Building2, ImageUp, Pencil, Plus } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import SimpleFormContent from '@/components/common/forms/SimpleFormContent';
import { businessFoundationService } from '@/services/admin/businessFoundationService';
import { profileService } from '@/services/profile/profileService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { activeFilter, fieldOptions, filterActions, includesTerm, statusCell, tableFooter } from './businessFoundationShared';

const environmentLabels = { CERTIFICACION: 'Certificacion', PRODUCCION: 'Produccion' };

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

const AdminCompanyConfig = () => {
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setCompanies(await businessFoundationService.companies.list());
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar configuracion de empresa.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(0); }, [search, status, pageSize]);

  const filteredCompanies = useMemo(() => {
    const term = search.trim().toLowerCase();
    return companies.filter((company) => activeFilter(status)(company) && includesTerm(company, ['company_rut', 'company_name', 'company_business_name', 'company_city', 'company_region'], term));
  }, [companies, search, status]);
  const visibleCompanies = filteredCompanies.slice(page * pageSize, page * pageSize + pageSize);
  const activeCompany = companies.find((item) => item.is_active);
  const productionCompany = companies.find((item) => item.dte_environment === 'PRODUCCION');

  const openForm = (company = null) => ModalManager.show({
    type: 'custom',
    title: company ? 'Editar empresa' : 'Nueva empresa',
    size: 'large',
    showFooter: false,
    contentComponent: SimpleFormContent,
    contentProps: {
      initialValues: company || { company_rut: '', company_name: '', company_business_name: '', company_address: '', company_comuna: '', company_city: '', company_region: '', economic_activity_code: '', economic_activity_name: '', dte_environment: 'CERTIFICACION', sii_user: '', is_active: !activeCompany },
      fields: [
        { id: 'company_rut', label: 'RUT', required: true },
        { id: 'company_name', label: 'Nombre fantasia', required: true },
        { id: 'company_business_name', label: 'Razon social', required: true, wide: true },
        { id: 'company_address', label: 'Direccion', required: true, wide: true },
        { id: 'company_comuna', label: 'Comuna', required: true },
        { id: 'company_city', label: 'Ciudad', required: true },
        { id: 'company_region', label: 'Region', required: true },
        { id: 'economic_activity_code', label: 'Codigo actividad', required: true },
        { id: 'economic_activity_name', label: 'Actividad economica', required: true, wide: true },
        { id: 'dte_environment', label: 'Ambiente DTE', type: 'select', options: Object.entries(environmentLabels).map(([value, label]) => ({ value, label })) },
        { id: 'sii_user', label: 'Usuario SII' },
        { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activa' },
      ],
      onSubmit: async (form) => {
        const payload = { ...form, sii_user: form.sii_user || null };
        await notifyPromise(company ? businessFoundationService.companies.update(company.id, payload) : businessFoundationService.companies.create(payload), {
          loading: 'Guardando empresa...',
          success: payload.is_active || payload.dte_environment === 'PRODUCCION' ? 'Empresa guardada y regla unica aplicada.' : 'Empresa guardada.',
          error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar.'),
        });
        await load();
      },
    },
  });

  const uploadCompanyMedia = (company, role) => pickImage(async (file) => {
    await notifyPromise(profileService.uploadCompanyMedia(company.id, role, file), {
      loading: role === 'logo' ? 'Procesando logo...' : 'Procesando banner...',
      success: role === 'logo' ? 'Logo actualizado.' : 'Banner actualizado.',
      error: (requestError) => getBackendMessage(requestError, 'No fue posible cargar la imagen.'),
    });
    await load();
  });

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mb-5 flex flex-wrap justify-between gap-3">
        <div><h1 className="text-xl font-semibold">Configuracion de empresa</h1><p className="mt-1 text-sm text-slate-500">Datos legales y parametros DTE base.</p></div>
        <ActionButton label="Nueva empresa" icon={Plus} onClick={() => openForm()} />
      </div>
      <KpiBar items={[{ label: 'Empresas', value: companies.length }, { label: 'Activa actual', value: activeCompany?.company_name || '-' }, { label: 'Produccion', value: productionCompany?.company_name || '-' }, { label: 'Certificacion', value: companies.filter((item) => item.dte_environment === 'CERTIFICACION').length }]} className="mb-4" />
      <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
        Solo puede existir una empresa activa y una empresa en ambiente productivo. Al marcar una empresa con cualquiera de esas condiciones, el sistema ajusta automaticamente las demas.
      </div>
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <FilterBar className="mb-4" searchValue={search} searchPlaceholder="Buscar empresa, RUT o ciudad" onSearchChange={setSearch} fields={[{ id: 'status', value: status, onChange: setStatus, options: fieldOptions.status }]} actions={filterActions({ loading, onRefresh: load, onClear: () => { setSearch(''); setStatus('all'); } })} />
      <DataTable
        loading={loading}
        data={visibleCompanies}
        footer={tableFooter({ page, pageSize, total: filteredCompanies.length, loading, setPage, setPageSize })}
        columns={[
          { id: 'company', label: 'Empresa', render: (item) => <><div className="font-medium">{item.company_name}</div><div className="font-mono text-xs text-slate-500">{item.company_rut}</div></> },
          { id: 'business', label: 'Razon social', render: (item) => item.company_business_name },
          { id: 'location', label: 'Ubicacion', render: (item) => `${item.company_city}, ${item.company_region}` },
          { id: 'activity', label: 'Actividad', render: (item) => <><div>{item.economic_activity_name}</div><div className="font-mono text-xs text-slate-500">{item.economic_activity_code}</div></> },
          { id: 'environment', label: 'DTE', render: (item) => <span className="inline-flex items-center gap-1 text-sm"><Building2 className="h-4 w-4 text-slate-500" />{environmentLabels[item.dte_environment]}</span> },
          { id: 'media', label: 'Media', render: (item) => <span className="text-xs text-slate-500">{[item.logo && 'Logo', item.banner && 'Banner'].filter(Boolean).join(' / ') || 'Sin imagenes'}</span> },
          { id: 'status', label: 'Estado', render: (item) => statusCell(item.is_active) },
          { id: 'actions', label: 'Acciones', align: 'right', render: (item) => <div className="flex justify-end gap-2"><RowActionButton label="Editar" icon={Pencil} onClick={() => openForm(item)} /><RowActionButton label="Cargar logo" icon={ImageUp} onClick={() => uploadCompanyMedia(item, 'logo')} /><RowActionButton label="Cargar banner" icon={ImageUp} onClick={() => uploadCompanyMedia(item, 'banner')} /></div> },
        ]}
      />
    </section>
  );
};

export default AdminCompanyConfig;
