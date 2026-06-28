/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Eye, Printer, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import { printService } from '@/services/admin/printService';
import { salesOperationsService } from '@/services/admin/salesOperationsService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { formatDateTime } from '@/utils/dateTime';

const STATUS_CONFIG = {
  PENDING:    { label: 'Pendiente',  icon: Clock,        color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-950/30'    },
  PROCESSING: { label: 'Procesando', icon: RefreshCw,    color: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-950/30'      },
  COMPLETED:  { label: 'Completado', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  FAILED:     { label: 'Fallido',    icon: XCircle,      color: 'text-red-600 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-950/30'        },
  CANCELLED:  { label: 'Cancelado',  icon: AlertCircle,  color: 'text-slate-500 dark:text-slate-400',     bg: 'bg-slate-100 dark:bg-slate-800'      },
};

const TICKET_TYPE_LABELS = {
  TICKET_VENTA:  'Venta',
  TICKET_CAMBIO: 'Cambio',
  TICKET_PRUEBA: 'Prueba',
};

const clp = (value) => {
  try { return `$ ${parseInt(value || 0, 10).toLocaleString('es-CL')}`; }
  catch { return '—'; }
};

// Agrupa jobs por sale_document_id; jobs sin sale_document_id quedan como grupos individuales.
// Retorna un array de grupos ordenado por fecha del job más reciente.
function groupJobs(jobs) {
  const byDoc = new Map();
  for (const j of jobs) {
    const key = j.sale_document_id != null ? `doc_${j.sale_document_id}` : `job_${j.id}`;
    if (!byDoc.has(key)) byDoc.set(key, []);
    byDoc.get(key).push(j);
  }
  return Array.from(byDoc.values()).map((group) => {
    // ordenar: el más antiguo primero → es el original
    group.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const original = group[0];
    const latest   = group[group.length - 1];
    return {
      _key:            original.sale_document_id != null ? `doc_${original.sale_document_id}` : `job_${original.id}`,
      sale_document_id: original.sale_document_id,
      sales_point_id:  original.sales_point_id,
      ticket_type:     original.ticket_type,
      ticket_number:   original.payload?.ticket_number || original.payload?.sale_code || null,
      customer:        original.payload?.customer || null,
      total:           original.payload?.total ?? null,
      created_at:      original.created_at,
      status:          latest.status,
      print_count:     group.length,
      latestJob:       latest,
      allJobs:         group,
    };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// ─── Reprint modal ────────────────────────────────────────────────────────────
const ReprintModal = ({ group, salesPoints, onConfirm, onClose }) => {
  const [selectedSalesPoint, setSelectedSalesPoint] = useState(group.sales_point_id ? String(group.sales_point_id) : '');
  const [ticketType, setTicketType] = useState(group.ticket_type || 'TICKET_VENTA');
  const [loading, setLoading] = useState(false);

  const printerPoints = salesPoints.filter((sp) => sp.has_printer && sp.is_active);

  const fieldCls = 'h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSalesPoint) return;
    setLoading(true);
    try {
      await onConfirm(group.sale_document_id, Number(selectedSalesPoint), ticketType);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Se generará un nuevo trabajo de impresión para esta venta en el punto de venta seleccionado.
      </p>

      <label className="space-y-1.5 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-300">Punto de venta destino</span>
        <select className={fieldCls} value={selectedSalesPoint} onChange={(e) => setSelectedSalesPoint(e.target.value)} required>
          <option value="">Seleccionar punto de venta...</option>
          {printerPoints.map((sp) => (
            <option key={sp.id} value={sp.id}>{sp.sales_point_name} ({sp.sales_point_code})</option>
          ))}
        </select>
        {printerPoints.length === 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">No hay puntos de venta con impresora configurada y activa.</p>
        )}
      </label>

      <label className="space-y-1.5 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-300">Tipo de ticket</span>
        <select className={fieldCls} value={ticketType} onChange={(e) => setTicketType(e.target.value)}>
          <option value="TICKET_VENTA">Ticket de Venta</option>
          <option value="TICKET_CAMBIO">Ticket de Cambio</option>
          <option value="TICKET_PRUEBA">Ticket de Prueba</option>
        </select>
      </label>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <button type="button" onClick={onClose} className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
          Cancelar
        </button>
        <button type="submit" disabled={loading || !selectedSalesPoint} className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          <Printer className="h-4 w-4" />
          {loading ? 'Encolando...' : 'Reimprimir'}
        </button>
      </div>
    </form>
  );
};

// ─── Detail modal ─────────────────────────────────────────────────────────────
const JobStatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.color} ${cfg.bg}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
};

const JobDetailModal = ({ group, onClose }) => {
  const job = group.latestJob;
  return (
    <div className="flex flex-col gap-4 text-sm">
      {/* Datos de la venta */}
      <div className="grid grid-cols-2 gap-4">
        {group.ticket_number && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">N° Ticket</p>
            <p className="mt-1 font-mono text-slate-700 dark:text-slate-300">{group.ticket_number}</p>
          </div>
        )}
        {group.customer && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Cliente</p>
            <p className="mt-1 text-slate-700 dark:text-slate-300">{group.customer}</p>
          </div>
        )}
        {group.total != null && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total</p>
            <p className="mt-1 font-semibold text-slate-700 dark:text-slate-300">{clp(group.total)}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Impresiones</p>
          <p className="mt-1 text-slate-700 dark:text-slate-300">{group.print_count}</p>
        </div>
      </div>

      {/* Lista de trabajos del grupo */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Trabajos de impresión</p>
        <div className="flex flex-col gap-1.5">
          {group.allJobs.map((j, idx) => (
            <div key={j.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">#{idx + 1}</span>
                <span className="font-mono text-xs text-slate-500">{j.job_code?.slice(0, 12)}…</span>
                <span className="text-xs text-slate-500">{formatDateTime(j.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{j.attempts} int.</span>
                <JobStatusBadge status={j.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {job.error_message && (
        <div className="rounded-md bg-red-50 p-3 dark:bg-red-950/30">
          <p className="text-xs font-medium text-red-700 dark:text-red-400">Último error</p>
          <p className="mt-1 font-mono text-xs text-red-600 dark:text-red-300">{job.error_message}</p>
        </div>
      )}

      <div className="flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
        <button type="button" onClick={onClose} className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
          Cerrar
        </button>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminPrintJobs() {
  const [jobs, setJobs]           = useState([]);
  const [salesPoints, setSalesPoints] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filters, setFilters]     = useState({ sales_point_id: '', status: '', ticket_type: '', date_from: '', date_to: '' });

  const load = async (activeFilters = filters) => {
    setLoading(true);
    try {
      const params = {};
      if (activeFilters.sales_point_id) params.sales_point_id = activeFilters.sales_point_id;
      if (activeFilters.status)         params.status         = activeFilters.status;
      if (activeFilters.ticket_type)    params.ticket_type    = activeFilters.ticket_type;
      if (activeFilters.date_from)      params.date_from      = activeFilters.date_from;
      if (activeFilters.date_to)        params.date_to        = activeFilters.date_to;
      const [jobsData, spData] = await Promise.all([
        printService.listJobs({ ...params, limit: 200 }),
        salesPoints.length ? Promise.resolve(salesPoints) : salesOperationsService.listSalesPoints(),
      ]);
      setJobs(jobsData);
      if (!salesPoints.length) setSalesPoints(spData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => groupJobs(jobs), [jobs]);

  const spName = (id) => salesPoints.find((sp) => sp.id === id)?.sales_point_name || `SP #${id}`;

  const openDetail = (group) => {
    ModalManager.show({
      type: 'custom',
      title: group.ticket_number ? `Detalle — ${group.ticket_number}` : 'Detalle del trabajo',
      size: 'medium',
      showFooter: false,
      contentComponent: JobDetailModal,
      contentProps: { group },
    });
  };

  const openReprint = (group) => {
    ModalManager.show({
      type: 'custom',
      title: 'Reimprimir ticket',
      size: 'small',
      showFooter: false,
      contentComponent: ReprintModal,
      contentProps: {
        group,
        salesPoints,
        onConfirm: async (saleDocumentId, salesPointId, ticketType) => {
          await notifyPromise(
            printService.reprintSale(saleDocumentId, salesPointId, ticketType),
            { loading: 'Encolando reimpresión...', success: 'Trabajo de reimpresión encolado', error: (e) => getBackendMessage(e) || 'Error al reimprimir' },
          );
          await load();
        },
      },
    });
  };

  const handleApply = () => load(filters);
  const handleClear = () => {
    const empty = { sales_point_id: '', status: '', ticket_type: '', date_from: '', date_to: '' };
    setFilters(empty);
    load(empty);
  };

  const kpiItems = useMemo(() => [
    { label: 'Tickets',      value: groups.length },
    { label: 'Completados',  value: groups.filter((g) => g.status === 'COMPLETED').length },
    { label: 'Pendientes',   value: groups.filter((g) => g.status === 'PENDING').length },
    { label: 'Fallidos',     value: groups.filter((g) => g.status === 'FAILED').length },
  ], [groups]);

  const selectCls = 'h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300';
  const inputCls  = 'h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300';

  const columns = [
    {
      id: 'created_at',
      label: 'Fecha',
      sortable: true,
      sortValue: (g) => g.created_at,
      render: (g) => <span className="text-xs text-slate-600 dark:text-slate-400">{formatDateTime(g.created_at)}</span>,
    },
    {
      id: 'ticket_number',
      label: 'N° Ticket',
      render: (g) => g.ticket_number
        ? <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{g.ticket_number}</span>
        : <span className="text-slate-400">—</span>,
    },
    {
      id: 'ticket_type',
      label: 'Tipo',
      render: (g) => (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {TICKET_TYPE_LABELS[g.ticket_type] || g.ticket_type}
        </span>
      ),
    },
    {
      id: 'sales_point',
      label: 'Punto de venta',
      render: (g) => <span className="text-sm text-slate-700 dark:text-slate-300">{g.sales_point_id ? spName(g.sales_point_id) : '—'}</span>,
    },
    {
      id: 'customer',
      label: 'Cliente',
      render: (g) => g.customer
        ? <span className="text-sm text-slate-700 dark:text-slate-300">{g.customer}</span>
        : <span className="text-slate-400">—</span>,
    },
    {
      id: 'total',
      label: 'Total',
      render: (g) => g.total != null
        ? <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{clp(g.total)}</span>
        : <span className="text-slate-400">—</span>,
    },
    {
      id: 'print_count',
      label: 'Impr.',
      render: (g) => g.print_count > 1
        ? <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">{g.print_count}×</span>
        : <span className="text-xs text-slate-400">1</span>,
    },
    {
      id: 'status',
      label: 'Estado',
      render: (g) => <JobStatusBadge status={g.status} />,
    },
    {
      id: 'actions',
      label: 'Acciones',
      align: 'right',
      render: (g) => (
        <div className="flex items-center justify-end gap-1">
          <RowActionButton icon={Eye} label="Detalle" onClick={() => openDetail(g)} />
          {g.sale_document_id && (
            <RowActionButton icon={Printer} label="Reimprimir" onClick={() => openReprint(g)} variant="primary" />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <ModuleHeader
        title="Historial de impresiones"
        description="Un registro por ticket. Las reimpresiones se acumulan en el mismo registro."
        actions={[{ label: 'Actualizar', icon: RefreshCw, onClick: () => load(), variant: 'secondary' }]}
      />

      <KpiBar items={kpiItems} />

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Punto de venta
          <select className={selectCls} value={filters.sales_point_id} onChange={(e) => setFilters((f) => ({ ...f, sales_point_id: e.target.value }))}>
            <option value="">Todos</option>
            {salesPoints.map((sp) => <option key={sp.id} value={sp.id}>{sp.sales_point_name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Estado
          <select className={selectCls} value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">Todos</option>
            <option value="PENDING">Pendiente</option>
            <option value="PROCESSING">Procesando</option>
            <option value="COMPLETED">Completado</option>
            <option value="FAILED">Fallido</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Tipo
          <select className={selectCls} value={filters.ticket_type} onChange={(e) => setFilters((f) => ({ ...f, ticket_type: e.target.value }))}>
            <option value="">Todos</option>
            <option value="TICKET_VENTA">Venta</option>
            <option value="TICKET_CAMBIO">Cambio</option>
            <option value="TICKET_PRUEBA">Prueba</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Desde
          <input type="date" className={inputCls} value={filters.date_from} onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Hasta
          <input type="date" className={inputCls} value={filters.date_to} onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))} />
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={handleApply} className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700">Filtrar</button>
          <button type="button" onClick={handleClear} className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Limpiar</button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={groups}
        loading={loading}
        emptyMessage="No hay trabajos de impresión con los filtros seleccionados."
        getRowKey={(g) => g._key}
      />
    </div>
  );
}
