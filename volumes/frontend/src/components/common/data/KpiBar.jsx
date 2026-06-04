/* eslint-disable react/prop-types */
const KpiBar = ({ items = [], columnsClassName = 'sm:grid-cols-4', className = '' }) => (
  <div className={`grid gap-3 ${columnsClassName} ${className}`}>
    {items.map((item) => (
      <button
        key={item.id || item.label}
        type="button"
        onClick={item.onClick}
        disabled={item.disabled}
        className={`rounded-md border px-4 py-3 text-left shadow-sm transition disabled:cursor-default disabled:opacity-60 ${
          item.active
            ? 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30'
            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
        } ${item.onClick ? 'hover:border-blue-300 hover:bg-blue-50/60 dark:hover:border-blue-800 dark:hover:bg-blue-950/30' : ''}`}
      >
        <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{item.label}</p>
        <p className="mt-1 text-2xl font-semibold">{item.value}</p>
        {item.hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.hint}</p>}
      </button>
    ))}
  </div>
);

export default KpiBar;
