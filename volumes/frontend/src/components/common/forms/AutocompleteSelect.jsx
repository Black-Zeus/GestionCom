/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, XCircle } from 'lucide-react';

const AutocompleteSelect = ({
  value = '',
  onChange,
  options = [],
  placeholder = 'Seleccionar',
  searchPlaceholder = 'Buscar opcion',
  disabled = false,
  clearable = false,
  showIcons = false,
  multiple = false,
  maxVisibleTags = 2,
  className = '',
  buttonClassName = '',
}) => {
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');

  const selectedValues = useMemo(() => {
    if (!multiple) return [];
    if (Array.isArray(value)) return value.map((item) => String(item));
    if (value === null || value === undefined || value === '') return [];
    return [String(value)];
  }, [multiple, value]);

  const selectedOption = useMemo(
    () => (!multiple ? options.find((option) => String(option.value) === String(value)) : null),
    [multiple, options, value]
  );

  const selectedOptions = useMemo(
    () => (multiple ? options.filter((option) => selectedValues.includes(String(option.value))) : []),
    [multiple, options, selectedValues]
  );

  const filteredOptions = useMemo(() => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => (
      [option.label, option.value]
        .filter(Boolean)
        .some((candidate) => String(candidate).toLowerCase().includes(normalized))
    ));
  }, [options, term]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }, [open]);

  const selectOption = (nextValue) => {
    if (multiple) {
      const normalizedNextValue = String(nextValue);
      const exists = selectedValues.includes(normalizedNextValue);
      const nextValues = exists
        ? selectedValues.filter((item) => item !== normalizedNextValue)
        : [...selectedValues, normalizedNextValue];
      onChange?.(nextValues);
      setTerm('');
      return;
    }

    onChange?.(nextValue);
    setTerm('');
    setOpen(false);
  };

  const clearValue = (event) => {
    event.stopPropagation();
    onChange?.(multiple ? [] : '');
    setTerm('');
  };

  const SelectedIcon = showIcons ? selectedOption?.icon : null;
  const hasSelection = multiple ? selectedOptions.length > 0 : Boolean(selectedOption);

  return (
    <div ref={containerRef} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
        className={`flex h-11 w-full min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-left text-sm shadow-sm transition hover:border-blue-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-blue-500 dark:focus:ring-blue-900/40 dark:disabled:bg-slate-900 ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {SelectedIcon && (
          <SelectedIcon className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-300" />
        )}
        {multiple && selectedOptions.length > 0 ? (
          <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {selectedOptions.slice(0, maxVisibleTags).map((option) => (
              <span key={option.value} className="max-w-[9rem] truncate rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
                {option.label}
              </span>
            ))}
            {selectedOptions.length > maxVisibleTags && (
              <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                +{selectedOptions.length - maxVisibleTags}
              </span>
            )}
          </span>
        ) : (
          <span className={`min-w-0 flex-1 truncate ${selectedOption ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
            {selectedOption?.label || placeholder}
          </span>
        )}
        {clearable && hasSelection && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            onClick={clearValue}
            aria-label="Limpiar seleccion"
          >
            <XCircle className="h-4 w-4" />
          </span>
        )}
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-950">
          <div className="flex h-10 items-center gap-2 border-b border-slate-100 px-3 dark:border-slate-800">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              ref={searchInputRef}
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setOpen(false);
                if (event.key === 'Enter' && filteredOptions[0]) selectOption(filteredOptions[0].value);
              }}
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
              placeholder={searchPlaceholder}
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1" role="listbox" aria-multiselectable={multiple || undefined}>
            {filteredOptions.length === 0 && (
              <div className="px-3 py-3 text-sm text-slate-500">Sin coincidencias</div>
            )}
            {filteredOptions.map((option) => {
              const selected = multiple
                ? selectedValues.includes(String(option.value))
                : String(option.value) === String(value);
              const OptionIcon = showIcons ? option.icon : null;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => selectOption(option.value)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                    selected
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900'
                  }`}
                >
                  {OptionIcon && <OptionIcon className="h-4 w-4 shrink-0" />}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {selected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AutocompleteSelect;
