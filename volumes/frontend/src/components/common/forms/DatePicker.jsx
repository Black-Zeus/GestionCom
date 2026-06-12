/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const ALL_DAY_NAMES = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

const toISO = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDisplay = (value, withTime) => {
  if (!value) return '';
  const [y, mo, d] = value.slice(0, 10).split('-');
  const dateStr = `${d}/${mo}/${y}`;
  if (!withTime) return dateStr;
  const time = value.length >= 16 ? value.slice(11, 16) : '00:00';
  return `${dateStr}  ${time}`;
};

const calendarGrid = (year, month, firstWeekDay = 1) => {
  const firstDay = new Date(year, month, 1);
  const offset   = (firstDay.getDay() - firstWeekDay + 7) % 7;
  const cursor   = new Date(firstDay);
  cursor.setDate(cursor.getDate() - offset);
  return Array.from({ length: 42 }, () => {
    const d = new Date(cursor);
    cursor.setDate(cursor.getDate() + 1);
    return d;
  });
};

/**
 * DatePicker — single-date calendar dropdown, rendered via portal (avoids modal clipping)
 *
 * Props:
 *   value       — 'YYYY-MM-DD' (withTime=false) | 'YYYY-MM-DDTHH:mm' (withTime=true)
 *   onChange    — (value: string) => void
 *   placeholder — label when no value
 *   minDate     — 'YYYY-MM-DD' lower bound
 *   maxDate     — 'YYYY-MM-DD' upper bound
 *   withTime    — show hour/minute selector below calendar
 *   className   — extra class on the wrapper div
 */
const DatePicker = ({
  value = '',
  onChange,
  placeholder = 'Seleccionar fecha',
  minDate,
  maxDate,
  withTime = false,
  firstWeekDay = 1,
  className = '',
}) => {
  const [open, setOpen]   = useState(false);
  const [pos, setPos]     = useState({ top: 0, left: 0 });
  const triggerRef        = useRef(null);
  const dropdownRef       = useRef(null);

  const dateValue = value ? value.slice(0, 10) : '';
  const timeValue = withTime && value && value.length >= 16 ? value.slice(11, 16) : '00:00';
  const [hh, mm]  = timeValue.split(':');

  const [currentMonth, setCurrentMonth] = useState(() => {
    const base = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  useEffect(() => {
    if (dateValue) {
      const d = new Date(`${dateValue}T00:00:00`);
      setCurrentMonth({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [dateValue]);

  const openDropdown = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropH = withTime ? 360 : 300;
    const top = rect.bottom + window.scrollY + 4;
    const fitsBelow = rect.bottom + dropH < window.innerHeight;
    setPos({
      top: fitsBelow ? top : rect.top + window.scrollY - dropH - 4,
      left: rect.left + window.scrollX,
      width: Math.max(rect.width, 240),
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!triggerRef.current?.contains(e.target) && !dropdownRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const dayNames = useMemo(
    () => [...ALL_DAY_NAMES.slice(firstWeekDay), ...ALL_DAY_NAMES.slice(0, firstWeekDay)],
    [firstWeekDay],
  );
  const days = useMemo(
    () => calendarGrid(currentMonth.year, currentMonth.month, firstWeekDay),
    [currentMonth, firstWeekDay],
  );

  const navigate = useCallback((dir) => {
    setCurrentMonth(({ year, month }) => {
      let m = month + dir, y = year;
      if (m < 0)  { m = 11; y -= 1; }
      if (m > 11) { m = 0;  y += 1; }
      return { year: y, month: m };
    });
  }, []);

  const today = toISO(new Date());
  const isDisabled = (iso) => (minDate && iso < minDate) || (maxDate && iso > maxDate);

  const handleDayClick = (date, iso) => {
    if (isDisabled(iso) || date.getMonth() !== currentMonth.month) return;
    if (withTime) {
      onChange(`${iso}T${timeValue}`);
    } else {
      onChange(iso);
      setOpen(false);
    }
  };

  const handleTimeChange = (field, val) => {
    const newTime = field === 'h' ? `${val}:${mm}` : `${hh}:${val}`;
    onChange(dateValue ? `${dateValue}T${newTime}` : '');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div ref={triggerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={openDropdown}
        className={[
          'flex h-10 w-full items-center gap-2 rounded-md border px-3 text-sm transition-colors',
          value
            ? 'border-blue-400 bg-blue-50 text-blue-800 dark:border-blue-600 dark:bg-blue-950 dark:text-blue-200'
            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-600',
        ].join(' ')}
      >
        <Calendar className="h-4 w-4 shrink-0 opacity-60" />
        <span className="flex-1 text-left">{value ? formatDisplay(value, withTime) : placeholder}</span>
        {value && (
          <X className="h-3.5 w-3.5 shrink-0 opacity-50 hover:opacity-100" onClick={handleClear} />
        )}
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{ top: pos.top, left: pos.left, minWidth: pos.width }}
          className="fixed z-[9999] w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          {/* ── Month navigation ── */}
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => navigate(-1)} className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800">
              <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </button>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
            </span>
            <button type="button" onClick={() => navigate(1)} className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800">
              <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </button>
          </div>

          {/* ── Day headers ── */}
          <div className="mb-1 grid grid-cols-7 text-center">
            {dayNames.map((d) => (
              <div key={d} className="py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{d}</div>
            ))}
          </div>

          {/* ── Day grid ── */}
          <div className="grid grid-cols-7">
            {days.map((date, idx) => {
              const iso       = toISO(date);
              const thisMonth = date.getMonth() === currentMonth.month;
              const selected  = iso === dateValue;
              const isToday   = iso === today;
              const disabled  = isDisabled(iso) || !thisMonth;

              let cls = 'flex h-8 w-full cursor-pointer select-none items-center justify-center rounded text-xs';
              if (disabled)      cls += ' cursor-default text-slate-300 dark:text-slate-600';
              else if (selected) cls += ' bg-blue-600 font-semibold text-white';
              else if (isToday)  cls += ' font-semibold text-blue-600 hover:bg-slate-100 dark:text-blue-400 dark:hover:bg-slate-800';
              else               cls += ' text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800';

              return (
                <div key={idx} className={cls} onClick={() => handleDayClick(date, iso)}>
                  {date.getDate()}
                </div>
              );
            })}
          </div>

          {/* ── Time selector ── */}
          {withTime && (
            <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
              <div className="mb-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Hora</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <select
                  value={hh}
                  onChange={(e) => handleTimeChange('h', e.target.value)}
                  className="h-8 w-16 rounded border border-slate-300 bg-white text-center text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="text-lg font-semibold text-slate-400">:</span>
                <select
                  value={mm}
                  onChange={(e) => handleTimeChange('m', e.target.value)}
                  className="h-8 w-16 rounded border border-slate-300 bg-white text-center text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-2.5 w-full rounded-md bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Confirmar
              </button>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
};

export default DatePicker;
