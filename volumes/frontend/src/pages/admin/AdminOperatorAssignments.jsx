/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Pencil, RefreshCw, Trash2, UserCheck, XCircle } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import DataTablePagination from '@/components/common/data/DataTablePagination';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import DatePicker from '@/components/common/forms/DatePicker';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import StatusBadge from '@/components/common/data/StatusBadge';
import { cashRegistersService } from '@/services/admin/cashRegistersService';
import { salesOperationsService } from '@/services/admin/salesOperationsService';
import { usersService } from '@/services/admin/usersService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { PAGE_SIZE_OPTIONS, usePreferencesStore } from '@/store/usePreferencesStore';

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const selectClassName = `${fieldClassName} bg-white dark:bg-slate-950`;

const scopeLabels = {
  cash_register: 'Caja',
  sales_point: 'Punto de venta',
};

const roleOptionsByScope = {
  cash_register: [
    { value: 'CASHIER', label: 'Cajero' },
    { value: 'SUPERVISOR', label: 'Supervisor' },
  ],
  sales_point: [
    { value: 'SELLER', label: 'Vendedor' },
    { value: 'SUPERVISOR', label: 'Supervisor' },
  ],
};

const emptyForm = {
  scope: 'cash_register',
  cash_register_id: '',
  sales_point_id: '',
  user_id: '',
  operator_role: 'CASHIER',
  is_default: false,
  valid_from: '',
  valid_until: '',
  notes: '',
  is_active: true,
};

const normalizeUsers = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

const assignmentToForm = (assignment) => ({
  scope: assignment.scope,
  cash_register_id: assignment.cash_register_id || '',
  sales_point_id: assignment.sales_point_id || '',
  user_id: assignment.user_id || '',
  operator_role: assignment.operator_role || (assignment.scope === 'sales_point' ? 'SELLER' : 'CASHIER'),
  is_default: assignment.is_default === true,
  valid_from: assignment.valid_from || '',
  valid_until: assignment.valid_until || '',
  notes: assignment.notes || '',
  is_active: assignment.is_active !== false,
});

const toPayload = (form) => ({
  ...(form.scope === 'cash_register' ? { cash_register_id: Number(form.cash_register_id) } : { sales_point_id: Number(form.sales_point_id) }),
  user_id: Number(form.user_id),
  operator_role: form.operator_role,
  is_default: Boolean(form.is_default),
  valid_from: form.valid_from || null,
  valid_until: form.valid_until || null,
  notes: form.notes.trim() || null,
  is_active: Boolean(form.is_active),
});

const AssignmentFormModal = ({ mode = 'create', initialValues = emptyForm, users = [], cashRegisters = [], salesPoints = [], onSubmit, onClose }) => {
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const isEdit = mode === 'edit';
  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const roleOptions = roleOptionsByScope[form.scope] || roleOptionsByScope.cash_register;

  const handleScopeChange = (value) => {
    setForm((current) => ({
      ...current,
      scope: value,
      operator_role: value === 'sales_point' ? 'SELLER' : 'CASHIER',
      cash_register_id: '',
      sales_point_id: '',
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!form.user_id || (form.scope === 'cash_register' && !form.cash_register_id) || (form.scope === 'sales_point' && !form.sales_point_id)) {
      setFormError('Debe seleccionar operador y origen operativo.');
      return;
    }
    if (form.valid_from && form.valid_until && form.valid_until < form.valid_from) {
      setFormError('La fecha hasta no puede ser anterior a la fecha desde.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form.scope, toPayload(form));
      onClose?.();
    } catch (requestError) {
      setFormError(getBackendMessage(requestError, 'No fue posible guardar la asignacion.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-950 dark:text-white">{isEdit ? 'Asignacion operativa' : 'Nueva asignacion operativa'}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Controla que usuarios pueden operar una caja o punto de venta.</div>
          </div>
          <label className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
            <input type="checkbox" checked={form.is_active} onChange={(event) => updateField('is_active', event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            Activo
          </label>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Tipo asignacion</span>
          <select className={selectClassName} value={form.scope} onChange={(event) => handleScopeChange(event.target.value)} disabled={isEdit}>
            <option value="cash_register">Caja</option>
            <option value="sales_point">Punto de venta</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Operador</span>
          <select className={selectClassName} value={form.user_id} onChange={(event) => updateField('user_id', event.target.value)} disabled={isEdit} required>
            <option value="">Seleccione...</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.full_name || `${user.first_name} ${user.last_name}`} ({user.username})</option>)}
          </select>
        </label>
        {form.scope === 'cash_register' ? (
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Caja</span>
            <select className={selectClassName} value={form.cash_register_id} onChange={(event) => updateField('cash_register_id', event.target.value)} disabled={isEdit} required>
              <option value="">Seleccione...</option>
              {cashRegisters.map((item) => <option key={item.id} value={item.id}>{item.register_code} - {item.register_name}</option>)}
            </select>
          </label>
        ) : (
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Punto de venta</span>
            <select className={selectClassName} value={form.sales_point_id} onChange={(event) => updateField('sales_point_id', event.target.value)} disabled={isEdit} required>
              <option value="">Seleccione...</option>
              {salesPoints.map((item) => <option key={item.id} value={item.id}>{item.sales_point_code} - {item.sales_point_name}</option>)}
            </select>
          </label>
        )}
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Rol operativo</span>
          <select className={selectClassName} value={form.operator_role} onChange={(event) => updateField('operator_role', event.target.value)} required>
            {roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Vigente desde</span>
          <DatePicker
            value={form.valid_from}
            onChange={(value) => updateField('valid_from', value)}
            maxDate={form.valid_until || undefined}
            placeholder="Seleccionar desde"
            className="[&>button]:h-11 [&>button]:w-full [&>button]:justify-start"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Vigente hasta</span>
          <DatePicker
            value={form.valid_until}
            onChange={(value) => updateField('valid_until', value)}
            minDate={form.valid_from || undefined}
            placeholder="Seleccionar hasta"
            className="[&>button]:h-11 [&>button]:w-full [&>button]:justify-start"
          />
        </label>
        <label className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
          <input type="checkbox" checked={form.is_default} onChange={(event) => updateField('is_default', event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Predeterminado para el operador
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">Notas</span>
          <input className={fieldClassName} value={form.notes} onChange={(event) => updateField('notes', event.target.value)} maxLength={1000} />
        </label>
      </div>

      {formError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{formError}</div>}

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancelar</button>
        <button type="submit" disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{saving ? 'Guardando...' : 'Guardar asignacion'}</button>
      </div>
    </form>
  );
};

const AdminOperatorAssignments = () => {
  const [scope, setScope] = useState('cash_register');
  const [cashAssignments, setCashAssignments] = useState([]);
  const [salesPointAssignments, setSalesPointAssignments] = useState([]);
  const [cashRegisters, setCashRegisters] = useState([]);
  const [salesPoints, setSalesPoints] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const tablePageSize = usePreferencesStore((state) => state.tablePageSize);
  const setTablePageSize = usePreferencesStore((state) => state.setTablePageSize);

  const assignments = scope === 'cash_register' ? cashAssignments : salesPointAssignments;

  const stats = useMemo(() => ({
    cash: cashAssignments.length,
    pos: salesPointAssignments.length,
    active: [...cashAssignments, ...salesPointAssignments].filter((item) => item.is_active).length,
    inactive: [...cashAssignments, ...salesPointAssignments].filter((item) => !item.is_active).length,
  }), [cashAssignments, salesPointAssignments]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return assignments.filter((item) => {
      const userName = item.user?.full_name || '';
      const sourceName = item.scope === 'cash_register' ? item.cash_register_name : item.sales_point_name;
      const sourceCode = item.scope === 'cash_register' ? item.cash_register_code : item.sales_point_code;
      const matchesStatus = status === 'all' || (status === 'active' && item.is_active) || (status === 'inactive' && !item.is_active);
      const matchesSearch = !term || [userName, item.user?.username, sourceName, sourceCode, item.operator_role].filter(Boolean).some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [assignments, search, status]);

  const visible = useMemo(() => filtered.slice(page * tablePageSize, page * tablePageSize + tablePageSize), [filtered, page, tablePageSize]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextCashAssignments, nextSalesPointAssignments, nextCashRegisters, nextSalesPoints, nextUsers] = await Promise.all([
        salesOperationsService.listCashRegisterAssignments(),
        salesOperationsService.listSalesPointAssignments(),
        cashRegistersService.list({ active_only: false, limit: 1000 }),
        salesOperationsService.listSalesPoints({ active_only: false, limit: 1000 }),
        usersService.list({ active_only: false, limit: 1000 }),
      ]);
      setCashAssignments(nextCashAssignments);
      setSalesPointAssignments(nextSalesPointAssignments);
      setCashRegisters(nextCashRegisters);
      setSalesPoints(nextSalesPoints);
      setUsers(normalizeUsers(nextUsers).filter((user) => user.is_active !== false));
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar asignaciones operativas.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setPage(0); }, [scope, search, status]);

  const openModal = (assignment = null) => {
    ModalManager.show({
      type: 'custom',
      title: assignment ? 'Editar asignacion' : 'Nueva asignacion',
      size: 'large',
      showFooter: false,
      contentComponent: AssignmentFormModal,
      contentProps: {
        mode: assignment ? 'edit' : 'create',
        initialValues: assignment ? assignmentToForm(assignment) : { ...emptyForm, scope },
        users,
        cashRegisters,
        salesPoints,
        onSubmit: async (targetScope, payload) => {
          let action;
          if (assignment && targetScope === 'cash_register') action = salesOperationsService.updateCashRegisterAssignment(assignment.id, payload);
          if (assignment && targetScope === 'sales_point') action = salesOperationsService.updateSalesPointAssignment(assignment.id, payload);
          if (!assignment && targetScope === 'cash_register') action = salesOperationsService.createCashRegisterAssignment(payload);
          if (!assignment && targetScope === 'sales_point') action = salesOperationsService.createSalesPointAssignment(payload);
          await notifyPromise(action, {
            loading: assignment ? 'Actualizando asignacion...' : 'Creando asignacion...',
            success: assignment ? 'Asignacion actualizada.' : 'Asignacion creada.',
            error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar la asignacion.'),
          });
          await loadData();
        },
      },
    });
  };

  const toggle = async (assignment) => {
    setBusyId(assignment.id);
    const payload = {
      operator_role: assignment.operator_role,
      is_default: assignment.is_default,
      valid_from: assignment.valid_from || null,
      valid_until: assignment.valid_until || null,
      notes: assignment.notes || null,
      is_active: !assignment.is_active,
    };
    try {
      const action = assignment.scope === 'cash_register'
        ? salesOperationsService.updateCashRegisterAssignment(assignment.id, payload)
        : salesOperationsService.updateSalesPointAssignment(assignment.id, payload);
      await notifyPromise(action, {
        loading: 'Actualizando estado...',
        success: 'Estado actualizado.',
        error: (requestError) => getBackendMessage(requestError, 'No fue posible actualizar el estado.'),
      });
      await loadData();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (assignment) => {
    const sourceName = assignment.scope === 'cash_register' ? assignment.cash_register_name : assignment.sales_point_name;
    const confirmed = await ModalManager.confirm({
      title: 'Eliminar asignacion',
      message: `Esta accion eliminara la relacion de ${assignment.user?.full_name || 'operador'} con ${sourceName}.`,
      buttons: { cancel: 'Cancelar', confirm: 'Eliminar' },
    });
    if (!confirmed) return;
    setBusyId(assignment.id);
    try {
      const action = assignment.scope === 'cash_register'
        ? salesOperationsService.removeCashRegisterAssignment(assignment.id)
        : salesOperationsService.removeSalesPointAssignment(assignment.id);
      await notifyPromise(action, {
        loading: 'Eliminando asignacion...',
        success: 'Asignacion eliminada.',
        error: (requestError) => getBackendMessage(requestError, 'No fue posible eliminar la asignacion.'),
      });
      await loadData();
    } finally {
      setBusyId(null);
    }
  };

  const columns = [
    { id: 'user', label: 'Operador', sortable: true, sortValue: (item) => item.user?.full_name || '', render: (item) => <><div className="font-medium text-slate-950 dark:text-white">{item.user?.full_name || 'Usuario'}</div><div className="font-mono text-xs text-slate-500">{item.user?.username}</div></> },
    { id: 'source', label: scopeLabels[scope], sortable: true, sortValue: (item) => (scope === 'cash_register' ? item.cash_register_name : item.sales_point_name) || '', render: (item) => <div><div className="font-medium text-slate-700 dark:text-slate-200">{scope === 'cash_register' ? item.cash_register_name : item.sales_point_name}</div><div className="font-mono text-xs text-slate-500">{scope === 'cash_register' ? item.cash_register_code : item.sales_point_code}</div></div> },
    { id: 'role', label: 'Rol', sortable: true, sortValue: (item) => item.operator_role, render: (item) => <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"><UserCheck className="h-3.5 w-3.5" />{item.operator_role}</span> },
    { id: 'validity', label: 'Vigencia', render: (item) => <div className="text-sm text-slate-600 dark:text-slate-300">{item.valid_from || 'Sin inicio'} - {item.valid_until || 'Sin termino'}{item.is_default && <div className="text-xs font-medium text-blue-600 dark:text-blue-300">Predeterminado</div>}</div> },
    { id: 'status', label: 'Estado', sortable: true, sortValue: (item) => item.is_active, render: (item) => <StatusBadge variant={item.is_active ? 'active' : 'inactive'}>{item.is_active ? 'Activo' : 'Inactivo'}</StatusBadge> },
    { id: 'actions', label: 'Acciones', align: 'right', render: (item) => <div className="flex justify-end gap-2"><RowActionButton label="Editar" icon={Pencil} disabled={busyId === item.id} onClick={() => openModal(item)} /><RowActionButton label={item.is_active ? 'Desactivar' : 'Activar'} icon={CheckCircle2} disabled={busyId === item.id} onClick={() => toggle(item)} /><RowActionButton label="Eliminar" icon={Trash2} disabled={busyId === item.id} variant="danger" onClick={() => remove(item)} /></div> },
  ];

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader title="Asignacion de operadores" description="Relaciona usuarios con cajas y puntos de venta autorizados." actions={[{ id: 'new-assignment', label: 'Nuevo', onClick: () => openModal() }]} />
      <KpiBar items={[{ id: 'cash', label: 'Cajas', value: stats.cash, active: scope === 'cash_register', onClick: () => setScope('cash_register') }, { id: 'pos', label: 'Puntos de venta', value: stats.pos, active: scope === 'sales_point', onClick: () => setScope('sales_point') }, { id: 'active', label: 'Activas', value: stats.active }, { id: 'inactive', label: 'Inactivas', value: stats.inactive }]} className="mb-4" />
      <FilterBar className="mb-4" gridClassName="lg:grid-cols-[minmax(280px,1fr)_190px_170px_auto_auto]" searchValue={search} searchPlaceholder="Buscar operador, usuario, caja o POS" onSearchChange={setSearch} onSearchSubmit={() => setPage(0)} fields={[{ id: 'scope', value: scope, onChange: setScope, options: [{ value: 'cash_register', label: 'Asignaciones a caja' }, { value: 'sales_point', label: 'Asignaciones a POS' }] }, { id: 'status', value: status, onChange: setStatus, options: [{ value: 'all', label: 'Todos los estados' }, { value: 'active', label: 'Activas' }, { value: 'inactive', label: 'Inactivas' }] }]} actions={<><ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={loadData} className={loading ? '[&>svg]:animate-spin' : ''} /><ActionButton label="Limpiar" icon={XCircle} variant="neutral" onClick={() => { setSearch(''); setStatus('all'); }} /></>} />
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
      <DataTable columns={columns} data={visible} loading={loading} emptyMessage="No hay asignaciones para mostrar." footer={<DataTablePagination page={page} pageSize={tablePageSize} pageSizeOptions={PAGE_SIZE_OPTIONS} total={filtered.length} hasMore={(page + 1) * tablePageSize < filtered.length} loading={loading} onPageChange={setPage} onPageSizeChange={(size) => { setTablePageSize(size); setPage(0); }} />} />
    </section>
  );
};

export default AdminOperatorAssignments;
