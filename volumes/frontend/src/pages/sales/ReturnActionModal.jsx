import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, RotateCcw, Shuffle, XCircle } from 'lucide-react';
import { adminMaintainersService } from '@/services/admin/adminMaintainersService';

const fieldClassName = 'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-900/40';

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
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Detalle de unidades */}
        <div className="mx-5 mt-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {selectedUnits.length} unidad(es) seleccionada(s)
            </p>
            <p className="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">{money(totalAmount)}</p>
          </div>
          <div className="mt-3 max-h-36 space-y-2 overflow-y-auto pr-1">
            {selectedUnits.map((selectedUnit) => (
              <div key={selectedUnit.id} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                <p className="font-medium text-slate-900 dark:text-slate-100">{selectedUnit.product}</p>
                <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                  {selectedUnit.code || '—'} · Unidad {selectedUnit.unit_sequence} · {money(selectedUnit.paid_amount)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="space-y-1 text-sm">
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

          <div className="space-y-1 text-sm">
            <label className="font-medium text-slate-700 dark:text-slate-200">
              Observación <span className="text-xs font-normal text-slate-400">(opcional)</span>
            </label>
            <input
              className={fieldClassName}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles adicionales..."
              maxLength={200}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <XCircle className="h-4 w-4" /> Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !reasonCode}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {saving ? 'Procesando...' : (isReturn ? 'Generar devolución' : 'Generar cambio')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default ReturnActionModal;
