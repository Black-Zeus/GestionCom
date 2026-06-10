/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAY_NAMES = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

const toISO = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const fromISO = (iso) => iso ? new Date(`${iso}T00:00:00`) : null;

const formatDisplay = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const calendarGrid = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const cursor = new Date(firstDay);
  cursor.setDate(cursor.getDate() - firstDay.getDay());
  return Array.from({ length: 42 }, () => { const d = new Date(cursor); cursor.setDate(cursor.getDate() + 1); return d; });
};

/**
 * DateRangePicker
 * Props:
 *   dateFrom  — 'YYYY-MM-DD' or ''
 *   dateTo    — 'YYYY-MM-DD' or ''
 *   onChange  — ({ from, to }) => void  — called when user applies or clears
 *   maxDays   — max allowed range (default 31)
 *   className — extra class on the trigger button
 */
const DateRangePicker = ({ dateFrom = '', dateTo = '', onChange, maxDays = 31, className = '' }) => {
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const base = dateFrom ? fromISO(dateFrom) : new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const [tempFrom, setTempFrom] = useState(dateFrom);
  const [tempTo, setTempTo] = useState(dateTo);
  const [hover, setHover] = useState(null);
  const [rangeError, setRangeError] = useState('');
  const containerRef = useRef(null);

  // Sync external prop changes (e.g. resetFilters)
  useEffect(() => { setTempFrom(dateFrom); setTempTo(dateTo); }, [dateFrom, dateTo]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (!containerRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const days = useMemo(() => calendarGrid(currentMonth.year, currentMonth.month), [currentMonth]);

  const navigate = useCallback((dir) => {
    setCurrentMonth(({ year, month }) => {
      let m = month + dir;
      let y = year;
      if (m < 0) { m = 11; y -= 1; }
      if (m > 11) { m = 0; y += 1; }
      return { year: y, month: m };
    });
  }, []);

  const handleDayClick = (date) => {
    const iso = toISO(date);
    if (!tempFrom || (tempFrom && tempTo)) {
      setTempFrom(iso);
      setTempTo('');
      setRangeError('');
      return;
    }
    // Second click — complete the range
    const [a, b] = iso < tempFrom ? [iso, tempFrom] : [tempFrom, iso];
    const diff = (fromISO(b) - fromISO(a)) / 86400000;
    if (diff > maxDays) {
      setRangeError(`El rango no puede superar ${maxDays} días.`);
      setTempFrom(iso);
      setTempTo('');
      return;
    }
    setRangeError('');
    setTempFrom(a);
    setTempTo(b);
  };

  const handleApply = () => {
    if (!tempFrom || !tempTo) return;
    onChange({ from: tempFrom, to: tempTo });
    setOpen(false);
  };

  const handleClear = () => {
    setTempFrom('');
    setTempTo('');
    setRangeError('');
    onChange({ from: '', to: '' });
    setOpen(false);
  };

  // Hover preview: effective end while selecting first click done
  const effectiveTo = tempFrom && !tempTo && hover ? (hover >= tempFrom ? hover : tempFrom) : tempTo;
  const effectiveFrom = tempFrom && !tempTo && hover && hover < tempFrom ? hover : tempFrom;

  const isDaySelected = (iso) => iso === effectiveFrom || iso === effectiveTo;
  const isDayInRange = (iso) => effectiveFrom && effectiveTo && iso > effectiveFrom && iso < effectiveTo;
  const isRangeEdge = (iso) => iso === effectiveFrom || iso === effectiveTo;

  const today = toISO(new Date());

  // Trigger label
  const triggerLabel = dateFrom && dateTo
    ? `${formatDisplay(dateFrom)} — ${formatDisplay(dateTo)}`
    : 'Seleccionar rango';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          'flex h-10 items-center gap-2 rounded-md border px-3 text-sm transition-colors',
          (dateFrom && dateTo)
            ? 'border-blue-400 bg-blue-50 text-blue-800 dark:border-blue-600 dark:bg-blue-950 dark:text-blue-200'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600',
        ].join(' ')}
      >
        <Calendar className="h-4 w-4 shrink-0" />
        <span className="whitespace-nowrap">{triggerLabel}</span>
        {(dateFrom || dateTo) && (
          <X
            className="ml-1 h-3.5 w-3.5 shrink-0 opacity-60 hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
          />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {/* Month nav */}
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => navigate(-1)} className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
            </span>
            <button type="button" onClick={() => navigate(1)} className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="mb-1 grid grid-cols-7 text-center">
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-0.5 text-xs font-medium text-slate-400">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {days.map((date, idx) => {
              const iso = toISO(date);
              const isThisMonth = date.getMonth() === currentMonth.month;
              const isToday = iso === today;
              const selected = isDaySelected(iso);
              const inRange = isDayInRange(iso);
              const edge = isRangeEdge(iso);

              let cls = 'relative flex h-8 w-full items-center justify-center text-xs cursor-pointer select-none';
              if (!isThisMonth) cls += ' text-slate-300 dark:text-slate-600';
              else if (selected) cls += ' text-white font-semibold';
              else if (inRange) cls += ' text-slate-700 dark:text-slate-200';
              else if (isToday) cls += ' font-semibold text-blue-600 dark:text-blue-400';
              else cls += ' text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded';

              // Range background strip
              let bgEl = null;
              if (selected && effectiveFrom && effectiveTo) {
                const isStart = iso === effectiveFrom;
                const isEnd = iso === effectiveTo;
                bgEl = (
                  <span className={[
                    'absolute inset-y-0 bg-blue-100 dark:bg-blue-900',
                    isStart && isEnd ? 'left-1 right-1 rounded' : isStart ? 'left-1/2 right-0' : isEnd ? 'left-0 right-1/2' : '',
                  ].join(' ')} />
                );
              } else if (inRange) {
                bgEl = <span className="absolute inset-y-0 left-0 right-0 bg-blue-50 dark:bg-blue-900/40" />;
              }

              // Circle for selected days
              const circleEl = selected
                ? <span className="absolute inset-y-0.5 left-1/2 z-10 aspect-square w-7 -translate-x-1/2 rounded-full bg-blue-600 dark:bg-blue-500" />
                : null;

              return (
                <div
                  key={idx}
                  className={cls}
                  onClick={() => isThisMonth && handleDayClick(date)}
                  onMouseEnter={() => tempFrom && !tempTo && isThisMonth && setHover(iso)}
                  onMouseLeave={() => setHover(null)}
                >
                  {bgEl}
                  {circleEl}
                  <span className="relative z-20">{date.getDate()}</span>
                </div>
              );
            })}
          </div>

          {/* Status / error */}
          <div className="mt-2 min-h-5 text-xs">
            {rangeError
              ? <span className="text-amber-600 dark:text-amber-400">{rangeError}</span>
              : tempFrom && !tempTo
                ? <span className="text-slate-400">Selecciona la fecha hasta...</span>
                : tempFrom && tempTo
                  ? <span className="text-slate-500">{formatDisplay(tempFrom)} — {formatDisplay(tempTo)}</span>
                  : <span className="text-slate-400">Selecciona la fecha desde...</span>}
          </div>

          {/* Footer */}
          <div className="mt-2 flex justify-end gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
            <button type="button" onClick={handleClear} className="h-8 rounded px-3 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              Limpiar
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!tempFrom || !tempTo}
              className="h-8 rounded bg-blue-600 px-4 text-xs font-medium text-white disabled:opacity-40 hover:bg-blue-700 dark:hover:bg-blue-500"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
