/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { FileText, KeyRound, RefreshCw, Save, ServerCog, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';
import ActionButton from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import ModalManager from '@/components/ui/modal';
import { electronicBillingService } from '@/services/admin/electronicBillingService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { formatRut } from '@/utils/rut';

const inputClassName = 'h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const textareaClassName = 'min-h-24 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-950';

const providerOptions = [
  { value: 'NONE', label: 'Sin proveedor' },
  { value: 'LIBREDTE', label: 'LibreDTE' },
  { value: 'SII_DIRECT', label: 'SII directo' },
  { value: 'OTHER', label: 'Otro' },
];

const emissionModeOptions = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'AUTO_ON_CLOSE', label: 'Automatico al cerrar venta' },
];

const environmentOptions = [
  { value: 'CERTIFICACION', label: 'Certificacion' },
  { value: 'PRODUCCION', label: 'Produccion' },
];

const defaultForm = {
  dte_enabled: false,
  default_provider: 'NONE',
  default_emission_mode: 'MANUAL',
  allow_internal_ticket_when_disabled: true,
  require_dte_for_dte_document_types: false,
  retry_enabled: true,
  max_retry_attempts: 3,
  company_config_id: null,
  company_dte_enabled: false,
  company_provider: 'NONE',
  company_emission_mode: 'MANUAL',
  send_dte_email_by_default: false,
  dte_activation_notes: '',
  provider_config_id: null,
  provider_code: 'LIBREDTE',
  provider_name: 'LibreDTE',
  environment: 'CERTIFICACION',
  base_url: 'https://libredte.cl/api',
  api_token_secret_name: '',
  api_token_or_hash: '',
  clear_api_token: false,
  webhook_secret: '',
  clear_webhook_secret: false,
  timeout_seconds: 30,
  provider_is_active: false,
};

const yesNo = (value) => (value ? 'Activo' : 'Inactivo');

const mapConfigToForm = (config) => ({
  ...defaultForm,
  dte_enabled: Boolean(config?.settings?.dte_enabled),
  default_provider: config?.settings?.default_provider || 'NONE',
  default_emission_mode: config?.settings?.default_emission_mode || 'MANUAL',
  allow_internal_ticket_when_disabled: config?.settings?.allow_internal_ticket_when_disabled !== false,
  require_dte_for_dte_document_types: Boolean(config?.settings?.require_dte_for_dte_document_types),
  retry_enabled: config?.settings?.retry_enabled !== false,
  max_retry_attempts: config?.settings?.max_retry_attempts ?? 3,
  company_config_id: config?.company?.id || null,
  company_dte_enabled: Boolean(config?.company?.dte_enabled),
  company_provider: config?.company?.dte_provider || config?.settings?.default_provider || 'NONE',
  company_emission_mode: config?.company?.dte_emission_mode || config?.settings?.default_emission_mode || 'MANUAL',
  send_dte_email_by_default: Boolean(config?.company?.send_dte_email_by_default),
  dte_activation_notes: config?.company?.dte_activation_notes || '',
  provider_config_id: config?.provider?.id || null,
  provider_code: config?.provider?.provider_code || 'LIBREDTE',
  provider_name: config?.provider?.provider_name || 'LibreDTE',
  environment: config?.provider?.environment || config?.company?.dte_environment || 'CERTIFICACION',
  base_url: config?.provider?.base_url || 'https://libredte.cl/api',
  api_token_secret_name: config?.provider?.api_token_secret_name || '',
  timeout_seconds: config?.provider?.timeout_seconds || 30,
  provider_is_active: Boolean(config?.provider?.is_active),
});

const Field = ({ label, children, help }) => (
  <label className="space-y-1.5 text-sm">
    <span className="block font-medium text-slate-800 dark:text-slate-100">{label}</span>
    {children}
    {help && <span className="block text-xs text-slate-500 dark:text-slate-400">{help}</span>}
  </label>
);

const ToggleField = ({ label, checked, onChange, help }) => (
  <label className="flex min-h-16 items-start gap-3 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm dark:border-slate-800 dark:bg-slate-950">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
    <span>
      <span className="block font-medium text-slate-800 dark:text-slate-100">{label}</span>
      {help && <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">{help}</span>}
    </span>
  </label>
);

const SelectField = ({ value, onChange, options }) => (
  <select className={inputClassName} value={value} onChange={(event) => onChange(event.target.value)}>
    {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select>
);

const AdminElectronicBilling = () => {
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const nextConfig = await electronicBillingService.getConfig();
      setConfig(nextConfig);
      setForm(mapConfigToForm(nextConfig));
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar facturacion electronica.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const statusItems = useMemo(() => [
    { label: 'DTE sistema', value: yesNo(form.dte_enabled) },
    { label: 'DTE empresa', value: yesNo(form.company_dte_enabled) },
    { label: 'Proveedor', value: form.default_provider === 'NONE' ? '-' : form.default_provider },
    { label: 'Ambiente', value: form.environment },
  ], [form]);

  const persist = async (nextForm, successMessage = 'Configuracion DTE guardada.') => {
    const enablingProduction = nextForm.dte_enabled && nextForm.company_dte_enabled && nextForm.environment === 'PRODUCCION';
    if (enablingProduction) {
      const confirmed = await ModalManager.confirm({
        title: 'Activar DTE en produccion',
        message: 'Confirma guardar la configuracion DTE en ambiente de produccion.',
        buttons: { cancel: 'Cancelar', confirm: 'Guardar configuracion' },
      });
      if (!confirmed) return;
    }

    const payload = {
      ...nextForm,
      max_retry_attempts: Number(nextForm.max_retry_attempts || 0),
      timeout_seconds: Number(nextForm.timeout_seconds || 30),
      api_token_or_hash: nextForm.api_token_or_hash?.trim() || null,
      webhook_secret: nextForm.webhook_secret?.trim() || null,
    };

    await notifyPromise(electronicBillingService.updateConfig(payload), {
      loading: 'Guardando facturacion electronica...',
      success: successMessage,
      error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar facturacion electronica.'),
    });
    await load();
  };

  const save = async () => persist(form);

  const toggleDteModule = async () => {
    const nextEnabled = !form.dte_enabled;
    const confirmed = await ModalManager.confirm({
      title: nextEnabled ? 'Activar modulo DTE' : 'Desactivar modulo DTE',
      message: nextEnabled
        ? 'Confirma activar el modulo DTE a nivel sistema. La emision efectiva tambien depende de la empresa y proveedor.'
        : 'Confirma desactivar DTE a nivel sistema. Las ventas podran seguir operando como ticket interno si esa regla esta permitida.',
      buttons: { cancel: 'Cancelar', confirm: nextEnabled ? 'Activar DTE' : 'Desactivar DTE' },
      variant: nextEnabled ? 'default' : 'danger',
    });
    if (!confirmed) return;
    await persist({ ...form, dte_enabled: nextEnabled }, nextEnabled ? 'Modulo DTE activado.' : 'Modulo DTE desactivado.');
  };

  const documentTypes = config?.document_types || [];

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Facturacion electronica"
        description="Parametros DTE, proveedor y reglas de emision."
        actions={[
          { id: 'refresh', label: 'Refrescar', icon: RefreshCw, variant: 'neutral', onClick: load, className: loading ? '[&>svg]:animate-spin' : '' },
          { id: 'toggle-dte', label: form.dte_enabled ? 'Desactivar DTE' : 'Activar DTE', icon: form.dte_enabled ? ToggleLeft : ToggleRight, variant: form.dte_enabled ? 'danger' : 'neutral', onClick: toggleDteModule, disabled: loading || !config?.company },
        ]}
      />

      <KpiBar items={statusItems} className="mb-4" />

      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</div>}
      {!loading && !config?.company && <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Debe existir una empresa configurada antes de activar DTE.</div>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.7fr)]">
        <div className="space-y-4">
          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center gap-2">
              {form.dte_enabled ? <ToggleRight className="h-5 w-5 text-emerald-600" /> : <ToggleLeft className="h-5 w-5 text-slate-500" />}
              <h2 className="text-base font-semibold">Activacion</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <ToggleField label="DTE habilitado en sistema" checked={form.dte_enabled} onChange={(value) => setField('dte_enabled', value)} help="Control global de emision electronica." />
              <ToggleField label="DTE habilitado en empresa" checked={form.company_dte_enabled} onChange={(value) => setField('company_dte_enabled', value)} help="Control operativo para la empresa activa." />
              <ToggleField label="Permitir ticket interno si DTE esta apagado" checked={form.allow_internal_ticket_when_disabled} onChange={(value) => setField('allow_internal_ticket_when_disabled', value)} help="Conserva el flujo actual de ventas." />
              <ToggleField label="Exigir emision para tipos DTE" checked={form.require_dte_for_dte_document_types} onChange={(value) => setField('require_dte_for_dte_document_types', value)} help="Aplica cuando DTE este habilitado." />
              <ToggleField label="Reintentos automaticos" checked={form.retry_enabled} onChange={(value) => setField('retry_enabled', value)} help="Permite reintentar emisiones fallidas." />
              <ToggleField label="Enviar correo por defecto" checked={form.send_dte_email_by_default} onChange={(value) => setField('send_dte_email_by_default', value)} help="Usado por el proveedor si aplica." />
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center gap-2">
              <ServerCog className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-semibold">Proveedor</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Proveedor sistema">
                <SelectField value={form.default_provider} onChange={(value) => { setField('default_provider', value); setField('company_provider', value); }} options={providerOptions} />
              </Field>
              <Field label="Proveedor empresa">
                <SelectField value={form.company_provider} onChange={(value) => setField('company_provider', value)} options={providerOptions} />
              </Field>
              <Field label="Codigo proveedor">
                <SelectField value={form.provider_code} onChange={(value) => setField('provider_code', value)} options={providerOptions.filter((option) => option.value !== 'NONE')} />
              </Field>
              <Field label="Nombre proveedor">
                <input className={inputClassName} value={form.provider_name} onChange={(event) => setField('provider_name', event.target.value)} />
              </Field>
              <Field label="Ambiente">
                <SelectField value={form.environment} onChange={(value) => setField('environment', value)} options={environmentOptions} />
              </Field>
              <Field label="URL base">
                <input className={inputClassName} value={form.base_url} onChange={(event) => setField('base_url', event.target.value)} />
              </Field>
              <Field label="Modo de emision">
                <SelectField value={form.default_emission_mode} onChange={(value) => { setField('default_emission_mode', value); setField('company_emission_mode', value); }} options={emissionModeOptions} />
              </Field>
              <Field label="Modo empresa">
                <SelectField value={form.company_emission_mode} onChange={(value) => setField('company_emission_mode', value)} options={emissionModeOptions} />
              </Field>
              <Field label="Timeout segundos">
                <input className={inputClassName} type="number" min="5" max="180" value={form.timeout_seconds} onChange={(event) => setField('timeout_seconds', event.target.value)} />
              </Field>
              <Field label="Maximo reintentos">
                <input className={inputClassName} type="number" min="0" max="10" value={form.max_retry_attempts} onChange={(event) => setField('max_retry_attempts', event.target.value)} />
              </Field>
              <ToggleField label="Proveedor activo" checked={form.provider_is_active} onChange={(value) => setField('provider_is_active', value)} help="Marca la configuracion lista para uso." />
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-violet-600" />
              <h2 className="text-base font-semibold">Credenciales</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nombre secreto token/hash" help={config?.provider?.has_api_token ? 'Token/hash guardado.' : 'Sin token/hash guardado.'}>
                <input className={inputClassName} value={form.api_token_secret_name} onChange={(event) => setField('api_token_secret_name', event.target.value)} placeholder="libredte_api_token" />
              </Field>
              <Field label="Nuevo token/hash">
                <input className={inputClassName} type="password" autoComplete="new-password" value={form.api_token_or_hash} onChange={(event) => setField('api_token_or_hash', event.target.value)} />
              </Field>
              <ToggleField label="Eliminar token/hash guardado" checked={form.clear_api_token} onChange={(value) => setField('clear_api_token', value)} help="Se aplica al guardar." />
              <Field label="Nuevo secreto webhook" help={config?.provider?.has_webhook_secret ? 'Webhook guardado.' : 'Sin webhook guardado.'}>
                <input className={inputClassName} type="password" autoComplete="new-password" value={form.webhook_secret} onChange={(event) => setField('webhook_secret', event.target.value)} />
              </Field>
              <ToggleField label="Eliminar secreto webhook" checked={form.clear_webhook_secret} onChange={(value) => setField('clear_webhook_secret', value)} help="Se aplica al guardar." />
              <Field label="Notas de activacion">
                <textarea className={textareaClassName} value={form.dte_activation_notes} onChange={(event) => setField('dte_activation_notes', event.target.value)} />
              </Field>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-semibold">Empresa activa</h2>
            </div>
            <dl className="grid gap-3 text-sm">
              <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-900">
                <dt className="text-xs font-medium uppercase text-slate-500">Empresa</dt>
                <dd className="mt-1 font-semibold">{config?.company?.company_name || '-'}</dd>
              </div>
              <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-900">
                <dt className="text-xs font-medium uppercase text-slate-500">RUT</dt>
                <dd className="mt-1 font-mono">{config?.company?.company_rut ? formatRut(config.company.company_rut) : '-'}</dd>
              </div>
              <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-900">
                <dt className="text-xs font-medium uppercase text-slate-500">Razon social</dt>
                <dd className="mt-1">{config?.company?.company_business_name || '-'}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-semibold">Tipos DTE</h2>
            </div>
            <DataTable
              loading={loading}
              data={documentTypes}
              columns={[
                { id: 'type', label: 'Tipo', render: (item) => <><div className="font-medium">{item.document_type_code}</div><div className="text-xs text-slate-500">{item.document_type_name}</div></> },
                { id: 'sii', label: 'SII', render: (item) => <span className="font-mono">{item.sii_dte_type}</span> },
                { id: 'amount', label: 'Monto', render: (item) => item.amount_mode },
                { id: 'status', label: 'Emision', render: (item) => item.is_enabled ? 'Activa' : 'Inactiva' },
                { id: 'catalog', label: 'Ventas', render: (item) => item.catalog_is_active ? 'Disponible' : 'Oculto' },
              ]}
            />
          </section>
        </div>
      </div>

      <div className="mt-4 flex justify-end rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <ActionButton label="Guardar configuracion" icon={Save} onClick={save} disabled={loading || !config?.company} />
      </div>
    </section>
  );
};

export default AdminElectronicBilling;
