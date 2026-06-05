/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { Building2, Image, Pencil, Plus, Power, ServerCog, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import { businessFoundationService } from '@/services/admin/businessFoundationService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { activeFilter, fieldOptions, filterActions, includesTerm, statusCell, tableFooter } from './businessFoundationShared';

const environmentLabels = { CERTIFICACION: 'Certificacion', PRODUCCION: 'Produccion' };

const openExpandedMedia = (entry) => ModalManager.show({
  type: 'custom',
  title: entry.label,
  size: entry.label === 'Banner' ? 'fullscreenWide' : 'large',
  showFooter: false,
  content: (
    <div className={`flex items-center justify-center rounded-md bg-slate-950/95 ${entry.label === 'Banner' ? 'p-2' : 'p-3'}`}>
      <img src={entry.fullSrc || entry.src} alt={entry.label} className={`${entry.label === 'Banner' ? 'max-h-[76vh]' : 'max-h-[72vh]'} max-w-full object-contain`} />
    </div>
  ),
});

const CompanyMediaViewer = ({ item }) => {
  const media = [
    { label: 'Logo', src: item.logo?.thumb_url, fullSrc: item.logo?.full_url, ratio: 'aspect-square' },
    { label: 'Banner', src: item.banner?.thumb_url, fullSrc: item.banner?.full_url, ratio: 'aspect-[16/5]' },
  ].filter((entry) => entry.src);

  if (!media.length) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
        <Image className="mx-auto h-10 w-10 text-slate-400" />
        <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Sin imagenes cargadas</p>
        <p className="mt-1 text-xs text-slate-500">Puedes agregar logo o banner desde la edicion de empresa.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {media.map((entry) => (
        <div key={entry.label} className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
          <button
            type="button"
            className={`block w-full overflow-hidden rounded-md bg-slate-100 outline-none transition hover:ring-2 hover:ring-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-slate-900 ${entry.ratio}`}
            onClick={() => openExpandedMedia(entry)}
            aria-label={`Ampliar ${entry.label}`}
          >
            <img src={entry.src} alt={entry.label} className="h-full w-full object-contain p-3" />
          </button>
          <p className="mt-3 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">{entry.label}</p>
        </div>
      ))}
    </div>
  );
};

const AdminCompanyConfig = () => {
  const navigate = useNavigate();
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

  const openForm = (company = null) => {
    if (!company) {
      navigate('/config/company/new');
      return;
    }
    navigate(`/config/company/edit/${encodeURIComponent(company.company_rut)}`);
  };

  const openMedia = (company) => ModalManager.show({
    type: 'custom',
    title: `Media de ${company.company_name}`,
    size: 'large',
    showFooter: true,
    content: <CompanyMediaViewer item={company} />,
  });

  const changeEnvironment = async (company) => {
    const nextEnvironment = company.dte_environment === 'PRODUCCION' ? 'CERTIFICACION' : 'PRODUCCION';
    const confirmed = await ModalManager.confirm({
      title: 'Cambiar ambiente DTE',
      message: `Confirma cambiar ${company.company_name} a ${environmentLabels[nextEnvironment]}.`,
      buttons: { cancel: 'Cancelar', confirm: 'Cambiar ambiente' },
    });
    if (!confirmed) return;

    await notifyPromise(businessFoundationService.companies.update(company.id, { dte_environment: nextEnvironment }), {
      loading: 'Actualizando ambiente...',
      success: nextEnvironment === 'PRODUCCION' ? 'Empresa en produccion. Regla unica aplicada.' : 'Empresa en certificacion.',
      error: (requestError) => getBackendMessage(requestError, 'No fue posible cambiar el ambiente.'),
    });
    await load();
  };

  const removeCompany = async (company) => {
    const confirmed = await ModalManager.confirm({
      title: 'Eliminar empresa',
      message: `Confirma eliminar ${company.company_name}. Esta accion la quitara del mantenedor.`,
      buttons: { cancel: 'Cancelar', confirm: 'Eliminar' },
      variant: 'danger',
    });
    if (!confirmed) return;

    await notifyPromise(businessFoundationService.companies.remove(company.id), {
      loading: 'Eliminando empresa...',
      success: 'Empresa eliminada.',
      error: (requestError) => getBackendMessage(requestError, 'No fue posible eliminar la empresa.'),
    });
    await load();
  };

  const changeStatus = async (company) => {
    const nextState = !company.is_active;
    const confirmed = await ModalManager.confirm({
      title: nextState ? 'Activar empresa' : 'Inactivar empresa',
      message: `Confirma ${nextState ? 'activar' : 'inactivar'} ${company.company_name}.`,
      buttons: { cancel: 'Cancelar', confirm: nextState ? 'Activar' : 'Inactivar' },
    });
    if (!confirmed) return;

    await notifyPromise(businessFoundationService.companies.update(company.id, { is_active: nextState }), {
      loading: 'Actualizando estado...',
      success: nextState ? 'Empresa activada. Regla unica aplicada.' : 'Empresa inactivada.',
      error: (requestError) => getBackendMessage(requestError, 'No fue posible cambiar el estado.'),
    });
    await load();
  };

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
          { id: 'status', label: 'Estado', render: (item) => statusCell(item.is_active) },
          {
            id: 'actions',
            label: 'Acciones',
            align: 'right',
            render: (item) => (
              <div className="flex justify-end gap-2">
                <RowActionButton label="Editar" icon={Pencil} onClick={() => openForm(item)} />
                <RowActionButton label="Ver media" icon={Image} onClick={() => openMedia(item)} />
                <RowActionButton label="Cambiar ambiente" icon={ServerCog} onClick={() => changeEnvironment(item)} />
                <RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => removeCompany(item)} />
                <RowActionButton label={item.is_active ? 'Inactivar' : 'Activar'} icon={Power} onClick={() => changeStatus(item)} />
              </div>
            ),
          },
        ]}
      />
    </section>
  );
};

export default AdminCompanyConfig;
