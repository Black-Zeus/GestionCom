/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Pencil, Plus, Trash2, XCircle } from 'lucide-react';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import StatusBadge from '@/components/common/data/StatusBadge';
import DataTable from '@/components/common/data/DataTable';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import ModalManager from '@/components/ui/modal';
import { getBackendMessage, toast } from '@/services/ui/notify';
import { cashSessionsService } from '@/services/cash/cashSessionsService';
import { currencyRatesService } from '@/services/admin/currencyRatesService';

const money = (value) => Number(value || 0).toLocaleString('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const exchangeMoney = (value) => {
  const amount = Number(value || 0);
  return amount.toLocaleString('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: amount > 0 && amount < 1 ? 2 : 0,
    maximumFractionDigits: amount > 0 && amount < 1 ? 4 : 2,
  });
};

const STATUS_MAP = {
  14: { label: 'Abierta',           variant: 'active' },
  15: { label: 'Pend. aprobacion',  variant: 'warning' },
  16: { label: 'Cerrada',           variant: 'inactive' },
  17: { label: 'Anulada',           variant: 'danger' },
};

const InfoRow = ({ label, value, highlight }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-sm text-slate-500">{label}</span>
    <span className={`text-sm font-semibold tabular-nums ${highlight ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{value}</span>
  </div>
);

const formatDateTime = (value) => (
  value ? new Date(value).toLocaleString('es-CL', { hour12: false }) : '—'
);

const OBSERVATION_META = {
  CASH_COUNT: { label: 'Arqueo',    role: 'cajero',     variant: 'info',    pending: 'El cajero aun no ha registrado las observaciones del arqueo.' },
  CLOSING:    { label: 'Cierre',    role: 'cajero',     variant: 'neutral', pending: 'El cajero aun no ha registrado las observaciones de cierre.' },
  APPROVAL:   { label: 'Aprobacion', role: 'supervisor', variant: 'active',  pending: 'La diferencia de caja supero el limite permitido. La sesion requiere que el supervisor la revise y apruebe o rechace para poder finalizar el cierre.' },
  REJECTION:  { label: 'Rechazo',   role: 'supervisor', variant: 'danger',  pending: 'En espera de respuesta del supervisor.' },
};

const parseAmount = (value) => Number(String(value ?? '').replace(',', '.')) || 0;
const isActiveRecord = (record) => record?.is_active !== false && record?.is_active !== 0;
const getRateInfo = (rate, currency = null) => {
  const marketRate = parseAmount(rate?.rate_value);
  const feePct = parseAmount(rate?.fee_pct ?? currency?.conversion_fee_pct);
  const effectiveRate = parseAmount(rate?.effective_rate) || (marketRate > 0 ? marketRate * (1 - feePct / 100) : 0);
  return { marketRate, feePct, effectiveRate };
};
const currencyLabel = (currency) => (
  `${currency.currency_code} - ${currency.currency_symbol || ''} - ${currency.currency_name || ''}`.replace(/\s+-\s+$/, '')
);

const ForeignCurrencyForm = ({
  currencies = [],
  ratesByCurrency = new Map(),
  primaryCurrency = 'CLP',
  initialValues = null,
  submitLabel = 'Agregar divisa',
  onSubmit,
  onClose,
}) => {
  const [form, setForm] = useState({
    currency_code: initialValues?.currency_code || '',
    denomination_value: initialValues?.denomination_value ? String(initialValues.denomination_value) : '',
    quantity: initialValues?.quantity ? String(initialValues.quantity) : '1',
  });

  const currencyOptions = useMemo(() => (
    currencies
      .filter(isActiveRecord)
      .filter((currency) => currency.currency_code && currency.currency_code !== primaryCurrency)
      .sort((left, right) => String(left.currency_code).localeCompare(String(right.currency_code)))
      .map((currency) => ({ value: currency.currency_code, label: currencyLabel(currency) }))
  ), [currencies, primaryCurrency]);

  const selectedCurrency = useMemo(
    () => currencies.find((currency) => currency.currency_code === form.currency_code) || null,
    [currencies, form.currency_code],
  );
  const selectedRate = ratesByCurrency.get(form.currency_code);
  const { marketRate, feePct, effectiveRate } = getRateInfo(selectedRate, selectedCurrency);
  const denominationValue = parseAmount(form.denomination_value);
  const quantity = Math.max(0, parseInt(form.quantity, 10) || 0);
  const foreignSubtotal = denominationValue * quantity;
  const convertedSubtotal = foreignSubtotal * effectiveRate;

  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = () => {
    if (!form.currency_code) {
      toast.error('Selecciona una divisa.');
      return;
    }
    if (!effectiveRate) {
      toast.error(`No hay tasa de conversion activa para ${form.currency_code}.`);
      return;
    }
    if (denominationValue <= 0) {
      toast.error('Ingresa el valor de la denominacion.');
      return;
    }
    if (quantity < 1) {
      toast.error('Ingresa una cantidad mayor a cero.');
      return;
    }

    onSubmit({
      id: initialValues?.id || Date.now(),
      label: `${form.currency_code} ${denominationValue.toLocaleString('es-CL', { maximumFractionDigits: 2 })}`,
      currency_code: form.currency_code,
      currency_name: selectedCurrency?.currency_name || form.currency_code,
      currency_symbol: selectedCurrency?.currency_symbol || '',
      denomination_value: denominationValue,
      quantity,
      exchange_rate: effectiveRate,
      market_rate: marketRate,
      fee_pct: feePct,
      base_currency_code: selectedRate?.base_currency_code || primaryCurrency,
      rate_date: selectedRate?.rate_date || null,
    });
    onClose();
  };

  return (
    <div className="space-y-4 p-1">
      <div className="space-y-1 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">Divisa</span>
        <AutocompleteSelect
          value={form.currency_code}
          onChange={(value) => set('currency_code', value)}
          options={currencyOptions}
          placeholder="Seleccionar divisa"
          searchPlaceholder="Buscar por codigo o nombre"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Valor denominacion</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950"
            value={form.denomination_value}
            onChange={(event) => set('denomination_value', event.target.value)}
            placeholder="Ej: 100"
          />
        </div>
        <div className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Cantidad</span>
          <input
            type="number"
            min="1"
            step="1"
            className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950"
            value={form.quantity}
            onChange={(event) => set('quantity', event.target.value)}
            placeholder="1"
          />
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between py-1">
          <span className="text-slate-500">Tipo de cambio mercado</span>
          <span className="font-semibold tabular-nums">
            {marketRate ? `1 ${form.currency_code} = ${exchangeMoney(marketRate)} ${primaryCurrency}` : 'Sin tasa'}
          </span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-slate-500">Fee conversion</span>
          <span className="font-semibold tabular-nums">
            {marketRate ? `${feePct.toLocaleString('es-CL', { maximumFractionDigits: 2 })}%` : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-slate-500">Tipo de cambio aplicado</span>
          <span className="font-semibold tabular-nums">
            {effectiveRate ? `1 ${form.currency_code} = ${exchangeMoney(effectiveRate)} ${primaryCurrency}` : 'Sin tasa'}
          </span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-slate-500">Subtotal divisa</span>
          <span className="font-semibold tabular-nums">
            {foreignSubtotal > 0 ? `${foreignSubtotal.toLocaleString('es-CL', { maximumFractionDigits: 2 })} ${form.currency_code || ''}` : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-800">
          <span className="text-slate-500">Equivalente en pesos</span>
          <span className="text-base font-bold tabular-nums text-slate-950 dark:text-white">{convertedSubtotal > 0 ? money(convertedSubtotal) : '—'}</span>
        </div>
        {selectedRate?.rate_date && (
          <p className="mt-2 text-xs text-slate-400">Tipo de cambio vigente al {selectedRate.rate_date}.</p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <ActionButton label="Cancelar" variant="neutral" icon={XCircle} onClick={onClose} />
        <ActionButton label={submitLabel} icon={Plus} onClick={handleSubmit} disabled={!currencyOptions.length} />
      </div>
    </div>
  );
};

const CashCount = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState(null);
  const [denominations, setDenominations] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [currencyRates, setCurrencyRates] = useState([]);
  const [counts, setCounts] = useState({});
  const [adhocRows, setAdhocRows] = useState([]);
  const [closingNotes, setClosingNotes] = useState('');
  const [cashCountNotes, setCashCountNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isOpen = session?.status_id === 14;

  const load = useCallback(async (id) => {
    setLoading(true);
    try {
      const [sess, summ, denoms] = await Promise.all([
        cashSessionsService.get(id),
        cashSessionsService.getSummary(id),
        cashSessionsService.getDenominations(),
      ]);
      setSession(sess);
      setSummary(summ);
      setDenominations(denoms);

      const initialCounts = {};
      const closingCounts = (sess.denomination_counts || []).filter((c) => c.count_type === 'CLOSING');
      if (closingCounts.length > 0) {
        closingCounts
          .filter((c) => c.currency_denomination_id)
          .forEach((c) => { initialCounts[c.currency_denomination_id] = c.quantity; });
      }
      setCounts(initialCounts);
      setAdhocRows(closingCounts
        .filter((c) => !c.currency_denomination_id && c.adhoc_currency_code)
        .map((c) => ({
          id: c.id,
          label: c.adhoc_label || `${c.adhoc_currency_code} ${c.adhoc_denomination_value}`,
          currency_code: c.adhoc_currency_code,
          denomination_value: Number(c.adhoc_denomination_value || 0),
          quantity: Number(c.quantity || 0),
          exchange_rate: 0,
          market_rate: 0,
          fee_pct: 0,
          base_currency_code: 'CLP',
          rate_date: null,
        })));
      const observations = sess.observations || [];
      const latestByType = (type) => [...observations].reverse().find((obs) => obs.observation_type === type)?.observation_text || '';
      setClosingNotes(latestByType('CLOSING') || sess.closing_notes || '');
      setCashCountNotes(latestByType('CASH_COUNT') || sess.cashier_notes || '');
    } catch {
      toast.error('Error al cargar la sesion de caja.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionId) {
      load(sessionId);
    } else {
      setLoading(false);
    }
  }, [sessionId, load]);

  useEffect(() => {
    let active = true;
    const loadCurrencyData = async () => {
      try {
        const [currenciesData, ratesData] = await Promise.all([
          currencyRatesService.listCurrencies(),
          currencyRatesService.list(),
        ]);
        if (!active) return;
        setCurrencies(currenciesData.filter(isActiveRecord));
        setCurrencyRates(ratesData);
      } catch (error) {
        if (active) toast.error(getBackendMessage(error, 'No fue posible cargar divisas activas.'));
      }
    };
    loadCurrencyData();
    return () => { active = false; };
  }, []);

  const handleCount = (id, value) => {
    const qty = Math.max(0, parseInt(value, 10) || 0);
    setCounts((prev) => ({ ...prev, [id]: qty }));
  };

  const removeAdhocRow = async (row) => {
    const foreignSubtotal = parseAmount(row.denomination_value) * Number(row.quantity || 0);
    const confirmed = await ModalManager.confirm({
      title: 'Eliminar divisa',
      message: `Confirma eliminar ${foreignSubtotal.toLocaleString('es-CL', { maximumFractionDigits: 2 })} ${row.currency_code} del arqueo.`,
      buttons: { cancel: 'Cancelar', confirm: 'Eliminar' },
    });
    if (!confirmed) return;
    setAdhocRows((prev) => prev.filter((item) => item.id !== row.id));
  };

  const primaryCurrency = useMemo(() => {
    const clpDenom = denominations.find((d) => (d.currency_code || 'CLP') === 'CLP');
    return clpDenom ? 'CLP' : (denominations[0]?.currency_code || 'CLP');
  }, [denominations]);

  const currencyGroups = useMemo(() => {
    const map = {};
    denominations.forEach((d) => {
      const code = d.currency_code || 'CLP';
      if (!map[code]) map[code] = [];
      map[code].push(d);
    });
    return Object.entries(map).sort(([a], [b]) => (a === primaryCurrency ? -1 : b === primaryCurrency ? 1 : a.localeCompare(b)));
  }, [denominations, primaryCurrency]);

  const physicalTotal = useMemo(() => (
    denominations
      .filter((d) => (d.currency_code || 'CLP') === primaryCurrency)
      .reduce((sum, d) => sum + (d.denomination_value * (counts[d.id] || 0)), 0)
  ), [denominations, counts, primaryCurrency]);

  const ratesByCurrency = useMemo(() => (
    new Map(currencyRates.map((rate) => [rate.currency_code, rate]))
  ), [currencyRates]);

  const addAdhocRow = () => {
    const modalId = ModalManager.show({
      type: 'custom',
      title: 'Agregar divisa',
      size: 'medium',
      showFooter: false,
      contentComponent: ForeignCurrencyForm,
      contentProps: {
        currencies,
        ratesByCurrency,
        primaryCurrency,
        onSubmit: (row) => setAdhocRows((prev) => [...prev, row]),
        onClose: () => ModalManager.close(modalId),
      },
    });
  };

  const editAdhocRow = (row) => {
    const modalId = ModalManager.show({
      type: 'custom',
      title: 'Editar divisa',
      size: 'medium',
      showFooter: false,
      contentComponent: ForeignCurrencyForm,
      contentProps: {
        currencies,
        ratesByCurrency,
        primaryCurrency,
        initialValues: row,
        submitLabel: 'Guardar cambios',
        onSubmit: (updatedRow) => setAdhocRows((prev) => prev.map((item) => (item.id === row.id ? updatedRow : item))),
        onClose: () => ModalManager.close(modalId),
      },
    });
  };

  const adhocClpTotal = useMemo(() => (
    adhocRows.reduce((sum, row) => {
      const foreignSubtotal = parseAmount(row.denomination_value) * (parseInt(row.quantity, 10) || 0);
      const currency = currencies.find((item) => item.currency_code === row.currency_code);
      const rateInfo = getRateInfo(ratesByCurrency.get(row.currency_code), currency);
      const effectiveRate = parseAmount(row.exchange_rate) || rateInfo.effectiveRate;
      return sum + (foreignSubtotal * effectiveRate);
    }, 0)
  ), [adhocRows, currencies, ratesByCurrency]);

  const totalPhysicalWithForeign = useMemo(
    () => physicalTotal + adhocClpTotal,
    [adhocClpTotal, physicalTotal],
  );

  const theoreticalCash = useMemo(() => (
    summary ? Number(summary.theoretical_cash || 0) : 0
  ), [summary]);

  const difference = useMemo(
    () => totalPhysicalWithForeign - theoreticalCash,
    [totalPhysicalWithForeign, theoreticalCash],
  );

  const methodGroups = useMemo(() => {
    if (!summary?.by_payment_method) return {};
    return summary.by_payment_method.reduce((acc, row) => {
      const type = row.method_type || 'OTHER';
      if (!acc[type]) acc[type] = [];
      acc[type].push(row);
      return acc;
    }, {});
  }, [summary]);

  const totalSalesAmount = useMemo(() => (
    (summary?.by_payment_method || []).reduce((sum, row) => sum + Number(row.total_amount || 0), 0)
  ), [summary]);

  const handleClose = async () => {
    if (!sessionId) return;
    if (!cashCountNotes.trim()) {
      toast.error('La observacion de arqueo es obligatoria.');
      return;
    }
    setSaving(true);
    try {
      const denominationCounts = denominations
        .filter((d) => (counts[d.id] || 0) > 0)
        .map((d) => ({ denomination_id: d.id, quantity: counts[d.id] }));
      const validAdhoc = adhocRows.filter(
        (r) => r.label.trim() && r.currency_code && Number(r.denomination_value) > 0 && Number(r.quantity) >= 1,
      ).map((r) => ({
        label: r.label.trim(),
        currency_code: r.currency_code.toUpperCase(),
        denomination_value: Number(r.denomination_value),
        quantity: parseInt(r.quantity, 10),
      }));
      await cashSessionsService.close(sessionId, {
        physical_amount: totalPhysicalWithForeign,
        closing_notes: closingNotes.trim() || null,
        cash_count_notes: cashCountNotes.trim(),
        denomination_counts: denominationCounts,
        adhoc_denomination_counts: validAdhoc,
      });
      toast.success('Sesion cerrada correctamente.');
      navigate('/cash/opening');
    } catch (err) {
      toast.error(getBackendMessage(err, 'No fue posible cerrar la sesion.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="min-h-full bg-slate-50 px-6 py-5 dark:bg-slate-950">
        <div className="flex h-40 items-center justify-center text-slate-400">Cargando...</div>
      </section>
    );
  }

  if (!sessionId || !session) {
    return (
      <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
        <ModuleHeader
          title="Arqueo de caja"
          description="Conteo y cierre de sesion de caja."
          actions={[
            { id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate('/cash/opening') },
          ]}
        />
        <div className="rounded-md border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-slate-500">Accede desde <strong>Apertura / cierre de caja</strong> seleccionando la caja abierta.</p>
        </div>
      </section>
    );
  }

  const statusInfo = STATUS_MAP[session.status_id] || { label: String(session.status_id), variant: 'inactive' };
  const sessionContext = [
    session.cash_register?.register_name ? `Caja: ${session.cash_register.register_name}` : null,
    session.cashier_name ? `Cajero: ${session.cashier_name}` : null,
  ].filter(Boolean).join(' · ') || 'Conteo y cierre de caja';
  const rawObservations = (session.observations || []).filter((obs) => OBSERVATION_META[obs.observation_type]);
  const fallbackObservations = rawObservations.length === 0 ? [
    session.cashier_notes && {
      id: 'fallback-cashier',
      observation_type: 'CASH_COUNT',
      observation_text: session.cashier_notes,
      created_by_name: session.cashier_name || 'Cajero',
      observed_at: null,
      source: 'fallback',
    },
    session.supervisor_notes && {
      id: 'fallback-supervisor',
      observation_type: session.is_approved ? 'APPROVAL' : 'REJECTION',
      observation_text: session.supervisor_notes,
      created_by_name: session.supervisor_name || 'Supervisor',
      observed_at: null,
      source: 'fallback',
    },
  ].filter(Boolean) : [];
  const visibleObservations = rawObservations.length > 0 ? rawObservations : fallbackObservations;
  const loadedObservationTypes = new Set(visibleObservations.map((obs) => obs.observation_type));
  const expectedObservationTypes = [
    ...(!isOpen ? ['CASH_COUNT', 'CLOSING'] : []),
    ...(session.status_id === 15 ? ['APPROVAL'] : []),
    ...(session.status_id === 16 && session.requires_supervisor_approval ? ['APPROVAL'] : []),
  ];
  const missingObservationTypes = [...new Set(expectedObservationTypes)]
    .filter((type) => !loadedObservationTypes.has(type));

  const inputCls = 'h-7 w-16 rounded border border-slate-200 px-2 text-center text-xs dark:border-slate-700 dark:bg-slate-900';

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Arqueo de caja"
        description={sessionContext}
        actions={[
          { id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate('/cash/opening') },
        ]}
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Informacion de la sesion</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <InfoRow label="Caja" value={session.cash_register?.register_name || '—'} />
            <InfoRow label="Cajero" value={session.cashier_name || '—'} />
            <InfoRow label="Apertura" value={formatDateTime(session.opening_datetime)} />
            <InfoRow label="Monto de apertura" value={money(session.opening_amount)} highlight />
            <InfoRow label="Estado" value={<StatusBadge variant={statusInfo.variant}>{statusInfo.label}</StatusBadge>} />
          </div>
        </div>

        {summary && (
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Ventas de la sesion</h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {summary.by_payment_method?.length === 0 && (
                <p className="py-2 text-sm text-slate-400">Sin ventas registradas.</p>
              )}
              {(summary.by_payment_method || []).map((row) => (
                <div key={row.payment_method_code} className="flex items-center justify-between py-1.5">
                  <div>
                    <div className="text-sm">{row.payment_method_name || row.payment_method_code || '—'}</div>
                    <div className="text-xs text-slate-400">{row.transaction_count} transaccion(es)</div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{money(row.total_amount)}</span>
                </div>
              ))}
            </div>
            {Number(summary.petty_cash_fund_initial_amount || 0) > 0 && (
              <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Caja chica</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Fondo asignado</span>
                    <span className="tabular-nums">{money(summary.petty_cash_fund_initial_amount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-red-500">
                    <span>Gastos de la sesion</span>
                    <span className="tabular-nums">-{money(summary.petty_cash_expenses_total)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <span>Saldo del fondo</span>
                    <span className="tabular-nums">{money(summary.petty_cash_fund_current_balance)}</span>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Total ventas</span>
              <span className="text-sm font-bold tabular-nums">{money(totalSalesAmount)}</span>
            </div>
          </div>
        )}
      </div>

      {summary && (
        <div className="mb-6 rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Cuadratura por medio de pago</h3>

          <div className="grid gap-3 lg:grid-cols-2">
            {/* Columna izquierda: Efectivo */}
            <div className="rounded-md border border-green-200 p-3 dark:border-green-800">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-green-700 dark:text-green-400">Efectivo</p>
              <div className="space-y-1">
                {(methodGroups['CASH'] || []).map((row) => (
                  <div key={row.payment_method_code} className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-600 dark:text-slate-300">{row.payment_method_name || row.payment_method_code}</span>
                      <span className="ml-1 text-[10px] text-slate-400">({row.transaction_count})</span>
                    </div>
                    <span className="text-xs font-semibold tabular-nums">{money(row.total_amount)}</span>
                  </div>
                ))}
                {(methodGroups['CASH'] || []).length === 0 && (
                  <p className="text-xs text-slate-400">Sin ventas en efectivo</p>
                )}
              </div>
              <div className="mt-3 space-y-1 border-t border-slate-200 pt-2 dark:border-slate-700">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Asignacion (apertura)</span>
                  <span className="tabular-nums">{money(summary.opening_amount)}</span>
                </div>
                {Number(summary.petty_cash_expenses_total || 0) > 0 && (
                  <div className="flex justify-between text-xs text-red-500">
                    <span>Gastos caja chica</span>
                    <span className="tabular-nums">-{money(summary.petty_cash_expenses_total)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <span>Saldo esperado</span>
                  <span className="tabular-nums">{money(theoreticalCash)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Contado fisico</span>
                  <span className="tabular-nums">{money(totalPhysicalWithForeign)}</span>
                </div>
                <div className={`flex justify-between text-xs font-semibold ${difference < 0 ? 'text-red-600' : difference > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  <span>Diferencia</span>
                  <span className="tabular-nums">{difference >= 0 ? '+' : ''}{money(difference)}</span>
                </div>
              </div>
            </div>

            {/* Columna derecha: todos los demás medios de pago */}
            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Otros medios de pago</p>
              <div className="space-y-1">
                {['CARD', 'TRANSFER', 'OTHER'].flatMap((type) => methodGroups[type] || []).map((row) => (
                  <div key={row.payment_method_code} className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-600 dark:text-slate-300">{row.payment_method_name || row.payment_method_code}</span>
                      <span className="ml-1 text-[10px] text-slate-400">({row.transaction_count})</span>
                    </div>
                    <span className="text-xs font-semibold tabular-nums">{money(row.total_amount)}</span>
                  </div>
                ))}
                {['CARD', 'TRANSFER', 'OTHER'].every((type) => (methodGroups[type] || []).length === 0) && (
                  <p className="text-xs text-slate-400">Sin otros medios de pago</p>
                )}
              </div>
              {Number(summary.petty_cash_fund_initial_amount || 0) > 0 && (
                <div className="mt-3 space-y-1 border-t border-amber-200 pt-2 dark:border-amber-800">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">Caja chica</p>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Fondo asignado</span>
                    <span className="tabular-nums">{money(summary.petty_cash_fund_initial_amount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-red-500">
                    <span>Gastos de la sesion</span>
                    <span className="tabular-nums">-{money(summary.petty_cash_expenses_total)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <span>Saldo del fondo</span>
                    <span className="tabular-nums">{money(summary.petty_cash_fund_current_balance)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-md bg-slate-100 px-4 py-2.5 dark:bg-slate-800">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Total recaudado</span>
            <span className="text-base font-bold tabular-nums">{money(totalSalesAmount)}</span>
          </div>
        </div>
      )}

      {denominations.length > 0 && (
        <div className="mb-6 rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Conteo de efectivo {!isOpen && <span className="ml-2 text-xs font-normal text-slate-400">(solo lectura)</span>}
          </h3>

          <div className="space-y-5">
            {currencyGroups.map(([code, denoms]) => {
              const coins = denoms.filter((d) => d.denomination_type === 'COIN');
              const bills = denoms.filter((d) => d.denomination_type === 'BILL');
              return (
                <div key={code}>
                  {currencyGroups.length > 1 && (
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                      {code}
                      {code !== primaryCurrency && (
                        <span className="ml-2 font-normal text-slate-400">(referencia — no suma al total {primaryCurrency})</span>
                      )}
                    </p>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[{ label: 'Monedas', items: coins }, { label: 'Billetes', items: bills }]
                      .filter(({ items }) => items.length > 0)
                      .map(({ label, items }) => (
                        <div key={label}>
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                          <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-50 dark:bg-slate-800">
                                <tr>
                                  <th className="px-3 py-1.5 text-left font-medium text-slate-600 dark:text-slate-300">Denominacion</th>
                                  <th className="px-3 py-1.5 text-center font-medium text-slate-600 dark:text-slate-300">Cantidad</th>
                                  <th className="px-3 py-1.5 text-right font-medium text-slate-600 dark:text-slate-300">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {items.map((d) => (
                                  <tr key={d.id}>
                                    <td className="px-3 py-1.5 font-mono text-xs">{d.denomination_label}</td>
                                    <td className="px-2 py-1 text-center">
                                      {isOpen ? (
                                        <input type="number" min="0" className={inputCls} value={counts[d.id] || ''} onChange={(e) => handleCount(d.id, e.target.value)} placeholder="0" />
                                      ) : (
                                        <span className="text-xs">{counts[d.id] || 0}</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-1.5 text-right tabular-nums text-xs">
                                      {(counts[d.id] || 0) > 0 ? money(d.denomination_value * (counts[d.id] || 0)) : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid gap-2 rounded-md bg-slate-50 p-3 dark:bg-slate-800 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-xs text-slate-500">Efectivo fisico contado ({primaryCurrency})</p>
              <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{money(physicalTotal)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">Otras divisas convertidas</p>
              <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{money(adhocClpTotal)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">Efectivo esperado</p>
              <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{money(theoreticalCash)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">Diferencia</p>
              <p className={`text-lg font-bold tabular-nums ${difference < 0 ? 'text-red-600' : difference > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {difference >= 0 ? '+' : ''}{money(difference)}
              </p>
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="mb-6 rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Otras divisas</h3>
              <p className="mt-0.5 text-xs text-slate-400">Registra billetes o monedas de otras monedas recibidos durante la sesion. Se convierten a {primaryCurrency} usando el tipo de cambio vigente.</p>
            </div>
            <button
              type="button"
              onClick={addAdhocRow}
              className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </button>
          </div>
          {adhocRows.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-3">Sin denominaciones adicionales. Usa el boton Agregar si recibiste pago en otra divisa.</p>
          ) : (
            <div>
              <DataTable
                data={adhocRows}
                emptyMessage="Sin denominaciones adicionales."
                columns={[
                  { id: 'label', label: 'Etiqueta', render: (row) => <span className="text-xs font-medium">{row.label}</span> },
                  { id: 'currency_code', label: 'Divisa', align: 'center', render: (row) => <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold dark:bg-slate-800">{row.currency_code}</span> },
                  { id: 'denomination_value', label: 'Valor', align: 'right', sortable: true, sortValue: (row) => parseAmount(row.denomination_value), render: (row) => <span className="tabular-nums text-xs">{parseAmount(row.denomination_value).toLocaleString('es-CL', { maximumFractionDigits: 2 })}</span> },
                  { id: 'quantity', label: 'Cantidad', align: 'center', sortable: true, sortValue: (row) => Number(row.quantity || 0), render: (row) => <span className="text-xs">{row.quantity}</span> },
                  {
                    id: 'fee_pct',
                    label: 'Fee',
                    align: 'right',
                    sortable: true,
                    sortValue: (row) => {
                      const currency = currencies.find((item) => item.currency_code === row.currency_code);
                      const rateInfo = getRateInfo(ratesByCurrency.get(row.currency_code), currency);
                      return parseAmount(row.fee_pct) || rateInfo.feePct;
                    },
                    render: (row) => {
                      const currency = currencies.find((item) => item.currency_code === row.currency_code);
                      const rateInfo = getRateInfo(ratesByCurrency.get(row.currency_code), currency);
                      const feePct = parseAmount(row.fee_pct) || rateInfo.feePct;
                      return <span className="tabular-nums text-xs">{feePct.toLocaleString('es-CL', { maximumFractionDigits: 2 })}%</span>;
                    },
                  },
                  {
                    id: 'foreign_subtotal',
                    label: 'Subtotal divisa',
                    align: 'right',
                    sortable: true,
                    sortValue: (row) => parseAmount(row.denomination_value) * Number(row.quantity || 0),
                    render: (row) => {
                      const sub = parseAmount(row.denomination_value) * Number(row.quantity || 0);
                      return <span className="tabular-nums text-xs">{sub > 0 ? `${sub.toLocaleString('es-CL')} ${row.currency_code}` : '—'}</span>;
                    },
                  },
                  {
                    id: 'converted_subtotal',
                    label: 'Equiv. pesos',
                    align: 'right',
                    sortable: true,
                    sortValue: (row) => {
                      const sub = parseAmount(row.denomination_value) * Number(row.quantity || 0);
                      const currency = currencies.find((item) => item.currency_code === row.currency_code);
                      const rateInfo = getRateInfo(ratesByCurrency.get(row.currency_code), currency);
                      const effectiveRate = parseAmount(row.exchange_rate) || rateInfo.effectiveRate;
                      return sub * effectiveRate;
                    },
                    render: (row) => {
                      const sub = parseAmount(row.denomination_value) * Number(row.quantity || 0);
                      const currency = currencies.find((item) => item.currency_code === row.currency_code);
                      const rateInfo = getRateInfo(ratesByCurrency.get(row.currency_code), currency);
                      const effectiveRate = parseAmount(row.exchange_rate) || rateInfo.effectiveRate;
                      const clpSub = sub * effectiveRate;
                      return <span className="tabular-nums text-xs font-semibold">{clpSub > 0 ? money(clpSub) : '—'}</span>;
                    },
                  },
                  {
                    id: 'actions',
                    label: 'Acciones',
                    align: 'center',
                    render: (row) => (
                      <div className="flex justify-center gap-2">
                        <RowActionButton
                          label="Editar divisa"
                          icon={Pencil}
                          onClick={() => editAdhocRow(row)}
                        />
                        <RowActionButton
                          label="Eliminar divisa"
                          icon={Trash2}
                          variant="danger"
                          onClick={() => removeAdhocRow(row)}
                        />
                      </div>
                    ),
                  },
                ]}
              />
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
                <span className="text-slate-500">Total otras divisas convertido</span>
                <span className="font-bold tabular-nums">{money(adhocClpTotal)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mb-6 rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Observaciones</h3>
          <span className="text-xs text-slate-400">
            {visibleObservations.length} cargada(s)
            {missingObservationTypes.length > 0 ? ` · ${missingObservationTypes.length} pendiente(s)` : ''}
          </span>
        </div>
        <div className="space-y-3">
          {visibleObservations.length === 0 && (
            <div className="rounded-md border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500 dark:border-slate-700">
              Sin observaciones cargadas para esta sesion.
            </div>
          )}

          {visibleObservations.map((obs) => {
            const meta = OBSERVATION_META[obs.observation_type] || { label: obs.observation_type, role: 'usuario', variant: 'neutral' };
            const name = obs.created_by_name || (meta.role === 'supervisor' ? session.supervisor_name : session.cashier_name) || meta.role;
            return (
              <div key={obs.id} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>
                  <span className="text-xs text-slate-400">{name} · {meta.role}</span>
                  {obs.source === 'fallback' && <span className="text-xs font-medium text-amber-600 dark:text-amber-400">recuperada desde notas antiguas</span>}
                </div>
                <p className="whitespace-pre-wrap">{obs.observation_text || 'Sin texto registrado.'}</p>
                <p className="mt-2 text-xs text-slate-400">fecha: {formatDateTime(obs.observed_at || obs.created_at)}</p>
              </div>
            );
          })}

          {missingObservationTypes.map((type) => {
            const meta = OBSERVATION_META[type];
            return (
              <div key={`missing-${type}`} className="rounded-md border border-dashed border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                <span className="font-semibold">{meta.label}:</span>
                <span className="ml-2">{meta.pending}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Confirmar cierre</h3>
        <div className="space-y-3">
          <div className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Observacion de arqueo <span className="text-red-500">*</span></span>
            <textarea
              className="min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"
              value={cashCountNotes}
              onChange={(e) => setCashCountNotes(e.target.value)}
              placeholder="Observaciones del arqueo (obligatorio)"
              disabled={!isOpen || saving}
            />
          </div>
          <div className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Observacion de cierre <span className="text-slate-400">(opcional)</span></span>
            <textarea
              className="min-h-[70px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder="Observaciones administrativas del cierre"
              disabled={!isOpen || saving}
            />
          </div>
          <div className="flex justify-end gap-2">
            <ActionButton
              label="Volver"
              icon={XCircle}
              variant="neutral"
              onClick={() => navigate('/cash/opening')}
              disabled={saving}
            />
            <ActionButton
              label={saving ? 'Cerrando...' : 'Confirmar cierre de caja'}
              icon={CheckCircle2}
              onClick={handleClose}
              disabled={!isOpen || saving}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CashCount;
