/* eslint-disable react/prop-types */
import { Search } from 'lucide-react';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';

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
      <button type="button" onClick={onSearchSubmit} className="inline-flex h-8 w-8 items-center justify-center text-slate-500 hover:text-blue-600" aria-label="Buscar">
        <Search className="h-4 w-4" />
      </button>
    </div>

    {fields.map((field) => (
      <AutocompleteSelect
        key={field.id}
        value={field.value}
        onChange={(nextValue) => field.onChange?.(nextValue)}
        options={field.options || []}
        placeholder={field.placeholder || 'Seleccionar'}
        searchPlaceholder={field.searchPlaceholder || 'Buscar opcion'}
        disabled={field.disabled}
        clearable={field.clearable}
        showIcons={field.showIcons ?? (field.options || []).some((option) => option.icon)}
        multiple={field.multiple}
        maxVisibleTags={field.maxVisibleTags}
        className={field.className}
        buttonClassName="h-10 shadow-none"
      />
    ))}

    {actions}
  </div>
);

export default FilterBar;
