import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleCheck, EyeOff, FolderTree, Layers3, Pencil, Power, RefreshCw, Trash2, XCircle } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import DataTablePagination from '@/components/common/data/DataTablePagination';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import SimpleFormContent from '@/components/common/forms/SimpleFormContent';
import StatusBadge from '@/components/common/data/StatusBadge';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import { productConfigService } from '@/services/admin/productConfigService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';

const emptyForm = { category_name: '', category_description: '', parent_id: '', sort_order: '0', is_active: true };
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 150, 200];

const toForm = (category) => ({
  category_name: category.category_name || '',
  category_description: category.category_description || '',
  parent_id: category.parent_id ? String(category.parent_id) : '',
  sort_order: String(category.sort_order ?? 0),
  is_active: category.is_active !== false,
});

const toPayload = (form) => ({
  category_name: form.category_name.trim(),
  category_description: form.category_description?.trim() || null,
  parent_id: form.parent_id ? Number(form.parent_id) : null,
  sort_order: Number(form.sort_order || 0),
  is_active: Boolean(form.is_active),
});

const AdminProductCategories = () => {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [parentFilter, setParentFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const loadMeta = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCategories(await productConfigService.listCategories({ active_only: false }));
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar categorias.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { setPage(0); }, [parentFilter, search, status, tablePageSize]);

  const parentOptions = useMemo(() => [
    { value: 'all', label: 'Todas las categorias', icon: FolderTree },
    { value: 'root', label: 'Solo raiz', icon: Layers3 },
    ...categories.filter((item) => !item.parent_id).map((item) => ({ value: String(item.id), label: item.category_name, icon: FolderTree })),
  ], [categories]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return categories.filter((item) => {
      const matchesStatus = status === 'all' || (status === 'active' && item.is_active) || (status === 'inactive' && !item.is_active);
      const matchesParent = parentFilter === 'all' || (parentFilter === 'root' && !item.parent_id) || String(item.parent_id || '') === parentFilter;
      const matchesSearch = !term || [item.category_name, item.parent_name, item.category_description].filter(Boolean).some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesParent && matchesSearch;
    });
  }, [categories, parentFilter, search, status]);

  const visibleCategories = useMemo(() => filtered.slice(page * tablePageSize, page * tablePageSize + tablePageSize), [filtered, page, tablePageSize]);

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setParentFilter('all');
    setPage(0);
  };

  const openModal = (category = null) => {
    const categoryOptions = [
      { value: '', label: 'Sin categoria padre', icon: Layers3 },
      ...categories
        .filter((item) => Number(item.id) !== Number(category?.id))
        .map((item) => ({ value: String(item.id), label: item.category_name, icon: item.parent_id ? FolderTree : Layers3 })),
    ];

    ModalManager.show({
      type: 'custom',
      title: category ? 'Editar categoria' : 'Nueva categoria',
      size: 'xlarge',
      showFooter: false,
      contentComponent: SimpleFormContent,
      contentProps: {
        initialValues: category ? toForm(category) : emptyForm,
        fields: [
          { type: 'section', id: 'identity', label: 'Datos de la categoria', description: 'Clasifica productos y ayuda a ordenar catalogo, busqueda y reglas comerciales.', icon: FolderTree, columns: 3 },
          { id: 'category_name', label: 'Nombre', required: true },
          { id: 'parent_id', label: 'Categoria padre', type: 'autocomplete', options: categoryOptions, placeholder: 'Sin categoria padre', searchPlaceholder: 'Buscar categoria', showIcons: true, clearable: true },
          { id: 'sort_order', label: 'Orden', type: 'number', min: 0 },
          { id: 'category_description', label: 'Descripcion', type: 'textarea', rows: 2, span: 'full', placeholder: 'Ejemplo: vestidos maternales, lactancia, pantalones ajustables.' },
          { type: 'section', id: 'state', label: 'Estado operativo', description: 'Controla si la categoria queda disponible para asociar nuevos productos.', icon: CircleCheck, columns: 3 },
          { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activa' },
        ],
        onSubmit: async (form) => {
          const payload = toPayload(form);
          await notifyPromise(category ? productConfigService.updateCategory(category.id, payload) : productConfigService.createCategory(payload), {
            loading: 'Guardando categoria...',
            success: 'Categoria guardada correctamente.',
            error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar la categoria.'),
          });
          await loadMeta();
        },
      },
    });
  };

  const remove = async (category) => {
    if (!await ModalManager.confirm({ title: 'Eliminar categoria', message: `Eliminar ${category.category_name}.`, buttons: { cancel: 'Cancelar', confirm: 'Eliminar' } })) return;
    setBusyId(category.id);
    try {
      await notifyPromise(productConfigService.removeCategory(category.id), { loading: 'Eliminando...', success: 'Categoria eliminada.', error: (requestError) => getBackendMessage(requestError, 'No fue posible eliminar.') });
      await loadMeta();
    } finally {
      setBusyId(null);
    }
  };

  const toggle = async (category) => {
    const nextStatus = !category.is_active;
    const confirmed = await ModalManager.confirm({
      title: nextStatus ? 'Activar categoria' : 'Desactivar categoria',
      message: nextStatus ? `Confirma activar ${category.category_name}.` : `Confirma desactivar ${category.category_name}.`,
      buttons: { cancel: 'Cancelar', confirm: nextStatus ? 'Activar' : 'Desactivar' },
    });
    if (!confirmed) return;
    setBusyId(category.id);
    try {
      await notifyPromise(productConfigService.updateCategory(category.id, { is_active: nextStatus }), {
        loading: nextStatus ? 'Activando categoria...' : 'Desactivando categoria...',
        success: nextStatus ? 'Categoria activa.' : 'Categoria inactiva.',
        error: (requestError) => getBackendMessage(requestError, 'No fue posible cambiar el estado.'),
      });
      await loadMeta();
    } finally {
      setBusyId(null);
    }
  };

  const stats = {
    total: categories.length,
    active: categories.filter((item) => item.is_active).length,
    roots: categories.filter((item) => !item.parent_id).length,
  };

  const columns = [
    { id: 'category', label: 'Categoria', sortable: true, sortValue: (item) => item.category_name, render: (item) => <><div className="font-medium">{item.category_name}</div>{item.category_description && <div className="text-xs text-slate-500">{item.category_description}</div>}</> },
    { id: 'parent', label: 'Categoria padre', sortable: true, sortValue: (item) => item.parent_name || '', render: (item) => item.parent_name || 'Raiz' },
    { id: 'level', label: 'Nivel', sortable: true, sortValue: (item) => item.category_level },
    { id: 'order', label: 'Orden', sortable: true, sortValue: (item) => item.sort_order, render: (item) => item.sort_order ?? 0 },
    { id: 'status', label: 'Estado', render: (item) => <StatusBadge variant={item.is_active ? 'active' : 'inactive'}>{item.is_active ? 'Activa' : 'Inactiva'}</StatusBadge> },
    { id: 'actions', label: 'Acciones', align: 'center', render: (item) => <div className="flex justify-center gap-2"><RowActionButton label="Editar" icon={Pencil} disabled={busyId === item.id} onClick={() => openModal(item)} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" disabled={busyId === item.id} onClick={() => remove(item)} /><RowActionButton label={item.is_active ? 'Desactivar' : 'Activar'} icon={item.is_active ? Power : CheckCircle2} disabled={busyId === item.id} onClick={() => toggle(item)} /></div> },
  ];

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Categorias de productos"
        description="Mantenedor jerarquico para clasificar productos."
        actions={[{ id: 'new-category', label: 'Nueva', onClick: () => openModal() }]}
      />

      <KpiBar
        items={[
          { id: 'total', label: 'Total', value: stats.total, active: status === 'all', onClick: () => setStatus('all') },
          { id: 'active', label: 'Activas', value: stats.active, active: status === 'active', onClick: () => setStatus('active') },
          { id: 'inactive', label: 'Inactivas', value: stats.total - stats.active, active: status === 'inactive', onClick: () => setStatus('inactive') },
          { id: 'roots', label: 'Raiz', value: stats.roots },
        ]}
        className="mb-4"
      />

      <FilterBar
        className="mb-4"
        searchValue={search}
        searchPlaceholder="Buscar categoria"
        onSearchChange={setSearch}
        onSearchSubmit={() => {}}
        fields={[
          { id: 'status', value: status, onChange: setStatus, options: [{ value: 'all', label: 'Todos los estados', icon: CircleCheck }, { value: 'active', label: 'Activas', icon: CheckCircle2 }, { value: 'inactive', label: 'Inactivas', icon: EyeOff }] },
          { id: 'parent', value: parentFilter, onChange: setParentFilter, options: parentOptions },
        ]}
        actions={(
          <>
            <ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={loadMeta} className={loading ? '[&>svg]:animate-spin' : ''} />
            <ActionButton label="Limpiar" icon={XCircle} variant="neutral" onClick={clearFilters} />
          </>
        )}
      />

      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <DataTable
        columns={columns}
        data={visibleCategories}
        loading={loading}
        emptyMessage="No hay categorias para mostrar."
        footer={<DataTablePagination page={page} pageSize={tablePageSize} pageSizeOptions={PAGE_SIZE_OPTIONS} total={filtered.length} hasMore={(page + 1) * tablePageSize < filtered.length} loading={loading} onPageChange={setPage} onPageSizeChange={(size) => { setTablePageSize(size); setPage(0); }} />}
      />
    </section>
  );
};

export default AdminProductCategories;
