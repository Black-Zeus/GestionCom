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

const formatDisplay = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const calendarGrid = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const cursor = new Date(firstDay);
  cursor.setDate(cursor.getDate() - firstDay.getDay());
  return Array.from({ length: 42 }, () => {
    const d = new Date(cursor);
    cursor.setDate(cursor.getDate() + 1);
    return d;
  });
};

/**
 * DatePicker — single-date calendar dropdown
 * Props:
 *   value       — 'YYYY-MM-DD' or ''
 *   onChange    — (value: string) => void  — '' when cleared
 *   placeholder — button label when no date selected
 *   minDate     — 'YYYY-MM-DD' — days before this are disabled
 *   maxDate     — 'YYYY-MM-DD' — days after this are disabled
 *   className   — extra class on the trigger button
 */
const DatePicker = ({ value = '', onChange, placeholder = 'Seleccionar fecha', minDate, maxDate, className = '' }) => {
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const base = value ? new Date(`${value}T00:00:00`) : new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const containerRef = useRef(null);

  // When value changes from outside (e.g. reset), update month view
  useEffect(() => {
    if (value) {
      const d = new Date(`${value}T00:00:00`);
      setCurrentMonth({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
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

  const today = toISO(new Date());

  const isDisabled = (iso) => (minDate && iso < minDate) || (maxDate && iso > maxDate);

  const handleDayClick = (date, iso) => {
    if (isDisabled(iso)) return;
    if (date.getMonth() !== currentMonth.month) return;
    onChange(iso);
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          'flex h-10 items-center gap-2 rounded-md border px-3 text-sm transition-colors',
          value
            ? 'border-blue-400 bg-blue-50 text-blue-800 dark:border-blue-600 dark:bg-blue-950 dark:text-blue-200'
            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-600',
        ].join(' ')}
      >
        <Calendar className="h-4 w-4 shrink-0 opacity-60" />
        <span className="whitespace-nowrap">{value ? formatDisplay(value) : placeholder}</span>
        {value && (
          <X className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50 hover:opacity-100" onClick={handleClear} />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
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
              const isSelected = iso === value;
              const isToday = iso === today;
              const disabled = isDisabled(iso) || !isThisMonth;

              let cls = 'flex h-8 w-full items-center justify-center rounded text-xs select-none';
              if (disabled) {
                cls += ' text-slate-300 dark:text-slate-600 cursor-default';
              } else if (isSelected) {
                cls += ' bg-blue-600 text-white font-semibold cursor-pointer';
              } else if (isToday) {
                cls += ' font-semibold text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer';
              } else {
                cls += ' text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer';
              }

              return (
                <div key={idx} className={cls} onClick={() => handleDayClick(date, iso)}>
                  {date.getDate()}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
