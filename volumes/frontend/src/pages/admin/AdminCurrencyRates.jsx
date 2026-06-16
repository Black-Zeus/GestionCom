import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, PenLine, RefreshCcw } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import DataTable from '@/components/common/data/DataTable';
import { ActionButton } from '@/components/common/actions/ActionButton';
import { getBackendMessage, notifyPromise, toast } from '@/services/ui/notify';
import { currencyRatesService } from '@/services/admin/currencyRatesService';

const fieldCls = 'h-10 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500';

const formatRate = (value) => {
  const n = Number(value || 0);
  if (n === 0) return '—';
  if (n >= 100) return n.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString('es-CL', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return n.toLocaleString('es-CL', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('es-CL') : '—');
const formatDateTime = (value) => (value ? new Date(value).toLocaleString('es-CL', { hour12: false }) : '—');

const ManualRateForm = ({ currencies = [], onSubmit, onClose }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ currency_code: '', rate_date: today, rate_value: '', source_name: 'Manual' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ ...form, rate_value: Number(form.rate_value) });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  const activeCurrencies = currencies.filter((c) => c.is_active !== false && c.is_active !== 0);

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Divisa</span>
          <select className={`${fieldCls} bg-white dark:bg-slate-950`} value={form.currency_code} onChange={(e) => set('currency_code', e.target.value)} required>
            <option value="">Seleccionar...</option>
            {activeCurrencies.map((c) => (
              <option key={c.currency_code} value={c.currency_code}>
                {c.currency_code} — {c.currency_name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Tasa de mercado</span>
          <input type="number" className={fieldCls} value={form.rate_value} onChange={(e) => set('rate_value', e.target.value)} min="0.000001" step="any" placeholder="ej: 950.00" required />
        </label>
        <label className="col-span-2 space-y-1 text-sm">
          <span className="font-medium">Fuente</span>
          <input type="text" className={fieldCls} value={form.source_name} onChange={(e) => set('source_name', e.target.value)} maxLength={100} />
        </label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Guardando...' : 'Registrar'}
        </button>
      </div>
    </form>
  );
};

const AdminCurrencyRates = () => {
  const [rates, setRates] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ratesData, currenciesData] = await Promise.all([
        currencyRatesService.list(),
        currencyRatesService.listCurrencies(),
      ]);
      setRates(ratesData);
      setCurrencies(currenciesData);
    } catch (err) {
      toast.error(getBackendMessage(err, 'No fue posible cargar los tipos de cambio.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await notifyPromise(
        currencyRatesService.sync(),
        {
          loading: 'Consultando ExchangeRate-API...',
          success: (res) => `${res?.synced ?? 0} divisas actualizadas al ${res?.rate_date ?? '—'} (base: ${res?.base_currency ?? '—'}).`,
          error: (err) => getBackendMessage(err, 'No fue posible sincronizar los tipos de cambio.'),
        },
      );
      if (result) await load();
    } finally {
      setSyncing(false);
    }
  };

  const openManual = () => {
    ModalManager.show({
      type: 'custom',
      title: 'Registrar tasa manual',
      size: 'medium',
      showFooter: false,
      contentComponent: ManualRateForm,
      contentProps: {
        currencies,
        onSubmit: async (payload) => {
          await notifyPromise(
            currencyRatesService.saveManual(payload),
            {
              loading: 'Guardando...',
              success: (res) => `Tasa de ${res?.currency_code ?? payload.currency_code} registrada para el ${payload.rate_date}.`,
              error: (err) => getBackendMessage(err, 'No fue posible registrar la tasa.'),
            },
          );
          await load();
        },
      },
    });
  };

  const columns = [
    {
      id: 'currency',
      label: 'Divisa',
      sortable: true,
      sortValue: (row) => row.currency_name,
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 font-mono text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {row.currency_code}
          </span>
          <div>
            <div className="font-medium">{row.currency_name}</div>
            <div className="text-xs text-slate-400">{row.currency_symbol}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'rate',
      label: 'Tasa de mercado',
      sortable: true,
      sortValue: (row) => Number(row.rate_value),
      render: (row) => (
        <span className="tabular-nums font-mono text-sm">
          1 {row.currency_code} = {formatRate(row.rate_value)} {row.base_currency_code}
        </span>
      ),
    },
    {
      id: 'fee',
      label: 'Fee',
      sortable: true,
      sortValue: (row) => Number(row.fee_pct),
      render: (row) => {
        const fee = Number(row.fee_pct || 0);
        return fee > 0
          ? <span className="tabular-nums text-sm text-amber-600 dark:text-amber-400">{fee.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
          : <span className="text-slate-400 text-xs">—</span>;
      },
    },
    {
      id: 'effective_rate',
      label: 'Tasa efectiva',
      sortable: true,
      sortValue: (row) => Number(row.effective_rate),
      render: (row) => {
        const fee = Number(row.fee_pct || 0);
        return (
          <span className={`tabular-nums font-mono text-sm ${fee > 0 ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>
            1 {row.currency_code} = {formatRate(row.effective_rate)} {row.base_currency_code}
          </span>
        );
      },
    },
    {
      id: 'rate_date',
      label: 'Fecha del tipo',
      sortable: true,
      sortValue: (row) => row.rate_date,
      render: (row) => formatDate(row.rate_date),
    },
    {
      id: 'source',
      label: 'Fuente',
      render: (row) => (
        <span className="text-xs text-slate-500">{row.source_name || '—'}</span>
      ),
    },
    {
      id: 'fetched_at',
      label: 'Ultima sincronizacion',
      sortable: true,
      sortValue: (row) => row.fetched_at,
      render: (row) => (
        <span className="text-xs text-slate-500">{formatDateTime(row.fetched_at)}</span>
      ),
    },
  ];

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Tipos de cambio"
        description="Tipos de cambio a CLP por divisa, sincronizados desde ExchangeRate-API."
      >
        <ActionButton label="Actualizar" icon={RefreshCcw} variant="neutral" onClick={load} disabled={loading || syncing} className={loading ? '[&>svg]:animate-spin' : ''} />
        <ActionButton label="Registrar manual" icon={PenLine} variant="neutral" onClick={openManual} disabled={loading || syncing} />
        <ActionButton label={syncing ? 'Sincronizando...' : 'Sincronizar'} icon={ArrowLeftRight} onClick={handleSync} disabled={syncing || loading} />
      </ModuleHeader>

      {rates.length === 0 && !loading && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          No hay tipos de cambio registrados. Usa <strong>Sincronizar</strong> para obtener las cotizaciones actuales desde ExchangeRate-API.
        </div>
      )}

      <DataTable
        columns={columns}
        data={rates}
        loading={loading}
        emptyMessage="Sin tipos de cambio. Sincroniza para obtener las cotizaciones actuales."
      />

      <p className="mt-4 text-xs text-slate-400">
        Fuente: ExchangeRate-API (open.er-api.com) · Base: USD → CLP.
      </p>
    </section>
  );
};

export default AdminCurrencyRates;
