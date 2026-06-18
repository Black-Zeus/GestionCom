/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ClipboardList, EyeOff, Pencil } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import StatusBadge from '@/components/common/data/StatusBadge';
import { documentConfigService } from '@/services/admin/documentConfigService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { tableFooter, filterActions } from '@/pages/admin/businessFoundationShared';

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-950';
const categoryLabels = { SALE: 'Venta' };
const movementLabels = { IN: 'Entrada', OUT: 'Salida', TRANSFER: 'Transferencia', ADJUSTMENT: 'Ajuste' };

const TypeModal = ({ initialValues, onSubmit, onClose }) => {
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        document_type_name: form.document_type_name.trim(),
        document_category: form.document_category,
        requires_approval: Boolean(form.requires_approval),
        generates_movement: Boolean(form.generates_movement),
        movement_type: form.generates_movement ? form.movement_type || null : null,
        is_active: Boolean(form.is_active),
      });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Nombre</span>
          <input className={fieldClassName} value={form.document_type_name} onChange={(e) => setField('document_type_name', e.target.value)} required />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Categoria</span>
          <select className={`${fieldClassName} bg-white dark:bg-slate-950`} value={form.document_category} onChange={(e) => setField('document_category', e.target.value)}>
            {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Movimiento</span>
          <select className={`${fieldClassName} bg-white dark:bg-slate-950`} value={form.movement_type || ''} onChange={(e) => setField('movement_type', e.target.value)} disabled={!form.generates_movement}>
            <option value="">Sin movimiento</option>
            {Object.entries(movementLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="flex h-11 items-center gap-2 rounded-md border px-3 text-sm dark:border-slate-700">
          <input type="checkbox" checked={form.requires_approval} onChange={(e) => setField('requires_approval', e.target.checked)} />
          Requiere aprobacion
        </label>
        <label className="flex h-11 items-center gap-2 rounded-md border px-3 text-sm dark:border-slate-700">
          <input type="checkbox" checked={form.generates_movement} onChange={(e) => setField('generates_movement', e.target.checked)} />
          Genera movimiento
        </label>
        <label className="flex h-11 items-center gap-2 rounded-md border px-3 text-sm dark:border-slate-700">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setField('is_active', e.target.checked)} />
          Activo
        </label>
      </div>
      <div className="flex justify-end gap-2 border-t pt-4 dark:border-slate-800">
        <button type="button" onClick={onClose} className="h-10 rounded-md border px-4 text-sm dark:border-slate-700">Cancelar</button>
        <button disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm text-white dark:bg-white dark:text-slate-950">{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </form>
  );
};

const AdminDocumentTypes = () => {
  const navigate = useNavigate();
  const [types, setTypes] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ typeStatus: 'all', category: 'all' });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setTypes(await documentConfigService.listTypes({ active_only: false }));
      setPage(0);
    } catch (err) {
      ModalManager.error({ title: 'Error', message: getBackendMessage(err, 'No fue posible cargar tipos de documento.') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    total: types.length,
    active: types.filter((t) => t.is_active).length,
  }), [types]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return types.filter((item) => {
      const matchStatus = filters.typeStatus === 'all' || (filters.typeStatus === 'active' && item.is_active) || (filters.typeStatus === 'inactive' && !item.is_active);
      const matchCategory = filters.category === 'all' || item.document_category === filters.category;
      const matchSearch = !term || [item.document_type_code, item.document_type_name, categoryLabels[item.document_category], movementLabels[item.movement_type]].filter(Boolean).some((v) => v.toLowerCase().includes(term));
      return matchStatus && matchCategory && matchSearch;
    });
  }, [types, search, filters]);

  const visible = useMemo(() => filtered.slice(page * pageSize, page * pageSize + pageSize), [filtered, page, pageSize]);

  const resetFilters = () => { setSearch(''); setFilters({ typeStatus: 'all', category: 'all' }); setPage(0); };

  const openEdit = (type) => ModalManager.show({
    type: 'custom',
    title: 'Editar tipo de documento',
    size: 'large',
    showFooter: false,
    contentComponent: TypeModal,
    contentProps: {
      initialValues: type,
      onSubmit: async (payload) => {
        await notifyPromise(documentConfigService.updateType(type.id, payload), {
          loading: 'Guardando tipo...',
          success: 'Tipo guardado.',
          error: (err) => getBackendMessage(err, 'No fue posible guardar.'),
        });
        await load();
      },
    },
  });

  const toggleType = async (type) => {
    const nextState = !type.is_active;
    const action = nextState ? 'activar' : 'desactivar';
    if (!await ModalManager.confirm({
      title: `${nextState ? 'Activar' : 'Desactivar'} tipo`,
      message: `Deseas ${action} ${type.document_type_name}?`,
      buttons: { cancel: 'Cancelar', confirm: nextState ? 'Activar' : 'Desactivar' },
    })) return;

    await notifyPromise(documentConfigService.updateType(type.id, { is_active: nextState }), {
      loading: 'Actualizando estado...',
      success: `Tipo ${nextState ? 'activado' : 'desactivado'}.`,
      error: (err) => getBackendMessage(err, 'No fue posible cambiar el estado.'),
    });
    await load();
  };

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Tipos de documentos"
        description="Catalogo funcional de tipos de documento del sistema."
        actions={[]}
      />

      <KpiBar
        className="mb-4"
        items={[
          { label: 'Tipos', value: stats.total },
          { label: 'Activos', value: stats.active },
        ]}
      />

      <FilterBar
        className="mb-4"
        searchValue={search}
        searchPlaceholder="Buscar tipo, codigo o movimiento"
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
        fields={[
          {
            id: 'typeStatus',
            value: filters.typeStatus,
            onChange: (v) => { setFilters((c) => ({ ...c, typeStatus: v })); setPage(0); },
            options: [
              { value: 'all', label: 'Todos los estados' },
              { value: 'active', label: 'Activos' },
              { value: 'inactive', label: 'Inactivos' },
            ],
          },
          {
            id: 'category',
            value: filters.category,
            onChange: (v) => { setFilters((c) => ({ ...c, category: v })); setPage(0); },
            options: [
              { value: 'all', label: 'Todas las categorias' },
              ...Object.entries(categoryLabels).map(([value, label]) => ({ value, label })),
            ],
          },
        ]}
        actions={filterActions({ loading, onRefresh: load, onClear: resetFilters })}
      />

      <DataTable
        loading={loading}
        data={visible}
        getRowKey={(row) => row.id}
        emptyMessage="No hay tipos de documento registrados."
        footer={tableFooter({ page, pageSize, total: filtered.length, loading, setPage, setPageSize })}
        columns={[
          {
            id: 'type',
            label: 'Tipo',
            sortable: true,
            sortValue: (item) => `${item.document_type_name || ''} ${item.document_type_code || ''}`,
            render: (item) => (
              <div>
                <div className="font-medium">{item.document_type_name}</div>
                <div className="font-mono text-xs text-slate-500">{item.document_type_code}</div>
              </div>
            ),
          },
          {
            id: 'category',
            label: 'Categoria',
            sortable: true,
            sortValue: (item) => categoryLabels[item.document_category] || item.document_category || '',
            render: (item) => categoryLabels[item.document_category] || item.document_category,
          },
          {
            id: 'movement',
            label: 'Movimiento',
            sortable: true,
            sortValue: (item) => (item.generates_movement ? movementLabels[item.movement_type] || item.movement_type || '' : 'No genera'),
            render: (item) => (item.generates_movement ? movementLabels[item.movement_type] || item.movement_type : 'No genera'),
          },
          {
            id: 'status',
            label: 'Estado',
            sortable: true,
            sortValue: (item) => item.is_active,
            render: (item) => <StatusBadge variant={item.is_active ? 'active' : 'inactive'}>{item.is_active ? 'Activo' : 'Inactivo'}</StatusBadge>,
          },
          {
            id: 'actions',
            label: 'Acciones',
            align: 'center',
            render: (item) => (
              <div className="flex justify-center gap-1">
                <RowActionButton label="Editar" icon={Pencil} onClick={() => openEdit(item)} />
                <RowActionButton
                  label={item.is_active ? 'Desactivar' : 'Activar'}
                  icon={item.is_active ? EyeOff : CheckCircle2}
                  variant={item.is_active ? 'danger' : 'neutral'}
                  onClick={() => toggleType(item)}
                />
                <RowActionButton
                  label="Ver series"
                  icon={ClipboardList}
                  onClick={() => navigate(`/documents/series/series?typeId=${item.id}&typeName=${encodeURIComponent(item.document_type_name)}`)}
                />
              </div>
            ),
          },
        ]}
      />
    </section>
  );
};

export default AdminDocumentTypes;
