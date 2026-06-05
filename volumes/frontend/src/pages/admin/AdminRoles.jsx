/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, RefreshCw, Search, UserRoundCog, Users, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import DataTablePagination from '@/components/common/data/DataTablePagination';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import StatusBadge from '@/components/common/data/StatusBadge';
import { rolesService } from '@/services/admin/rolesService';
import { usersService } from '@/services/admin/usersService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { useAuthStore } from '@/store/useAuthStore';
import { PAGE_SIZE_OPTIONS, usePreferencesStore } from '@/store/usePreferencesStore';

const emptyRoleForm = {
  role_name: '',
  role_description: '',
};

const getUserInitials = (user) => {
  if (user.initials) return user.initials;
  const first = user.first_name?.[0] || user.display_name?.[0] || user.username?.[0] || 'U';
  const second = user.last_name?.[0] || user.username?.[1] || '';
  return `${first}${second}`.toUpperCase();
};

const RoleFormModal = ({ onSubmit, onClose }) => {
  const [form, setForm] = useState(emptyRoleForm);
  const [saving, setSaving] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await onSubmit({
        role_name: form.role_name.trim(),
        role_description: form.role_description.trim() || null,
      });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Nombre</span>
          <input
            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            value={form.role_name}
            onChange={(event) => updateField('role_name', event.target.value)}
            required
          />
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">Descripcion</span>
          <textarea
            className="min-h-24 w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            value={form.role_description}
            onChange={(event) => updateField('role_description', event.target.value)}
            maxLength={500}
          />
        </label>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
          {saving ? 'Guardando...' : 'Guardar perfil'}
        </button>
      </div>
    </form>
  );
};

const RoleUsersModal = ({ role, onChanged, onClose }) => {
  const currentUser = useAuthStore((state) => state.user);
  const [usersById, setUsersById] = useState({});
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [initialUserIds, setInitialUserIds] = useState([]);
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const rememberUsers = (nextUsers) => {
    setUsersById((current) => {
      const next = { ...current };
      nextUsers.forEach((user) => {
        next[user.id] = user;
      });
      return next;
    });
  };

  const hasChanges = useMemo(() => {
    const current = [...selectedUserIds].sort((left, right) => left - right).join(',');
    const initial = [...initialUserIds].sort((left, right) => left - right).join(',');
    return current !== initial;
  }, [initialUserIds, selectedUserIds]);

  const selectedCount = selectedUserIds.length;
  const pendingAddCount = selectedUserIds.filter((userId) => !initialUserIds.includes(userId)).length;
  const pendingRemoveCount = initialUserIds.filter((userId) => !selectedUserIds.includes(userId)).length;
  const isEditable = role.is_active;
  const currentUserId = Number(currentUser?.id || currentUser?.user_id || 0);
  const initialSet = useMemo(() => new Set(initialUserIds), [initialUserIds]);
  const selectedSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds]);

  const workingUsers = useMemo(() => {
    const ids = Array.from(new Set([...initialUserIds, ...selectedUserIds]));
    return ids
      .map((userId) => usersById[userId])
      .filter(Boolean)
      .sort((left, right) => {
        const leftRemoved = initialSet.has(left.id) && !selectedSet.has(left.id) ? 1 : 0;
        const rightRemoved = initialSet.has(right.id) && !selectedSet.has(right.id) ? 1 : 0;
        if (leftRemoved !== rightRemoved) return leftRemoved - rightRemoved;
        return (left.display_name || left.username || '').localeCompare(right.display_name || right.username || '');
      });
  }, [initialSet, initialUserIds, selectedSet, selectedUserIds, usersById]);

  useEffect(() => {
    let mounted = true;

    const loadAssignedUsers = async () => {
      setLoading(true);
      setFormError('');

      try {
        const data = await usersService.list({
          status: 'all',
          active_only: false,
          role_code: role.role_code,
          limit: 1000,
        });
        if (!mounted) return;

        const nextUsers = data.users || [];
        const assignedIds = nextUsers.map((user) => user.id);

        rememberUsers(nextUsers);
        setSelectedUserIds(assignedIds);
        setInitialUserIds(assignedIds);
      } catch (requestError) {
        if (!mounted) return;
        setFormError(getBackendMessage(requestError, 'No fue posible cargar usuarios del perfil.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadAssignedUsers();

    return () => {
      mounted = false;
    };
  }, [role.id, role.role_code]);

  useEffect(() => {
    const term = search.trim();

    if (term.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return undefined;
    }

    let mounted = true;
    const timer = setTimeout(async () => {
      setSearching(true);
      setFormError('');

      try {
        const data = await usersService.list({
          status: 'all',
          active_only: false,
          search: term,
          limit: 20,
        });
        if (!mounted) return;

        const nextUsers = data.users || [];
        rememberUsers(nextUsers);
        setSearchResults(nextUsers);
      } catch (requestError) {
        if (!mounted) return;
        setFormError(getBackendMessage(requestError, 'No fue posible buscar usuarios.'));
      } finally {
        if (mounted) setSearching(false);
      }
    }, 350);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [search]);

  const toggleUser = (userId) => {
    if (!isEditable) return;
    if (Number(userId) === currentUserId) {
      setFormError('No puedes modificar los roles de tu propia cuenta.');
      return;
    }
    setFormError('');
    setSelectedUserIds((current) => (
      current.includes(userId)
        ? current.filter((selectedUserId) => selectedUserId !== userId)
        : [...current, userId]
    ));
  };

  const updateChangedUsers = async () => {
    const initialSet = new Set(initialUserIds);
    const selectedSet = new Set(selectedUserIds);
    const changedUserIds = Array.from(new Set([...initialUserIds, ...selectedUserIds]))
      .filter((userId) => initialSet.has(userId) !== selectedSet.has(userId))
      .filter((userId) => Number(userId) !== currentUserId);

    for (const userId of changedUserIds) {
      const rolesData = await usersService.getRoles(userId);
      const currentRoleIds = (rolesData.assigned_roles || []).map((assignedRole) => assignedRole.id);
      const nextRoleIds = selectedSet.has(userId)
        ? Array.from(new Set([...currentRoleIds, role.id]))
        : currentRoleIds.filter((roleId) => roleId !== role.id);

      await usersService.updateRoles(userId, {
        role_ids: nextRoleIds,
        reason: reason.trim(),
      });
    }

    return changedUserIds.length;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!hasChanges) {
      onClose?.();
      return;
    }

    if (!isEditable) {
      setFormError('No es posible modificar usuarios de un perfil inactivo.');
      return;
    }

    const changedUserIds = Array.from(new Set([...initialUserIds, ...selectedUserIds]))
      .filter((userId) => initialSet.has(userId) !== selectedSet.has(userId))
      .filter((userId) => Number(userId) !== currentUserId);

    if (changedUserIds.length === 0) {
      setFormError('No hay cambios aplicables para guardar.');
      return;
    }

    if (reason.trim().length < 3) {
      setFormError('Debes indicar un motivo del cambio.');
      return;
    }

    setSaving(true);
    try {
      await notifyPromise(
        updateChangedUsers(),
        {
          loading: 'Actualizando usuarios del perfil...',
          success: (changedCount) => `${changedCount} usuario${changedCount === 1 ? '' : 's'} actualizado${changedCount === 1 ? '' : 's'}.`,
          error: (requestError) => getBackendMessage(requestError, 'No fue posible actualizar los usuarios del perfil.'),
        }
      );
      await onChanged?.();
      onClose?.();
    } catch (requestError) {
      setFormError(getBackendMessage(requestError, 'No fue posible actualizar los usuarios del perfil.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Perfil</div>
            <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{role.role_name}</div>
            <div className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">{role.role_code}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-right text-xs">
            <div className="rounded-md bg-white px-3 py-2 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
              <div className="font-semibold text-slate-950 dark:text-white">{selectedCount}</div>
              <div className="text-slate-500 dark:text-slate-400">Asignados</div>
            </div>
            <div className="rounded-md bg-white px-3 py-2 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
              <div className="font-semibold text-slate-950 dark:text-white">+{pendingAddCount} / -{pendingRemoveCount}</div>
              <div className="text-slate-500 dark:text-slate-400">Pendientes</div>
            </div>
          </div>
        </div>
        {!isEditable && (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            Perfil inactivo. Puedes revisar usuarios asociados, pero no modificar asignaciones.
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <aside className="space-y-3 xl:order-2">
          <div className="relative">
            <input
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-3 pr-10 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar usuario para agregar"
              disabled={!isEditable}
            />
            <Search className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${searching ? 'animate-pulse' : ''}`} />
          </div>

          <div className="rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Resultados de busqueda
          </div>
          <div className="h-48 overflow-y-auto p-2">
            {searchResults.map((user) => {
              const selected = selectedSet.has(user.id);
              const pendingAdd = !initialSet.has(user.id) && selected;
              const pendingRemoval = initialSet.has(user.id) && !selected;
              const isCurrentUser = Number(user.id) === currentUserId;
              return (
                <div key={user.id} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/70">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {getUserInitials(user)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-900 dark:text-slate-100">{user.display_name || user.username}</div>
                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">{user.username}{user.email ? ` - ${user.email}` : ''}</div>
                  </div>
                  <button
                    type="button"
                    disabled={!isEditable || isCurrentUser || (selected && !pendingRemoval && !pendingAdd)}
                    onClick={() => toggleUser(user.id)}
                    className="h-8 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {isCurrentUser ? 'Tu cuenta' : pendingRemoval ? 'Restaurar' : pendingAdd ? 'Quitar' : selected ? 'Asignado' : 'Agregar'}
                  </button>
                </div>
              );
            })}
            {search.trim().length < 2 && (
              <div className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Ingresa al menos 2 caracteres para buscar usuarios.
              </div>
            )}
            {!searching && search.trim().length >= 2 && searchResults.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No se encontraron usuarios.
              </div>
            )}
            {searching && (
              <div className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Buscando usuarios...
              </div>
            )}
          </div>
          </div>
        </aside>

        <div className="xl:order-1">

      {loading ? (
        <div className="rounded-md border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Cargando usuarios asociados...
        </div>
      ) : (
        <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Usuarios del perfil</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Pulsa una card para marcarla como remover. Los cambios se aplican al guardar.</div>
            </div>
          </div>
          <div className="grid max-h-[360px] gap-3 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
            {workingUsers.map((user) => {
              const selected = selectedSet.has(user.id);
              const pendingAdd = !initialSet.has(user.id) && selected;
              const pendingRemoval = initialSet.has(user.id) && !selected;
              const isCurrentUser = Number(user.id) === currentUserId;
              return (
                <button
                  key={user.id}
                  type="button"
                  disabled={!isEditable || isCurrentUser}
                  onClick={() => toggleUser(user.id)}
                  className={`group flex min-h-24 w-full items-start gap-3 rounded-md border p-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-70 ${pendingRemoval ? 'border-red-300 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100' : pendingAdd ? 'border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100' : 'border-slate-200 bg-white hover:border-red-200 hover:bg-red-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-red-900 dark:hover:bg-red-950/20'}`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${pendingRemoval ? 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-100' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                    {getUserInitials(user)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-900 dark:text-slate-100">{user.display_name || user.username}</div>
                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">{user.username}{user.email ? ` - ${user.email}` : ''}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${user.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                      {pendingAdd && (
                        <span className="rounded-md bg-blue-100 px-2 py-1 text-[11px] font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">Agregar</span>
                      )}
                      {pendingRemoval && (
                        <span className="rounded-md bg-red-100 px-2 py-1 text-[11px] font-medium text-red-700 dark:bg-red-900/50 dark:text-red-200">Remover</span>
                      )}
                      {isCurrentUser && (
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">Tu cuenta</span>
                      )}
                      {!isCurrentUser && !pendingAdd && !pendingRemoval && (
                        <span className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-slate-500 opacity-0 ring-1 ring-slate-200 transition group-hover:opacity-100 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-800">
                          Marcar remover
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {workingUsers.length === 0 && (
              <div className="rounded-md border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 sm:col-span-2 xl:col-span-3">
                Este perfil no tiene usuarios asociados. Usa la busqueda para agregar usuarios.
              </div>
            )}
          </div>
        </div>
      )}
        </div>
      </div>

      <label className="space-y-1.5 text-sm">
        <span className="font-semibold text-slate-800 dark:text-slate-100">Motivo del cambio</span>
        <textarea
          className="min-h-20 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:disabled:bg-slate-900 dark:focus:border-blue-500 dark:focus:ring-blue-950"
          placeholder="Ejemplo: Ajuste de perfil solicitado por jefatura."
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          minLength={3}
          maxLength={500}
          disabled={!hasChanges || !isEditable}
          required={hasChanges && isEditable}
        />
        <span className="block text-xs text-slate-500 dark:text-slate-400">Requerido solo si modificas usuarios asignados.</span>
      </label>

      {formError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {formError}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
          Cancelar
        </button>
        <button type="submit" disabled={saving || loading || !isEditable} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
          {saving ? 'Guardando...' : 'Guardar usuarios'}
        </button>
      </div>
    </form>
  );
};

const AdminRoles = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: 'active',
    type: 'all',
  });
  const [page, setPage] = useState(0);
  const [pagination, setPagination] = useState({
    totalFound: 0,
    hasMore: false,
  });
  const tablePageSize = usePreferencesStore((state) => state.tablePageSize);
  const setTablePageSize = usePreferencesStore((state) => state.setTablePageSize);
  const [loading, setLoading] = useState(false);
  const [busyRoleId, setBusyRoleId] = useState(null);
  const [error, setError] = useState('');

  const visibleRoles = useMemo(() => (
    [...roles]
      .filter((role) => (filters.type === 'system' ? role.is_system_role : filters.type === 'custom' ? !role.is_system_role : true))
      .sort((left, right) => (left.role_name || '').localeCompare(right.role_name || ''))
  ), [filters.type, roles]);

  const stats = useMemo(() => ({
    total: roles.length,
    active: roles.filter((role) => role.is_active).length,
    system: roles.filter((role) => role.is_system_role).length,
    custom: roles.filter((role) => !role.is_system_role).length,
  }), [roles]);

  const loadRoles = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await rolesService.list({
        skip: page * tablePageSize,
        limit: tablePageSize,
        active_only: filters.status === 'active',
        include_system: true,
        search: search.length >= 2 ? search : undefined,
      });
      setRoles(data.roles || []);
      setPagination({
        totalFound: data.total_found || 0,
        hasMore: Boolean(data.pagination?.has_more),
      });
      const summaryData = await rolesService.summary();
      setSummary(summaryData);
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar perfiles.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, page, tablePageSize]);

  useEffect(() => {
    if (search.length === 1) return undefined;

    const timer = setTimeout(() => {
      if (page !== 0) {
        setPage(0);
      } else {
        loadRoles();
      }
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const setFilter = (field, value) => {
    setPage(0);
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const openCreateModal = () => {
    ModalManager.show({
      type: 'custom',
      title: 'Nuevo perfil',
      size: 'large',
      showFooter: false,
      contentComponent: RoleFormModal,
      contentProps: {
        onSubmit: async (payload) => {
          await notifyPromise(
            rolesService.create(payload),
            {
              loading: 'Creando perfil...',
              success: 'Perfil creado correctamente.',
              error: (requestError) => getBackendMessage(requestError, 'No fue posible crear el perfil.'),
            }
          );
          await loadRoles();
        },
      },
    });
  };

  const viewPermissions = (role) => {
    navigate(`/admin/roles/permissions?roleId=${role.id}`);
  };

  const openRoleUsersModal = (role) => {
    if (role.role_code === 'SUPER_ADMIN') {
      ModalManager.info({
        title: 'Perfil reservado',
        message: 'Super Admin solo puede estar asignado al usuario root.',
        content: 'Este perfil forma parte de la administracion base del sistema y no se gestiona como un perfil operativo.',
        buttons: {
          close: 'Entendido',
        },
      });
      return;
    }

    ModalManager.show({
      type: 'custom',
      title: 'Usuarios del perfil',
      size: 'fullscreenWide',
      showFooter: false,
      contentComponent: RoleUsersModal,
      contentProps: {
        role,
        onChanged: loadRoles,
      },
    });
  };

  const deactivateRole = async (role) => {
    if (role.is_system_role) {
      ModalManager.info({
        title: 'Perfil de sistema',
        message: 'No es posible desactivar perfiles de sistema.',
        content: 'Estos perfiles forman parte de la configuracion base de seguridad y deben permanecer disponibles.',
        buttons: {
          close: 'Entendido',
        },
      });
      return;
    }

    if (!role.is_active) return;

    const confirmed = await ModalManager.confirm({
      title: 'Desactivar perfil',
      message: `Confirma que deseas desactivar el perfil ${role.role_name}.`,
      buttons: {
        cancel: 'Cancelar',
        confirm: 'Desactivar',
      },
    });

    if (!confirmed) return;

    setBusyRoleId(role.id);
    try {
      await notifyPromise(
        rolesService.changeActivation(role.id, {
          is_active: false,
          reason: 'Desactivacion desde administracion',
        }),
        {
          loading: 'Desactivando perfil...',
          success: 'Perfil desactivado.',
          error: (requestError) => getBackendMessage(requestError, 'No fue posible desactivar el perfil.'),
        }
      );
      await loadRoles();
    } finally {
      setBusyRoleId(null);
    }
  };

  const kpiItems = [
    {
      id: 'total',
      label: 'Total',
      value: summary?.total_roles ?? stats.total,
      active: filters.status === 'all' && filters.type === 'all',
      onClick: () => {
        setPage(0);
        setFilters({ status: 'all', type: 'all' });
      },
    },
    {
      id: 'active',
      label: 'Activos',
      value: summary?.active_roles ?? stats.active,
      active: filters.status === 'active',
      onClick: () => setFilter('status', 'active'),
    },
    {
      id: 'system',
      label: 'Sistema',
      value: summary?.system_roles ?? stats.system,
      active: filters.type === 'system',
      onClick: () => setFilter('type', 'system'),
    },
    {
      id: 'custom',
      label: 'Custom',
      value: summary?.editable_roles ?? stats.custom,
      active: filters.type === 'custom',
      onClick: () => setFilter('type', 'custom'),
    },
  ];

  const filterFields = [
    {
      id: 'status',
      value: filters.status,
      onChange: (value) => setFilter('status', value),
      options: [
        { value: 'all', label: 'Todos los estados' },
        { value: 'active', label: 'Activos' },
      ],
    },
    {
      id: 'type',
      value: filters.type,
      onChange: (value) => setFilter('type', value),
      options: [
        { value: 'all', label: 'Todos los tipos' },
        { value: 'system', label: 'Sistema' },
        { value: 'custom', label: 'Custom / usuario' },
      ],
    },
  ];

  const roleColumns = [
    {
      id: 'role',
      label: 'Rol',
      sortable: true,
      sortValue: (role) => role.role_name,
      render: (role) => (
        <>
          <div className="font-medium">{role.role_name}</div>
          <div className="font-mono text-xs text-slate-500">{role.role_code}</div>
        </>
      ),
    },
    {
      id: 'type',
      label: 'Tipo',
      sortable: true,
      sortValue: (role) => (role.is_system_role ? 'Sistema' : 'Custom'),
      render: (role) => (
        <span className={`rounded-md px-2 py-1 text-xs font-medium ${role.is_system_role ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'}`}>
          {role.is_system_role ? 'Sistema' : 'Custom / usuario'}
        </span>
      ),
    },
    {
      id: 'users',
      label: 'Usuarios',
      sortable: true,
      sortValue: (role) => role.users_count,
      render: (role) => role.users_count,
    },
    {
      id: 'permissions',
      label: 'Permisos',
      sortable: true,
      sortValue: (role) => role.permissions_count,
      render: (role) => role.permissions_count,
    },
    {
      id: 'status',
      label: 'Estado',
      sortable: true,
      sortValue: (role) => role.is_active,
      render: (role) => <StatusBadge variant={role.is_active ? 'active' : 'inactive'}>{role.is_active ? 'Activo' : 'Inactivo'}</StatusBadge>,
    },
    {
      id: 'actions',
      label: 'Acciones',
      align: 'right',
      render: (role) => (
        <div className="flex justify-end gap-2">
          <RowActionButton label="Ver perfil" icon={Eye} onClick={() => viewPermissions(role)} />
          <RowActionButton label="Usuarios del perfil" icon={Users} onClick={() => openRoleUsersModal(role)} />
          <RowActionButton
            label="Desactivar perfil"
            icon={EyeOff}
            variant="danger"
            disabled={!role.is_active || busyRoleId === role.id}
            onClick={() => deactivateRole(role)}
          />
        </div>
      ),
    },
  ];

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Roles</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Catalogo de perfiles de acceso y estado operativo.
          </p>
        </div>
        <ActionButton label="Nuevo Perfil" icon={UserRoundCog} onClick={openCreateModal} />
      </div>

      <KpiBar items={kpiItems} className="mb-4" />

      <FilterBar
        className="mb-4"
        searchValue={search}
        searchPlaceholder="Buscar perfil o codigo"
        onSearchChange={setSearch}
        onSearchSubmit={loadRoles}
        fields={filterFields}
        gridClassName="lg:grid-cols-[minmax(280px,1fr)_180px_180px_auto_auto]"
        actions={(
          <>
            <ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={loadRoles} className={loading ? '[&>svg]:animate-spin' : ''} />
            <ActionButton
              label="Limpiar"
              icon={XCircle}
              variant="neutral"
              onClick={() => {
                setSearch('');
                setPage(0);
                setFilters({ status: 'active', type: 'all' });
              }}
            />
          </>
        )}
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <DataTable
        columns={roleColumns}
        data={visibleRoles}
        loading={loading}
        emptyMessage="No hay perfiles para los filtros actuales."
        footer={(
          <DataTablePagination
            page={page}
            pageSize={tablePageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            total={pagination.totalFound}
            hasMore={pagination.hasMore}
            loading={loading}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPage(0);
              setTablePageSize(nextPageSize);
            }}
          />
        )}
      />
    </section>
  );
};

export default AdminRoles;
