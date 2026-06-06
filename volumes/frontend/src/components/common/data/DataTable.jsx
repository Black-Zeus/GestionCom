/* eslint-disable react/prop-types */
import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import ModuleSpinner from '@/components/common/loading/ModuleSpinner';

const getValue = (row, column) => {
  if (column.sortValue) return column.sortValue(row);
  if (column.accessor) return column.accessor(row);
  return row?.[column.id];
};

const normalizeValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value.toString().toLowerCase();
};

const alignClass = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const actionCellClass = [
  'w-[12.5rem]',
  'min-w-[12.5rem]',
  'max-w-[12.5rem]',
  '!text-center',
].join(' ');

const DataTable = ({
  columns = [],
  data = [],
  getRowKey = (row) => row.id,
  emptyMessage = 'No hay registros para mostrar.',
  loading = false,
  footer,
  className = '',
}) => {
  const [sort, setSort] = useState({ columnId: null, direction: 'asc' });

  const sortedData = useMemo(() => {
    if (!sort.columnId) return data;

    const column = columns.find((item) => item.id === sort.columnId);
    if (!column) return data;

    return [...data].sort((left, right) => {
      const leftValue = normalizeValue(getValue(left, column));
      const rightValue = normalizeValue(getValue(right, column));

      if (leftValue < rightValue) return sort.direction === 'asc' ? -1 : 1;
      if (leftValue > rightValue) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [columns, data, sort]);

  const toggleSort = (column) => {
    if (!column.sortable) return;

    setSort((current) => {
      if (current.columnId !== column.id) {
        return { columnId: column.id, direction: 'asc' };
      }

      return {
        columnId: column.id,
        direction: current.direction === 'asc' ? 'desc' : 'asc',
      };
    });
  };

  return (
    <div className={`overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              {columns.map((column) => {
                const isSorted = sort.columnId === column.id;
                const SortIcon = !isSorted ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown;

                return (
                  <th key={column.id} className={`px-4 py-3 ${alignClass[column.align || 'left']} ${column.headerClassName || ''}`}>
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column)}
                        className={`inline-flex items-center gap-1 font-semibold hover:text-slate-900 dark:hover:text-white ${column.align === 'right' ? 'justify-end' : ''}`}
                      >
                        {column.label}
                        <SortIcon className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span>{column.label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedData.map((row, rowIndex) => (
              <tr key={getRowKey(row, rowIndex)} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                {columns.map((column) => {
                  const isActionsColumn = column.id === 'actions';
                  const content = column.render ? column.render(row, rowIndex) : getValue(row, column);

                  return (
                    <td key={column.id} className={`px-4 py-3 ${alignClass[column.align || 'left']} ${isActionsColumn ? actionCellClass : ''} ${column.cellClassName || ''}`}>
                      {isActionsColumn ? (
                        <div className="flex w-full justify-center">
                          <div className="flex w-[10.5rem] max-w-full flex-wrap justify-center gap-2 [&>div]:!flex [&>div]:!w-full [&>div]:!max-w-full [&>div]:!flex-wrap [&>div]:!justify-center [&>div]:!gap-2">
                            {content}
                          </div>
                        </div>
                      ) : content}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!loading && sortedData.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {loading && sortedData.length === 0 && (
              <tr>
                <td colSpan={columns.length}>
                  <ModuleSpinner message="Cargando datos..." detail="Preparando registros" variant="container" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
};

export default DataTable;
