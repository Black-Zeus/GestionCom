import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, RefreshCcw, Shuffle, XCircle } from 'lucide-react';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import KpiBar from '@/components/common/data/KpiBar';
import FilterBar from '@/components/common/data/FilterBar';
import DataTable from '@/components/common/data/DataTable';
import DatePicker from '@/components/common/forms/DatePicker';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import SaleDetailModal from '@/components/sales/SaleDetailModal';
import { tableFooter } from '@/pages/admin/businessFoundationShared';
import { salesDocumentsService } from '@/services/sales/salesDocumentsService';
import { getBackendMessage, toast } from '@/services/ui/notify';

const money = (value) => Number(value || 0).toLocaleString('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const normalize = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '');

const fmtDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-CL');
};

const dayValue = (value) => String(value || '').slice(0, 10);

const customerName = (customer) => (
  customer?.commercial_name
  || customer?.legal_name
  || customer?.customer_name
  || customer?.name
  || customer?.customer_code
  || 'Consumidor final'
);

const itemCount = (sale) => (sale.items || []).reduce((sum, line) => sum + Number(line.quantity || 0), 0);
const canSendToReturns = (sale) => !['RETURN_TICKET', 'EXCHANGE_DRAFT'].includes(sale.document_type_code);

const SalesCompleted = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [detailSale, setDetailSale] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSales(await salesDocumentsService.listClosed());
      setPage(0);
    } catch (err) {
      toast.error(getBackendMessage(err, 'No fue posible cargar ventas realizadas.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = normalize(search);
    return sales.filter((sale) => {
      const saleDay = dayValue(sale.updated_at || sale.created_at);
      const matchesDateFrom = !dateFrom || saleDay >= dateFrom;
      const matchesDateTo = !dateTo || saleDay <= dateTo;
      const matchesSearch = !term || [
        sale.sale_code,
        sale.ticket_number,
        sale.document_type_name,
        sale.payment_method_name,
        sale.payment_method_code,
        customerName(sale.customer),
      ].some((value) => normalize(value).includes(term));
      return matchesDateFrom && matchesDateTo && matchesSearch;
    });
  }, [dateFrom, dateTo, sales, search]);

  const visible = useMemo(() => filtered.slice(page * pageSize, page * pageSize + pageSize), [filtered, page, pageSize]);
  const totalAmount = filtered.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
  const avgTicket = filtered.length ? totalAmount / filtered.length : 0;
  const totalItems = filtered.reduce((sum, sale) => sum + itemCount(sale), 0);

  const resetFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setPage(0);
  };

  const openDetail = (sale) => setDetailSale(sale);
  const openExchange = (sale) => {
    const saleCode = encodeURIComponent(sale.sale_code);
    navigate(`/documents/returns?sale_code=${saleCode}&action=EXCHANGE`);
  };

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Ventas realizadas"
        description="Consulta de documentos de venta cerrados en caja."
        actions={[{ id: 'refresh', label: 'Actualizar', icon: RefreshCcw, variant: 'neutral', onClick: load, disabled: loading }]}
      />

      <KpiBar
        className="mb-4"
        items={[
          { label: 'Ventas', value: filtered.length },
          { label: 'Total vendido', value: money(totalAmount) },
          { label: 'Ticket promedio', value: money(avgTicket) },
          { label: 'Items vendidos', value: totalItems },
        ]}
      />

      <FilterBar
        className="mb-4"
        searchValue={search}
        searchPlaceholder="Buscar folio, cliente, codigo o medio de pago"
        onSearchChange={(value) => { setSearch(value); setPage(0); }}
        gridClassName="lg:grid-cols-[minmax(280px,1fr)_auto_auto_auto]"
        fields={[]}
        actions={(
          <>
            <DatePicker value={dateFrom} placeholder="Desde" maxDate={dateTo || undefined} onChange={(value) => { setDateFrom(value); setPage(0); }} />
            <DatePicker value={dateTo} placeholder="Hasta" minDate={dateFrom || undefined} onChange={(value) => { setDateTo(value); setPage(0); }} />
            <ActionButton label="Limpiar" icon={XCircle} variant="neutral" onClick={resetFilters} />
          </>
        )}
      />

      <DataTable
        loading={loading}
        data={visible}
        getRowKey={(row) => row.id}
        emptyMessage="No hay ventas realizadas para mostrar."
        footer={tableFooter({ page, pageSize, total: filtered.length, loading, setPage, setPageSize })}
        columns={[
          {
            id: 'folio',
            label: 'Folio',
            sortable: true,
            render: (sale) => (
              <div>
                <div className="font-mono text-xs font-medium text-blue-600 dark:text-blue-400">{sale.ticket_number || sale.sale_code}</div>
                <div className="text-xs text-slate-500">{sale.document_type_name || sale.document_type_code}</div>
              </div>
            ),
          },
          { id: 'date', label: 'Fecha', sortable: true, sortValue: (sale) => sale.updated_at || sale.created_at, render: (sale) => fmtDate(sale.updated_at || sale.created_at) },
          { id: 'customer', label: 'Cliente', render: (sale) => customerName(sale.customer) },
          { id: 'payment', label: 'Medio pago', render: (sale) => sale.payment_method_name || sale.payment_method_code || 'Sin metodo' },
          { id: 'items', label: 'Items', align: 'right', sortable: true, sortValue: itemCount, render: itemCount },
          { id: 'total', label: 'Total', align: 'right', sortable: true, sortValue: (sale) => Number(sale.total_amount || 0), render: (sale) => <span className="font-semibold tabular-nums">{money(sale.total_amount)}</span> },
          {
            id: 'actions',
            label: 'Acciones',
            align: 'center',
            render: (sale) => (
              <div className="flex justify-center gap-2">
                <RowActionButton label="Ver venta" icon={Eye} onClick={() => openDetail(sale)} />
                <RowActionButton
                  label="Cambiar productos"
                  icon={Shuffle}
                  onClick={() => openExchange(sale)}
                  disabled={!canSendToReturns(sale)}
                />
              </div>
            ),
          },
        ]}
      />
      {detailSale && (
        <SaleDetailModal sale={detailSale} onClose={() => setDetailSale(null)} />
      )}
    </section>
  );
};

export default SalesCompleted;
