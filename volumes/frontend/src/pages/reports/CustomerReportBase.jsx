/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ApexCharts from 'apexcharts';
import ReactApexChart from 'react-apexcharts';
import { ArrowLeft, BarChart2, X } from 'lucide-react';
import ReportLayout from '@/components/common/navigation/ReportLayout';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import DateRangePicker from '@/components/common/forms/DateRangePicker';
import apiClient from '@/services/api/apiClient';
import { toast } from '@/services/ui/notify';
import { useSessionStore } from '@/store/useSessionStore';
import { buildCsvBlobUrl, buildXlsxBlobUrl } from '@/utils/exportFile';

const money = (value) => Number(value || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const toISO = (date) => date.toISOString().slice(0, 10);
const addDays = (date, days) => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };
const fmt = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
const getMondayISO = () => { const today = new Date(); const diff = today.getDay() === 0 ? 6 : today.getDay() - 1; return toISO(addDays(today, -diff)); };
const periodFrom = (days) => toISO(addDays(new Date(), -(days - 1)));
const pct = (value) => `${Number(value || 0).toFixed(1)}%`;
const boolLabel = (value) => (value ? 'Sí' : 'No');

const activeWarehouseValue = (location) => {
  const value = location?.warehouse_id ?? location?.id;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? String(numeric) : '';
};
const locationOption = (location) => {
  const value = activeWarehouseValue(location);
  return value ? { value, label: location?.warehouse_name || location?.label || location?.name || `Sucursal ${value}` } : null;
};

const PERIODS = [
  { id: 'today', label: 'Hoy', days: 1 },
  { id: 'week', label: 'Esta semana', getFrom: getMondayISO },
  { id: '7d', label: '7 días', days: 7 },
  { id: '15d', label: '15 días', days: 15 },
  { id: '30d', label: '30 días', days: 30 },
  { id: '60d', label: '60 días', days: 60 },
  { id: '90d', label: '90 días', days: 90 },
];

const ALL_WAREHOUSE_VALUE = '__all__';
const CURRENCY_LABEL = 'Peso chileno (CLP)';
const ALL_VALUE = 'all';

const defaultFilters = (warehouseValue = '') => ({
  dateFrom: getMondayISO(),
  dateTo: toISO(new Date()),
  period: 'week',
  warehouseId: warehouseValue ? [warehouseValue] : [],
  riskLevel: ALL_VALUE,
  methodId: ALL_VALUE,
  active: ALL_VALUE,
  groupBy: 'region',
});

const Th = ({ children, right }) => <th className={`pb-2 px-3 first:pl-0 last:pr-0 text-xs font-medium uppercase text-slate-400 ${right ? 'text-right' : 'text-left'}`}>{children}</th>;
const Td = ({ children, right, muted, bold }) => <td className={`py-2.5 px-3 first:pl-0 last:pr-0 text-sm ${right ? 'text-right tabular-nums' : ''} ${muted ? 'text-slate-400' : ''} ${bold ? 'font-semibold' : ''}`}>{children}</td>;

const valueFor = (row, column) => {
  const [key,, type] = column;
  const value = row?.[key];
  if (type === 'money') return money(value);
  if (type === 'pct') return pct(value);
  if (type === 'bool') return boolLabel(value);
  if (type === 'number') return Number(value || 0).toLocaleString('es-CL');
  return value || '—';
};

const CustomerReportBase = ({ config }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDark = document.documentElement.classList.contains('dark');
  const activeLocationRecord = useSessionStore((state) => state.getActiveLocation());
  const locations = useSessionStore((state) => state.locations);
  const activeWarehouse = useMemo(() => activeWarehouseValue(activeLocationRecord), [activeLocationRecord]);

  const [filters, setFilters] = useState(() => defaultFilters(activeWarehouse));
  const [executedFilters, setExecutedFilters] = useState(() => defaultFilters(activeWarehouse));
  const [rows, setRows] = useState([]);
  const [detailRows, setDetailRows] = useState([]);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('detail');
  const [dynamicOptions, setDynamicOptions] = useState([]);

  const realBranchOptions = useMemo(() => locations.map(locationOption).filter(Boolean), [locations]);
  const branchOptions = useMemo(() => [{ value: ALL_WAREHOUSE_VALUE, label: 'Todas las sucursales' }, ...realBranchOptions], [realBranchOptions]);
  const allBranchValues = useMemo(() => realBranchOptions.map((option) => String(option.value)), [realBranchOptions]);
  const selectedBranchValues = Array.isArray(filters.warehouseId) ? filters.warehouseId : [];
  const executedBranchValues = Array.isArray(executedFilters.warehouseId) ? executedFilters.warehouseId : [];
  const defaultBranchValues = useMemo(() => (activeWarehouse && allBranchValues.includes(activeWarehouse) ? [activeWarehouse] : []), [activeWarehouse, allBranchValues]);

  const branchLabel = (values) => {
    const selected = new Set((values || []).map(String));
    const labels = realBranchOptions.filter((option) => selected.has(String(option.value))).map((option) => option.label);
    return labels.length ? labels.join(', ') : 'Todas las sucursales';
  };
  const setSelectedBranches = (values = []) => {
    const next = values.map(String);
    setFilters((current) => ({ ...current, warehouseId: next.includes(ALL_WAREHOUSE_VALUE) ? allBranchValues : next }));
  };
  const applyPeriod = (id) => {
    const period = PERIODS.find((item) => item.id === id);
    setFilters((current) => ({ ...current, period: id, dateFrom: period.getFrom ? period.getFrom() : periodFrom(period.days), dateTo: toISO(new Date()) }));
  };
  const clearFilters = () => setFilters({ ...defaultFilters(activeWarehouse), warehouseId: defaultBranchValues });

  const specificValue = config.filterKey ? filters[config.filterKey] : ALL_VALUE;
  const isFiltered = filters.period !== 'week'
    || selectedBranchValues.join(',') !== defaultBranchValues.join(',')
    || (config.filterKey && specificValue !== defaultFilters()[config.filterKey]);

  const fetchData = useCallback(async (nextFilters = filters) => {
    setLoading(true);
    try {
      const branches = Array.isArray(nextFilters.warehouseId) ? nextFilters.warehouseId : [];
      const params = { date_from: nextFilters.dateFrom, date_to: nextFilters.dateTo };
      if (branches.length) params.warehouse_ids = branches.join(',');
      if (config.filterKey && nextFilters[config.filterKey] !== ALL_VALUE) params[config.filterParam] = nextFilters[config.filterKey];
      const { data } = await apiClient.get(config.endpoint, { params });
      setRows(data.rows || []);
      setDetailRows(data.detail_rows || []);
      setTotals(data.totals || {});
      if (config.dynamicOptionsKey) {
        const options = (data[config.dynamicOptionsKey] || []).map((item) => ({ value: String(item.id), label: item.method_name || item.name || item.label || String(item.id) }));
        setDynamicOptions([{ value: ALL_VALUE, label: 'Todos los métodos' }, ...options]);
      }
      setExecutedFilters({ ...nextFilters, warehouseId: branches.length ? branches : defaultBranchValues });
    } catch {
      toast.error('Error cargando datos del reporte');
    } finally {
      setLoading(false);
    }
  }, [config, defaultBranchValues, filters]);

  useEffect(() => {
    const initial = defaultFilters(activeWarehouse);
    setFilters(initial);
    setExecutedFilters(initial);
    setRows([]);
    setDetailRows([]);
    setTotals({});
    setViewMode('detail');
    fetchData(initial);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const chartRows = rows.slice(0, 12);
  const chartOptions = useMemo(() => ({
    chart: { id: config.chartId, type: 'bar', background: 'transparent', fontFamily: 'inherit', toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } } },
    plotOptions: { bar: { horizontal: Boolean(config.chart.horizontal), borderRadius: 3, columnWidth: '48%', barHeight: '60%' } },
    colors: [config.color],
    dataLabels: { enabled: false },
    xaxis: { categories: chartRows.map((row) => row[config.chart.labelKey] || 'Sin dato'), labels: { formatter: (value) => (config.chart.money ? `$${(Number(value || 0) / 1000).toFixed(0)}K` : value), style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: isDark ? '#cbd5e1' : '#475569', fontSize: '11px' }, maxWidth: 180 } },
    grid: { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (value) => (config.chart.money ? money(value) : Number(value || 0).toLocaleString('es-CL')) } },
    theme: { mode: isDark ? 'dark' : 'light' },
  }), [chartRows, config, isDark]);
  const chartSeries = [{ name: config.chart.title, data: chartRows.map((row) => Number(row[config.chart.valueKey] || 0)) }];

  const columns = viewMode === 'detail' ? config.detailColumns : config.groupedColumns;
  const currentRows = viewMode === 'detail' ? detailRows : rows;
  const filterOptions = config.dynamicOptionsKey ? dynamicOptions : (config.filterOptions || []);
  const exportMetadata = () => [
    ['Reporte', config.title],
    ['Periodo', `${fmt(executedFilters.dateFrom)} - ${fmt(executedFilters.dateTo)}`],
    ['Locación', branchLabel(executedBranchValues)],
    ['Moneda', CURRENCY_LABEL],
    ['Vista', viewMode === 'detail' ? 'Detalle' : config.groupLabel],
    ['Generado el', new Date().toLocaleString('es-CL')],
  ];
  const exportData = () => ({
    headers: columns.map((column) => column[3] && column[2] === 'money' ? `${column[1]} ${CURRENCY_LABEL}` : column[1]),
    data: currentRows.map((row) => columns.map((column) => valueFor(row, column))),
  });
  const handleCsvExport = async () => { const { headers, data } = exportData(); return buildCsvBlobUrl(headers, data, { metadataRows: exportMetadata() }); };
  const handleXlsxExport = async () => { const { headers, data } = exportData(); return buildXlsxBlobUrl(headers, data, config.xlsxSheet, { metadataRows: exportMetadata() }); };
  const handlePdfExport = async () => {
    const chartImg = await ApexCharts.exec(config.chartId, 'dataURI');
    const formData = new FormData();
    formData.append('date_from', executedFilters.dateFrom);
    formData.append('date_to', executedFilters.dateTo);
    formData.append('warehouse_id', executedBranchValues.length ? executedBranchValues.join(',') : 'all');
    formData.append('view_mode', viewMode);
    if (config.filterPdf) formData.append(config.filterPdf, executedFilters[config.filterKey] || ALL_VALUE);
    if (chartImg?.imgURI) formData.append('chart_bar', await (await fetch(chartImg.imgURI)).blob(), 'chart_bar.png');
    const { data: blob } = await apiClient.post(config.pdfEndpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' }, responseType: 'blob' });
    return URL.createObjectURL(blob);
  };

  const Icon = config.icon;

  return (
    <ReportLayout
      title={config.title}
      description={`${fmt(executedFilters.dateFrom)} - ${fmt(executedFilters.dateTo)} · ${Number(currentRows.length || 0).toLocaleString('es-CL')} registros`}
      actions={[{ id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate(pathname) }]}
      filterBar={<><div className="w-full shrink-0 sm:w-72 lg:w-80"><AutocompleteSelect value={selectedBranchValues} onChange={setSelectedBranches} options={branchOptions} placeholder="Todas las sucursales" clearable={false} multiple maxVisibleTags={3} buttonClassName="h-10 shadow-none" /></div><div className="flex overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">{PERIODS.map((period) => <button key={period.id} type="button" onClick={() => applyPeriod(period.id)} className={`h-10 px-3 text-sm whitespace-nowrap transition-colors ${filters.period === period.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{period.label}</button>)}</div><DateRangePicker dateFrom={filters.dateFrom} dateTo={filters.dateTo} maxDays={365} onChange={({ from, to }) => setFilters((current) => ({ ...current, period: 'custom', dateFrom: from, dateTo: to }))} /></>}
      filterBarActions={isFiltered ? <button type="button" onClick={clearFilters} className="flex h-10 items-center gap-1.5 rounded-md px-3 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-3.5 w-3.5" /> Limpiar</button> : null}
      filterBarTrailing={config.filterKey ? <div className="flex items-center gap-2"><span className="shrink-0 text-sm text-slate-500">{config.filterLabel}</span><div className="w-56"><AutocompleteSelect value={[filters[config.filterKey]]} onChange={([value]) => setFilters((current) => ({ ...current, [config.filterKey]: value || ALL_VALUE }))} options={filterOptions} clearable={false} buttonClassName="h-10 shadow-none" /></div></div> : null}
      onRunReport={() => fetchData(filters)}
      runReportLoading={loading}
      kpiItems={config.kpis(totals, rows)}
      charts={[{ title: config.chart.title, subtitle: config.chart.subtitle, icon: BarChart2, content: rows.length > 0 ? <ReactApexChart options={chartOptions} series={chartSeries} type="bar" height={Math.max(240, Math.min(chartRows.length * 38, 420))} /> : <div className="flex h-40 items-center justify-center text-sm text-slate-400">Sin datos para el período seleccionado</div> }]}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      viewModeOptions={[{ id: 'detail', label: 'Detalle' }, { id: 'grouped', label: config.groupLabel }]}
      tableTitle={viewMode === 'detail' ? config.tableDetail : config.tableGrouped}
      tableSubtitle={loading ? 'Cargando...' : `${currentRows.length} registros`}
      tableIcon={Icon}
      onExportCsv={handleCsvExport}
      onExportExcel={handleXlsxExport}
      onExportPdf={handlePdfExport}
      csvFilename={`${config.csvBase}_${executedFilters.dateFrom}_${executedFilters.dateTo}.csv`}
      excelFilename={`${config.csvBase}_${executedFilters.dateFrom}_${executedFilters.dateTo}.xlsx`}
      pdfFilename={`${config.csvBase}_${executedFilters.dateFrom}_${executedFilters.dateTo}.pdf`}
    >
      <div className="overflow-x-auto">
        {loading ? <div className="flex items-center justify-center py-16 text-sm text-slate-400">Cargando datos...</div> : (
          <table className="w-full min-w-[920px]">
            <thead><tr className="border-b border-slate-100 dark:border-slate-800">{columns.map((column) => <Th key={column[0]} right={column[3]}>{column[1]}</Th>)}</tr></thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {currentRows.length === 0 ? (
                <tr><td colSpan={columns.length} className="py-16 text-center text-sm text-slate-400">Sin datos para el período seleccionado</td></tr>
              ) : currentRows.map((row, index) => (
                <tr key={`${row.id || row.customer_id || row.payment_code || row.sale_code || row.dimension || index}-${index}`}>
                  {columns.map((column) => <Td key={column[0]} right={column[3]} muted={column[0].includes('date') || column[0].includes('tax') || column[0] === 'status_label'} bold={column[2] === 'money'}>{valueFor(row, column)}</Td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ReportLayout>
  );
};

export default CustomerReportBase;
