/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ApexCharts from 'apexcharts';
import ReactApexChart from 'react-apexcharts';
import { ArrowLeft, BarChart2, BarChart3, Eye, X } from 'lucide-react';
import ReportLayout from '@/components/common/navigation/ReportLayout';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import DateRangePicker from '@/components/common/forms/DateRangePicker';
import SaleDetailModal from '@/components/sales/SaleDetailModal';
import { toast } from '@/services/ui/notify';
import apiClient from '@/services/api/apiClient';
import { useSessionStore } from '@/store/useSessionStore';
import { buildCsvBlobUrl, buildXlsxBlobUrl } from '@/utils/exportFile';

const money   = (v) => Number(v).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const toISO   = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmt     = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDay  = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: '2-digit' });
const fmtDT   = (v) => v ? new Date(v).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

// --- Constants -----------------------------------------------------------

const getMondayISO = () => {
  const today = new Date();
  const diff  = today.getDay() === 0 ? 6 : today.getDay() - 1; // días desde el lunes
  return toISO(addDays(today, -diff));
};

const PERIODS = [
  { id: 'today', label: 'Hoy',          days: 1 },
  { id: 'week',  label: 'Esta semana',  getFrom: getMondayISO },
  { id: '7d',    label: '7 días',       days:  7 },
  { id: '15d',   label: '15 días',      days: 15 },
  { id: '30d',   label: '30 días',      days: 30 },
  { id: '60d',   label: '60 días',      days: 60 },
  { id: '90d',   label: '90 días',      days: 90 },
];

const BRANCH_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const METHOD_PALETTE  = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
const ALL_BRANCH_VALUE = '__all__';
const CURRENCY_LABEL = 'Peso chileno (CLP)';

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
    label: location?.warehouse_name || location?.label || location?.name || `Sucursal ${value}`,
  };
};

// --- Table helpers -------------------------------------------------------

const Th = ({ children, right, center }) => (
  <th className={`pb-2 px-3 first:pl-0 last:pr-0 text-xs font-medium uppercase text-slate-400 ${right ? 'text-right' : center ? 'text-center' : 'text-left'}`}>{children}</th>
);
const Td = ({ children, right, center, muted, bold, className: cls = '' }) => (
  <td className={`py-2.5 px-3 first:pl-0 last:pr-0 text-sm ${right ? 'text-right tabular-nums' : center ? 'text-center' : ''} ${muted ? 'text-slate-400' : ''} ${bold ? 'font-semibold' : ''} ${cls}`}>
    {children}
  </td>
);

const statusLabel = (status) => ({ CLOSED: 'Cerrado', CANCELLED: 'Anulado' }[status] || status || '-');

// --- Main ----------------------------------------------------------------

const defaultFilters = (warehouseValue = '') => ({
  sucursal: warehouseValue ? [warehouseValue] : [],
  period: 'week',
  dateFrom: getMondayISO(),
  dateTo: toISO(new Date()),
});

const DailySales = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDark = document.documentElement.classList.contains('dark');
  const activeLocationRecord = useSessionStore((state) => state.getActiveLocation());
  const locations = useSessionStore((state) => state.locations);
  const activeWarehouse = useMemo(() => activeWarehouseValue(activeLocationRecord), [activeLocationRecord]);

  const [filters, setFilters]           = useState(() => defaultFilters(activeWarehouse));
  const [executedFilters, setExecutedFilters] = useState(() => defaultFilters(activeWarehouse));
  const [viewMode, setViewMode]         = useState('grouped'); // 'grouped'=por día | 'detail'=individual
  const [rows, setRows]                 = useState([]);
  const [detailRows, setDetailRows]     = useState([]);
  const [loading, setLoading]           = useState(false);
  const [detailSaleCode, setDetailSaleCode] = useState(null);

  const set = (key, val) => setFilters((f) => ({ ...f, [key]: val }));

  const applyPeriod = (id) => {
    const p = PERIODS.find((x) => x.id === id);
    if (p) setFilters((f) => ({ ...f, period: id, dateFrom: p.getFrom ? p.getFrom() : periodFrom(p.days), dateTo: toISO(new Date()) }));
  };

  const realBranchOptions = useMemo(() => (
    locations.map(locationOption).filter(Boolean)
  ), [locations]);
  const branchOptions = useMemo(() => [
    { value: ALL_BRANCH_VALUE, label: 'Todas las sucursales' },
    ...realBranchOptions,
  ], [realBranchOptions]);
  const allBranchValues = useMemo(() => realBranchOptions.map((option) => String(option.value)), [realBranchOptions]);
  const selectedBranchValues = useMemo(
    () => (Array.isArray(filters.sucursal) ? filters.sucursal : []),
    [filters.sucursal]
  );
  const executedBranchValues = useMemo(
    () => (Array.isArray(executedFilters.sucursal) ? executedFilters.sucursal : []),
    [executedFilters.sucursal]
  );

  const setSelectedBranches = (values = []) => {
    const nextValues = values.map(String);
    if (nextValues.includes(ALL_BRANCH_VALUE)) {
      set('sucursal', allBranchValues);
      return;
    }
    set('sucursal', nextValues);
  };

  const selectedBranchLabels = (values) => {
    const selected = new Set((values || []).map(String));
    const labels = realBranchOptions
      .filter((option) => selected.has(String(option.value)))
      .map((option) => option.label);
    return labels.length ? labels.join(', ') : 'Todas las sucursales';
  };

  const defaultBranchValues = useMemo(() => (
    activeWarehouse && allBranchValues.includes(activeWarehouse) ? [activeWarehouse] : []
  ), [activeWarehouse, allBranchValues]);

  const clearFilters = () => setFilters((current) => ({
    ...defaultFilters(activeWarehouse),
    sucursal: defaultBranchValues.length ? defaultBranchValues : current.sucursal,
  }));
  const isFiltered = filters.period !== 'week' || (
    allBranchValues.length > 0
    && selectedBranchValues.join(',') !== defaultBranchValues.join(',')
  );

  const fetchData = useCallback(async (nextFilters = filters) => {
    setLoading(true);
    try {
      const params = { date_from: nextFilters.dateFrom, date_to: nextFilters.dateTo };
      const nextBranches = Array.isArray(nextFilters.sucursal) ? nextFilters.sucursal : [];
      if (nextBranches.length > 0) {
        params.warehouse_ids = nextBranches.join(',');
      }

      const { data } = await apiClient.get('/reports/daily-sales/data', { params });
      const optionValues = allBranchValues;
      const validNextBranches = nextBranches.filter((value) => optionValues.includes(String(value)));
      const fallbackBranchValues = activeWarehouse && optionValues.includes(activeWarehouse) ? [activeWarehouse] : [];
      const resolvedFilters = {
        ...nextFilters,
        sucursal: validNextBranches.length ? validNextBranches : fallbackBranchValues,
      };

      setRows(data.rows || []);
      setDetailRows(data.detail_rows || []);
      setExecutedFilters(resolvedFilters);
      setFilters((current) => (
        Array.isArray(current.sucursal)
          && current.sucursal.some((value) => optionValues.includes(String(value)))
          ? current
          : { ...current, sucursal: fallbackBranchValues }
      ));
    } catch {
      toast.error('Error cargando datos del reporte');
    } finally {
      setLoading(false);
    }
  }, [activeWarehouse, allBranchValues, filters]);

  useEffect(() => { fetchData(defaultFilters(activeWarehouse)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived data
  const nonEmptyRows  = rows.filter((r) => r.total > 0);
  const totals = useMemo(() => ({
    total:     rows.reduce((a, r) => a + (r.total     || 0), 0),
    txn:       rows.reduce((a, r) => a + (r.txn       || 0), 0),
    cancelled: rows.reduce((a, r) => a + (r.cancelled || 0), 0),
  }), [rows]);

  const avgTicketTotal = totals.txn > 0 ? Math.round(totals.total / totals.txn) : 0;
  const bestDay  = nonEmptyRows.reduce((b, r) => (!b || r.total > b.total ? r : b), null);
  const worstDay = nonEmptyRows.reduce((b, r) => (!b || r.total < b.total ? r : b), null);

  // Unique branch names in data (preserves order)
  const uniqueBranches = useMemo(() => {
    const seen = new Map();
    rows.forEach((r) => (r.by_branch || []).forEach((b) => seen.set(b.warehouse_name, true)));
    return Array.from(seen.keys());
  }, [rows]);

  // Unique payment methods in data (preserves order by first seen)
  const allMethods = useMemo(() => {
    const seen = new Map();
    rows.forEach((r) => (r.by_method || []).forEach((m) => {
      if (!seen.has(m.code)) seen.set(m.code, m.name);
    }));
    return Array.from(seen.entries()).map(([code, name]) => ({ code, name }));
  }, [rows]);

  // Chart labels
  const chartLabels = rows.map((r) => { const [, m, d] = r.iso.split('-'); return `${d}/${m}`; });

  // Area chart series (by branch or single)
  const chartSeries = useMemo(() => {
    if (uniqueBranches.length <= 1 || executedBranchValues.length === 1) {
      return [{
        name: executedBranchValues.length === 1
          ? (realBranchOptions.find((o) => String(o.value) === String(executedBranchValues[0]))?.label ?? 'Sucursal')
          : (uniqueBranches[0] ? `Suc. ${uniqueBranches[0]}` : 'Ventas'),
        data:  rows.map((r) => r.total),
        color: BRANCH_PALETTE[0],
      }];
    }
    return uniqueBranches.map((name, i) => ({
      name:  `Suc. ${name}`,
      data:  rows.map((r) => (r.by_branch || []).find((b) => b.warehouse_name === name)?.total ?? 0),
      color: BRANCH_PALETTE[i % BRANCH_PALETTE.length],
    }));
  }, [rows, uniqueBranches, executedBranchValues, realBranchOptions]);

  // Bar chart series (dynamic payment methods)
  const barSeries = useMemo(() =>
    allMethods.map((m) => ({
      name: m.name,
      data: rows.map((r) => Math.round((r.by_method || []).find((x) => x.code === m.code)?.amount ?? 0)),
    }))
  , [rows, allMethods]);

  const areaOptions = useMemo(() => ({
    chart: {
      id: 'daily-sales-area',
      type: 'area', stacked: false, background: 'transparent', fontFamily: 'inherit',
      toolbar: {
        show: true,
        tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false },
        export: {
          png: { filename: `ventas-diarias_${executedFilters.dateFrom}_${executedFilters.dateTo}` },
          csv: { filename: `ventas-diarias_${executedFilters.dateFrom}_${executedFilters.dateTo}` },
        },
      },
    },
    stroke:     { curve: 'smooth', width: 2 },
    fill:       { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.03, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: chartLabels,
      labels:     { rotate: rows.length > 20 ? -45 : 0, style: { fontSize: '10px', colors: isDark ? '#94a3b8' : '#64748b' }, show: rows.length <= 90 },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis:   { labels: { formatter: (v) => `$${(v / 1000).toFixed(0)}K`, style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' } } },
    grid:    { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
    legend:  { show: uniqueBranches.length > 1, position: 'top', horizontalAlign: 'left', labels: { colors: isDark ? '#cbd5e1' : '#475569' } },
    tooltip: { shared: true, y: { formatter: (v) => money(v) } },
    theme:   { mode: isDark ? 'dark' : 'light' },
  }), [chartLabels, rows.length, isDark, uniqueBranches.length, executedFilters.dateFrom, executedFilters.dateTo]);

  const barOptions = useMemo(() => ({
    chart: {
      id: 'daily-sales-bar',
      type: 'bar', stacked: true, background: 'transparent', fontFamily: 'inherit',
      toolbar: {
        show: true,
        tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false },
        export: {
          png: { filename: `metodos-pago_${executedFilters.dateFrom}_${executedFilters.dateTo}` },
          csv: { filename: `metodos-pago_${executedFilters.dateFrom}_${executedFilters.dateTo}` },
        },
      },
    },
    colors:      METHOD_PALETTE,
    plotOptions: { bar: { columnWidth: rows.length > 30 ? '90%' : '65%', borderRadius: 2 } },
    dataLabels:  { enabled: false },
    xaxis: {
      categories: chartLabels,
      labels:     { rotate: rows.length > 20 ? -45 : 0, style: { fontSize: '10px', colors: isDark ? '#94a3b8' : '#64748b' }, show: rows.length <= 90 },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis:   { labels: { formatter: (v) => `$${(v / 1000).toFixed(0)}K`, style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' } } },
    grid:    { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
    legend:  { show: true, position: 'top', horizontalAlign: 'left', labels: { colors: isDark ? '#cbd5e1' : '#475569' } },
    tooltip: { shared: true, intersect: false, y: { formatter: (v) => money(v) } },
    theme:   { mode: isDark ? 'dark' : 'light' },
  }), [chartLabels, rows.length, isDark, executedFilters.dateFrom, executedFilters.dateTo]);

  // KPIs
  const KPI_ITEMS = [
    { id: 'total',  label: 'Total período',  value: money(totals.total),         hint: `en ${rows.length} días`            },
    { id: 'txn',    label: 'Transacciones',   value: totals.txn.toString(),       hint: 'documentos emitidos'               },
    { id: 'avg',    label: 'Ticket promedio', value: money(avgTicketTotal),       hint: 'por transacción'                   },
    { id: 'best',   label: 'Mejor día',       value: bestDay  ? money(bestDay.total)  : '—', hint: bestDay  ? fmtDay(bestDay.iso)  : '' },
    { id: 'worst',  label: 'Peor día',        value: worstDay ? money(worstDay.total) : '—', hint: worstDay ? fmtDay(worstDay.iso) : '' },
    { id: 'cancel', label: 'Anulaciones',     value: totals.cancelled.toString(), hint: `${((totals.cancelled / Math.max(totals.txn, 1)) * 100).toFixed(1)}% del total` },
  ];

  // --- Exports -------------------------------------------------------------

  const handlePdfExport = async () => {
    try {
      const [areaImg, barImg] = await Promise.all([
        ApexCharts.exec('daily-sales-area', 'dataURI'),
        ApexCharts.exec('daily-sales-bar',  'dataURI'),
      ]);
      const toBlob = async (dataURI) => (await fetch(dataURI)).blob();
      const formData = new FormData();
      formData.append('date_from', executedFilters.dateFrom);
      formData.append('date_to',   executedFilters.dateTo);
      formData.append('branch',    executedBranchValues.length ? executedBranchValues.join(',') : 'all');
      formData.append('view_mode', viewMode);
      if (areaImg?.imgURI) formData.append('chart_area', await toBlob(areaImg.imgURI), 'chart_area.png');
      if (barImg?.imgURI)  formData.append('chart_bar',  await toBlob(barImg.imgURI),  'chart_bar.png');
      const { data: blob } = await apiClient.post('/reports/daily-sales/pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      });
      return URL.createObjectURL(blob);
    } catch {
      toast.error('No se pudo generar el PDF. Verifique que el servicio Gotenberg esté activo.');
      throw new Error('pdf_failed');
    }
  };

  const buildExportData = () => {
    const methodCodes = allMethods.map((m) => m.code);
    const methodNames = allMethods.map((m) => m.name);
    let headers = ['Fecha', 'Día', 'Transacciones', `Total ${CURRENCY_LABEL}`, `Ticket prom. ${CURRENCY_LABEL}`, ...methodNames.map((name) => `${name} ${CURRENCY_LABEL}`), 'Anulaciones'];
    let data = rows.map((r) => [
      fmt(r.iso),
      new Date(`${r.iso}T00:00:00`).toLocaleDateString('es-CL', { weekday: 'long' }),
      r.txn, r.total, r.avg_ticket,
      ...methodCodes.map((code) => Math.round((r.by_method || []).find((m) => m.code === code)?.amount ?? 0)),
      r.cancelled,
    ]);
    if (viewMode === 'detail') {
      headers = ['Fecha', 'Folio', 'Estado', 'Cliente', 'Sucursal', 'Medio de pago', `Total ${CURRENCY_LABEL}`];
      data = detailRows.map((r) => [
        fmtDT(r.created_at),
        r.folio,
        statusLabel(r.status),
        r.customer_name,
        r.warehouse_name,
        r.payment_method_name,
        r.total_amount,
      ]);
    } else {
      const methodTotals = methodCodes.map((code) =>
        rows.reduce((sum, r) => sum + Math.round((r.by_method || []).find((m) => m.code === code)?.amount ?? 0), 0)
      );
      data.push(['TOTAL', '', totals.txn, totals.total, avgTicketTotal, ...methodTotals, totals.cancelled]);
    }
    return { headers, data };
  };

  const buildExportMetadata = () => {
    return [
      ['Reporte', 'Ventas diarias'],
      ['Periodo', `${fmt(executedFilters.dateFrom)} - ${fmt(executedFilters.dateTo)}`],
      ['Sucursal', selectedBranchLabels(executedBranchValues)],
      ['Moneda', CURRENCY_LABEL],
      ['Vista', viewMode === 'detail' ? 'Detalle' : 'Por día'],
      ['Generado el', new Date().toLocaleString('es-CL')],
    ];
  };

  const handleCsvExport  = async () => {
    const { headers, data } = buildExportData();
    return buildCsvBlobUrl(headers, data, { metadataRows: buildExportMetadata() });
  };

  const handleXlsxExport = async () => {
    const { headers, data } = buildExportData();
    return buildXlsxBlobUrl(headers, data, 'Ventas diarias', { metadataRows: buildExportMetadata() });
  };

  const handleViewModeChange = (nextMode) => {
    setViewMode(nextMode);
    if (nextMode === 'grouped') fetchData(filters);
  };

  const bestIso = bestDay?.iso;

  // -------------------------------------------------------------------------

  return (
    <>
    <ReportLayout
      // Header
      title="Ventas diarias"
      description={`${fmt(executedFilters.dateFrom)} — ${fmt(executedFilters.dateTo)} · ${rows.length} días`}
      actions={[
        { id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate(pathname) },
      ]}

      // Filtros — Sucursal | shortcuts | DatePicker
      filterBar={
        <>
          <div className="w-full shrink-0 sm:w-72 lg:w-80">
            <AutocompleteSelect
              value={selectedBranchValues}
              onChange={setSelectedBranches}
              options={branchOptions}
              placeholder="Todas las sucursales"
              clearable={false}
              multiple
              maxVisibleTags={3}
              buttonClassName="h-10 shadow-none"
            />
          </div>
          <div className="flex overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPeriod(p.id)}
                className={`h-10 px-3 text-sm whitespace-nowrap transition-colors ${
                  filters.period === p.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <DateRangePicker
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            maxDays={365}
            onChange={({ from, to }) => setFilters((f) => ({ ...f, period: 'custom', dateFrom: from, dateTo: to }))}
          />
        </>
      }

      viewMode={viewMode}
      onViewModeChange={handleViewModeChange}
      viewModeOptions={[{ id: 'detail', label: 'Detalle' }, { id: 'grouped', label: 'Por día' }]}
      onRunReport={() => fetchData(filters)}
      runReportLoading={loading}

      filterBarActions={
        isFiltered ? (
          <button
            type="button"
            onClick={clearFilters}
            className="flex h-10 items-center gap-1.5 rounded-md px-3 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        ) : null
      }

      // KPIs
      kpiItems={KPI_ITEMS}

      // Gráficos
      charts={[
        {
          title:   'Evolución de ventas por día',
          icon:    BarChart3,
          content: (
            <ReactApexChart
              options={areaOptions}
              series={chartSeries}
              type="area"
              height={240}
              key={`daily-area-${executedBranchValues.join('-')}-${executedFilters.dateFrom}-${executedFilters.dateTo}`}
            />
          ),
        },
        {
          title:    'Desglose por método de pago',
          subtitle: allMethods.map((m) => m.name).join(' · ') || 'Sin datos',
          icon:     BarChart2,
          content:  (
            <ReactApexChart
              options={barOptions}
              series={barSeries}
              type="bar"
              height={240}
              key={`daily-bar-${executedBranchValues.join('-')}-${executedFilters.dateFrom}-${executedFilters.dateTo}`}
            />
          ),
        },
      ]}

      // Tabla
      tableTitle={viewMode === 'detail' ? 'Detalle de ventas' : 'Resumen por día'}
      tableSubtitle={loading ? 'Cargando…' : viewMode === 'detail'
        ? `${detailRows.length} registro${detailRows.length === 1 ? '' : 's'}`
        : `${rows.length} día${rows.length === 1 ? '' : 's'}`}
      tableIcon={BarChart3}
      onExportCsv={handleCsvExport}
      csvFilename={`ventas-diarias_${executedFilters.dateFrom}_${executedFilters.dateTo}.csv`}
      onExportExcel={handleXlsxExport}
      excelFilename={`ventas-diarias_${executedFilters.dateFrom}_${executedFilters.dateTo}.xlsx`}
      tableFooter={viewMode === 'grouped' ? (
        <div className="grid grid-cols-5 gap-4 text-right text-sm">
          <span className="col-span-2 text-left font-semibold text-slate-700 dark:text-slate-200">Total período</span>
          <span className="font-bold tabular-nums">{totals.txn}</span>
          <span className="font-bold tabular-nums">{money(totals.total)}</span>
          <span className="font-bold tabular-nums text-red-500 dark:text-red-400">{totals.cancelled}</span>
        </div>
      ) : null}

      // PDF
      onExportPdf={handlePdfExport}
      exportDescription={`${fmt(executedFilters.dateFrom)} — ${fmt(executedFilters.dateTo)} · ${rows.length} días`}
      pdfFilename={`ventas-diarias_${executedFilters.dateFrom}_${executedFilters.dateTo}.pdf`}
    >

      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">Cargando datos…</div>
        ) : (viewMode === 'detail' ? detailRows.length === 0 : rows.length === 0) ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">Sin ventas en el período seleccionado</div>
        ) : viewMode === 'detail' ? (
          /* ── Detalle: una fila por documento ── */
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Documento</Th>
                <Th>Fecha</Th>
                <Th>Cliente</Th>
                <Th>Sucursal</Th>
                <Th>Medio de pago</Th>
                <Th right>Total</Th>
                <Th right>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {detailRows.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <p className="font-semibold text-slate-900 dark:text-white">{r.folio}</p>
                    <p className={`text-xs ${r.status === 'CANCELLED' ? 'text-red-500 dark:text-red-400' : 'text-slate-400'}`}>
                      {statusLabel(r.status)}
                    </p>
                  </Td>
                  <Td muted><span className="text-xs">{fmtDT(r.created_at)}</span></Td>
                  <Td>{r.customer_name}</Td>
                  <Td>{r.warehouse_name}</Td>
                  <Td muted>{r.payment_method_name || '-'}</Td>
                  <Td right bold>{Number(r.total_amount || 0) > 0 ? money(r.total_amount) : <span className="text-slate-300 dark:text-slate-600">—</span>}</Td>
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
        ) : (
          /* ── Por día: vista compacta con totales ── */
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Fecha</Th>
                <Th right>Txn</Th>
                <Th right>Total</Th>
                <Th right>Ticket prom.</Th>
                <Th right>Anuladas</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {rows.map((r) => {
                const isBest = r.iso === bestIso;
                return (
                  <tr key={r.iso} className={isBest ? 'bg-emerald-50/60 dark:bg-emerald-950/10' : ''}>
                    <Td>
                      <div className="flex items-center gap-2">
                        {isBest && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" title="Mejor día" />}
                        <div>
                          <p className="text-sm font-medium">{fmt(r.iso)}</p>
                          <p className="text-xs text-slate-400">{new Date(`${r.iso}T00:00:00`).toLocaleDateString('es-CL', { weekday: 'long' })}</p>
                        </div>
                      </div>
                    </Td>
                    <Td right muted>{r.txn}</Td>
                    <Td right bold>{money(r.total)}</Td>
                    <Td right muted>{money(r.avg_ticket)}</Td>
                    <Td right className={r.cancelled > 0 ? 'text-red-500 dark:text-red-400' : ''}>{r.cancelled}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </ReportLayout>
    {detailSaleCode && (
      <SaleDetailModal
        saleCode={detailSaleCode}
        onClose={() => setDetailSaleCode(null)}
      />
    )}
    </>
  );
};

export default DailySales;
