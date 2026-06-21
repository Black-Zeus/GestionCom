import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ApexCharts from 'apexcharts';
import ReactApexChart from 'react-apexcharts';
import { ArrowLeft, BarChart2, BarChart3, X } from 'lucide-react';
import ReportLayout from '@/components/common/navigation/ReportLayout';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import DateRangePicker from '@/components/common/forms/DateRangePicker';
import { toast } from '@/services/ui/notify';
import apiClient from '@/services/api/apiClient';
import { buildCsvBlobUrl, buildXlsxBlobUrl } from '@/utils/exportFile';

const money   = (v) => Number(v).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const toISO   = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmt     = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDay  = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: '2-digit' });

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

const periodFrom = (days) => toISO(addDays(new Date(), -(days - 1)));

// --- Table helpers -------------------------------------------------------

const Th = ({ children, right, center }) => (
  <th className={`pb-2 px-3 first:pl-0 last:pr-0 text-xs font-medium uppercase text-slate-400 ${right ? 'text-right' : center ? 'text-center' : 'text-left'}`}>{children}</th>
);
const Td = ({ children, right, center, muted, bold, className: cls = '' }) => (
  <td className={`py-2.5 px-3 first:pl-0 last:pr-0 text-sm ${right ? 'text-right tabular-nums' : center ? 'text-center' : ''} ${muted ? 'text-slate-400' : ''} ${bold ? 'font-semibold' : ''} ${cls}`}>
    {children}
  </td>
);

// --- Main ----------------------------------------------------------------

const defaultFilters = () => ({
  sucursal: 'all', period: '30d',
  dateFrom: toISO(addDays(new Date(), -29)), dateTo: toISO(new Date()),
});

const DailySales = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDark = document.documentElement.classList.contains('dark');

  const [filters, setFilters]           = useState(defaultFilters);
  const [rows, setRows]                 = useState([]);
  const [branchOptions, setBranchOptions] = useState([{ value: 'all', label: 'Todas las sucursales' }]);
  const [loading, setLoading]           = useState(false);

  const set = (key, val) => setFilters((f) => ({ ...f, [key]: val }));

  const applyPeriod = (id) => {
    const p = PERIODS.find((x) => x.id === id);
    if (p) setFilters((f) => ({ ...f, period: id, dateFrom: p.getFrom ? p.getFrom() : periodFrom(p.days), dateTo: toISO(new Date()) }));
  };

  const clearFilters = () => setFilters(defaultFilters());
  const isFiltered   = filters.sucursal !== 'all' || filters.period !== '30d';

  // Fetch data from API whenever filters change
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { date_from: filters.dateFrom, date_to: filters.dateTo };
      if (filters.sucursal !== 'all') params.warehouse_id = filters.sucursal;

      const { data } = await apiClient.get('/reports/daily-sales/data', { params });

      setRows(data.rows || []);
      setBranchOptions([
        { value: 'all', label: 'Todas las sucursales' },
        ...(data.warehouses || []),
      ]);
    } catch {
      toast.error('Error cargando datos del reporte');
    } finally {
      setLoading(false);
    }
  }, [filters.dateFrom, filters.dateTo, filters.sucursal]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
    if (filters.sucursal !== 'all' || uniqueBranches.length <= 1) {
      return [{
        name: filters.sucursal !== 'all'
          ? (branchOptions.find((o) => o.value === filters.sucursal)?.label ?? 'Sucursal')
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
  }, [rows, uniqueBranches, filters.sucursal, branchOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bar chart series (dynamic payment methods)
  const barSeries = useMemo(() =>
    allMethods.map((m) => ({
      name: m.name,
      data: rows.map((r) => Math.round((r.by_method || []).find((x) => x.code === m.code)?.amount ?? 0)),
    }))
  , [rows, allMethods]); // eslint-disable-line react-hooks/exhaustive-deps

  const areaOptions = useMemo(() => ({
    chart: {
      id: 'daily-sales-area',
      type: 'area', stacked: false, background: 'transparent', fontFamily: 'inherit',
      toolbar: {
        show: true,
        tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false },
        export: {
          png: { filename: `ventas-diarias_${filters.dateFrom}_${filters.dateTo}` },
          csv: { filename: `ventas-diarias_${filters.dateFrom}_${filters.dateTo}` },
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
  }), [chartLabels, rows.length, isDark, uniqueBranches.length, filters.dateFrom, filters.dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const barOptions = useMemo(() => ({
    chart: {
      id: 'daily-sales-bar',
      type: 'bar', stacked: true, background: 'transparent', fontFamily: 'inherit',
      toolbar: {
        show: true,
        tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false },
        export: {
          png: { filename: `metodos-pago_${filters.dateFrom}_${filters.dateTo}` },
          csv: { filename: `metodos-pago_${filters.dateFrom}_${filters.dateTo}` },
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
  }), [chartLabels, rows.length, isDark, filters.dateFrom, filters.dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

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
      formData.append('date_from', filters.dateFrom);
      formData.append('date_to',   filters.dateTo);
      formData.append('branch',    filters.sucursal);
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
    const headers = ['Fecha', 'Día', 'Transacciones', 'Total (CLP)', 'Ticket prom. (CLP)', ...methodNames, 'Anulaciones'];
    const data = rows.map((r) => [
      fmt(r.iso),
      new Date(`${r.iso}T00:00:00`).toLocaleDateString('es-CL', { weekday: 'long' }),
      r.txn, r.total, r.avg_ticket,
      ...methodCodes.map((code) => Math.round((r.by_method || []).find((m) => m.code === code)?.amount ?? 0)),
      r.cancelled,
    ]);
    const methodTotals = methodCodes.map((code) =>
      rows.reduce((sum, r) => sum + Math.round((r.by_method || []).find((m) => m.code === code)?.amount ?? 0), 0)
    );
    data.push(['TOTAL', '', totals.txn, totals.total, avgTicketTotal, ...methodTotals, totals.cancelled]);
    return { headers, data };
  };

  const handleCsvExport  = async () => { const { headers, data } = buildExportData(); return buildCsvBlobUrl(headers, data); };
  const handleXlsxExport = async () => { const { headers, data } = buildExportData(); return buildXlsxBlobUrl(headers, data, 'Ventas diarias'); };

  const bestIso = bestDay?.iso;

  // -------------------------------------------------------------------------

  return (
    <ReportLayout
      // Header
      title="Ventas diarias"
      description={`${fmt(filters.dateFrom)} — ${fmt(filters.dateTo)} · ${rows.length} días`}
      actions={[
        { id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate(pathname) },
      ]}

      // Filtros
      filterBar={
        <>
          <div className="w-52 shrink-0">
            <AutocompleteSelect
              value={filters.sucursal}
              onChange={(v) => set('sucursal', v || 'all')}
              options={branchOptions}
              placeholder="Todas las sucursales"
              clearable={false}
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
          {isFiltered && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex h-10 items-center gap-1.5 rounded-md px-3 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-3.5 w-3.5" /> Limpiar
            </button>
          )}
        </>
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
              key={`daily-area-${filters.sucursal}-${filters.dateFrom}-${filters.dateTo}`}
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
              key={`daily-bar-${filters.sucursal}-${filters.dateFrom}-${filters.dateTo}`}
            />
          ),
        },
      ]}

      // Tabla
      tableTitle="Detalle por día"
      tableSubtitle={loading ? 'Cargando…' : `${rows.length} días`}
      tableIcon={BarChart3}
      onExportCsv={handleCsvExport}
      csvFilename={`ventas-diarias_${filters.dateFrom}_${filters.dateTo}.csv`}
      onExportExcel={handleXlsxExport}
      excelFilename={`ventas-diarias_${filters.dateFrom}_${filters.dateTo}.xlsx`}
      tableFooter={
        <div className="grid grid-cols-5 gap-4 text-right text-sm">
          <span className="col-span-2 text-left font-semibold text-slate-700 dark:text-slate-200">Total período</span>
          <span className="font-bold tabular-nums">{totals.txn}</span>
          <span className="font-bold tabular-nums">{money(totals.total)}</span>
          <span className="font-bold tabular-nums text-red-500 dark:text-red-400">{totals.cancelled}</span>
        </div>
      }

      // PDF
      onExportPdf={handlePdfExport}
      pdfDescription={`${fmt(filters.dateFrom)} — ${fmt(filters.dateTo)} · ${rows.length} días`}
      pdfFilename={`ventas-diarias_${filters.dateFrom}_${filters.dateTo}.pdf`}
    >

      {/* Tabla detalle */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">
            Cargando datos…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">
            Sin ventas en el período seleccionado
          </div>
        ) : (
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
                    <Td right bold>{r.total > 0 ? money(r.total) : <span className="text-slate-300 dark:text-slate-600">—</span>}</Td>
                    <Td right muted>{r.avg_ticket > 0 ? money(r.avg_ticket) : <span className="text-slate-300 dark:text-slate-600">—</span>}</Td>
                    <Td right>
                      {r.cancelled > 0
                        ? <span className="text-red-500 dark:text-red-400">{r.cancelled}</span>
                        : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </ReportLayout>
  );
};

export default DailySales;
