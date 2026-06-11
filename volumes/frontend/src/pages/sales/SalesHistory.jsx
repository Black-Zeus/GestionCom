import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Pencil, RefreshCcw, Trash2, XCircle } from 'lucide-react';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import KpiBar from '@/components/common/data/KpiBar';
import FilterBar from '@/components/common/data/FilterBar';
import DataTable from '@/components/common/data/DataTable';
import { RowActionButton } from '@/components/common/actions/ActionButton';
import ModalManager from '@/components/ui/modal';
import { salesDocumentsService } from '@/services/sales/salesDocumentsService';
import { getBackendMessage, toast } from '@/services/ui/notify';
import { tableFooter, filterActions } from '@/pages/admin/businessFoundationShared';

const money = (value) => Number(value || 0).toLocaleString('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const customerName = (customer) => (
  customer?.commercial_name
  || customer?.legal_name
  || customer?.customer_name
  || customer?.name
  || customer?.customer_code
  || 'Cliente'
);

const normalize = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '');

const SalesHistory = () => {
  const navigate = useNavigate();
  const [pendingSales, setPendingSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPendingSales(await salesDocumentsService.listPending());
      setPage(0);
    } catch (err) {
      toast.error(getBackendMessage(err, 'No fue posible cargar ventas pendientes.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = normalize(search);
    if (!term) return pendingSales;
    return pendingSales.filter((item) => [
      item.sale_code,
      customerName(item.customer),
      item.prepared_by,
    ].some((v) => normalize(v).includes(term)));
  }, [pendingSales, search]);

  const visible = useMemo(
    () => filtered.slice(page * pageSize, page * pageSize + pageSize),
    [filtered, page, pageSize],
  );

  const totalAmount = useMemo(
    () => pendingSales.reduce((sum, item) => sum + Number(item.total_amount || 0), 0),
    [pendingSales],
  );

  const resetFilters = () => { setSearch(''); setPage(0); };

  const deleteSale = async (item) => {
    if (!await ModalManager.confirm({
      title: 'Eliminar venta pendiente',
      message: `Eliminar la venta ${item.sale_code} de ${customerName(item.customer)}. Esta accion no se puede deshacer.`,
      buttons: { cancel: 'Cancelar', confirm: 'Eliminar' },
    })) return;
    try {
      await salesDocumentsService.deletePending(item.id);
      toast.success('Venta eliminada.');
      await load();
    } catch (err) {
      toast.error(getBackendMessage(err, 'No fue posible eliminar la venta.'));
    }
  };

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Historial de ventas"
        description="Ventas pendientes de cierre en caja."
        actions={[{ id: 'refresh', label: 'Actualizar', icon: RefreshCcw, variant: 'neutral', onClick: load, disabled: loading }]}
      />

      <KpiBar
        className="mb-4"
        items={[
          { label: 'Pendientes', value: pendingSales.length },
          { label: 'Total estimado', value: money(totalAmount) },
        ]}
      />

      <FilterBar
        className="mb-4"
        searchValue={search}
        searchPlaceholder="Buscar por codigo, cliente o preparado por"
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
        fields={[]}
        actions={filterActions({ loading, onRefresh: load, onClear: resetFilters })}
      />

      <DataTable
        loading={loading}
        data={visible}
        getRowKey={(row) => row.id}
        emptyMessage="No hay ventas pendientes."
        footer={tableFooter({ page, pageSize, total: filtered.length, loading, setPage, setPageSize })}
        columns={[
          {
            id: 'sale_code',
            label: 'Codigo',
            sortable: true,
            render: (item) => (
              <div>
                <div className="font-mono text-xs font-medium">{item.sale_code}</div>
                <div className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString('es-CL')}</div>
              </div>
            ),
          },
          { id: 'customer', label: 'Cliente', render: (item) => customerName(item.customer) },
          { id: 'prepared_by', label: 'Preparado por', render: (item) => item.prepared_by || '—' },
          {
            id: 'items',
            label: 'Items',
            align: 'right',
            render: (item) => (item.items || []).reduce((sum, line) => sum + Number(line.quantity || 0), 0),
          },
          {
            id: 'total_amount',
            label: 'Total',
            align: 'right',
            render: (item) => <span className="font-semibold tabular-nums">{money(item.total_amount)}</span>,
          },
          {
            id: 'actions',
            label: 'Acciones',
            align: 'center',
            render: (item) => (
              <div className="flex justify-center gap-1">
                <RowActionButton
                  label="Editar"
                  icon={Pencil}
                  onClick={() => navigate(`/sales/new?edit=${item.sale_code}`)}
                />
                <RowActionButton
                  label="Pasar a caja"
                  icon={CreditCard}
                  onClick={() => navigate(`/cash/pos?saleId=${item.sale_code}`)}
                />
                <RowActionButton
                  label="Eliminar"
                  icon={Trash2}
                  variant="danger"
                  onClick={() => deleteSale(item)}
                />
              </div>
            ),
          },
        ]}
      />
    </section>
  );
};

export default SalesHistory;
