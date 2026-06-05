/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound, Pencil, RefreshCw, Search, SlidersHorizontal, UserCog, XCircle } from 'lucide-react';
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
import { PAGE_SIZE_OPTIONS, usePreferencesStore } from '@/store/usePreferencesStore';
import { formatDateTime } from '@/utils/dateTime';

const emptyUserForm = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  phone: '',
  role_id: '',
  password: '',
  confirm_password: '',
};

const toCreatePayload = (form) => ({
  username: form.username,
  email: form.email,
  first_name: form.first_name,
  last_name: form.last_name,
  phone: form.phone || null,
  role_id: Number(form.role_id),
  password: form.password,
  confirm_password: form.confirm_password,
});

const toUpdatePayload = (form) => ({
  email: form.email,
  first_name: form.first_name,
  last_name: form.last_name,
  phone: form.phone || null,
});

const userToForm = (user) => ({
  username: user.username || '',
  email: user.email || '',
  first_name: user.first_name || '',
  last_name: user.last_name || '',
  phone: user.phone || '',
  role_id: '',
  password: '',
  confirm_password: '',
});

const emptyPasswordForm = {
  new_password: '',
  confirm_password: '',
  reason: '',
};

const passwordPolicyRequirements = [
  { id: 'length', label: 'Minimo 8 caracteres', shortLabel: '8 caracteres', test: (value) => value.length >= 8 },
  { id: 'lowercase', label: 'Una letra minuscula', shortLabel: 'Minuscula', test: (value) => /[a-z]/.test(value) },
  { id: 'uppercase', label: 'Una letra mayuscula', shortLabel: 'Mayuscula', test: (value) => /[A-Z]/.test(value) },
  { id: 'number', label: 'Un numero', shortLabel: 'Numero', test: (value) => /\d/.test(value) },
  { id: 'special', label: 'Un signo o caracter especial', shortLabel: 'Simbolo', test: (value) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?]/.test(value) },
];

const getPasswordStrength = (password) => {
  const checks = passwordPolicyRequirements.map((requirement) => ({
    ...requirement,
    passed: requirement.test(password),
  }));
  const score = checks.filter((check) => check.passed).length;
  const percent = (score / passwordPolicyRequirements.length) * 100;

  if (!password) {
    return { checks, score, percent: 0, label: 'Sin evaluar', barClass: 'bg-slate-300', textClass: 'text-slate-500', valid: false };
  }

  if (score <= 2) {
    return { checks, score, percent, label: 'Debil', barClass: 'bg-red-500', textClass: 'text-red-600 dark:text-red-300', valid: false };
  }

  if (score <= 4) {
    return { checks, score, percent, label: 'Media', barClass: 'bg-amber-500', textClass: 'text-amber-700 dark:text-amber-300', valid: false };
  }

  return { checks, score, percent, label: 'Fuerte', barClass: 'bg-emerald-500', textClass: 'text-emerald-700 dark:text-emerald-300', valid: true };
};

const getUserInitials = (user) => {
  const source = user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Usuario';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

const getReadonlyUserRoles = (user) => {
  const roleNames = user?.role_names?.length ? user.role_names : [];
  const roleCodes = user?.roles?.length ? user.roles : [];

  if (roleNames.length) {
    return roleNames.map((roleName, index) => ({
      id: `${roleCodes[index] || roleName}-${index}`,
      name: roleName,
      code: roleCodes[index] || '',
    }));
  }

  return roleCodes.map((roleCode, index) => ({
    id: `${roleCode}-${index}`,
    name: roleCode,
    code: roleCode,
  }));
};

const UserFormModal = ({ mode = 'create', initialValues = emptyUserForm, user = null, roleOptions = [], onSubmit, onClose }) => {
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({
    password: false,
    confirm_password: false,
  });
  const isEdit = mode === 'edit';
  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);
  const activeRoleOptions = useMemo(
    () => roleOptions.filter((role) => role.is_active !== false && role.role_code !== 'SUPER_ADMIN'),
    [roleOptions]
  );
  const readonlyRoles = useMemo(() => getReadonlyUserRoles(user), [user]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const togglePasswordVisibility = (field) => {
    setVisiblePasswords((current) => ({ ...current, [field]: !current[field] }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!isEdit && !form.role_id) {
      setFormError('Debes seleccionar un perfil inicial para el usuario.');
      return;
    }

    if (!isEdit && form.password !== form.confirm_password) {
      setFormError('La clave temporal y su confirmacion deben coincidir.');
      return;
    }

    if (!isEdit && !passwordStrength.valid) {
      setFormError('La clave temporal no cumple la politica de seguridad.');
      return;
    }

    setSaving(true);

    try {
      await onSubmit(isEdit ? toUpdatePayload(form) : toCreatePayload(form));
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-950 dark:text-white">{isEdit ? 'Datos del usuario' : 'Alta de usuario'}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {isEdit ? 'Actualiza los datos principales de la cuenta.' : 'Define identidad, perfil inicial y clave temporal.'}
            </div>
          </div>
          {!isEdit && (
            <span className="rounded-md bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900">
              Perfil requerido
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {!isEdit && (
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Usuario</span>
            <input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950" value={form.username} onChange={(event) => updateField('username', event.target.value)} required />
          </label>
        )}
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Email</span>
          <input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} required />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Nombre</span>
          <input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950" value={form.first_name} onChange={(event) => updateField('first_name', event.target.value)} required />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Apellido</span>
          <input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950" value={form.last_name} onChange={(event) => updateField('last_name', event.target.value)} required />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Telefono</span>
          <input className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
        </label>
        {!isEdit && (
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Perfil inicial</span>
            <select className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950" value={form.role_id} onChange={(event) => updateField('role_id', event.target.value)} required>
              <option value="">Selecciona un perfil</option>
              {activeRoleOptions.map((role) => (
                <option key={role.id} value={role.id}>{role.role_name}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {isEdit && (
        <div className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Perfiles asignados</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Solo lectura. La asignacion se modifica desde la accion Administrar roles.
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {readonlyRoles.length > 0 ? (
              readonlyRoles.map((role) => (
                <span key={role.id} className="inline-flex min-h-8 items-center rounded-md border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                  {role.name}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500 dark:text-slate-400">Sin perfiles asignados</span>
            )}
          </div>
        </div>
      )}

      {!isEdit && (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-semibold text-slate-800 dark:text-slate-100">Clave temporal</span>
              <div className="relative">
                <input className="h-11 w-full rounded-md border border-slate-300 px-3 pr-10 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950" type={visiblePasswords.password ? 'text' : 'password'} placeholder="Ingrese la clave temporal" value={form.password} onChange={(event) => updateField('password', event.target.value)} required />
                <button type="button" className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100" onClick={() => togglePasswordVisibility('password')} aria-label={visiblePasswords.password ? 'Ocultar clave temporal' : 'Mostrar clave temporal'}>
                  {visiblePasswords.password ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-semibold text-slate-800 dark:text-slate-100">Confirmar clave</span>
              <div className="relative">
                <input className="h-11 w-full rounded-md border border-slate-300 px-3 pr-10 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950" type={visiblePasswords.confirm_password ? 'text' : 'password'} placeholder="Repita la clave" value={form.confirm_password} onChange={(event) => updateField('confirm_password', event.target.value)} required />
                <button type="button" className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100" onClick={() => togglePasswordVisibility('confirm_password')} aria-label={visiblePasswords.confirm_password ? 'Ocultar confirmacion de clave' : 'Mostrar confirmacion de clave'}>
                  {visiblePasswords.confirm_password ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-100">Politica de clave</span>
              <span className={`font-medium ${passwordStrength.textClass}`}>{passwordStrength.label}</span>
            </div>
            <div className="h-1 rounded-full bg-slate-200 dark:bg-slate-800">
              <div className={`h-full rounded-full transition-all ${passwordStrength.barClass}`} style={{ width: `${passwordStrength.percent}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {passwordStrength.checks.map((check) => (
                <span key={check.id} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${check.passed ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'}`}>
                  <span>{check.passed ? '✓' : '×'}</span>
                  {check.shortLabel}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {formError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {formError}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
};

const PasswordChangeModal = ({ user, onSubmit, onClose }) => {
  const [form, setForm] = useState(emptyPasswordForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({
    new_password: false,
    confirm_password: false,
  });
  const passwordStrength = useMemo(() => getPasswordStrength(form.new_password), [form.new_password]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const togglePasswordVisibility = (field) => {
    setVisiblePasswords((current) => ({ ...current, [field]: !current[field] }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (form.new_password !== form.confirm_password) {
      setFormError('La nueva clave y su confirmacion deben coincidir.');
      return;
    }

    if (!passwordStrength.valid) {
      setFormError('La nueva clave no cumple la politica de seguridad.');
      return;
    }

    setSaving(true);

    try {
      await onSubmit({
        new_password: form.new_password,
        confirm_password: form.confirm_password,
        reason: form.reason.trim(),
      });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
              {getUserInitials(user)}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Usuario afectado</div>
              <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">{user.display_name || user.username}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Cuenta</div>
            <div className="mt-1 rounded-md bg-white px-2 py-1 font-mono text-xs text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800">
              {user.username}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="font-semibold text-slate-800 dark:text-slate-100">Nueva clave</span>
          <div className="relative">
            <input className="h-11 w-full rounded-md border border-slate-300 px-3 pr-10 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950" type={visiblePasswords.new_password ? 'text' : 'password'} placeholder="Ingrese la nueva clave" value={form.new_password} onChange={(event) => updateField('new_password', event.target.value)} required />
            <button type="button" className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100" onClick={() => togglePasswordVisibility('new_password')} aria-label={visiblePasswords.new_password ? 'Ocultar nueva clave' : 'Mostrar nueva clave'}>
              {visiblePasswords.new_password ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-semibold text-slate-800 dark:text-slate-100">Confirmar clave</span>
          <div className="relative">
            <input className="h-11 w-full rounded-md border border-slate-300 px-3 pr-10 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950" type={visiblePasswords.confirm_password ? 'text' : 'password'} placeholder="Repita la clave" value={form.confirm_password} onChange={(event) => updateField('confirm_password', event.target.value)} required />
            <button type="button" className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100" onClick={() => togglePasswordVisibility('confirm_password')} aria-label={visiblePasswords.confirm_password ? 'Ocultar confirmacion de clave' : 'Mostrar confirmacion de clave'}>
              {visiblePasswords.confirm_password ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
      </div>

      <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold text-slate-800 dark:text-slate-100">Politica de clave</span>
          <span className={`font-medium ${passwordStrength.textClass}`}>{passwordStrength.label}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className={`h-full rounded-full transition-all ${passwordStrength.barClass}`} style={{ width: `${passwordStrength.percent}%` }} />
        </div>
        <div className="flex flex-wrap gap-2">
          {passwordStrength.checks.map((check) => (
            <div key={check.id} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${check.passed ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'}`}>
              {check.passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              <span>{check.shortLabel}</span>
            </div>
          ))}
        </div>
      </div>

      <label className="space-y-1.5 text-sm">
        <span className="font-semibold text-slate-800 dark:text-slate-100">Motivo del cambio</span>
        <textarea className="min-h-28 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950" placeholder="Ejemplo: Cambio solicitado por reposicion de clave, validado con supervisor." value={form.reason} onChange={(event) => updateField('reason', event.target.value)} minLength={3} maxLength={500} required />
        <span className="block text-xs text-slate-500 dark:text-slate-400">Usa un motivo breve y entendible para revision posterior.</span>
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
        <button type="submit" disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
          {saving ? 'Actualizando...' : 'Actualizar clave'}
        </button>
      </div>
    </form>
  );
};

const UserRolesModal = ({ user, onSubmit, onClose }) => {
  const [availableRoles, setAvailableRoles] = useState([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [initialRoleIds, setInitialRoleIds] = useState([]);
  const [roleSearch, setRoleSearch] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const hasChanges = useMemo(() => {
    const current = [...selectedRoleIds].sort((left, right) => left - right).join(',');
    const initial = [...initialRoleIds].sort((left, right) => left - right).join(',');
    return current !== initial;
  }, [initialRoleIds, selectedRoleIds]);
  const initialRoleSet = useMemo(() => new Set(initialRoleIds), [initialRoleIds]);
  const selectedRoleSet = useMemo(() => new Set(selectedRoleIds), [selectedRoleIds]);
  const roleOptionsForUser = useMemo(
    () => availableRoles.filter((role) => user.username === 'root' || role.role_code !== 'SUPER_ADMIN'),
    [availableRoles, user.username]
  );
  const selectedRoles = useMemo(
    () => roleOptionsForUser
      .filter((role) => selectedRoleSet.has(role.id) || initialRoleSet.has(role.id))
      .sort((left, right) => {
        const leftRemoved = initialRoleSet.has(left.id) && !selectedRoleSet.has(left.id) ? 1 : 0;
        const rightRemoved = initialRoleSet.has(right.id) && !selectedRoleSet.has(right.id) ? 1 : 0;
        if (leftRemoved !== rightRemoved) return leftRemoved - rightRemoved;
        return left.role_name.localeCompare(right.role_name);
      }),
    [initialRoleSet, roleOptionsForUser, selectedRoleSet]
  );
  const filteredRoles = useMemo(() => {
    const term = roleSearch.trim().toLowerCase();
    if (term.length < 2) return [];

    return roleOptionsForUser
      .filter((role) => (
        role.role_name?.toLowerCase().includes(term)
        || role.role_code?.toLowerCase().includes(term)
        || role.role_description?.toLowerCase().includes(term)
      ))
      .sort((left, right) => left.role_name.localeCompare(right.role_name));
  }, [roleOptionsForUser, roleSearch]);
  const pendingAddCount = selectedRoleIds.filter((roleId) => !initialRoleSet.has(roleId)).length;
  const pendingRemoveCount = initialRoleIds.filter((roleId) => !selectedRoleSet.has(roleId)).length;

  useEffect(() => {
    let mounted = true;

    const loadUserRoles = async () => {
      setLoading(true);
      setFormError('');

      try {
        const data = await usersService.getRoles(user.id);
        if (!mounted) return;

        const assignedIds = (data.assigned_roles || []).map((role) => role.id);
        setAvailableRoles(data.available_roles || []);
        setSelectedRoleIds(assignedIds);
        setInitialRoleIds(assignedIds);
      } catch (requestError) {
        if (!mounted) return;
        setFormError(getBackendMessage(requestError, 'No fue posible cargar los roles del usuario.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadUserRoles();

    return () => {
      mounted = false;
    };
  }, [user.id]);

  const toggleRole = (roleId) => {
    setSelectedRoleIds((current) => (
      current.includes(roleId)
        ? current.filter((selectedRoleId) => selectedRoleId !== roleId)
        : [...current, roleId]
    ));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!hasChanges) {
      onClose?.();
      return;
    }

    if (reason.trim().length < 3) {
      setFormError('Debes indicar un motivo del cambio.');
      return;
    }

    setSaving(true);

    try {
      await onSubmit({
        role_ids: selectedRoleIds,
        reason: reason.trim(),
      });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
              {getUserInitials(user)}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Usuario afectado</div>
              <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">{user.display_name || user.username}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Cuenta</div>
            <div className="mt-1 rounded-md bg-white px-2 py-1 font-mono text-xs text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800">
              {user.username}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-md border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Cargando roles...
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Roles asignados</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Pulsa una card para marcarla como remover.</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-right text-xs">
                <div className="rounded-md bg-slate-50 px-3 py-2 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
                  <div className="font-semibold text-slate-950 dark:text-white">{selectedRoleIds.length}</div>
                  <div className="text-slate-500 dark:text-slate-400">Asignados</div>
                </div>
                <div className="rounded-md bg-slate-50 px-3 py-2 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
                  <div className="font-semibold text-slate-950 dark:text-white">+{pendingAddCount} / -{pendingRemoveCount}</div>
                  <div className="text-slate-500 dark:text-slate-400">Pendientes</div>
                </div>
              </div>
            </div>

            <div className="grid max-h-[360px] gap-3 overflow-y-auto sm:grid-cols-2">
              {selectedRoles.map((role) => {
                const selected = selectedRoleSet.has(role.id);
                const pendingAdd = !initialRoleSet.has(role.id) && selected;
                const pendingRemoval = initialRoleSet.has(role.id) && !selected;

                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => toggleRole(role.id)}
                    className={`group flex min-h-24 w-full items-start gap-3 rounded-md border p-3 text-left text-sm transition ${pendingRemoval ? 'border-red-300 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100' : pendingAdd ? 'border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100' : 'border-slate-200 bg-white hover:border-red-200 hover:bg-red-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-red-900 dark:hover:bg-red-950/20'}`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${pendingRemoval ? 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-100' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                      {role.role_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-slate-900 dark:text-slate-100">{role.role_name}</div>
                      <div className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">{role.role_code}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {pendingAdd && <span className="rounded-md bg-blue-100 px-2 py-1 text-[11px] font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">Agregar</span>}
                        {pendingRemoval && <span className="rounded-md bg-red-100 px-2 py-1 text-[11px] font-medium text-red-700 dark:bg-red-900/50 dark:text-red-200">Remover</span>}
                        {!pendingAdd && !pendingRemoval && (
                          <span className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-slate-500 opacity-0 ring-1 ring-slate-200 transition group-hover:opacity-100 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-800">
                            Marcar remover
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
              {selectedRoles.length === 0 && (
                <div className="rounded-md border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 sm:col-span-2">
                  Este usuario no tiene roles asignados. Usa la busqueda para agregar uno.
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-3">
            <div className="relative">
              <input
                className="h-10 w-full rounded-md border border-slate-200 bg-white pl-3 pr-10 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950"
                value={roleSearch}
                onChange={(event) => setRoleSearch(event.target.value)}
                placeholder="Buscar rol para agregar"
              />
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:border-slate-800 dark:text-slate-400">
                Resultados de busqueda
              </div>
              <div className="h-64 overflow-y-auto p-2">
                {filteredRoles.map((role) => {
                  const selected = selectedRoleSet.has(role.id);
                  const pendingAdd = !initialRoleSet.has(role.id) && selected;
                  const pendingRemoval = initialRoleSet.has(role.id) && !selected;

                  return (
                    <div key={role.id} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/70">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {role.role_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-slate-900 dark:text-slate-100">{role.role_name}</div>
                        <div className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">{role.role_code}</div>
                      </div>
                      <button
                        type="button"
                        disabled={selected && !pendingRemoval && !pendingAdd}
                        onClick={() => toggleRole(role.id)}
                        className="h-8 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        {pendingRemoval ? 'Restaurar' : pendingAdd ? 'Quitar' : selected ? 'Asignado' : 'Agregar'}
                      </button>
                    </div>
                  );
                })}
                {roleSearch.trim().length < 2 && (
                  <div className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    Ingresa al menos 2 caracteres para buscar roles.
                  </div>
                )}
                {roleSearch.trim().length >= 2 && filteredRoles.length === 0 && (
                  <div className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    No se encontraron roles.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      <label className="space-y-1.5 text-sm">
        <span className="font-semibold text-slate-800 dark:text-slate-100">Motivo del cambio</span>
        <textarea
          className="min-h-24 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:disabled:bg-slate-900 dark:focus:border-blue-500 dark:focus:ring-blue-950"
          placeholder="Ejemplo: Ajuste de perfil operativo solicitado por jefatura."
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          minLength={3}
          maxLength={500}
          disabled={!hasChanges}
          required={hasChanges}
        />
        <span className="block text-xs text-slate-500 dark:text-slate-400">Requerido solo si modificas los roles asignados.</span>
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
        <button type="submit" disabled={saving || loading} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
          {saving ? 'Guardando...' : 'Guardar roles'}
        </button>
      </div>
    </form>
  );
};

const AdminUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    roleCode: 'all',
    recent: 'all',
  });
  const [page, setPage] = useState(0);
  const [pagination, setPagination] = useState({
    totalFound: 0,
    hasMore: false,
  });
  const tablePageSize = usePreferencesStore((state) => state.tablePageSize);
  const setTablePageSize = usePreferencesStore((state) => state.setTablePageSize);
  const timezone = usePreferencesStore((state) => state.timezone);
  const [loading, setLoading] = useState(false);
  const [busyUserId, setBusyUserId] = useState(null);
  const [error, setError] = useState('');

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((user) => user.is_active).length;
    const inactive = total - active;
    const recent = users.filter((user) => user.is_recently_active).length;

    return { total, active, inactive, recent };
  }, [users]);

  const availableRoleOptions = useMemo(() => {
    const rolesMap = new Map();

    roleOptions.forEach((role) => {
      rolesMap.set(role.role_code, {
        role_code: role.role_code,
        role_name: role.role_name,
      });
    });

    users.forEach((user) => {
      (user.role_details || []).forEach((role) => {
        rolesMap.set(role.code, {
          role_code: role.code,
          role_name: role.name,
        });
      });
      (user.roles || []).forEach((roleCode, index) => {
        if (!rolesMap.has(roleCode)) {
          rolesMap.set(roleCode, {
            role_code: roleCode,
            role_name: user.role_names?.[index] || roleCode,
          });
        }
      });
    });

    return Array.from(rolesMap.values()).sort((left, right) => left.role_name.localeCompare(right.role_name));
  }, [roleOptions, users]);

  const setFilter = (field, value) => {
    setPage(0);
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const loadRoles = async () => {
    try {
      const data = await rolesService.list({
        limit: 200,
        active_only: true,
        include_system: true,
      });
      setRoleOptions(data.roles || []);
    } catch {
      setRoleOptions([]);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await usersService.list({
        skip: page * tablePageSize,
        limit: tablePageSize,
        active_only: false,
        status: filters.status,
        role_code: filters.roleCode === 'all' ? undefined : filters.roleCode,
        has_recent_login: filters.recent === 'all' ? undefined : filters.recent === 'recent',
        search: search.length >= 2 ? search : undefined,
      });
      setUsers(data.users || []);
      setPagination({
        totalFound: data.total_found || 0,
        hasMore: Boolean(data.pagination?.has_more),
      });
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar usuarios.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.roleCode, filters.recent, page, tablePageSize]);

  useEffect(() => {
    if (search.length === 1) return undefined;

    const timer = setTimeout(() => {
      if (page !== 0) {
        setPage(0);
      } else {
        loadUsers();
      }
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    loadRoles();
  }, []);

  const openCreateModal = () => {
    ModalManager.show({
      type: 'custom',
      title: 'Nuevo usuario',
      size: 'large',
      showFooter: false,
      contentComponent: UserFormModal,
      contentProps: {
        mode: 'create',
        initialValues: emptyUserForm,
        roleOptions,
        onSubmit: async (payload) => {
          await notifyPromise(
            (async () => {
              const { role_id: roleId, ...createPayload } = payload;
              const createdUser = await usersService.create(createPayload);
              await usersService.updateRoles(createdUser.id, {
                role_ids: [roleId],
                reason: 'Perfil inicial asignado durante creacion de usuario.',
              });
              return createdUser;
            })(),
            {
              loading: 'Creando usuario...',
              success: 'Usuario creado correctamente.',
              error: (requestError) => getBackendMessage(requestError, 'No fue posible crear el usuario.'),
            }
          );
          await loadUsers();
        },
      },
    });
  };

  const openEditModal = (user) => {
    ModalManager.show({
      type: 'custom',
      title: 'Editar usuario',
      size: 'large',
      showFooter: false,
      contentComponent: UserFormModal,
      contentProps: {
        mode: 'edit',
        initialValues: userToForm(user),
        user,
        onSubmit: async (payload) => {
          await notifyPromise(
            usersService.update(user.id, payload),
            {
              loading: 'Actualizando usuario...',
              success: 'Usuario actualizado correctamente.',
              error: (requestError) => getBackendMessage(requestError, 'No fue posible actualizar el usuario.'),
            }
          );
          await loadUsers();
        },
      },
    });
  };

  const openPasswordModal = (user) => {
    ModalManager.show({
      type: 'custom',
      title: 'Cambio de contraseña',
      size: 'large',
      showFooter: false,
      contentComponent: PasswordChangeModal,
      contentProps: {
        user,
        onSubmit: async (payload) => {
          await notifyPromise(
            usersService.changePasswordByAdmin(user.id, payload),
            {
              loading: 'Actualizando clave...',
              success: 'Clave actualizada correctamente.',
              error: (requestError) => getBackendMessage(requestError, 'No fue posible actualizar la clave.'),
            }
          );
          await loadUsers();
        },
      },
    });
  };

  const openRolesModal = (user) => {
    ModalManager.show({
      type: 'custom',
      title: 'Roles de usuario',
      size: 'fullscreenWide',
      showFooter: false,
      contentComponent: UserRolesModal,
      contentProps: {
        user,
        onSubmit: async (payload) => {
          await notifyPromise(
            usersService.updateRoles(user.id, payload),
            {
              loading: 'Actualizando roles...',
              success: 'Roles actualizados correctamente.',
              error: (requestError) => getBackendMessage(requestError, 'No fue posible actualizar los roles.'),
            }
          );
          await loadUsers();
          await loadRoles();
        },
      },
    });
  };

  const toggleUser = async (user) => {
    const nextState = !user.is_active;
    const action = nextState ? 'activar' : 'desactivar';
    const confirmed = await ModalManager.confirm({
      title: `${nextState ? 'Activar' : 'Desactivar'} usuario`,
      message: `Confirma que deseas ${action} a ${user.display_name || user.username}.`,
      buttons: {
        cancel: 'Cancelar',
        confirm: nextState ? 'Activar' : 'Desactivar',
      },
    });

    if (!confirmed) return;

    setBusyUserId(user.id);

    try {
      await notifyPromise(
        usersService.toggleActivation(
          user.id,
          nextState,
          nextState ? 'Activacion desde administracion' : 'Desactivacion desde administracion'
        ),
        {
          loading: `${nextState ? 'Activando' : 'Desactivando'} usuario...`,
          success: `Usuario ${nextState ? 'activado' : 'desactivado'}.`,
          error: (requestError) => getBackendMessage(requestError, 'No fue posible cambiar el estado.'),
        }
      );
      await loadUsers();
    } finally {
      setBusyUserId(null);
    }
  };

  const kpiItems = [
    {
      id: 'total',
      label: 'Total',
      value: stats.total,
      active: filters.status === 'all' && filters.recent === 'all',
      onClick: () => {
        setPage(0);
        setFilters((current) => ({ ...current, status: 'all', recent: 'all' }));
      },
    },
    {
      id: 'active',
      label: 'Activos',
      value: stats.active,
      active: filters.status === 'active',
      onClick: () => setFilter('status', 'active'),
    },
    {
      id: 'inactive',
      label: 'Inactivos',
      value: stats.inactive,
      active: filters.status === 'inactive',
      onClick: () => setFilter('status', 'inactive'),
    },
    {
      id: 'recent',
      label: 'Recientes',
      value: stats.recent,
      active: filters.recent === 'recent',
      onClick: () => setFilter('recent', 'recent'),
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
        { value: 'inactive', label: 'Inactivos' },
      ],
    },
    {
      id: 'roleCode',
      value: filters.roleCode,
      onChange: (value) => setFilter('roleCode', value),
      options: [
        { value: 'all', label: 'Todos los roles' },
        ...availableRoleOptions.map((role) => ({
          value: role.role_code,
          label: role.role_name,
        })),
      ],
    },
    {
      id: 'recent',
      value: filters.recent,
      onChange: (value) => setFilter('recent', value),
      options: [
        { value: 'all', label: 'Toda actividad' },
        { value: 'recent', label: 'Login reciente' },
        { value: 'not_recent', label: 'Sin login reciente' },
      ],
    },
  ];

  const userColumns = [
    {
      id: 'user',
      label: 'Usuario',
      sortable: true,
      sortValue: (user) => user.display_name || user.username,
      render: (user) => (
        <>
          <div className="font-medium">{user.display_name || user.username}</div>
          <div className="text-xs text-slate-500">{user.username}</div>
        </>
      ),
    },
    {
      id: 'contact',
      label: 'Contacto',
      sortable: true,
      sortValue: (user) => user.email,
      render: (user) => (
        <>
          <div>{user.email}</div>
          <div className="text-xs text-slate-500">{user.phone || 'Sin telefono'}</div>
        </>
      ),
    },
    {
      id: 'status',
      label: 'Estado',
      sortable: true,
      sortValue: (user) => user.is_active,
      render: (user) => <StatusBadge variant={user.is_active ? 'active' : 'inactive'}>{user.is_active ? 'Activo' : 'Inactivo'}</StatusBadge>,
    },
    {
      id: 'roles',
      label: 'Roles',
      sortable: true,
      cellClassName: 'text-slate-600 dark:text-slate-300',
      sortValue: (user) => (user.role_names?.length ? user.role_names : user.roles)?.join(', ') || '',
      render: (user) => (user.role_names?.length ? user.role_names : user.roles)?.join(', ') || 'Sin rol',
    },
    {
      id: 'lastLogin',
      label: 'Ultimo acceso',
      sortable: true,
      cellClassName: 'text-slate-600 dark:text-slate-300',
      sortValue: (user) => user.last_login_at || '',
      render: (user) => formatDateTime(user.last_login_at, timezone),
    },
    {
      id: 'actions',
      label: 'Acciones',
      align: 'right',
      render: (user) => (
        <div className="flex justify-end gap-2">
          <RowActionButton label="Editar usuario" icon={Pencil} onClick={() => openEditModal(user)} />
          <RowActionButton label="Administrar roles" icon={UserCog} disabled={busyUserId === user.id} onClick={() => openRolesModal(user)} />
          <RowActionButton label="Permisos especiales" icon={SlidersHorizontal} disabled={busyUserId === user.id} onClick={() => navigate(`/admin/users/permissions?userId=${user.id}`)} />
          <RowActionButton label="Cambiar clave" icon={KeyRound} disabled={busyUserId === user.id} onClick={() => openPasswordModal(user)} />
          <RowActionButton label={user.is_active ? 'Desactivar usuario' : 'Activar usuario'} icon={user.is_active ? EyeOff : CheckCircle2} disabled={busyUserId === user.id} variant={user.is_active ? 'danger' : 'neutral'} onClick={() => toggleUser(user)} />
        </div>
      ),
    },
  ];

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Usuarios</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gestion de acceso, datos base y estado operativo.
          </p>
        </div>
        <ActionButton label="Nuevo" onClick={openCreateModal} />
      </div>

      <KpiBar items={kpiItems} className="mb-4" />

      <FilterBar
        className="mb-4"
        searchValue={search}
        searchPlaceholder="Buscar usuario, nombre o email"
        onSearchChange={setSearch}
        onSearchSubmit={loadUsers}
        fields={filterFields}
        actions={(
          <>
            <ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={loadUsers} className={loading ? '[&>svg]:animate-spin' : ''} />
            <ActionButton
              label="Limpiar"
              icon={XCircle}
              variant="neutral"
              onClick={() => {
                setSearch('');
                setPage(0);
                setFilters({ status: 'all', roleCode: 'all', recent: 'all' });
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
        columns={userColumns}
        data={users}
        loading={loading}
        emptyMessage="No hay usuarios para los filtros actuales."
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

export default AdminUsers;
