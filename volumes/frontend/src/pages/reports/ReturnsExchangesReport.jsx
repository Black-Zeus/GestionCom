/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Eye, FileText, RefreshCw, RotateCcw, X } from 'lucide-react';
import KpiBar from '@/components/common/data/KpiBar';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import DateRangePicker from '@/components/common/forms/DateRangePicker';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import SaleDetailModal from '@/components/sales/SaleDetailModal';
import { adminMaintainersService } from '@/services/admin/adminMaintainersService';
import apiClient from '@/services/api/apiClient';
import { getBackendMessage, toast } from '@/services/ui/notify';

const money = (value) => Number(value || 0).toLocaleString('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const toISO = (date) => date.toISOString().slice(0, 10);
const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const defaultFilters = () => ({
  dateFrom: toISO(addDays(new Date(), -29)),
  dateTo: toISO(new Date()),
  warehouseId: 'all',
  documentType: 'all',
  status: 'CLOSED',
});

const formatDateTime = (value) => (
  value
    ? new Date(value).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '-'
);

const downloadCSV = (filename, headers, rows) => {
  const esc = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(esc).join(','), ...rows.map((row) => row.map(esc).join(','))];
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
};

const DOCUMENT_OPTIONS = [
  { value: 'all', label: 'Cambios y devoluciones' },
  { value: 'EXCHANGE_DRAFT', label: 'Solo cambios' },
  { value: 'RETURN_TICKET', label: 'Solo devoluciones' },
];

const STATUS_OPTIONS = [
  { value: 'CLOSED', label: 'Cerrados' },
  { value: 'PENDING_CASHIER', label: 'Pendientes' },
  { value: 'CANCELLED', label: 'Cancelados' },
  { value: 'all', label: 'Todos los estados' },
];

const Card = ({ title, subtitle, icon: Icon, children, actions }) => (
  <div className="flex flex-col rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
      {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" />}
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</span>
        {subtitle && <span className="ml-2 text-xs text-slate-400">{subtitle}</span>}
      </div>
      {actions && <div className="ml-2 flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
    <div className="flex-1 p-5">{children}</div>
  </div>
);

const Th = ({ children, right }) => (
  <th className={`px-3 py-3 text-xs font-semibold uppercase text-slate-400 first:pl-0 last:pr-0 ${right ? 'text-right' : 'text-left'}`}>
    {children}
  </th>
);

const Td = ({ children, right, muted, bold, className = '' }) => (
  <td className={`px-3 py-3 text-sm first:pl-0 last:pr-0 ${right ? 'text-right tabular-nums' : ''} ${muted ? 'text-slate-400' : ''} ${bold ? 'font-semibold text-slate-950 dark:text-white' : ''} ${className}`}>
    {children}
  </td>
);

const statusLabel = (status) => ({
  PENDING_CASHIER: 'Pendiente',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado',
}[status] || status || '-');

const documentBadgeClass = (code) => (
  code === 'EXCHANGE_DRAFT'
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
);

const ReturnsExchangesReport = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [filters, setFilters] = useState(defaultFilters);
  const [warehouses, setWarehouses] = useState([]);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailSaleCode, setDetailSaleCode] = useState(null);

  useEffect(() => {
    adminMaintainersService.list('warehouses-options', { active_only: true })
      .then(setWarehouses)
      .catch(() => setWarehouses([]));
  }, []);

  const warehouseOptions = useMemo(() => [
    { value: 'all', label: 'Todas las locaciones' },
    ...warehouses.map((warehouse) => ({
      value: String(warehouse.id),
      label: warehouse.warehouse_name || warehouse.warehouse_code || `Locacion ${warehouse.id}`,
    })),
  ], [warehouses]);

  const fetchReport = useCallback(async () => {
    if (!filters.dateFrom || !filters.dateTo) return;
    setLoading(true);
    setError('');
    try {
      const params = {
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        document_type: filters.documentType,
        status: filters.status,
      };
      if (filters.warehouseId !== 'all') params.warehouse_id = filters.warehouseId;
      const response = await apiClient.get('/reports/sales/returns-exchanges', { params });
      const payload = response.data?.data ? response.data : response.data || {};
      setRows(Array.isArray(payload.data) ? payload.data : []);
      setTotals(payload.totals || {});
    } catch (err) {
      setError(getBackendMessage(err, 'No fue posible cargar el reporte.'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const filteredRows = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) => [
      row.folio,
      row.source_document,
      row.customer_name,
      row.warehouse_name,
      row.document_label,
      row.status,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalized)));
  }, [rows, search]);

  const isFiltered = filters.warehouseId !== 'all' || filters.documentType !== 'all' || filters.status !== 'CLOSED' || Boolean(search);

  const kpis = [
    { id: 'documents', label: 'Documentos', value: String(totals.documents || 0), hint: `${totals.exchanges || 0} cambios · ${totals.returns || 0} devoluciones` },
    { id: 'origin', label: 'Articulos origen', value: String(totals.origin_items || 0), hint: 'devueltos o cambiados' },
    { id: 'new', label: 'Articulos nuevos', value: String(totals.new_items || 0), hint: 'entregados en cambios' },
    { id: 'credit', label: 'Credito generado', value: money(totals.origin_credit_amount), hint: 'valor reconocido' },
    { id: 'newAmount', label: 'Productos nuevos', value: money(totals.new_products_amount), hint: 'valor entregado' },
    { id: 'lost', label: 'Credito perdido', value: money(totals.forfeited_credit), hint: 'no acumulado / no usado' },
  ];

  const clearFilters = () => {
    setFilters(defaultFilters());
    setSearch('');
  };

  const exportCSV = () => {
    if (!filteredRows.length) {
      toast('No hay registros para exportar.');
      return;
    }
    const headers = ['Fecha', 'Folio', 'Tipo', 'Estado', 'Documento origen', 'Cliente', 'Locacion', 'Articulos origen', 'Articulos nuevos', 'Credito generado', 'Productos nuevos', 'Credito perdido', 'Total'];
    const data = filteredRows.map((row) => [
      formatDateTime(row.updated_at || row.created_at),
      row.folio,
      row.document_label,
      statusLabel(row.status),
      row.source_document || '',
      row.customer_name,
      row.warehouse_name,
      row.origin_item_count,
      row.new_item_count,
      row.origin_credit_amount,
      row.new_products_amount,
      row.forfeited_credit,
      row.total_amount,
    ]);
    downloadCSV(`cambios-devoluciones_${filters.dateFrom}_${filters.dateTo}.csv`, headers, data);
  };

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Cambios y devoluciones"
        description="Listado de documentos por rango de fechas y locación"
        actions={[
          { id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate(pathname) },
          { id: 'refresh', label: loading ? 'Cargando...' : 'Actualizar', icon: loading ? RefreshCw : RotateCcw, disabled: loading, onClick: fetchReport },
        ]}
      />

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="w-64 shrink-0">
          <AutocompleteSelect value={filters.warehouseId} onChange={(value) => setFilters((current) => ({ ...current, warehouseId: value || 'all' }))} options={warehouseOptions} placeholder="Todas las locaciones" clearable={false} buttonClassName="h-10 shadow-none" />
        </div>
        <div className="w-56 shrink-0">
          <AutocompleteSelect value={filters.documentType} onChange={(value) => setFilters((current) => ({ ...current, documentType: value || 'all' }))} options={DOCUMENT_OPTIONS} placeholder="Tipo de documento" clearable={false} buttonClassName="h-10 shadow-none" />
        </div>
        <div className="w-44 shrink-0">
          <AutocompleteSelect value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value || 'CLOSED' }))} options={STATUS_OPTIONS} placeholder="Estado" clearable={false} buttonClassName="h-10 shadow-none" />
        </div>
        <DateRangePicker dateFrom={filters.dateFrom} dateTo={filters.dateTo} maxDays={365} onChange={({ from, to }) => setFilters((current) => ({ ...current, dateFrom: from, dateTo: to }))} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-10 min-w-[16rem] flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-900/40"
          placeholder="Buscar folio, cliente, documento origen o locación"
        />
        {isFiltered && (
          <button type="button" onClick={clearFilters} className="flex h-10 items-center gap-1.5 rounded-md px-3 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}
      </div>

      <KpiBar items={kpis} className="mb-5" />

      <Card
        title="Documentos"
        subtitle={`${filteredRows.length} registro${filteredRows.length === 1 ? '' : 's'}`}
        icon={FileText}
        actions={
          <button type="button" onClick={exportCSV} title="Exportar CSV" className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
            <Download className="h-4 w-4" />
          </button>
        }
      >
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Cargando...</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-red-500">{error}</p>
        ) : filteredRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No hay cambios o devoluciones para los filtros seleccionados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <Th>Documento</Th>
                  <Th>Fecha</Th>
                  <Th>Cliente</Th>
                  <Th>Origen</Th>
                  <Th>Locación</Th>
                  <Th right>Art. origen</Th>
                  <Th right>Art. nuevos</Th>
                  <Th right>Crédito</Th>
                  <Th right>Perdido</Th>
                  <Th right>Total</Th>
                  <Th right>Acciones</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <Td>
                      <p className="font-semibold text-slate-900 dark:text-white">{row.folio}</p>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${documentBadgeClass(row.document_type_code)}`}>
                        {row.document_label} · {statusLabel(row.status)}
                      </span>
                    </Td>
                    <Td muted><span className="text-xs">{formatDateTime(row.updated_at || row.created_at)}</span></Td>
                    <Td>{row.customer_name}</Td>
                    <Td muted>{row.source_document || '-'}</Td>
                    <Td>{row.warehouse_name}</Td>
                    <Td right>{row.origin_item_count}</Td>
                    <Td right>{row.new_item_count}</Td>
                    <Td right bold>{money(row.origin_credit_amount)}</Td>
                    <Td right className={Number(row.forfeited_credit || 0) > 0 ? 'text-amber-500 dark:text-amber-300' : ''}>{money(row.forfeited_credit)}</Td>
                    <Td right bold>{money(row.total_amount)}</Td>
                    <Td right>
                      <button
                        type="button"
                        onClick={() => setDetailSaleCode(row.sale_code)}
                        title="Ver detalle"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-300"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {detailSaleCode && (
        <SaleDetailModal
          saleCode={detailSaleCode}
          title="Detalle de cambio o devolución"
          onClose={() => setDetailSaleCode(null)}
        />
      )}
    </section>
  );
};

export default ReturnsExchangesReport;
