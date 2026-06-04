/* eslint-disable react/prop-types */
import { Search } from 'lucide-react';

const FilterBar = ({
  searchValue = '',
  searchPlaceholder = 'Buscar',
  onSearchChange,
  onSearchSubmit,
  fields = [],
  actions,
  gridClassName = 'lg:grid-cols-[minmax(280px,1fr)_180px_220px_180px_auto_auto]',
  className = '',
}) => (
  <div className={`grid gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${gridClassName} ${className}`}>
    <div className="flex h-10 min-w-0 items-center rounded-md border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
      <input
        value={searchValue}
        onChange={(event) => onSearchChange?.(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSearchSubmit?.();
        }}
        className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
        placeholder={searchPlaceholder}
      />
      <button type="button" onClick={onSearchSubmit} className="text-slate-500 hover:text-blue-600" aria-label="Buscar">
        <Search className="h-4 w-4" />
      </button>
    </div>

    {fields.map((field) => (
      <select
        key={field.id}
        value={field.value}
        onChange={(event) => field.onChange?.(event.target.value)}
        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
      >
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    ))}

    {actions}
  </div>
);

export default FilterBar;
