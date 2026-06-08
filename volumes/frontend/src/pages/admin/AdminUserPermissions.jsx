import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, RefreshCw, Save, Search, ShieldCheck, UserCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BottomActionBar from '@/components/common/actions/BottomActionBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import PermissionMatrix from '@/components/common/permissions/PermissionMatrix';
import { usersService } from '@/services/admin/usersService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';

const AdminUserPermissions = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userIdParam = Number(searchParams.get('userId'));
  const [selectedUser, setSelectedUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [directPermissionIds, setDirectPermissionIds] = useState([]);
  const [initialDirectPermissionIds, setInitialDirectPermissionIds] = useState([]);
  const [inheritedPermissionIds, setInheritedPermissionIds] = useState([]);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const hasChanges = useMemo(() => {
    const current = [...directPermissionIds].sort((left, right) => left - right).join(',');
    const initial = [...initialDirectPermissionIds].sort((left, right) => left - right).join(',');
    return current !== initial;
  }, [directPermissionIds, initialDirectPermissionIds]);

  const effectivePermissionIds = useMemo(
    () => Array.from(new Set([...directPermissionIds, ...inheritedPermissionIds])),
    [directPermissionIds, inheritedPermissionIds]
  );

  const filteredPermissions = useMemo(() => {
    const term = permissionSearch.trim().toLowerCase();
    if (!term) return permissions;

    return permissions.filter((permission) => (
      permission.permission_code?.toLowerCase().includes(term)
      || permission.permission_name?.toLowerCase().includes(term)
      || permission.permission_group?.toLowerCase().includes(term)
    ));
  }, [permissionSearch, permissions]);

  const loadPermissions = async () => {
    if (!userIdParam) {
      setError('Selecciona un usuario desde Administracion > Usuarios.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await usersService.getPermissions(userIdParam);
      setSelectedUser(data.user || null);
      setPermissions(data.permissions || []);
      setDirectPermissionIds(data.direct_permission_ids || []);
      setInitialDirectPermissionIds(data.direct_permission_ids || []);
      setInheritedPermissionIds(data.inherited_permission_ids || []);
      setChangeReason('');
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar permisos especiales del usuario.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIdParam]);

  const togglePermission = (permissionId) => {
    if (inheritedPermissionIds.includes(permissionId)) return;

    setDirectPermissionIds((current) => (
      current.includes(permissionId)
        ? current.filter((selectedPermissionId) => selectedPermissionId !== permissionId)
        : [...current, permissionId]
    ));
  };

  const savePermissions = async () => {
    setError('');

    if (!selectedUser || !hasChanges) return;

    if (changeReason.trim().length < 3) {
      setError('Debes indicar un motivo del cambio.');
      return;
    }

    setSaving(true);

    try {
      await notifyPromise(
        usersService.updatePermissions(selectedUser.id, {
          permission_ids: directPermissionIds,
          reason: changeReason.trim(),
        }),
        {
          loading: 'Actualizando permisos especiales...',
          success: 'Permisos especiales actualizados.',
          error: (requestError) => getBackendMessage(requestError, 'No fue posible actualizar permisos especiales.'),
        }
      );
      await loadPermissions();
    } finally {
      setSaving(false);
    }
  };

  const selectedUserName = selectedUser?.display_name || selectedUser?.username || '';
  const selectedUserDetail = selectedUser?.email || selectedUser?.username || 'Excepciones de acceso por usuario.';

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title={selectedUserName ? `Permisos especiales - ${selectedUserName}` : 'Permisos especiales'}
        description={selectedUserDetail}
        actions={[
          { id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate('/admin/users') },
          { id: 'refresh', label: 'Refrescar', icon: RefreshCw, variant: 'neutral', onClick: loadPermissions, className: loading ? '[&>svg]:animate-spin' : '' },
          { id: 'save', label: saving ? 'Guardando...' : 'Guardar permisos', icon: Save, disabled: !hasChanges || saving || loading || !selectedUser, onClick: savePermissions },
        ]}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {[
          ['Usuario', selectedUser?.username || '-', UserCircle],
          ['Heredados', inheritedPermissionIds.length, ShieldCheck],
          ['Especiales', directPermissionIds.length, ShieldCheck],
          ['Efectivos', effectivePermissionIds.length, ShieldCheck],
        ].map(([label, value, Icon]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{label}</p>
              <Icon className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-1 truncate text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-4 p-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            Usa esta pantalla para entregar accesos puntuales a este usuario sin cambiar su perfil principal. Los accesos que ya vienen desde sus roles se muestran como referencia y no requieren ajuste aqui.
          </div>

          <div className="flex h-10 min-w-72 flex-1 items-center rounded-md border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
            <input
              value={permissionSearch}
              onChange={(event) => setPermissionSearch(event.target.value)}
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
              placeholder="Buscar permiso, codigo o grupo"
            />
            <Search className="h-4 w-4 text-slate-400" />
          </div>

          <label className="space-y-1.5 text-sm">
            <span className="font-semibold text-slate-800 dark:text-slate-100">Motivo del cambio</span>
            <textarea
              className="min-h-20 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:disabled:bg-slate-900 dark:focus:border-blue-500 dark:focus:ring-blue-950"
              placeholder="Ejemplo: Acceso temporal requerido para apoyar operacion de caja."
              value={changeReason}
              onChange={(event) => setChangeReason(event.target.value)}
              minLength={3}
              maxLength={500}
              disabled={!hasChanges}
              required={hasChanges}
            />
            <span className="block text-xs text-slate-500 dark:text-slate-400">Requerido solo si modificas permisos especiales.</span>
          </label>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-md border border-slate-200 px-4 py-12 text-center text-sm text-slate-500 dark:border-slate-800">
              Cargando permisos...
            </div>
          ) : (
            <PermissionMatrix
              permissions={filteredPermissions}
              selectedPermissionIds={effectivePermissionIds}
              inheritedPermissionIds={inheritedPermissionIds}
              onToggle={togglePermission}
              disabled={!selectedUser}
            />
          )}

          <BottomActionBar
            actions={[
              {
                id: 'back',
                label: 'Volver',
                variant: 'neutral',
                onClick: () => navigate('/admin/users'),
              },
              {
                id: 'save',
                label: saving ? 'Guardando...' : 'Guardar permisos',
                icon: Save,
                variant: 'primary',
                disabled: !hasChanges || saving || loading || !selectedUser,
                onClick: savePermissions,
              },
            ]}
          />
        </div>
      </section>
    </section>
  );
};

export default AdminUserPermissions;
