/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, EyeOff, Pencil, RefreshCw, Trash2, XCircle } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import DataTablePagination from '@/components/common/data/DataTablePagination';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import StatusBadge from '@/components/common/data/StatusBadge';
import { productConfigService } from '@/services/admin/productConfigService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950';
const emptyForm = { category_code: '', category_name: '', category_description: '', parent_id: '', sort_order: '0', is_active: true };
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const toForm = (category) => ({
  category_code: category.category_code || '',
  category_name: category.category_name || '',
  category_description: category.category_description || '',
  parent_id: category.parent_id ? String(category.parent_id) : '',
  sort_order: String(category.sort_order ?? 0),
  is_active: category.is_active !== false,
});

const toPayload = (form) => ({
  category_name: form.category_name.trim(),
  category_description: form.category_description.trim() || null,
  parent_id: form.parent_id ? Number(form.parent_id) : null,
  sort_order: Number(form.sort_order || 0),
  is_active: Boolean(form.is_active),
});

const CategoryModal = ({ mode = 'create', initialValues = emptyForm, categories = [], currentId = null, onSubmit, onClose }) => {
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const isEdit = mode === 'edit';
  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(toPayload(form));
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        {isEdit && <label className="space-y-1 text-sm"><span className="font-medium">Codigo</span><input className={`${fieldClassName} font-mono`} value={form.category_code} disabled readOnly /></label>}
        <label className="space-y-1 text-sm"><span className="font-medium">Nombre</span><input className={fieldClassName} value={form.category_name} onChange={(event) => updateField('category_name', event.target.value)} required minLength={2} /></label>
        <label className="space-y-1 text-sm"><span className="font-medium">Categoria padre</span><select className={`${fieldClassName} bg-white dark:bg-slate-950`} value={form.parent_id} onChange={(event) => updateField('parent_id', event.target.value)}><option value="">Sin padre</option>{categories.filter((item) => Number(item.id) !== Number(currentId)).map((item) => <option key={item.id} value={item.id}>{item.category_code} - {item.category_name}</option>)}</select></label>
        <label className="space-y-1 text-sm"><span className="font-medium">Orden</span><input className={fieldClassName} type="number" min="0" value={form.sort_order} onChange={(event) => updateField('sort_order', event.target.value)} /></label>
        <label className="space-y-1 text-sm md:col-span-2"><span className="font-medium">Descripcion</span><textarea className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={form.category_description} onChange={(event) => updateField('category_description', event.target.value)} /></label>
        <label className="flex h-11 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm dark:border-slate-700"><input type="checkbox" checked={form.is_active} onChange={(event) => updateField('is_active', event.target.checked)} />Activa</label>
      </div>
      <div className="flex justify-end gap-2 border-t pt-4 dark:border-slate-800"><button type="button" onClick={onClose} className="h-10 rounded-md border px-4 text-sm dark:border-slate-700">Cancelar</button><button disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm text-white dark:bg-white dark:text-slate-950">{saving ? 'Guardando...' : 'Guardar'}</button></div>
    </form>
  );
};

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

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setCategories(await productConfigService.listCategories({ active_only: false }));
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar categorias.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(0); }, [parentFilter, search, status, tablePageSize]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return categories.filter((item) => {
      const matchesStatus = status === 'all' || (status === 'active' && item.is_active) || (status === 'inactive' && !item.is_active);
      const matchesParent = parentFilter === 'all' || (parentFilter === 'root' && !item.parent_id) || String(item.parent_id || '') === parentFilter;
      const matchesSearch = !term || [item.category_code, item.category_name, item.parent_name, item.category_path].filter(Boolean).some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesParent && matchesSearch;
    });
  }, [categories, parentFilter, search, status]);
  const visibleCategories = useMemo(() => filtered.slice(page * tablePageSize, page * tablePageSize + tablePageSize), [filtered, page, tablePageSize]);
  const parentOptions = useMemo(() => [
    { value: 'all', label: 'Todas las categorias' },
    { value: 'root', label: 'Solo raiz' },
    ...categories.filter((item) => !item.parent_id).map((item) => ({ value: String(item.id), label: item.category_name })),
  ], [categories]);
  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setParentFilter('all');
    setPage(0);
  };

  const openModal = (category = null) => ModalManager.show({
    type: 'custom',
    title: category ? 'Editar categoria' : 'Nueva categoria',
    size: 'large',
    showFooter: false,
    contentComponent: CategoryModal,
    contentProps: {
      mode: category ? 'edit' : 'create',
      initialValues: category ? toForm(category) : emptyForm,
      categories,
      currentId: category?.id,
      onSubmit: async (payload) => {
        await notifyPromise(category ? productConfigService.updateCategory(category.id, payload) : productConfigService.createCategory(payload), {
          loading: 'Guardando categoria...',
          success: 'Categoria guardada correctamente.',
          error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar la categoria.'),
        });
        await load();
      },
    },
  });

  const remove = async (category) => {
    if (!await ModalManager.confirm({ title: 'Eliminar categoria', message: `Eliminar ${category.category_name}.`, buttons: { cancel: 'Cancelar', confirm: 'Eliminar' } })) return;
    setBusyId(category.id);
    try {
      await notifyPromise(productConfigService.removeCategory(category.id), { loading: 'Eliminando...', success: 'Categoria eliminada.', error: (requestError) => getBackendMessage(requestError, 'No fue posible eliminar.') });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const toggle = (category) => openModal({ ...category, is_active: !category.is_active });
  const stats = { total: categories.length, active: categories.filter((item) => item.is_active).length, roots: categories.filter((item) => !item.parent_id).length };
  const columns = [
    { id: 'category', label: 'Categoria', sortable: true, sortValue: (item) => item.category_name, render: (item) => <><div className="font-medium">{item.category_name}</div><div className="font-mono text-xs text-slate-500">{item.category_code}</div></> },
    { id: 'parent', label: 'Padre', sortable: true, sortValue: (item) => item.parent_name || '', render: (item) => item.parent_name || 'Raiz' },
    { id: 'level', label: 'Nivel', sortable: true, sortValue: (item) => item.category_level },
    { id: 'path', label: 'Ruta', render: (item) => <span className="text-xs text-slate-500">{item.category_path}</span> },
    { id: 'status', label: 'Estado', render: (item) => <StatusBadge variant={item.is_active ? 'active' : 'inactive'}>{item.is_active ? 'Activa' : 'Inactiva'}</StatusBadge> },
    { id: 'actions', label: 'Acciones', align: 'right', render: (item) => <div className="flex justify-end gap-2"><RowActionButton label="Editar" icon={Pencil} disabled={busyId === item.id} onClick={() => openModal(item)} /><RowActionButton label={item.is_active ? 'Desactivar' : 'Activar'} icon={item.is_active ? EyeOff : CheckCircle2} disabled={busyId === item.id} onClick={() => toggle(item)} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" disabled={busyId === item.id} onClick={() => remove(item)} /></div> },
  ];

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mb-5 flex flex-wrap justify-between gap-3"><div><h1 className="text-xl font-semibold">Categorias de productos</h1><p className="mt-1 text-sm text-slate-500">Mantenedor jerarquico para clasificar productos.</p></div><ActionButton label="Nueva" onClick={() => openModal()} /></div>
      <KpiBar items={[{ id: 'total', label: 'Total', value: stats.total, active: status === 'all', onClick: () => setStatus('all') }, { id: 'active', label: 'Activas', value: stats.active, active: status === 'active', onClick: () => setStatus('active') }, { id: 'inactive', label: 'Inactivas', value: stats.total - stats.active, active: status === 'inactive', onClick: () => setStatus('inactive') }, { id: 'roots', label: 'Raiz', value: stats.roots }]} className="mb-4" />
      <FilterBar
        className="mb-4"
        searchValue={search}
        searchPlaceholder="Buscar categoria"
        onSearchChange={setSearch}
        onSearchSubmit={() => {}}
        fields={[
          { id: 'status', value: status, onChange: setStatus, options: [{ value: 'all', label: 'Todos los estados' }, { value: 'active', label: 'Activas' }, { value: 'inactive', label: 'Inactivas' }] },
          { id: 'parent', value: parentFilter, onChange: setParentFilter, options: parentOptions },
        ]}
        actions={(
          <>
            <ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={load} className={loading ? '[&>svg]:animate-spin' : ''} />
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
