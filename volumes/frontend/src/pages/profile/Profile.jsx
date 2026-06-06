import { useCallback, useEffect, useMemo, useState } from 'react';
import { Camera, Check, KeyRound, MonitorSmartphone, Palette, RefreshCw, RotateCcw, Save, UserCircle } from 'lucide-react';
import { ActionButton } from '@/components/common/actions/ActionButton';
import BottomActionBar from '@/components/common/actions/BottomActionBar';
import DataTable from '@/components/common/data/DataTable';
import KpiBar from '@/components/common/data/KpiBar';
import StatusBadge from '@/components/common/data/StatusBadge';
import UserAvatar from '@/components/common/media/UserAvatar';
import ModuleTabs from '@/components/common/navigation/ModuleTabs';
import { authService } from '@/services/auth/authService';
import { profileService } from '@/services/profile/profileService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { PAGE_SIZE_OPTIONS, usePreferencesStore } from '@/store/usePreferencesStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatDateTime } from '@/utils/dateTime';
import { normalizePhoneForStorage } from '@/utils/phone';

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';

const Profile = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '' });
  const [password, setPassword] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mergeUserProfile = useAuthStore((state) => state.mergeUserProfile);
  const hydrateUser = useAuthStore((state) => state.hydrateUser);
  const theme = usePreferencesStore((state) => state.theme);
  const setTheme = usePreferencesStore((state) => state.setTheme);
  const timezone = usePreferencesStore((state) => state.timezone);
  const setTimezone = usePreferencesStore((state) => state.setTimezone);
  const tablePageSize = usePreferencesStore((state) => state.tablePageSize);
  const setTablePageSize = usePreferencesStore((state) => state.setTablePageSize);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextProfile, nextSessions] = await Promise.all([profileService.get(), profileService.sessions()]);
      setProfile(nextProfile);
      setSessions(nextSessions);
      setForm({ first_name: nextProfile.first_name || '', last_name: nextProfile.last_name || '', phone: nextProfile.phone || '' });
      setPendingAvatarFile(null);
      mergeUserProfile(nextProfile);
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar el perfil.'));
    } finally {
      setLoading(false);
    }
  }, [mergeUserProfile]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!pendingAvatarFile) {
      setPendingAvatarPreview('');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(pendingAvatarFile);
    setPendingAvatarPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [pendingAvatarFile]);

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.username || 'Usuario';
  const completeness = profile?.phone ? 100 : 80;
  const tabs = useMemo(() => [
    { id: 'profile', label: 'Datos personales', icon: UserCircle },
    { id: 'password', label: 'Cambiar contraseña', icon: KeyRound },
    { id: 'sessions', label: 'Sesiones activas', icon: MonitorSmartphone, count: sessions.length },
    { id: 'preferences', label: 'Personalizacion', icon: Palette },
  ], [sessions.length]);

  const hasProfileChanges = useMemo(() => (
    Boolean(pendingAvatarFile)
    || form.first_name !== (profile?.first_name || '')
    || form.last_name !== (profile?.last_name || '')
    || form.phone !== (profile?.phone || '')
  ), [form, pendingAvatarFile, profile]);

  const saveProfile = async () => {
    await notifyPromise((async () => {
      if (
        form.first_name !== (profile?.first_name || '')
        || form.last_name !== (profile?.last_name || '')
        || form.phone !== (profile?.phone || '')
      ) {
        await profileService.update({ ...form, phone: form.phone ? normalizePhoneForStorage(form.phone) : '' });
      }
      if (pendingAvatarFile) {
        await profileService.uploadAvatar(pendingAvatarFile);
      }
    })(), {
      loading: 'Guardando perfil...',
      success: 'Perfil actualizado.',
      error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar el perfil.'),
    });
    setPendingAvatarFile(null);
    await hydrateUser();
    await load();
  };

  const resetProfileChanges = () => {
    setForm({ first_name: profile?.first_name || '', last_name: profile?.last_name || '', phone: profile?.phone || '' });
    setPendingAvatarFile(null);
  };

  const savePassword = async () => {
    await notifyPromise(authService.changePassword(password), {
      loading: 'Actualizando contraseña...',
      success: 'Contraseña actualizada.',
      error: (requestError) => getBackendMessage(requestError, 'No fue posible cambiar la contraseña.'),
    });
    setPassword({ current_password: '', new_password: '', confirm_password: '' });
  };

  const savePreferences = async () => {
    await notifyPromise(profileService.updatePreferences({ theme, timezone, table_page_size: tablePageSize }), {
      loading: 'Guardando preferencias...',
      success: 'Preferencias guardadas.',
      error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar preferencias.'),
    });
  };

  const selectAvatar = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPendingAvatarFile(file);
  };

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Mi perfil</h1>
          <p className="mt-1 text-sm text-slate-500">Datos personales, seguridad, sesiones y preferencias de uso.</p>
        </div>
        <ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={load} className={loading ? '[&>svg]:animate-spin' : ''} />
      </div>

      <KpiBar items={[{ label: 'Perfil', value: `${completeness}%` }, { label: 'Roles', value: profile?.role_count || 0 }, { label: 'Permisos', value: profile?.permission_count || 0 }, { label: 'Sesiones', value: sessions.length }]} className="mb-4" />
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <ModuleTabs className="mb-4" activeTab={activeTab} onChange={setActiveTab} tabs={tabs} />

      {activeTab === 'profile' && (
        <>
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col items-center text-center">
                <UserAvatar src={pendingAvatarPreview || profile?.avatar?.thumb_url} alt={fullName} size="lg" placeholderClassName="text-slate-500" />
                <div className="mt-3 text-sm font-semibold">{fullName}</div>
                <div className="text-xs text-slate-500">{profile?.email}</div>
                <label className="mt-4 inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                  <Camera className="h-4 w-4" />
                  Seleccionar avatar
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={selectAvatar} />
                </label>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  {pendingAvatarFile ? 'Avatar pendiente de guardar.' : 'Se guarda sanitizado en WebP, sin metadata, con thumb 128x128 y full maximo 1024x1024.'}
                </p>
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm"><span className="font-medium">Nombre</span><input className={fieldClassName} value={form.first_name} onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))} /></label>
                <label className="space-y-1 text-sm"><span className="font-medium">Apellido</span><input className={fieldClassName} value={form.last_name} onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))} /></label>
                <label className="space-y-1 text-sm"><span className="font-medium">Telefono</span><input className={fieldClassName} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
                <label className="space-y-1 text-sm"><span className="font-medium">Correo</span><input className={`${fieldClassName} bg-slate-100 text-slate-500 dark:bg-slate-800`} value={profile?.email || ''} disabled readOnly /></label>
              </div>
            </div>
          </div>
          <BottomActionBar
            className="mt-4 rounded-md shadow-sm"
            leftContent={hasProfileChanges ? 'Cambios pendientes sin guardar.' : 'Perfil sin cambios pendientes.'}
            actions={[
              { id: 'reset', label: 'Descartar', icon: RotateCcw, variant: 'neutral', disabled: !hasProfileChanges || loading, onClick: resetProfileChanges },
              { id: 'save', label: 'Guardar', icon: Save, variant: 'primary', disabled: !hasProfileChanges || loading, onClick: saveProfile },
            ]}
          />
        </>
      )}

      {activeTab === 'password' && (
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm"><span className="font-medium">Contraseña actual</span><input type="password" className={fieldClassName} value={password.current_password} onChange={(event) => setPassword((current) => ({ ...current, current_password: event.target.value }))} /></label>
            <label className="space-y-1 text-sm"><span className="font-medium">Nueva contraseña</span><input type="password" className={fieldClassName} value={password.new_password} onChange={(event) => setPassword((current) => ({ ...current, new_password: event.target.value }))} /></label>
            <label className="space-y-1 text-sm"><span className="font-medium">Confirmar contraseña</span><input type="password" className={fieldClassName} value={password.confirm_password} onChange={(event) => setPassword((current) => ({ ...current, confirm_password: event.target.value }))} /></label>
          </div>
          <div className="mt-4 flex justify-end"><ActionButton label="Cambiar contraseña" icon={KeyRound} onClick={savePassword} /></div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <DataTable
          data={sessions}
          loading={loading}
          columns={[
            { id: 'device', label: 'Dispositivo', render: (item) => <><div className="font-medium">{item.device}</div><div className="text-xs text-slate-500">{item.ip_address}</div></> },
            { id: 'state', label: 'Estado', render: (item) => <StatusBadge variant="active">{item.is_current ? 'Actual' : item.status}</StatusBadge> },
            { id: 'date', label: 'Ultima actividad', render: (item) => formatDateTime(item.last_seen_at, timezone) },
          ]}
        />
      )}

      {activeTab === 'preferences' && (
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm"><span className="font-medium">Tema</span><select className={fieldClassName} value={theme} onChange={(event) => setTheme(event.target.value)}><option value="light">Claro</option><option value="dark">Oscuro</option></select></label>
            <label className="space-y-1 text-sm"><span className="font-medium">Zona horaria</span><input className={fieldClassName} value={timezone} onChange={(event) => setTimezone(event.target.value)} /></label>
            <label className="space-y-1 text-sm"><span className="font-medium">Filas por pagina</span><select className={fieldClassName} value={tablePageSize} onChange={(event) => setTablePageSize(Number(event.target.value))}>{PAGE_SIZE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          </div>
          <div className="mt-4 flex justify-end"><ActionButton label="Guardar preferencias" icon={Check} onClick={savePreferences} /></div>
        </div>
      )}
    </section>
  );
};

export default Profile;
