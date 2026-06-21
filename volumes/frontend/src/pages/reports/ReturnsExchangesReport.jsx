/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ApexCharts from 'apexcharts';
import ReactApexChart from 'react-apexcharts';
import { ArrowLeft, Eye, FileText } from 'lucide-react';
import ReportLayout from '@/components/common/navigation/ReportLayout';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import DateRangePicker from '@/components/common/forms/DateRangePicker';
import SaleDetailModal from '@/components/sales/SaleDetailModal';
import apiClient from '@/services/api/apiClient';
import { getBackendMessage, toast } from '@/services/ui/notify';
import { useSessionStore } from '@/store/useSessionStore';
import { buildCsvBlobUrl, buildXlsxBlobUrl } from '@/utils/exportFile';

// ── Helpers ───────────────────────────────────────────────────────────────────

const money = (v) => Number(v || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const toISO   = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmt     = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDT   = (v)   => v ? new Date(v).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

const getMondayISO = () => {
  const today = new Date();
  const diff  = today.getDay() === 0 ? 6 : today.getDay() - 1;
  return toISO(addDays(today, -diff));
};

const periodFrom = (days) => toISO(addDays(new Date(), -(days - 1)));
const activeWarehouseValue = (location) => {
  const value = location?.warehouse_id ?? location?.id;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? String(numeric) : '';
};
const locationOption = (location) => {
  const value = activeWarehouseValue(location);
  if (!value) return null;
  return {
    value,
    label: location?.warehouse_name || location?.label || location?.name || `Locacion ${value}`,
  };
};

// ── Constantes ────────────────────────────────────────────────────────────────

const PERIODS = [
  { id: 'today', label: 'Hoy',         days: 1 },
  { id: 'week',  label: 'Esta semana', getFrom: getMondayISO },
  { id: '7d',    label: '7 días',      days:  7 },
  { id: '15d',   label: '15 días',     days: 15 },
  { id: '30d',   label: '30 días',     days: 30 },
  { id: '60d',   label: '60 días',     days: 60 },
  { id: '90d',   label: '90 días',     days: 90 },
];

const DOCUMENT_OPTIONS = [
  { value: 'all',            label: 'Cambios y devoluciones' },
  { value: 'EXCHANGE_DRAFT', label: 'Solo cambios'           },
  { value: 'RETURN_TICKET',  label: 'Solo devoluciones'      },
];

const STATUS_OPTIONS = [
  { value: 'CLOSED',           label: 'Cerrados'         },
  { value: 'PENDING_CASHIER',  label: 'Pendientes'       },
  { value: 'CANCELLED',        label: 'Cancelados'       },
  { value: 'all',              label: 'Todos los estados'},
];
const ALL_WAREHOUSE_VALUE = '__all__';
const CURRENCY_LABEL = 'Peso chileno (CLP)';

const defaultFilters = (warehouseValue = '') => ({
  dateFrom:     getMondayISO(),
  dateTo:       toISO(new Date()),
  period:       'week',
  warehouseId:  warehouseValue ? [warehouseValue] : [],
  documentType: 'all',
  status:       'CLOSED',
});

const eachDateIsoAsc = (from, to) => {
  if (!from || !to) return [];
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const dates = [];
  for (let cur = new Date(start); cur <= end; cur = addDays(cur, 1)) {
    dates.push(toISO(cur));
  }
  return dates;
};

// ── Sub-componentes de tabla ───────────────────────────────────────────────────

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

const statusLabel = (s) => ({ PENDING_CASHIER: 'Pendiente', CLOSED: 'Cerrado', CANCELLED: 'Cancelado' }[s] || s || '-');

const docBadgeClass = (code) => code === 'EXCHANGE_DRAFT'
  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
  : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300';

// ── Componente principal ──────────────────────────────────────────────────────

const ReturnsExchangesReport = () => {
  const navigate          = useNavigate();
  const { pathname }      = useLocation();
  const isDark            = document.documentElement.classList.contains('dark');
  const activeLocationRecord = useSessionStore((state) => state.getActiveLocation());
  const locations = useSessionStore((state) => state.locations);
  const activeWarehouse = useMemo(() => activeWarehouseValue(activeLocationRecord), [activeLocationRecord]);

  const [filters, setFilters]   = useState(() => defaultFilters(activeWarehouse));
  const [executedFilters, setExecutedFilters] = useState(() => defaultFilters(activeWarehouse));
  const [viewMode, setViewMode] = useState('detail'); // 'detail' | 'grouped'
  const [rows, setRows]         = useState([]);
  const [totals, setTotals]     = useState({});
  const [loading, setLoading]   = useState(false);
  const [detailSaleCode, setDetailSaleCode] = useState(null);

  const set = (key, val) => setFilters((f) => ({ ...f, [key]: val }));

  const applyPeriod = (id) => {
    const p = PERIODS.find((x) => x.id === id);
    if (p) setFilters((f) => ({ ...f, period: id, dateFrom: p.getFrom ? p.getFrom() : periodFrom(p.days), dateTo: toISO(new Date()) }));
  };

  const warehouseOptions = useMemo(() => [
    { value: ALL_WAREHOUSE_VALUE, label: 'Todas las locaciones' },
    ...locations.map(locationOption).filter(Boolean),
  ], [locations]);
  const realWarehouseOptions = useMemo(() => warehouseOptions.filter((option) => option.value !== ALL_WAREHOUSE_VALUE), [warehouseOptions]);
  const allWarehouseValues = useMemo(() => realWarehouseOptions.map((option) => String(option.value)), [realWarehouseOptions]);
  const defaultWarehouseValues = useMemo(() => (
    activeWarehouse && allWarehouseValues.includes(activeWarehouse) ? [activeWarehouse] : []
  ), [activeWarehouse, allWarehouseValues]);
  const selectedWarehouseValues = Array.isArray(filters.warehouseId) ? filters.warehouseId : [];
  const executedWarehouseValues = Array.isArray(executedFilters.warehouseId) ? executedFilters.warehouseId : [];

  useEffect(() => {
    if (!allWarehouseValues.length) return;
    setFilters((current) => (
      Array.isArray(current.warehouseId)
        && current.warehouseId.some((value) => allWarehouseValues.includes(String(value)))
        ? current
        : { ...current, warehouseId: defaultWarehouseValues }
    ));
    setExecutedFilters((current) => (
      Array.isArray(current.warehouseId)
        && current.warehouseId.some((value) => allWarehouseValues.includes(String(value)))
        ? current
        : { ...current, warehouseId: defaultWarehouseValues }
    ));
  }, [allWarehouseValues, defaultWarehouseValues]);

  const setSelectedWarehouses = (values = []) => {
    const nextValues = values.map(String);
    if (nextValues.includes(ALL_WAREHOUSE_VALUE)) {
      set('warehouseId', allWarehouseValues);
      return;
    }
    set('warehouseId', nextValues);
  };

  const selectedWarehouseLabels = (values) => {
    const selected = new Set((values || []).map(String));
    const labels = realWarehouseOptions
      .filter((option) => selected.has(String(option.value)))
      .map((option) => option.label);
    return labels.length ? labels.join(', ') : 'Todas las locaciones';
  };

  // Fetch
  const fetchReport = useCallback(async (nextFilters = filters) => {
    if (!nextFilters.dateFrom || !nextFilters.dateTo) return;
    setLoading(true);
    try {
      const params = {
        date_from:     nextFilters.dateFrom,
        date_to:       nextFilters.dateTo,
        document_type: nextFilters.documentType,
        status:        nextFilters.status,
      };
      const nextWarehouses = Array.isArray(nextFilters.warehouseId) ? nextFilters.warehouseId : [];
      if (nextWarehouses.length > 0) {
        params.warehouse_ids = nextWarehouses.join(',');
      }
      const { data } = await apiClient.get('/reports/sales/returns-exchanges', { params });
      const payload = data?.data ? data : data || {};
      setRows(Array.isArray(payload.data) ? payload.data : []);
      setTotals(payload.totals || {});
      setExecutedFilters({
        ...nextFilters,
        warehouseId: nextWarehouses.length ? nextWarehouses : defaultWarehouseValues,
      });
    } catch (err) {
      toast.error(getBackendMessage(err, 'No fue posible cargar el reporte.'));
    } finally {
      setLoading(false);
    }
  }, [defaultWarehouseValues, filters]);

  useEffect(() => { fetchReport(defaultFilters(activeWarehouse)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Agrupación por día (viewMode === 'grouped') o detalle individual
  const displayRows = useMemo(() => {
    if (viewMode === 'detail') return rows;
    const byDay = {};
    eachDateIsoAsc(executedFilters.dateFrom, executedFilters.dateTo).forEach((iso) => {
      byDay[iso] = {
        _iso: iso, documents: 0, exchanges: 0, returns: 0,
        origin_item_count: 0, new_item_count: 0,
        origin_credit_amount: 0, new_products_amount: 0, forfeited_credit: 0,
      };
    });
    rows.forEach((r) => {
      const iso = (r.updated_at || r.created_at || '').slice(0, 10);
      if (!iso) return;
      if (!byDay[iso]) byDay[iso] = {
        _iso: iso, documents: 0, exchanges: 0, returns: 0,
        origin_item_count: 0, new_item_count: 0,
        origin_credit_amount: 0, new_products_amount: 0, forfeited_credit: 0,
      };
      const g = byDay[iso];
      g.documents++;
      if (r.document_type_code === 'EXCHANGE_DRAFT') g.exchanges++; else g.returns++;
      g.origin_item_count      += r.origin_item_count;
      g.new_item_count         += r.new_item_count;
      g.origin_credit_amount   += r.origin_credit_amount;
      g.new_products_amount    += r.new_products_amount;
      g.forfeited_credit       += r.forfeited_credit;
    });
    return Object.values(byDay).sort((a, b) => a._iso.localeCompare(b._iso));
  }, [executedFilters.dateFrom, executedFilters.dateTo, rows, viewMode]);

  const filteredRows = displayRows;

  // Datos del gráfico: cambios y devoluciones por día
  const chartData = useMemo(() => {
    const byDay = {};
    rows.forEach((r) => {
      const iso = (r.updated_at || r.created_at || '').slice(0, 10);
      if (!iso) return;
      if (!byDay[iso]) byDay[iso] = { exchanges: 0, returns: 0 };
      if (r.document_type_code === 'EXCHANGE_DRAFT') byDay[iso].exchanges++;
      else byDay[iso].returns++;
    });
    const sorted = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b));
    return {
      labels:    sorted.map(([iso]) => { const [, m, d] = iso.split('-'); return `${d}/${m}`; }),
      exchanges: sorted.map(([, v]) => v.exchanges),
      returns:   sorted.map(([, v]) => v.returns),
    };
  }, [rows]);

  const barOptions = useMemo(() => ({
    chart: {
      id: 'returns-exchanges-bar',
      type: 'bar', stacked: true, background: 'transparent', fontFamily: 'inherit',
      toolbar: {
        show: true,
        tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false },
        export: {
          png: { filename: `cambios-devoluciones_${executedFilters.dateFrom}_${executedFilters.dateTo}` },
          csv: { filename: `cambios-devoluciones_${executedFilters.dateFrom}_${executedFilters.dateTo}` },
        },
      },
    },
    colors:      ['#3b82f6', '#f43f5e'],
    plotOptions: { bar: { columnWidth: chartData.labels.length > 30 ? '90%' : '55%', borderRadius: 2 } },
    dataLabels:  { enabled: false },
    xaxis: {
      categories: chartData.labels,
      labels:     { rotate: chartData.labels.length > 20 ? -45 : 0, style: { fontSize: '10px', colors: isDark ? '#94a3b8' : '#64748b' }, show: chartData.labels.length <= 90 },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis:   { labels: { formatter: (v) => String(v), style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' } }, tickAmount: 4 },
    grid:    { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
    legend:  { show: true, position: 'top', horizontalAlign: 'left', labels: { colors: isDark ? '#cbd5e1' : '#475569' } },
    tooltip: { shared: true, intersect: false, y: { formatter: (v) => `${v} doc.` } },
    theme:   { mode: isDark ? 'dark' : 'light' },
  }), [chartData.labels, isDark, executedFilters.dateFrom, executedFilters.dateTo]);

  const barSeries = [
    { name: 'Cambios',      data: chartData.exchanges },
    { name: 'Devoluciones', data: chartData.returns   },
  ];

  // KPIs
  const kpiItems = [
    { id: 'documents', label: 'Documentos',       value: String(totals.documents || 0),          hint: `${totals.exchanges || 0} cambios · ${totals.returns || 0} devoluciones` },
    { id: 'origin',    label: 'Artículos origen', value: String(totals.origin_items || 0),        hint: 'devueltos o cambiados'  },
    { id: 'new',       label: 'Artículos nuevos', value: String(totals.new_items || 0),           hint: 'entregados en cambios'  },
    { id: 'credit',    label: 'Crédito generado', value: money(totals.origin_credit_amount),      hint: 'valor reconocido'       },
    { id: 'newAmt',    label: 'Productos nuevos', value: money(totals.new_products_amount),       hint: 'valor entregado'        },
    { id: 'lost',      label: 'Crédito perdido',  value: money(totals.forfeited_credit),          hint: 'no acumulado / no usado'},
  ];

  // Exportación
  const buildExportData = () => {
    if (viewMode === 'grouped') {
      const headers = ['Fecha', 'Documentos', 'Cambios', 'Devoluciones', 'Art. origen', 'Art. nuevos', `Crédito generado ${CURRENCY_LABEL}`, `Productos nuevos ${CURRENCY_LABEL}`, `Crédito perdido ${CURRENCY_LABEL}`];
      const data = filteredRows.map((r) => [
        fmt(r._iso),
        r.documents,
        r.exchanges,
        r.returns,
        r.origin_item_count,
        r.new_item_count,
        r.origin_credit_amount,
        r.new_products_amount,
        r.forfeited_credit,
      ]);
      data.push([
        'TOTAL',
        rows.length,
        totals.exchanges || 0,
        totals.returns || 0,
        totals.origin_items || 0,
        totals.new_items || 0,
        totals.origin_credit_amount || 0,
        totals.new_products_amount || 0,
        totals.forfeited_credit || 0,
      ]);
      return { headers, data };
    }

    const headers = ['Fecha', 'Folio', 'Tipo', 'Estado', 'Documento origen', 'Cliente', 'Locación', 'Art. origen', 'Art. nuevos', `Crédito generado ${CURRENCY_LABEL}`, `Productos nuevos ${CURRENCY_LABEL}`, `Crédito perdido ${CURRENCY_LABEL}`, `Total ${CURRENCY_LABEL}`];
    const data = filteredRows.map((r) => [
      fmtDT(r.updated_at || r.created_at),
      r.folio,
      r.document_label,
      statusLabel(r.status),
      r.source_document || '',
      r.customer_name,
      r.warehouse_name,
      r.origin_item_count,
      r.new_item_count,
      r.origin_credit_amount,
      r.new_products_amount,
      r.forfeited_credit,
      r.total_amount,
    ]);
    return { headers, data };
  };

  const buildExportMetadata = () => {
    const warehouseLabel = selectedWarehouseLabels(executedWarehouseValues);
    const documentLabel = DOCUMENT_OPTIONS.find((o) => o.value === executedFilters.documentType)?.label || 'Cambios y devoluciones';
    const statusOption = STATUS_OPTIONS.find((o) => o.value === executedFilters.status);
    return [
      ['Reporte', 'Cambios y devoluciones'],
      ['Periodo', `${fmt(executedFilters.dateFrom)} - ${fmt(executedFilters.dateTo)}`],
      ['Locación', warehouseLabel],
      ['Tipo de documento', documentLabel],
      ['Estado', statusOption?.label || executedFilters.status],
      ['Moneda', CURRENCY_LABEL],
      ['Vista', viewMode === 'detail' ? 'Detalle' : 'Por día'],
      ['Generado el', new Date().toLocaleString('es-CL')],
    ];
  };

  const handlePdfExport = async () => {
    try {
      const barImg  = await ApexCharts.exec('returns-exchanges-bar', 'dataURI');
      const toBlob  = async (dataURI) => (await fetch(dataURI)).blob();
      const formData = new FormData();
      formData.append('date_from',     executedFilters.dateFrom);
      formData.append('date_to',       executedFilters.dateTo);
      formData.append('warehouse_id',  executedWarehouseValues.length ? executedWarehouseValues.join(',') : 'all');
      formData.append('document_type', executedFilters.documentType);
      formData.append('status',        executedFilters.status);
      formData.append('view_mode',     viewMode);
      if (barImg?.imgURI) formData.append('chart_bar', await toBlob(barImg.imgURI), 'chart_bar.png');
      const { data: blob } = await apiClient.post('/reports/sales/returns-exchanges/pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      });
      return URL.createObjectURL(blob);
    } catch {
      toast.error('No se pudo generar el PDF. Verifique que el servicio Gotenberg esté activo.');
      throw new Error('pdf_failed');
    }
  };

  const handleCsvExport  = async () => {
    if (!filteredRows.length) { toast('No hay registros para exportar.'); throw new Error('empty'); }
    const { headers, data } = buildExportData();
    return buildCsvBlobUrl(headers, data, { metadataRows: buildExportMetadata() });
  };

  const handleXlsxExport = async () => {
    if (!filteredRows.length) { toast('No hay registros para exportar.'); throw new Error('empty'); }
    const { headers, data } = buildExportData();
    return buildXlsxBlobUrl(headers, data, 'Cambios y devoluciones', { metadataRows: buildExportMetadata() });
  };

  const handleViewModeChange = (nextMode) => {
    setViewMode(nextMode);
    if (nextMode === 'grouped') fetchReport(filters);
  };

  const isFiltered = (
    allWarehouseValues.length > 0
    && selectedWarehouseValues.join(',') !== defaultWarehouseValues.join(',')
  ) || filters.documentType !== 'all'
    || filters.status !== 'CLOSED' || filters.period !== 'week';

  const clearFilters = () => setFilters({ ...defaultFilters(activeWarehouse), warehouseId: defaultWarehouseValues });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <ReportLayout
        title="Cambios y devoluciones"
        description={`${fmt(executedFilters.dateFrom)} — ${fmt(executedFilters.dateTo)} · ${filteredRows.length} documentos`}
        actions={[
          { id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate(pathname) },
        ]}

        filterBar={
          <>
            {/* 1. Sucursal */}
            <div className="w-full shrink-0 sm:w-56 lg:w-60">
              <AutocompleteSelect value={selectedWarehouseValues} onChange={setSelectedWarehouses} options={warehouseOptions} placeholder="Todas las locaciones" clearable={false} multiple maxVisibleTags={3} buttonClassName="h-10 shadow-none" />
            </div>

            {/* 2. Períodos rápidos */}
            <div className="flex overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPeriod(p.id)}
                  className={`h-10 px-2.5 text-sm whitespace-nowrap transition-colors ${
                    filters.period === p.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* 3. Rango de fechas */}
            <DateRangePicker
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              maxDays={365}
              onChange={({ from, to }) => setFilters((f) => ({ ...f, period: 'custom', dateFrom: from, dateTo: to }))}
            />

          </>
        }

        filterBarActions={
          isFiltered ? (
            <button type="button" onClick={clearFilters} className="flex h-10 items-center gap-1.5 rounded-md px-3 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              ✕ Limpiar
            </button>
          ) : null
        }

        filterBarTrailing={
          <>
            {/* Otros filtros */}
            <div className="w-44 shrink-0">
              <AutocompleteSelect value={filters.documentType} onChange={(v) => set('documentType', v || 'all')} options={DOCUMENT_OPTIONS} placeholder="Tipo de documento" clearable={false} buttonClassName="h-10 shadow-none" />
            </div>
            <div className="w-36 shrink-0">
              <AutocompleteSelect value={filters.status} onChange={(v) => set('status', v || 'CLOSED')} options={STATUS_OPTIONS} placeholder="Estado" clearable={false} buttonClassName="h-10 shadow-none" />
            </div>
          </>
        }

        kpiItems={kpiItems}

        charts={[
          {
            title:   'Cambios y devoluciones por día',
            icon:    FileText,
            content: (
              <ReactApexChart
                options={barOptions}
                series={barSeries}
                type="bar"
                height={240}
                key={`returns-bar-${executedFilters.dateFrom}-${executedFilters.dateTo}`}
              />
            ),
          },
        ]}

        tableTitle="Documentos"
        tableSubtitle={loading ? 'Cargando…' : viewMode === 'grouped'
          ? `${filteredRows.length} día${filteredRows.length === 1 ? '' : 's'} · ${rows.length} documentos`
          : `${filteredRows.length} documento${filteredRows.length === 1 ? '' : 's'}`}
        tableIcon={FileText}

        onExportPdf={handlePdfExport}
        pdfFilename={`cambios-devoluciones_${executedFilters.dateFrom}_${executedFilters.dateTo}.pdf`}
        onExportCsv={handleCsvExport}
        csvFilename={`cambios-devoluciones_${executedFilters.dateFrom}_${executedFilters.dateTo}.csv`}
        onExportExcel={handleXlsxExport}
        excelFilename={`cambios-devoluciones_${executedFilters.dateFrom}_${executedFilters.dateTo}.xlsx`}
        exportDescription={`${fmt(executedFilters.dateFrom)} — ${fmt(executedFilters.dateTo)} · ${filteredRows.length} documentos`}

        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onRunReport={() => fetchReport(filters)}
        runReportLoading={loading}
      >
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Cargando…</p>
        ) : filteredRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No hay cambios o devoluciones para los filtros seleccionados.</p>
        ) : viewMode === 'grouped' ? (
          /* ── Vista agrupada por día ─────────────────────────────── */
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <Th>Fecha</Th>
                  <Th right>Docs.</Th>
                  <Th right>Cambios</Th>
                  <Th right>Devoluciones</Th>
                  <Th right>Art. origen</Th>
                  <Th right>Art. nuevos</Th>
                  <Th right>Crédito generado</Th>
                  <Th right>Prod. nuevos</Th>
                  <Th right>Crédito perdido</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {filteredRows.map((g) => (
                  <tr key={g._iso}>
                    <Td bold>{fmt(g._iso)}</Td>
                    <Td right>{g.documents}</Td>
                    <Td right muted>{g.exchanges}</Td>
                    <Td right muted>{g.returns}</Td>
                    <Td right>{g.origin_item_count}</Td>
                    <Td right>{g.new_item_count}</Td>
                    <Td right bold>{money(g.origin_credit_amount)}</Td>
                    <Td right>{money(g.new_products_amount)}</Td>
                    <Td right className={g.forfeited_credit > 0 ? 'text-amber-500 dark:text-amber-300' : ''}>
                      {money(g.forfeited_credit)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── Vista detalle individual ───────────────────────────── */
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
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
                {filteredRows.map((r) => (
                  <tr key={r.id}>
                    <Td>
                      <p className="font-semibold text-slate-900 dark:text-white">{r.folio}</p>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${docBadgeClass(r.document_type_code)}`}>
                        {r.document_label} · {statusLabel(r.status)}
                      </span>
                    </Td>
                    <Td muted><span className="text-xs">{fmtDT(r.updated_at || r.created_at)}</span></Td>
                    <Td>{r.customer_name}</Td>
                    <Td muted>{r.source_document || '-'}</Td>
                    <Td>{r.warehouse_name}</Td>
                    <Td right>{r.origin_item_count}</Td>
                    <Td right>{r.new_item_count}</Td>
                    <Td right bold>{money(r.origin_credit_amount)}</Td>
                    <Td right className={Number(r.forfeited_credit || 0) > 0 ? 'text-amber-500 dark:text-amber-300' : ''}>{money(r.forfeited_credit)}</Td>
                    <Td right bold>{money(r.total_amount)}</Td>
                    <Td right>
                      <button
                        type="button"
                        onClick={() => setDetailSaleCode(r.sale_code)}
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
      </ReportLayout>

      {detailSaleCode && (
        <SaleDetailModal
          saleCode={detailSaleCode}
          title="Detalle de cambio o devolución"
          onClose={() => setDetailSaleCode(null)}
        />
      )}
    </>
  );
};

export default ReturnsExchangesReport;
