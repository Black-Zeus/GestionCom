import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, RotateCcw, Shuffle, XCircle } from 'lucide-react';
import { adminMaintainersService } from '@/services/admin/adminMaintainersService';

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-900/40';

const money = (value) => Number(value || 0).toLocaleString('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const ReturnActionModal = ({ unit, units, amount, actionType, onConfirm, onClose }) => {
  const [allReasons, setAllReasons] = useState([]);
  const [reasonCode, setReasonCode] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const isReturn = actionType === 'RETURN';
  const selectedUnits = units?.length ? units : unit ? [unit] : [];
  const totalAmount = amount ?? selectedUnits.reduce((sum, item) => sum + Number(item.paid_amount || 0), 0);
  const title = isReturn ? 'Generar ticket de devolución' : 'Generar cambio';
  const Icon = isReturn ? RotateCcw : Shuffle;
  const filterKey = isReturn ? 'allows_refund' : 'allows_exchange';
  const groupedUnits = useMemo(() => {
    const grouped = new Map();
    selectedUnits.forEach((selectedUnit) => {
      const unitAmount = Number(selectedUnit.paid_amount || 0);
      const key = [
        selectedUnit.line_id,
        selectedUnit.code || '',
        selectedUnit.product || '',
        unitAmount,
      ].join('|');
      const current = grouped.get(key) || {
        id: key,
        product: selectedUnit.product,
        code: selectedUnit.code,
        quantity: 0,
        unitAmount,
        totalAmount: 0,
        unitSequences: [],
      };
      current.quantity += 1;
      current.totalAmount += unitAmount;
      current.unitSequences.push(selectedUnit.unit_sequence);
      grouped.set(key, current);
    });
    return Array.from(grouped.values());
  }, [selectedUnits]);

  useEffect(() => {
    adminMaintainersService.list('return-reasons').then((rows) => {
      setAllReasons(rows || []);
    }).catch(() => {});
  }, []);

  const reasons = useMemo(() => (
    allReasons.filter((r) => r[filterKey])
  ), [allReasons, filterKey]);

  useEffect(() => {
    setReasonCode(reasons[0]?.reason_code ?? '');
  }, [reasons]);

  const submit = async (e) => {
    e.preventDefault();
    if (!reasonCode) return;
    setSaving(true);
    try {
      const selectedReason = reasons.find((r) => r.reason_code === reasonCode);
      const reason = [selectedReason?.reason_name, notes.trim()].filter(Boolean).join(' — ');
      await onConfirm(reason || null);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm dark:bg-black/70"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-950 shadow-2xl dark:border-slate-700/80 dark:bg-slate-950/95 dark:text-white">
        <header className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Icon className="h-8 w-8 shrink-0 text-slate-700 dark:text-white" />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold sm:text-2xl">{title}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Revisa las unidades seleccionadas y registra el motivo antes de generar el documento.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Cerrar"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </header>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <main className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-5 pb-5 sm:px-8 lg:grid-cols-[0.95fr_1.45fr]">
            <section className="flex min-h-[28rem] flex-col rounded-lg border border-slate-200 bg-white/70 p-5 dark:border-slate-700/80 dark:bg-slate-900/45">
              <div className="mb-4 border-b border-slate-200 pb-4 dark:border-slate-700">
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">
                    {selectedUnits.length} unidad(es) seleccionada(s)
                  </p>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="space-y-3">
                  {groupedUnits.map((group) => (
                    <div key={group.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-950 dark:text-white">
                            {group.product}
                            <span className="ml-2 text-xs font-semibold text-blue-600 dark:text-blue-300">x{group.quantity}</span>
                          </p>
                          <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                            {group.code || '—'}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {money(group.unitAmount)} c/u
                          </p>
                        </div>
                        <p className="shrink-0 font-semibold tabular-nums text-slate-950 dark:text-white">{money(group.totalAmount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="flex min-h-[28rem] flex-col rounded-lg border border-slate-200 bg-white/70 p-5 dark:border-slate-700/80 dark:bg-slate-900/45">
              <div className="mb-5 border-b border-slate-200 pb-4 dark:border-slate-700">
                <h3 className="text-base font-semibold text-slate-950 dark:text-white">Datos de la operación</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  El motivo queda asociado a la trazabilidad del cambio o devolución.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="space-y-1.5 text-sm">
                  <label className="font-medium text-slate-700 dark:text-slate-200">
                    Motivo <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={fieldClassName}
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value)}
                    required
                  >
                    {reasons.length === 0 && (
                      <option value="">Cargando motivos...</option>
                    )}
                    {reasons.map((r) => (
                      <option key={r.reason_code} value={r.reason_code}>
                        {r.reason_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 text-sm">
                  <label className="font-medium text-slate-700 dark:text-slate-200">
                    Observación <span className="text-xs font-normal text-slate-400">(opcional)</span>
                  </label>
                  <textarea
                    className="min-h-32 w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-3 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-900/40"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Detalles adicionales..."
                    maxLength={200}
                  />
                </div>
              </div>

              <div className="mt-auto rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-slate-600 dark:text-slate-300">Total reconocido</span>
                  <span className="text-xl font-bold tabular-nums text-slate-950 dark:text-white">{money(totalAmount)}</span>
                </div>
              </div>
            </section>
          </main>

          <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700/80 dark:bg-slate-900/70 sm:px-8">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <XCircle className="h-4 w-4" /> Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !reasonCode}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-600 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {saving ? 'Procesando...' : (isReturn ? 'Generar devolución' : 'Generar cambio')}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default ReturnActionModal;
