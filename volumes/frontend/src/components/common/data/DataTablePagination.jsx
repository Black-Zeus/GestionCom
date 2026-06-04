/* eslint-disable react/prop-types */
const DataTablePagination = ({
  page = 0,
  pageSize,
  pageSizeOptions = [],
  total = 0,
  hasMore = false,
  loading = false,
  onPageChange,
  onPageSizeChange,
}) => {
  const start = total > 0 ? page * pageSize + 1 : 0;
  const end = total > 0 ? Math.min((page + 1) * pageSize, total) : 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-800">
      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
        <span>Registros</span>
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange?.(Number(event.target.value))}
          className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-950"
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
      <div className="text-slate-500 dark:text-slate-400">
        {total > 0 ? `${start}-${end} de ${total}` : '0 registros'}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page === 0 || loading}
          onClick={() => onPageChange?.(Math.max(page - 1, 0))}
          className="h-9 rounded-md border border-slate-200 px-3 text-sm disabled:opacity-50 dark:border-slate-700"
        >
          Anterior
        </button>
        <span className="min-w-16 text-center text-slate-500 dark:text-slate-400">Pag. {page + 1}</span>
        <button
          type="button"
          disabled={!hasMore || loading}
          onClick={() => onPageChange?.(page + 1)}
          className="h-9 rounded-md border border-slate-200 px-3 text-sm disabled:opacity-50 dark:border-slate-700"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};

export default DataTablePagination;
