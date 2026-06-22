/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ApexCharts from 'apexcharts';
import ReactApexChart from 'react-apexcharts';
import { ArrowLeft, BarChart2, WalletCards, X } from 'lucide-react';
import ReportLayout from '@/components/common/navigation/ReportLayout';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import DateRangePicker from '@/components/common/forms/DateRangePicker';
import apiClient from '@/services/api/apiClient';
import { toast } from '@/services/ui/notify';
import { useSessionStore } from '@/store/useSessionStore';
import { buildCsvBlobUrl, buildXlsxBlobUrl } from '@/utils/exportFile';

const money = (v) => Number(v || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const toISO = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmt = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
const getMondayISO = () => { const today = new Date(); const diff = today.getDay() === 0 ? 6 : today.getDay() - 1; return toISO(addDays(today, -diff)); };
const periodFrom = (days) => toISO(addDays(new Date(), -(days - 1)));
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
const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'UNDECLARED', label: 'No declarado' },
  { value: 'DECLARED', label: 'Declarado' },
  { value: 'SUSPENDED', label: 'Suspendido' },
  { value: 'CLOSED', label: 'Cerrado' },
];
const ALL_WAREHOUSE_VALUE = '__all__';
const CURRENCY_LABEL = 'Peso chileno (CLP)';
const CHART_ID = 'petty-cash-funds-chart';
const defaultFilters = (warehouseValue = '') => ({
  dateFrom: getMondayISO(),
  dateTo: toISO(new Date()),
  period: 'week',
  warehouseId: warehouseValue ? [warehouseValue] : [],
  status: 'all',
});
const Th = ({ children, right }) => <th className={`pb-2 px-3 first:pl-0 last:pr-0 text-xs font-medium uppercase text-slate-400 ${right ? 'text-right' : 'text-left'}`}>{children}</th>;
const Td = ({ children, right, muted, bold }) => <td className={`py-2.5 px-3 first:pl-0 last:pr-0 text-sm ${right ? 'text-right tabular-nums' : ''} ${muted ? 'text-slate-400' : ''} ${bold ? 'font-semibold' : ''}`}>{children}</td>;
const statusLabel = (value) => STATUS_OPTIONS.find((item) => item.value === value)?.label || value || 'Sin estado';
const groupByStatus = (items) => Object.values(items.reduce((acc, row) => {
  const key = row.fund_status || 'Sin estado';
  const entry = acc[key] || { fund_status: key, funds: 0, initial_amount: 0, current_balance: 0, total_expenses: 0, total_replenishments: 0 };
  entry.funds += 1;
  entry.initial_amount += Number(row.initial_amount || 0);
  entry.current_balance += Number(row.current_balance || 0);
  entry.total_expenses += Number(row.total_expenses || 0);
  entry.total_replenishments += Number(row.total_replenishments || 0);
  acc[key] = entry;
  return acc;
}, {}));

const PettyCashFundStatus = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDark = document.documentElement.classList.contains('dark');
  const activeLocationRecord = useSessionStore((state) => state.getActiveLocation());
  const locations = useSessionStore((state) => state.locations);
  const activeWarehouse = useMemo(() => activeWarehouseValue(activeLocationRecord), [activeLocationRecord]);
  const [filters, setFilters] = useState(() => defaultFilters(activeWarehouse));
  const [executedFilters, setExecutedFilters] = useState(() => defaultFilters(activeWarehouse));
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('detail');

  const realBranchOptions = useMemo(() => locations.map(locationOption).filter(Boolean), [locations]);
  const branchOptions = useMemo(() => [{ value: ALL_WAREHOUSE_VALUE, label: 'Todas las sucursales' }, ...realBranchOptions], [realBranchOptions]);
  const allBranchValues = useMemo(() => realBranchOptions.map((option) => String(option.value)), [realBranchOptions]);
  const selectedBranchValues = Array.isArray(filters.warehouseId) ? filters.warehouseId : [];
  const executedBranchValues = Array.isArray(executedFilters.warehouseId) ? executedFilters.warehouseId : [];
  const defaultBranchValues = useMemo(() => (activeWarehouse && allBranchValues.includes(activeWarehouse) ? [activeWarehouse] : []), [activeWarehouse, allBranchValues]);
  const groupedRows = useMemo(() => groupByStatus(rows), [rows]);
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
  const isFiltered = filters.period !== 'week' || selectedBranchValues.join(',') !== defaultBranchValues.join(',') || filters.status !== 'all';

  const fetchData = useCallback(async (nextFilters = filters) => {
    setLoading(true);
    try {
      const branches = Array.isArray(nextFilters.warehouseId) ? nextFilters.warehouseId : [];
      const params = { status: nextFilters.status };
      if (branches.length) params.warehouse_ids = branches.join(',');
      const { data } = await apiClient.get('/reports/petty-cash/fund-status/data', { params });
      setRows(data.rows || []);
      setTotals(data.totals || {});
      setExecutedFilters({ ...nextFilters, warehouseId: branches.length ? branches : defaultBranchValues });
    } catch {
      toast.error('Error cargando datos del reporte');
    } finally {
      setLoading(false);
    }
  }, [defaultBranchValues, filters]);
  useEffect(() => { fetchData(defaultFilters(activeWarehouse)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exportMetadata = () => [
    ['Reporte', 'Caja chica - estado de fondos'],
    ['Periodo referencial', `${fmt(executedFilters.dateFrom)} - ${fmt(executedFilters.dateTo)}`],
    ['Locación', branchLabel(executedBranchValues)],
    ['Moneda', CURRENCY_LABEL],
    ['Vista', viewMode === 'detail' ? 'Detalle' : 'Por estado'],
    ['Generado el', new Date().toLocaleString('es-CL')],
  ];
  const chartSeries = [{ name: 'Saldo actual', data: groupedRows.map((row) => Math.round(Number(row.current_balance || 0))) }];
  const chartOptions = useMemo(() => ({
    chart: { id: CHART_ID, type: 'bar', background: 'transparent', fontFamily: 'inherit', toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } } },
    plotOptions: { bar: { borderRadius: 3, columnWidth: '45%' } },
    colors: ['#10b981'],
    dataLabels: { enabled: false },
    xaxis: { categories: groupedRows.map((row) => statusLabel(row.fund_status)), labels: { style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: (value) => `$${(value / 1000).toFixed(0)}K`, style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' } } },
    grid: { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (value) => money(value) } },
    theme: { mode: isDark ? 'dark' : 'light' },
  }), [groupedRows, isDark]);
  const exportData = () => (viewMode === 'detail' ? {
    headers: ['Sucursal', 'Fondo', 'Responsable', 'Estado', `Asignado ${CURRENCY_LABEL}`, `Saldo ${CURRENCY_LABEL}`, `Gastado ${CURRENCY_LABEL}`, `Repuesto ${CURRENCY_LABEL}`, '% usado'],
    data: rows.map((row) => [row.warehouse_name, row.fund_code, row.responsible_name, statusLabel(row.fund_status), row.initial_amount, row.current_balance, row.total_expenses, row.total_replenishments, row.used_pct]),
  } : {
    headers: ['Estado', 'Fondos', `Asignado ${CURRENCY_LABEL}`, `Saldo ${CURRENCY_LABEL}`, `Gastado ${CURRENCY_LABEL}`, `Repuesto ${CURRENCY_LABEL}`],
    data: groupedRows.map((row) => [statusLabel(row.fund_status), row.funds, row.initial_amount, row.current_balance, row.total_expenses, row.total_replenishments]),
  });
  const handleCsvExport = async () => { const { headers, data } = exportData(); return buildCsvBlobUrl(headers, data, { metadataRows: exportMetadata() }); };
  const handleXlsxExport = async () => { const { headers, data } = exportData(); return buildXlsxBlobUrl(headers, data, 'Caja chica fondos', { metadataRows: exportMetadata() }); };
  const handlePdfExport = async () => {
    const chartImg = await ApexCharts.exec(CHART_ID, 'dataURI');
    const formData = new FormData();
    formData.append('date_from', executedFilters.dateFrom);
    formData.append('date_to', executedFilters.dateTo);
    formData.append('warehouse_id', executedBranchValues.length ? executedBranchValues.join(',') : 'all');
    formData.append('status', executedFilters.status || 'all');
    formData.append('view_mode', viewMode);
    if (chartImg?.imgURI) formData.append('chart_bar', await (await fetch(chartImg.imgURI)).blob(), 'chart_bar.png');
    const { data: blob } = await apiClient.post('/reports/petty-cash/fund-status/pdf', formData, { headers: { 'Content-Type': 'multipart/form-data' }, responseType: 'blob' });
    return URL.createObjectURL(blob);
  };

  return (
    <ReportLayout
      title="Caja chica - estado de fondos"
      description={`${Number(totals.funds || 0).toLocaleString('es-CL')} fondos · saldo ${money(totals.current_balance)}`}
      actions={[{ id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate(pathname) }]}
      filterBar={<><div className="w-full shrink-0 sm:w-72 lg:w-80"><AutocompleteSelect value={selectedBranchValues} onChange={setSelectedBranches} options={branchOptions} placeholder="Todas las sucursales" clearable={false} multiple maxVisibleTags={3} buttonClassName="h-10 shadow-none" /></div><div className="flex overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">{PERIODS.map((period) => <button key={period.id} type="button" onClick={() => applyPeriod(period.id)} className={`h-10 px-3 text-sm whitespace-nowrap transition-colors ${filters.period === period.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{period.label}</button>)}</div><DateRangePicker dateFrom={filters.dateFrom} dateTo={filters.dateTo} maxDays={365} onChange={({ from, to }) => setFilters((current) => ({ ...current, period: 'custom', dateFrom: from, dateTo: to }))} /></>}
      filterBarActions={isFiltered ? <button type="button" onClick={clearFilters} className="flex h-10 items-center gap-1.5 rounded-md px-3 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-3.5 w-3.5" /> Limpiar</button> : null}
      filterBarTrailing={<div className="flex items-center gap-2"><span className="shrink-0 text-sm text-slate-500">Estado</span><div className="w-44"><AutocompleteSelect value={[filters.status]} onChange={([value]) => setFilters((current) => ({ ...current, status: value || 'all' }))} options={STATUS_OPTIONS} clearable={false} buttonClassName="h-10 shadow-none" /></div></div>}
      onRunReport={() => fetchData(filters)} runReportLoading={loading}
      kpiItems={[{ id: 'balance', label: 'Saldo actual', value: money(totals.current_balance), hint: 'fondos activos' }, { id: 'initial', label: 'Asignado', value: money(totals.initial_amount), hint: 'monto base' }, { id: 'spent', label: 'Gastos', value: money(totals.total_expenses), hint: `${Number(totals.funds || 0)} fondos` }]}
      charts={[{ title: 'Saldo por estado de fondo', subtitle: 'Saldo actual consolidado', icon: BarChart2, content: groupedRows.length > 0 ? <ReactApexChart options={chartOptions} series={chartSeries} type="bar" height={280} /> : <div className="flex h-40 items-center justify-center text-sm text-slate-400">Sin fondos para los filtros seleccionados</div> }]}
      viewMode={viewMode} onViewModeChange={setViewMode} viewModeOptions={[{ id: 'detail', label: 'Detalle' }, { id: 'grouped', label: 'Por estado' }]}
      tableTitle={viewMode === 'detail' ? 'Fondos de caja chica' : 'Resumen por estado'} tableSubtitle={loading ? 'Cargando...' : `${viewMode === 'detail' ? rows.length : groupedRows.length} registros`} tableIcon={WalletCards}
      onExportCsv={handleCsvExport} onExportExcel={handleXlsxExport} onExportPdf={handlePdfExport}
      csvFilename={`caja-chica-fondos_${executedFilters.dateFrom}_${executedFilters.dateTo}.csv`} excelFilename={`caja-chica-fondos_${executedFilters.dateFrom}_${executedFilters.dateTo}.xlsx`} pdfFilename={`caja-chica-fondos_${executedFilters.dateFrom}_${executedFilters.dateTo}.pdf`}
    >
      <div className="overflow-x-auto">{loading ? <div className="flex items-center justify-center py-16 text-sm text-slate-400">Cargando datos...</div> : (
        <table className="w-full min-w-[900px]"><thead><tr className="border-b border-slate-100 dark:border-slate-800">{viewMode === 'detail' ? <><Th>Sucursal</Th><Th>Fondo</Th><Th>Responsable</Th><Th>Estado</Th><Th right>Asignado</Th><Th right>Saldo</Th><Th right>% usado</Th></> : <><Th>Estado</Th><Th right>Fondos</Th><Th right>Asignado</Th><Th right>Saldo</Th><Th right>Gastos</Th><Th right>Reposiciones</Th></>}</tr></thead><tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">{(viewMode === 'detail' ? rows : groupedRows).map((row) => viewMode === 'detail' ? <tr key={row.id}><Td muted>{row.warehouse_name}</Td><Td>{row.fund_code}</Td><Td muted>{row.responsible_name}</Td><Td>{statusLabel(row.fund_status)}</Td><Td right muted>{money(row.initial_amount)}</Td><Td right bold>{money(row.current_balance)}</Td><Td right muted>{Number(row.used_pct || 0).toLocaleString('es-CL', { maximumFractionDigits: 1 })}%</Td></tr> : <tr key={row.fund_status}><Td>{statusLabel(row.fund_status)}</Td><Td right muted>{row.funds}</Td><Td right muted>{money(row.initial_amount)}</Td><Td right bold>{money(row.current_balance)}</Td><Td right muted>{money(row.total_expenses)}</Td><Td right muted>{money(row.total_replenishments)}</Td></tr>)}</tbody></table>
      )}</div>
    </ReportLayout>
  );
};

export default PettyCashFundStatus;
