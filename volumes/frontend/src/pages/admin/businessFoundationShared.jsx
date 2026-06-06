import { RefreshCw, XCircle } from 'lucide-react';
import { ActionButton } from '@/components/common/actions/ActionButton';
import DataTablePagination from '@/components/common/data/DataTablePagination';
import StatusBadge from '@/components/common/data/StatusBadge';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 150, 200];

export const fieldOptions = {
  status: [
    { value: 'all', label: 'Todos los estados' },
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
  ],
};

export const statusCell = (isActive) => (
  <StatusBadge variant={isActive ? 'active' : 'inactive'}>{isActive ? 'Activo' : 'Inactivo'}</StatusBadge>
);

export const tableFooter = ({ page, pageSize, total, loading, setPage, setPageSize }) => (
  <DataTablePagination
    page={page}
    pageSize={pageSize}
    pageSizeOptions={PAGE_SIZE_OPTIONS}
    total={total}
    hasMore={(page + 1) * pageSize < total}
    loading={loading}
    onPageChange={setPage}
    onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
  />
);

export const filterActions = ({ loading, onRefresh, onClear }) => (
  <>
    <ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={onRefresh} className={loading ? '[&>svg]:animate-spin' : ''} />
    <ActionButton label="Limpiar" icon={XCircle} variant="neutral" onClick={onClear} />
  </>
);

export const activeFilter = (value) => (
  value === 'all' ? () => true : (item) => (value === 'active' ? item.is_active : !item.is_active)
);

export const includesTerm = (item, fields, term) => (
  !term || fields.map((field) => item[field]).filter(Boolean).some((value) => String(value).toLowerCase().includes(term))
);
