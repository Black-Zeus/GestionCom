/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import StatusBadge from '@/components/common/data/StatusBadge';
import { ActionButton } from '@/components/common/actions/ActionButton';
import { getBackendMessage, toast } from '@/services/ui/notify';
import { cashSessionsService } from '@/services/cash/cashSessionsService';

const money = (value) => Number(value || 0).toLocaleString('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

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

const CashCount = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState(null);
  const [denominations, setDenominations] = useState([]);
  const [counts, setCounts] = useState({});
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
        closingCounts.forEach((c) => { initialCounts[c.currency_denomination_id] = c.quantity; });
      }
      setCounts(initialCounts);
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

  const handleCount = (id, value) => {
    const qty = Math.max(0, parseInt(value, 10) || 0);
    setCounts((prev) => ({ ...prev, [id]: qty }));
  };

  const physicalTotal = useMemo(() => (
    denominations.reduce((sum, d) => sum + (d.denomination_value * (counts[d.id] || 0)), 0)
  ), [denominations, counts]);

  const theoreticalCash = useMemo(() => (
    summary ? Number(summary.theoretical_cash || 0) : 0
  ), [summary]);

  const difference = useMemo(() => physicalTotal - theoreticalCash, [physicalTotal, theoreticalCash]);

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
      await cashSessionsService.close(sessionId, {
        physical_amount: physicalTotal,
        closing_notes: closingNotes.trim() || null,
        cash_count_notes: cashCountNotes.trim(),
        denomination_counts: denominationCounts,
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
  const coins = denominations.filter((d) => d.denomination_type === 'COIN');
  const bills = denominations.filter((d) => d.denomination_type === 'BILL');

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Arqueo de caja"
        description={`Sesion: ${session.session_code?.slice(0, 8)}...`}
        actions={[
          { id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate('/cash/opening') },
        ]}
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Informacion de la sesion</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <InfoRow label="Caja" value={session.cash_register?.register_name || '—'} />
            <InfoRow label="Codigo de sesion" value={session.session_code?.slice(0, 12) + '...' || '—'} />
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
            <div className="mt-3 space-y-0 border-t border-slate-200 pt-3 dark:border-slate-700">
              {Number(summary.petty_cash_expenses_total || 0) > 0 && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-slate-500">Gastos caja chica</span>
                  <span className="text-sm font-semibold tabular-nums text-red-600">
                    -{money(summary.petty_cash_expenses_total)}
                  </span>
                </div>
              )}
              <InfoRow label="Efectivo esperado" value={money(theoreticalCash)} highlight />
            </div>
          </div>
        )}
      </div>

      {denominations.length > 0 && (
        <div className="mb-6 rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Conteo de efectivo {!isOpen && <span className="ml-2 text-xs font-normal text-slate-400">(solo lectura)</span>}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {[{ label: 'Monedas', items: coins }, { label: 'Billetes', items: bills }].map(({ label, items }) => (
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
                              <input
                                type="number"
                                min="0"
                                className="h-7 w-16 rounded border border-slate-200 px-2 text-center text-xs dark:border-slate-700 dark:bg-slate-900"
                                value={counts[d.id] || ''}
                                onChange={(e) => handleCount(d.id, e.target.value)}
                                placeholder="0"
                              />
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

          <div className="mt-4 grid gap-2 rounded-md bg-slate-50 p-3 dark:bg-slate-800 sm:grid-cols-3">
            <div className="text-center">
              <p className="text-xs text-slate-500">Efectivo fisico contado</p>
              <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{money(physicalTotal)}</p>
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

      {(session?.observations?.length > 0 || session?.cashier_notes || session?.supervisor_notes) && (
        <div className="mb-6 rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Observaciones</h3>
          <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
            {(session.observations || [])
              .filter((obs) => ['CLOSING', 'CASH_COUNT'].includes(obs.observation_type))
              .map((obs) => {
                const name = obs.created_by_name || session.cashier_name || 'Cajero';
                return (
                  <div key={obs.id} className="pt-4 first:pt-0 text-sm text-slate-700 dark:text-slate-300">
                    <p>
                      <span className="font-semibold">{name} (cajero):</span>{' '}
                      {obs.observation_text}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">fecha: {formatDateTime(obs.observed_at)}</p>
                  </div>
                );
              })}

            {(session.observations || [])
              .filter((obs) => ['APPROVAL', 'REJECTION'].includes(obs.observation_type))
              .map((obs) => {
                const name = obs.created_by_name || session.supervisor_name || 'Supervisor';
                const isApproved = obs.observation_type === 'APPROVAL';
                return (
                  <div key={obs.id} className="pt-4 first:pt-0 text-sm text-slate-700 dark:text-slate-300">
                    <p>
                      <span className="font-semibold">{name} (supervisor):</span>{' '}
                      {obs.observation_text}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">fecha: {formatDateTime(obs.observed_at)}</p>
                    <p className={`mt-0.5 text-xs font-semibold ${isApproved ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      Estado: {isApproved ? 'Aprobado' : 'Rechazado'}
                    </p>
                  </div>
                );
              })}

            {(session.observations || []).length === 0 && session.cashier_notes && (
              <div className="pt-4 first:pt-0 text-sm text-slate-700 dark:text-slate-300">
                <p>
                  <span className="font-semibold">{session.cashier_name || 'Cajero'} (cajero):</span>{' '}
                  {session.cashier_notes}
                </p>
              </div>
            )}
            {(session.observations || []).length === 0 && session.supervisor_notes && (
              <div className="pt-4 first:pt-0 text-sm text-slate-700 dark:text-slate-300">
                <p>
                  <span className="font-semibold">{session.supervisor_name || 'Supervisor'} (supervisor):</span>{' '}
                  {session.supervisor_notes}
                </p>
                <p className={`mt-0.5 text-xs font-semibold ${session.is_approved ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  Estado: {session.is_approved ? 'Aprobado' : 'Rechazado'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {isOpen && (
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Confirmar cierre</h3>
          <div className="space-y-3">
            <div className="space-y-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">Observacion de arqueo <span className="text-red-500">*</span></span>
              <textarea
                className="min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950"
                value={cashCountNotes}
                onChange={(e) => setCashCountNotes(e.target.value)}
                placeholder="Observaciones del arqueo (obligatorio)"
              />
            </div>
            <div className="space-y-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">Observacion de cierre <span className="text-slate-400">(opcional)</span></span>
              <textarea
                className="min-h-[70px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950"
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Observaciones administrativas del cierre"
              />
            </div>
            <div className="flex justify-end gap-2">
              <ActionButton
                label="Cancelar"
                icon={XCircle}
                variant="neutral"
                onClick={() => navigate('/cash/opening')}
                disabled={saving}
              />
              <ActionButton
                label={saving ? 'Cerrando...' : 'Confirmar cierre de caja'}
                icon={CheckCircle2}
                onClick={handleClose}
                disabled={saving}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default CashCount;
