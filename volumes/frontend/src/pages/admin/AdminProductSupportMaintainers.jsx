import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, EyeOff, ListTree, Pencil, Power, RefreshCw, Tags, Trash2, XCircle } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import DataTablePagination from '@/components/common/data/DataTablePagination';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import SimpleFormContent from '@/components/common/forms/SimpleFormContent';
import StatusBadge from '@/components/common/data/StatusBadge';
import { adminMaintainersService } from '@/services/admin/adminMaintainersService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 150, 200];

const getStatusOptions = (activeLevel) => [
  { value: 'all', label: 'Todos los estados', icon: Tags },
  { value: 'active', label: activeLevel === 'models' ? 'Activos' : 'Activas', icon: CheckCircle2 },
  { value: 'inactive', label: activeLevel === 'models' ? 'Inactivos' : 'Inactivas', icon: EyeOff },
];

const AdminProductSupportMaintainers = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const selectedBrandCode = searchParams.get('brand') || '';
  const selectedBrand = brands.find((brand) => brand.brand_code === selectedBrandCode);
  const activeLevel = selectedBrandCode ? 'models' : 'brands';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextBrands, nextModels] = await Promise.all([
        adminMaintainersService.list('product-brands'),
        adminMaintainersService.list('product-models'),
      ]);
      setBrands(nextBrands);
      setModels(nextModels);
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar marcas y modelos.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    setSearch('');
    setStatus('all');
    setPage(0);
  }, [activeLevel]);
  useEffect(() => { setPage(0); }, [search, status, pageSize, selectedBrandCode]);

  const activeModelCountByBrand = useMemo(() => models.reduce((counts, model) => {
    if (!model.is_active) return counts;
    const brandId = String(model.brand_id || '');
    counts[brandId] = (counts[brandId] || 0) + 1;
    return counts;
  }, {}), [models]);

  const modelCountByBrand = useMemo(() => models.reduce((counts, model) => {
    const brandId = String(model.brand_id || '');
    counts[brandId] = (counts[brandId] || 0) + 1;
    return counts;
  }, {}), [models]);

  const filteredBrands = useMemo(() => {
    const term = search.trim().toLowerCase();
    return brands.filter((brand) => {
      const matchesStatus = status === 'all' || (status === 'active' && brand.is_active) || (status === 'inactive' && !brand.is_active);
      const matchesSearch = !term || [brand.brand_name, brand.brand_description].filter(Boolean).some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [brands, search, status]);

  const filteredModels = useMemo(() => {
    const term = search.trim().toLowerCase();
    return models.filter((model) => {
      const matchesBrand = selectedBrand ? Number(model.brand_id) === Number(selectedBrand.id) : false;
      const matchesStatus = status === 'all' || (status === 'active' && model.is_active) || (status === 'inactive' && !model.is_active);
      const matchesSearch = !term || [model.model_name, model.model_description].filter(Boolean).some((value) => value.toLowerCase().includes(term));
      return matchesBrand && matchesStatus && matchesSearch;
    });
  }, [models, search, selectedBrand, status]);

  const activeRows = activeLevel === 'models' ? filteredModels : filteredBrands;
  const visibleRows = useMemo(() => activeRows.slice(page * pageSize, page * pageSize + pageSize), [activeRows, page, pageSize]);

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setPage(0);
  };

  const openBrandModels = (brand) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('brand', brand.brand_code);
    setSearchParams(nextParams);
  };

  const goBack = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('brand');
    setSearchParams(nextParams);
  };

  const openBrandModal = (brand = null) => ModalManager.show({
    type: 'custom',
    title: brand ? 'Editar marca' : 'Nueva marca',
    size: 'xlarge',
    showFooter: false,
    contentComponent: SimpleFormContent,
    contentProps: {
      initialValues: brand ? { brand_name: brand.brand_name || '', brand_description: brand.brand_description || '', is_active: brand.is_active !== false } : { brand_name: '', brand_description: '', is_active: true },
      fields: [
        { type: 'section', id: 'brand', label: 'Datos de la marca', description: 'Marca comercial que luego podra asociarse a productos.', icon: Tags, columns: 3 },
        { id: 'brand_name', label: 'Marca', required: true },
        { id: 'brand_description', label: 'Descripcion', type: 'textarea', rows: 2, span: 'full' },
        { type: 'section', id: 'state', label: 'Estado operativo', description: 'Controla si la marca queda disponible para nuevos productos.', icon: CheckCircle2, columns: 3 },
        { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activa' },
      ],
      onSubmit: async (form) => {
        const payload = { brand_name: form.brand_name.trim(), brand_description: form.brand_description?.trim() || null, is_active: Boolean(form.is_active) };
        await notifyPromise(brand ? adminMaintainersService.update('product-brands', brand.id, payload) : adminMaintainersService.create('product-brands', payload), {
          loading: 'Guardando marca...',
          success: 'Marca guardada.',
          error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar la marca.'),
        });
        await load();
      },
    },
  });

  const openModelModal = (model = null) => {
    if (!selectedBrand) return;
    ModalManager.show({
      type: 'custom',
      title: model ? 'Editar modelo' : 'Nuevo modelo',
      size: 'xlarge',
      showFooter: false,
      contentComponent: SimpleFormContent,
      contentProps: {
        initialValues: model ? { model_name: model.model_name || '', model_description: model.model_description || '', is_active: model.is_active !== false } : { model_name: '', model_description: '', is_active: true },
        fields: [
          { type: 'section', id: 'model', label: `Modelo para ${selectedBrand.brand_name}`, description: 'Modelo dependiente de la marca seleccionada.', icon: ListTree, columns: 3 },
          { id: 'model_name', label: 'Modelo', required: true },
          { id: 'model_description', label: 'Descripcion', type: 'textarea', rows: 2, span: 'full' },
          { type: 'section', id: 'state', label: 'Estado operativo', description: 'Controla si el modelo queda disponible para nuevos productos.', icon: CheckCircle2, columns: 3 },
          { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' },
        ],
        onSubmit: async (form) => {
          const payload = { brand_id: selectedBrand.id, model_name: form.model_name.trim(), model_description: form.model_description?.trim() || null, is_active: Boolean(form.is_active) };
          await notifyPromise(model ? adminMaintainersService.update('product-models', model.id, payload) : adminMaintainersService.create('product-models', payload), {
            loading: 'Guardando modelo...',
            success: 'Modelo guardado.',
            error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar el modelo.'),
          });
          await load();
        },
      },
    });
  };

  const remove = async ({ resource, item, label }) => {
    const confirmed = await ModalManager.confirm({
      title: `Eliminar ${label}`,
      message: `Confirma eliminar ${label === 'marca' ? item.brand_name : item.model_name}.`,
      buttons: { cancel: 'Cancelar', confirm: 'Eliminar' },
    });
    if (!confirmed) return;
    setBusyId(`${resource}:${item.id}`);
    try {
      await notifyPromise(adminMaintainersService.remove(resource, item.id), {
        loading: 'Eliminando...',
        success: 'Registro eliminado.',
        error: (requestError) => getBackendMessage(requestError, 'No fue posible eliminar.'),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const toggle = async ({ resource, item, label }) => {
    const nextStatus = !item.is_active;
    const confirmed = await ModalManager.confirm({
      title: nextStatus ? `Activar ${label}` : `Desactivar ${label}`,
      message: nextStatus ? `Confirma activar ${label === 'marca' ? item.brand_name : item.model_name}.` : `Confirma desactivar ${label === 'marca' ? item.brand_name : item.model_name}.`,
      buttons: { cancel: 'Cancelar', confirm: nextStatus ? 'Activar' : 'Desactivar' },
    });
    if (!confirmed) return;
    setBusyId(`${resource}:${item.id}`);
    try {
      await notifyPromise(adminMaintainersService.update(resource, item.id, { is_active: nextStatus }), {
        loading: nextStatus ? 'Activando...' : 'Desactivando...',
        success: nextStatus ? 'Registro activo.' : 'Registro inactivo.',
        error: (requestError) => getBackendMessage(requestError, 'No fue posible cambiar el estado.'),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const brandStats = {
    total: brands.length,
    active: brands.filter((brand) => brand.is_active).length,
    models: models.length,
  };
  const modelStats = {
    total: filteredModels.length,
    active: filteredModels.filter((model) => model.is_active).length,
    inactive: filteredModels.filter((model) => !model.is_active).length,
  };

  const brandColumns = [
    { id: 'brand', label: 'Marca', sortable: true, sortValue: (item) => item.brand_name, render: (item) => <div className="font-medium">{item.brand_name}</div> },
    { id: 'description', label: 'Descripcion', render: (item) => item.brand_description || '-' },
    { id: 'models', label: 'Modelos', align: 'center', sortable: true, sortValue: (item) => modelCountByBrand[String(item.id)] || 0, render: (item) => <span className="font-medium">{activeModelCountByBrand[String(item.id)] || 0}</span> },
    { id: 'status', label: 'Estado', render: (item) => <StatusBadge variant={item.is_active ? 'active' : 'inactive'}>{item.is_active ? 'Activa' : 'Inactiva'}</StatusBadge> },
    { id: 'actions', label: 'Acciones', align: 'center', render: (item) => <><RowActionButton label="Editar" icon={Pencil} disabled={busyId === `product-brands:${item.id}`} onClick={() => openBrandModal(item)} /><RowActionButton label="Modelos" icon={ListTree} disabled={busyId === `product-brands:${item.id}`} onClick={() => openBrandModels(item)} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" disabled={busyId === `product-brands:${item.id}`} onClick={() => remove({ resource: 'product-brands', item, label: 'marca' })} /><RowActionButton label={item.is_active ? 'Desactivar' : 'Activar'} icon={item.is_active ? Power : CheckCircle2} disabled={busyId === `product-brands:${item.id}`} onClick={() => toggle({ resource: 'product-brands', item, label: 'marca' })} /></> },
  ];

  const modelColumns = [
    { id: 'model', label: 'Modelo', sortable: true, sortValue: (item) => item.model_name, render: (item) => <div className="font-medium">{item.model_name}</div> },
    { id: 'description', label: 'Descripcion', render: (item) => item.model_description || '-' },
    { id: 'status', label: 'Estado', render: (item) => <StatusBadge variant={item.is_active ? 'active' : 'inactive'}>{item.is_active ? 'Activo' : 'Inactivo'}</StatusBadge> },
    { id: 'actions', label: 'Acciones', align: 'center', render: (item) => <><RowActionButton label="Editar" icon={Pencil} disabled={busyId === `product-models:${item.id}`} onClick={() => openModelModal(item)} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" disabled={busyId === `product-models:${item.id}`} onClick={() => remove({ resource: 'product-models', item, label: 'modelo' })} /><RowActionButton label={item.is_active ? 'Desactivar' : 'Activar'} icon={item.is_active ? Power : CheckCircle2} disabled={busyId === `product-models:${item.id}`} onClick={() => toggle({ resource: 'product-models', item, label: 'modelo' })} /></> },
  ];

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title={activeLevel === 'models' ? `Modelos - ${selectedBrand?.brand_name || 'marca'}` : 'Marcas y modelos de productos'}
        description={activeLevel === 'models' ? 'Modelos disponibles para la marca seleccionada.' : 'Catalogo de marcas reutilizables en productos.'}
        actions={[
          activeLevel === 'models' && { id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: goBack },
          { id: 'primary', label: activeLevel === 'models' ? 'Nuevo modelo' : 'Nueva marca', icon: activeLevel === 'models' ? ListTree : Tags, disabled: activeLevel === 'models' && !selectedBrand, onClick: () => (activeLevel === 'models' ? openModelModal() : openBrandModal()) },
        ]}
      />

      <KpiBar
        className="mb-4"
        items={activeLevel === 'models' ? [
          { id: 'total', label: 'Total', value: modelStats.total, active: status === 'all', onClick: () => setStatus('all') },
          { id: 'active', label: 'Activos', value: modelStats.active, active: status === 'active', onClick: () => setStatus('active') },
          { id: 'inactive', label: 'Inactivos', value: modelStats.inactive, active: status === 'inactive', onClick: () => setStatus('inactive') },
          { id: 'brand', label: 'Marca', value: selectedBrand?.brand_name || '-' },
        ] : [
          { id: 'total', label: 'Total', value: brandStats.total, active: status === 'all', onClick: () => setStatus('all') },
          { id: 'active', label: 'Activas', value: brandStats.active, active: status === 'active', onClick: () => setStatus('active') },
          { id: 'inactive', label: 'Inactivas', value: brandStats.total - brandStats.active, active: status === 'inactive', onClick: () => setStatus('inactive') },
          { id: 'models', label: 'Modelos', value: brandStats.models },
        ]}
      />

      <FilterBar
        className="mb-4"
        searchValue={search}
        searchPlaceholder={activeLevel === 'models' ? 'Buscar modelo' : 'Buscar marca'}
        onSearchChange={setSearch}
        fields={[{ id: 'status', value: status, onChange: setStatus, options: getStatusOptions(activeLevel) }]}
        actions={(
          <>
            <ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={load} className={loading ? '[&>svg]:animate-spin' : ''} />
            <ActionButton label="Limpiar" icon={XCircle} variant="neutral" onClick={clearFilters} />
          </>
        )}
      />

      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <DataTable
        columns={activeLevel === 'models' ? modelColumns : brandColumns}
        data={visibleRows}
        loading={loading}
        emptyMessage={activeLevel === 'models' ? 'No hay modelos para esta marca.' : 'No hay marcas para mostrar.'}
        footer={<DataTablePagination page={page} pageSize={pageSize} pageSizeOptions={PAGE_SIZE_OPTIONS} total={activeRows.length} hasMore={(page + 1) * pageSize < activeRows.length} loading={loading} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(0); }} />}
      />
    </section>
  );
};

export default AdminProductSupportMaintainers;
