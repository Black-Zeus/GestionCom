/* eslint-disable react/prop-types */
const KpiBar = ({ items = [], columnsClassName = '', className = '' }) => {
  const columnCount = Math.max(items.length, 1);

  return (
    <div
      className={`grid gap-3 ${columnsClassName} ${className}`}
      style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
    >
      {items.map((item) => (
        <button
          key={item.id || item.label}
          type="button"
          onClick={item.onClick}
          disabled={item.disabled}
          className={`min-w-0 rounded-md border px-4 py-3 text-left shadow-sm transition disabled:cursor-default disabled:opacity-60 ${
            item.active
              ? 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30'
              : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
          } ${item.onClick ? 'hover:border-blue-300 hover:bg-blue-50/60 dark:hover:border-blue-800 dark:hover:bg-blue-950/30' : ''}`}
        >
          <p className="break-words text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{item.label}</p>
          <p className="mt-1 break-words text-2xl font-semibold">{item.value}</p>
          {item.hint && <p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">{item.hint}</p>}
        </button>
      ))}
    </div>
  );
};

export default KpiBar;
