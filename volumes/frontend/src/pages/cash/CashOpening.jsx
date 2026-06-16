/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Eye, Lock, LockOpen, RefreshCcw, ThumbsDown, ThumbsUp, XCircle } from 'lucide-react';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import DataTable from '@/components/common/data/DataTable';
import StatusBadge from '@/components/common/data/StatusBadge';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import ModalManager from '@/components/ui/modal';
import { getBackendMessage, toast } from '@/services/ui/notify';
import { cashSessionsService } from '@/services/cash/cashSessionsService';
import { useSessionStore } from '@/store/useSessionStore';

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

const OpenSessionForm = ({ register, denominations, onClose, onSuccess }) => {
  const [notes, setNotes] = useState('');
  const [counts, setCounts] = useState({});
  const [saving, setSaving] = useState(false);

  const fieldClass = 'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';

  const handleCount = (id, value) => {
    const qty = Math.max(0, parseInt(value, 10) || 0);
    setCounts((prev) => ({ ...prev, [id]: qty }));
  };

  const currencyGroups = useMemo(() => {
    const map = {};
    (denominations || []).forEach((d) => {
      const code = d.currency_code || 'CLP';
      if (!map[code]) map[code] = [];
      map[code].push(d);
    });
    return Object.entries(map).sort(([a], [b]) => (a === 'CLP' ? -1 : b === 'CLP' ? 1 : a.localeCompare(b)));
  }, [denominations]);

  const primaryCurrency = currencyGroups.length > 0 ? currencyGroups[0][0] : 'CLP';

  const totalFromCounts = useMemo(() => (
    (denominations || [])
      .filter((d) => (d.currency_code || 'CLP') === primaryCurrency)
      .reduce((sum, d) => sum + (d.denomination_value * (counts[d.id] || 0)), 0)
  ), [denominations, counts, primaryCurrency]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const denominationCounts = (denominations || [])
        .filter((d) => (counts[d.id] || 0) > 0)
        .map((d) => ({ denomination_id: d.id, quantity: counts[d.id] }));
      await cashSessionsService.open({
        cash_register_id: register.id,
        opening_amount: totalFromCounts,
        opening_notes: notes || null,
        denomination_counts: denominationCounts,
      });
      toast.success(`Caja "${register.register_name}" abierta.`);
      onClose();
      onSuccess();
    } catch (err) {
      toast.error(getBackendMessage(err, 'No fue posible abrir la sesion.'));
    } finally {
      setSaving(false);
    }
  };

  const renderDenomTable = (items) => (
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
              <td className="px-2 py-1">
                <input
                  type="number"
                  min="0"
                  className="h-7 w-16 rounded border border-slate-200 px-2 text-center text-xs dark:border-slate-700 dark:bg-slate-900"
                  value={counts[d.id] || ''}
                  onChange={(e) => handleCount(d.id, e.target.value)}
                  placeholder="0"
                />
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-xs">
                {(counts[d.id] || 0) > 0 ? money(d.denomination_value * (counts[d.id] || 0)) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4 p-1">
      {(denominations || []).length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Conteo de efectivo</p>
          <div className="space-y-4">
            {currencyGroups.map(([code, denoms]) => {
              const coins = denoms.filter((d) => d.denomination_type === 'COIN');
              const bills = denoms.filter((d) => d.denomination_type === 'BILL');
              const subtotal = denoms.reduce((s, d) => s + (d.denomination_value * (counts[d.id] || 0)), 0);
              return (
                <div key={code}>
                  {currencyGroups.length > 1 && (
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                      {code}
                      {code !== primaryCurrency && <span className="ml-2 font-normal text-slate-400">(referencia — no suma al monto de apertura)</span>}
                    </p>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {coins.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Monedas</p>
                        {renderDenomTable(coins)}
                      </div>
                    )}
                    {bills.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Billetes</p>
                        {renderDenomTable(bills)}
                      </div>
                    )}
                  </div>
                  {currencyGroups.length > 1 && subtotal > 0 && (
                    <div className="mt-2 flex items-center justify-between rounded bg-slate-100 px-3 py-1.5 text-sm dark:bg-slate-800">
                      <span className="text-slate-500">Subtotal {code}</span>
                      <span className="font-semibold tabular-nums">{subtotal.toLocaleString('es-CL')} {code}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-md bg-slate-50 px-4 py-2 dark:bg-slate-800">
            <span className="text-sm text-slate-500">Monto de apertura ({primaryCurrency})</span>
            <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{money(totalFromCounts)}</span>
          </div>
        </div>
      )}

      <div className="space-y-1 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">Notas de apertura</span>
        <textarea
          rows={4}
          className={`${fieldClass} h-auto resize-none py-2`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Opcional"
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <ActionButton label="Cancelar" variant="neutral" icon={XCircle} onClick={onClose} disabled={saving} />
        <ActionButton label={saving ? 'Abriendo...' : 'Confirmar apertura'} icon={LockOpen} onClick={handleSubmit} disabled={saving} />
      </div>
    </div>
  );
};

const ApproveSessionForm = ({ session, onClose, onSuccess }) => {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const taClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950 resize-none';

  const hasDiscrepancy = Number(session.difference_amount || 0) !== 0;

  const handleSubmit = async () => {
    if (hasDiscrepancy && !notes.trim()) {
      toast.error('La observacion es obligatoria cuando existe discrepancia en el arqueo.');
      return;
    }
    setSaving(true);
    try {
      await cashSessionsService.approve(session.id, { supervisor_notes: notes.trim() || null });
      toast.success('Sesion aprobada y cerrada.');
      onClose();
      onSuccess();
    } catch (err) {
      toast.error(getBackendMessage(err, 'No fue posible aprobar la sesion.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-1">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Caja: <strong>{session.cash_register?.register_name || '—'}</strong>
        {hasDiscrepancy && (
          <span className={`ml-2 font-semibold ${Number(session.difference_amount) < 0 ? 'text-red-600' : 'text-amber-600'}`}>
            &nbsp;· Diferencia: {money(session.difference_amount)}
          </span>
        )}
      </p>
      <div className="space-y-1 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">
          Notas del supervisor {hasDiscrepancy ? <span className="text-red-500">*</span> : <span className="text-slate-400">(opcional)</span>}
        </span>
        <textarea
          rows={4}
          className={taClass}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={hasDiscrepancy ? 'Obligatorio al existir discrepancia...' : 'Observaciones de la aprobacion'}
          autoFocus
        />
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <ActionButton label="Cancelar" variant="neutral" icon={XCircle} onClick={onClose} disabled={saving} />
        <ActionButton label={saving ? 'Aprobando...' : 'Aprobar cierre'} icon={ThumbsUp} onClick={handleSubmit} disabled={saving} />
      </div>
    </div>
  );
};

const RejectSessionForm = ({ session, onClose, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const taClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950 resize-none';

  const handleSubmit = async () => {
    if (!reason.trim()) { toast.error('El motivo de rechazo es obligatorio.'); return; }
    setSaving(true);
    try {
      await cashSessionsService.reject(session.id, { rejection_reason: reason.trim() });
      toast.success('Cierre rechazado. La caja quedo abierta para nuevo arqueo.');
      onClose();
      onSuccess();
    } catch (err) {
      toast.error(getBackendMessage(err, 'No fue posible rechazar la sesion.'));
    } finally {
      setSaving(false);
    }
  };

  const hasDiff = Number(session.difference_amount || 0) !== 0;

  return (
    <div className="space-y-4 p-1">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Caja: <strong>{session.cash_register?.register_name || '—'}</strong>
        {hasDiff && (
          <span className={`ml-2 font-semibold ${Number(session.difference_amount) < 0 ? 'text-red-600' : 'text-amber-600'}`}>
            &nbsp;· Diferencia: {money(session.difference_amount)}
          </span>
        )}
        . La sesion volvera a estado <strong>Abierta</strong> para que el cajero corrija el arqueo.
      </p>
      <div className="space-y-1 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">Motivo del rechazo <span className="text-red-500">*</span></span>
        <textarea rows={4} className={taClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe el motivo del rechazo..." autoFocus />
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <ActionButton label="Cancelar" variant="neutral" icon={XCircle} onClick={onClose} disabled={saving} />
        <ActionButton label={saving ? 'Rechazando...' : 'Rechazar cierre'} icon={ThumbsDown} onClick={handleSubmit} disabled={saving} />
      </div>
    </div>
  );
};

const CashOpening = () => {
  const navigate = useNavigate();
  const sessionRegisters = useSessionStore((state) => state.cashRegisters);
  const [activeSessions, setActiveSessions] = useState([]);
  const [pendingSessions, setPendingSessions] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [denominations, setDenominations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [active, pending, recent, denoms] = await Promise.all([
        cashSessionsService.listActive(),
        cashSessionsService.list({ status_id: 15 }),
        cashSessionsService.list({ limit: 30 }),
        cashSessionsService.getDenominations(),
      ]);
      setActiveSessions(active);
      setPendingSessions(pending);
      setRecentSessions(recent);
      setDenominations(denoms);
    } catch {
      toast.error('Error al cargar los datos de caja.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeSessionByRegister = useMemo(() => {
    const map = {};
    activeSessions.forEach((s) => { map[String(s.cash_register_id)] = s; });
    return map;
  }, [activeSessions]);

  const pendingSessionByRegister = useMemo(() => {
    const map = {};
    pendingSessions.forEach((s) => { map[String(s.cash_register_id)] = s; });
    return map;
  }, [pendingSessions]);

  const registerRows = useMemo(() => (
    sessionRegisters.map((reg) => ({
      ...reg,
      activeSession: activeSessionByRegister[String(reg.id)] || null,
      pendingSession: pendingSessionByRegister[String(reg.id)] || null,
    }))
  ), [sessionRegisters, activeSessionByRegister, pendingSessionByRegister]);

  const approveSessionModal = (sess) => {
    const modalId = ModalManager.show({
      type: 'custom',
      title: 'Aprobar cierre de caja',
      size: 'medium',
      showFooter: false,
      contentComponent: ApproveSessionForm,
      contentProps: {
        session: sess,
        onClose: () => ModalManager.close(modalId),
        onSuccess: () => load(),
      },
    });
  };

  const rejectSessionModal = (sess) => {
    const modalId = ModalManager.show({
      type: 'custom',
      title: 'Rechazar cierre de caja',
      size: 'medium',
      showFooter: false,
      contentComponent: RejectSessionForm,
      contentProps: {
        session: sess,
        onClose: () => ModalManager.close(modalId),
        onSuccess: () => load(),
      },
    });
  };

  const openSessionModal = (register) => {
    const modalId = ModalManager.show({
      type: 'custom',
      title: `Abrir caja: ${register.register_name}`,
      size: 'large',
      showFooter: false,
      contentComponent: OpenSessionForm,
      contentProps: {
        register,
        denominations,
        onClose: () => ModalManager.close(modalId),
        onSuccess: () => load(),
      },
    });
  };

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Apertura / cierre de caja"
        description="Gestiona la apertura y cierre de sesiones por caja registradora."
        actions={(
          <ActionButton label="Actualizar" icon={RefreshCcw} variant="neutral" onClick={load} disabled={loading} />
        )}
      />

      <div className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Cajas disponibles</h2>
        <DataTable
          data={registerRows}
          getRowKey={(row) => row.id}
          loading={loading}
          emptyMessage="No tienes cajas asignadas. Contacta al administrador para configurar tu asignacion de operador."
          columns={[
            {
              id: 'name',
              label: 'Caja',
              render: (row) => (
                <div>
                  <div className="font-medium">{row.register_name}</div>
                  <div className="font-mono text-xs text-slate-500">{row.register_code}</div>
                </div>
              ),
            },
            {
              id: 'status',
              label: 'Estado',
              align: 'center',
              render: (row) => {
                if (row.activeSession) return <StatusBadge variant="active"><LockOpen className="mr-1 inline h-3 w-3" />Abierta</StatusBadge>;
                if (row.pendingSession) return <StatusBadge variant="warning">Pend. aprobacion</StatusBadge>;
                return <StatusBadge variant="inactive"><Lock className="mr-1 inline h-3 w-3" />Cerrada</StatusBadge>;
              },
            },
            {
              id: 'session_info',
              label: 'Sesion activa',
              render: (row) => {
                const s = row.activeSession || row.pendingSession;
                if (!s) return <span className="text-slate-400">—</span>;
                return (
                  <div className="text-sm">
                    <div className="text-xs text-slate-400">
                      Apertura: {s.opening_datetime ? new Date(s.opening_datetime).toLocaleString('es-CL', { hour12: false }) : '—'}
                    </div>
                    <div className="text-xs">Monto inicial: <span className="font-semibold tabular-nums">{money(s.opening_amount)}</span></div>
                  </div>
                );
              },
            },
            {
              id: 'actions',
              label: 'Acciones',
              align: 'right',
              render: (row) => (
                <div className="flex items-center justify-end gap-1">
                  {row.activeSession && (
                    <RowActionButton
                      label="Arqueo / Cerrar"
                      icon={CheckCircle2}
                      onClick={() => navigate(`/cash/count?session_id=${row.activeSession.id}`)}
                    />
                  )}
                  {!row.activeSession && !row.pendingSession && (
                    <RowActionButton
                      label="Abrir caja"
                      icon={LockOpen}
                      onClick={() => openSessionModal(row)}
                    />
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Historial reciente</h2>
        <DataTable
          data={recentSessions}
          getRowKey={(row) => row.id}
          loading={loading}
          emptyMessage="No hay sesiones registradas."
          columns={[
            {
              id: 'register',
              label: 'Caja',
              render: (row) => (
                <div>
                  <div className="font-medium">{row.cash_register?.register_name || '—'}</div>
                  <div className="font-mono text-xs text-slate-500">{row.cash_register?.register_code || '—'}</div>
                </div>
              ),
            },
            {
              id: 'opening',
              label: 'Apertura',
              render: (row) => (
                <div className="text-sm">
                  <div>{row.opening_datetime ? new Date(row.opening_datetime).toLocaleString('es-CL', { hour12: false }) : '—'}</div>
                  <div className="tabular-nums text-slate-500">{money(row.opening_amount)}</div>
                </div>
              ),
            },
            {
              id: 'closing',
              label: 'Cierre',
              render: (row) => (
                row.closing_datetime
                  ? (
                    <div className="text-sm">
                      <div>{new Date(row.closing_datetime).toLocaleString('es-CL', { hour12: false })}</div>
                      {row.difference_amount !== null && (
                        <div className={`tabular-nums ${Number(row.difference_amount) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          Dif: {money(row.difference_amount)}
                        </div>
                      )}
                    </div>
                  )
                  : <span className="text-slate-400">—</span>
              ),
            },
            {
              id: 'status',
              label: 'Estado',
              align: 'center',
              render: (row) => {
                const s = STATUS_MAP[row.status_id] || { label: String(row.status_id), variant: 'inactive' };
                return <StatusBadge variant={s.variant}>{s.label}</StatusBadge>;
              },
            },
            {
              id: 'actions',
              label: '',
              align: 'right',
              render: (row) => (
                <div className="flex items-center justify-end gap-1">
                  <RowActionButton label="Ver registro" icon={Eye} onClick={() => navigate(`/cash/count?session_id=${row.id}`)} />
                  {row.status_id === 14 && (
                    <RowActionButton label="Ir al arqueo" icon={CheckCircle2} onClick={() => navigate(`/cash/count?session_id=${row.id}`)} />
                  )}
                  {row.status_id === 15 && (
                    <>
                      <RowActionButton label="Aprobar" icon={ThumbsUp} onClick={() => approveSessionModal(row)} />
                      <RowActionButton label="Rechazar" icon={ThumbsDown} onClick={() => rejectSessionModal(row)} />
                    </>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    </section>
  );
};

export default CashOpening;
