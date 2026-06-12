/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, RefreshCcw, RotateCcw, Shuffle, X, XCircle } from 'lucide-react';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import KpiBar from '@/components/common/data/KpiBar';
import DataTable from '@/components/common/data/DataTable';
import FilterBar from '@/components/common/data/FilterBar';
import DatePicker from '@/components/common/forms/DatePicker';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import { tableFooter } from '@/pages/admin/businessFoundationShared';
import { salesDocumentsService } from '@/services/sales/salesDocumentsService';
import apiClient from '@/services/api/apiClient';
import { toast } from 'react-hot-toast';

const TYPE_OPTIONS = [
  { value: 'all',            label: 'Todos los tipos' },
  { value: 'TICKET',         label: 'Ventas' },
  { value: 'EXCHANGE_DRAFT', label: 'Cambios' },
  { value: 'RETURN_TICKET',  label: 'Devoluciones' },
];

const TYPE_LABELS = {
  TICKET:         'Venta',
  EXCHANGE_DRAFT: 'Cambio',
  RETURN_TICKET:  'Devolucion',
};

const TYPE_BADGE = {
  TICKET:         'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  EXCHANGE_DRAFT: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  RETURN_TICKET:  'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
};

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

const fmtMoney = (n) =>
  n != null ? `$${new Intl.NumberFormat('es-CL').format(Number(n))}` : '—';

// ── Sale detail modal ────────────────────────────────────────────────────────

const STATUS_LABEL = {
  CLOSED:          'Cerrado',
  CANCELLED:       'Anulado',
  PENDING_CASHIER: 'Pendiente',
};

const SaleDetailModal = ({ saleCode, onClose }) => {
  const [sale, setSale]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    salesDocumentsService.getByCode(saleCode)
      .then(setSale)
      .catch(() => toast.error('No fue posible cargar el detalle de la venta.'))
      .finally(() => setLoading(false));
  }, [saleCode]);

  const customerLabel =
    sale?.customer?.commercial_name
    || sale?.customer?.legal_name
    || sale?.customer?.customer_code
    || '—';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative flex w-full max-w-3xl flex-col max-h-[90vh] rounded-xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold">Detalle de venta</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6">
          {loading && (
            <p className="py-8 text-center text-sm text-slate-500">Cargando...</p>
          )}

          {!loading && !sale && (
            <p className="py-8 text-center text-sm text-red-500">No se pudo cargar el documento.</p>
          )}

          {!loading && sale && (
            <div className="space-y-5">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 rounded-md border border-slate-200 p-4 text-sm dark:border-slate-700 md:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-500">Documento</p>
                  <p className="font-semibold">{sale.ticket_number || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tipo</p>
                  <p className="font-medium">{sale.document_type_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Fecha</p>
                  <p className="font-medium">{fmtDate(sale.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Estado</p>
                  <p className="font-medium">{STATUS_LABEL[sale.status] || sale.status || '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500">Cliente</p>
                  <p className="font-medium">{customerLabel}</p>
                </div>
                {sale.prepared_by && (
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500">Preparado por</p>
                    <p className="font-medium">{sale.prepared_by}</p>
                  </div>
                )}
              </div>

              {/* Items table */}
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Items</p>
                <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Producto</th>
                        <th className="px-3 py-2 text-center">Cant.</th>
                        <th className="px-3 py-2 text-right">P. Unit.</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(sale.items || []).map((item) => (
                        <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-2 text-slate-500">{item.line_number}</td>
                          <td className="px-3 py-2">
                            <div className="font-medium leading-tight">{item.name}</div>
                            {item.code && (
                              <div className="font-mono text-xs text-slate-400">{item.code}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">{item.quantity}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(item.unit_price)}</td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">
                            {fmtMoney(item.paid_total_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="tabular-nums">{fmtMoney(sale.subtotal_amount)}</span>
                  </div>
                  {Number(sale.line_discount_amount || 0) > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Desc. línea</span>
                      <span className="tabular-nums">−{fmtMoney(sale.line_discount_amount)}</span>
                    </div>
                  )}
                  {Number(sale.document_discount_amount || 0) > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Desc. documento</span>
                      <span className="tabular-nums">−{fmtMoney(sale.document_discount_amount)}</span>
                    </div>
                  )}
                  {Number(sale.tax_amount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">IVA</span>
                      <span className="tabular-nums">{fmtMoney(sale.tax_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold dark:border-slate-700">
                    <span>Total</span>
                    <span className="tabular-nums">{fmtMoney(sale.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main page ────────────────────────────────────────────────────────────────

const CustomerSalesPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerId   = searchParams.get('customer_id');
  const customerName = searchParams.get('customer_name') || 'Cliente';

  const [rows,         setRows]         = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [fromDate,     setFromDate]     = useState(daysAgo(30));
  const [toDate,       setToDate]       = useState(today());
  const [docType,      setDocType]      = useState('all');
  const [search,       setSearch]       = useState('');
  const [page,         setPage]         = useState(0);
  const [pageSize,     setPageSize]     = useState(25);
  const [viewSaleCode, setViewSaleCode] = useState(null);

  const load = useCallback(async (filters) => {
    if (!customerId) return;
    const f = filters ?? { fromDate, toDate, docType };
    setLoading(true);
    try {
      const params = { from_date: f.fromDate, to_date: f.toDate };
      if (f.docType && f.docType !== 'all') params.doc_type = f.docType;
      const res = await apiClient.get(`/sales-documents/by-customer/${customerId}`, { params });
      setRows(res.data?.data || []);
      setPage(0);
    } catch {
      toast.error('No fue posible cargar las ventas del cliente.');
    } finally {
      setLoading(false);
    }
  }, [customerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load
  useEffect(() => { load({ fromDate, toDate, docType }); }, [customerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-reload when type filter changes
  useEffect(() => {
    if (customerId) load({ fromDate, toDate, docType });
  }, [docType]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = () => load({ fromDate, toDate, docType });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.ticket_number, r.document_type_name, fmtDate(r.created_at), fmtMoney(r.total_amount)]
        .some((v) => String(v || '').toLowerCase().includes(term)),
    );
  }, [rows, search]);

  const paged = useMemo(
    () => filtered.slice(page * pageSize, page * pageSize + pageSize),
    [filtered, page, pageSize],
  );

  const kpis = useMemo(() => {
    const ventas    = rows.filter((r) => r.document_type_code === 'TICKET');
    const cambios   = rows.filter((r) => r.document_type_code === 'EXCHANGE_DRAFT');
    const devols    = rows.filter((r) => r.document_type_code === 'RETURN_TICKET');
    const totalVtas = ventas.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    const totalDev  = devols.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    return [
      { id: 'ventas',   label: 'Ventas',        value: ventas.length },
      { id: 'cambios',  label: 'Cambios',        value: cambios.length },
      { id: 'devols',   label: 'Devoluciones',   value: devols.length },
      { id: 'monto',    label: 'Total ventas',   value: fmtMoney(totalVtas) },
      { id: 'devmonto', label: 'Total devuelto', value: fmtMoney(totalDev) },
    ];
  }, [rows]);

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title={`Ventas — ${customerName}`}
        description="Historial de ventas, cambios y devoluciones del cliente."
        actions={[
          { id: 'back',    label: 'Volver',     icon: ArrowLeft,  variant: 'neutral', onClick: () => navigate('/customers') },
          { id: 'refresh', label: 'Actualizar', icon: RefreshCcw, variant: 'neutral', onClick: handleApply, disabled: loading },
        ]}
      />

      <KpiBar className="mb-4" items={kpis} />

      <FilterBar
        className="mb-4"
        gridClassName="lg:grid-cols-[minmax(280px,1fr)_180px_auto_auto_auto_auto]"
        searchValue={search}
        searchPlaceholder="Buscar registro"
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
        fields={[
          {
            id: 'docType',
            value: docType,
            onChange: (v) => setDocType(v ?? 'all'),
            options: TYPE_OPTIONS,
            placeholder: 'Todos los tipos',
          },
        ]}
        actions={(
          <>
            <DatePicker value={fromDate} onChange={setFromDate} maxDate={toDate} placeholder="Desde" />
            <DatePicker value={toDate} onChange={setToDate} minDate={fromDate} placeholder="Hasta" />
            <ActionButton label="Aplicar" onClick={handleApply} disabled={loading} className={loading ? '[&>svg]:animate-spin' : ''} />
            <ActionButton label="Limpiar" icon={XCircle} variant="neutral" onClick={() => { setSearch(''); setDocType('all'); setFromDate(daysAgo(30)); setToDate(today()); setPage(0); }} />
          </>
        )}
      />

      <DataTable
        loading={loading}
        data={paged}
        emptyMessage="No se encontraron registros para el periodo seleccionado."
        footer={tableFooter({ page, pageSize, total: filtered.length, loading, setPage, setPageSize })}
        columns={[
          {
            id: 'ticket_number',
            label: 'N° Documento',
            sortable: true,
            sortValue: (r) => r.ticket_number || '',
            render: (r) => (
              <span className="font-mono text-sm font-medium">
                {r.ticket_number || r.sale_code?.slice(0, 8) || '—'}
              </span>
            ),
          },
          {
            id: 'document_type_code',
            label: 'Tipo',
            sortable: true,
            sortValue: (r) => TYPE_LABELS[r.document_type_code] || r.document_type_code || '',
            render: (r) => (
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_BADGE[r.document_type_code] || ''}`}>
                {TYPE_LABELS[r.document_type_code] || r.document_type_name || '—'}
              </span>
            ),
          },
          {
            id: 'created_at',
            label: 'Fecha',
            sortable: true,
            sortValue: (r) => r.created_at || '',
            render: (r) => <span className="text-sm">{fmtDate(r.created_at)}</span>,
          },
          {
            id: 'total_amount',
            label: 'Total',
            sortable: true,
            sortValue: (r) => Number(r.total_amount || 0),
            align: 'right',
            render: (r) => (
              <span className={`text-sm font-medium ${r.document_type_code === 'RETURN_TICKET' ? 'text-red-600 dark:text-red-400' : ''}`}>
                {fmtMoney(r.total_amount)}
              </span>
            ),
          },
          {
            id: 'actions',
            label: 'Acciones',
            align: 'right',
            render: (r) => (
              <div className="flex items-center justify-end gap-1">
                <RowActionButton label="Ver venta" icon={Eye} onClick={() => setViewSaleCode(r.sale_code)} />
                {r.document_type_code !== 'RETURN_TICKET' && (
                  <RowActionButton
                    label="Devolucion"
                    icon={RotateCcw}
                    onClick={() => navigate(`/sales/returns?sale_code=${r.sale_code}&action=RETURN`)}
                  />
                )}
                {r.document_type_code !== 'RETURN_TICKET' && (
                  <RowActionButton
                    label="Cambio"
                    icon={Shuffle}
                    onClick={() => navigate(`/sales/returns?sale_code=${r.sale_code}&action=EXCHANGE`)}
                  />
                )}
              </div>
            ),
          },
        ]}
      />

      {viewSaleCode && (
        <SaleDetailModal
          saleCode={viewSaleCode}
          onClose={() => setViewSaleCode(null)}
        />
      )}
    </section>
  );
};

export default CustomerSalesPage;
