/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ApexCharts from 'apexcharts';
import ReactApexChart from 'react-apexcharts';
import { ArrowLeft, ReceiptText, X } from 'lucide-react';
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

const getMondayISO = () => {
  const today = new Date();
  const diff = today.getDay() === 0 ? 6 : today.getDay() - 1;
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
    label: location?.warehouse_name || location?.label || location?.name || `Sucursal ${value}`,
  };
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
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'APPROVED', label: 'Aprobado' },
  { value: 'REJECTED', label: 'Rechazado' },
];
const STATUS_LABELS = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
};

const ALL_WAREHOUSE_VALUE = '__all__';
const ALL_CATEGORY_VALUE = 'all';
const CURRENCY_LABEL = 'Peso chileno (CLP)';
const CHART_ID = 'petty-cash-detail-daily';

const defaultFilters = (warehouseValue = '') => ({
  dateFrom: getMondayISO(),
  dateTo: toISO(new Date()),
  period: 'week',
  warehouseId: warehouseValue ? [warehouseValue] : [],
  categoryId: ALL_CATEGORY_VALUE,
  status: 'all',
});

const Th = ({ children, right }) => (
  <th className={`pb-2 px-3 first:pl-0 last:pr-0 text-xs font-medium uppercase text-slate-400 ${right ? 'text-right' : 'text-left'}`}>
    {children}
  </th>
);

const Td = ({ children, right, muted, bold, className = '' }) => (
  <td className={`py-2.5 px-3 first:pl-0 last:pr-0 text-sm ${right ? 'text-right tabular-nums' : ''} ${muted ? 'text-slate-400' : ''} ${bold ? 'font-semibold' : ''} ${className}`}>
    {children}
  </td>
);

const PettyCashDetail = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDark = document.documentElement.classList.contains('dark');

  const activeLocationRecord = useSessionStore((state) => state.getActiveLocation());
  const locations = useSessionStore((state) => state.locations);
  const activeWarehouse = useMemo(() => activeWarehouseValue(activeLocationRecord), [activeLocationRecord]);

  const [filters, setFilters] = useState(() => defaultFilters(activeWarehouse));
  const [executedFilters, setExecutedFilters] = useState(() => defaultFilters(activeWarehouse));
  const [detailRows, setDetailRows] = useState([]);
  const [dailyRows, setDailyRows] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([{ value: ALL_CATEGORY_VALUE, label: 'Todas las categorías' }]);
  const [totals, setTotals] = useState({ total: 0, count: 0, approved: 0, pending: 0, rejected: 0, with_receipt: 0, categories: 0 });
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('detail');

  const set = (key, val) => setFilters((current) => ({ ...current, [key]: val }));
  const applyPeriod = (id) => {
    const period = PERIODS.find((item) => item.id === id);
    if (!period) return;
    setFilters((current) => ({
      ...current,
      period: id,
      dateFrom: period.getFrom ? period.getFrom() : periodFrom(period.days),
      dateTo: toISO(new Date()),
    }));
  };

  const realBranchOptions = useMemo(() => locations.map(locationOption).filter(Boolean), [locations]);
  const branchOptions = useMemo(() => [{ value: ALL_WAREHOUSE_VALUE, label: 'Todas las sucursales' }, ...realBranchOptions], [realBranchOptions]);
  const allBranchValues = useMemo(() => realBranchOptions.map((option) => String(option.value)), [realBranchOptions]);
  const selectedBranchValues = useMemo(() => (Array.isArray(filters.warehouseId) ? filters.warehouseId : []), [filters.warehouseId]);
  const executedBranchValues = useMemo(() => (Array.isArray(executedFilters.warehouseId) ? executedFilters.warehouseId : []), [executedFilters.warehouseId]);
  const defaultBranchValues = useMemo(
    () => (activeWarehouse && allBranchValues.includes(activeWarehouse) ? [activeWarehouse] : []),
    [activeWarehouse, allBranchValues],
  );

  const setSelectedBranches = (values = []) => {
    const next = values.map(String);
    set('warehouseId', next.includes(ALL_WAREHOUSE_VALUE) ? allBranchValues : next);
  };

  const branchLabel = (values) => {
    const selected = new Set((values || []).map(String));
    const labels = realBranchOptions.filter((option) => selected.has(String(option.value))).map((option) => option.label);
    return labels.length ? labels.join(', ') : 'Todas las sucursales';
  };

  const categoryLabel = (value) => {
    if (!value || value === ALL_CATEGORY_VALUE) return 'Todas las categorías';
    return categoryOptions.find((option) => String(option.value) === String(value))?.label || 'Categoría seleccionada';
  };

  const statusLabel = (value) => STATUS_OPTIONS.find((option) => option.value === value)?.label || 'Todos los estados';

  const clearFilters = () => setFilters({
    ...defaultFilters(activeWarehouse),
    warehouseId: defaultBranchValues.length ? defaultBranchValues : [],
  });

  const isFiltered = filters.period !== 'week'
    || (allBranchValues.length > 0 && selectedBranchValues.join(',') !== defaultBranchValues.join(','))
    || filters.categoryId !== ALL_CATEGORY_VALUE
    || filters.status !== 'all';

  const fetchData = useCallback(async (nextFilters = filters) => {
    setLoading(true);
    try {
      const branches = Array.isArray(nextFilters.warehouseId) ? nextFilters.warehouseId : [];
      const params = {
        date_from: nextFilters.dateFrom,
        date_to: nextFilters.dateTo,
        status: nextFilters.status,
      };
      if (branches.length) params.warehouse_ids = branches.join(',');
      if (nextFilters.categoryId !== ALL_CATEGORY_VALUE) params.category_id = nextFilters.categoryId;

      const { data } = await apiClient.get('/reports/petty-cash/detail/data', { params });
      const validBranches = branches.filter((value) => allBranchValues.includes(String(value)));
      const fallback = activeWarehouse && allBranchValues.includes(activeWarehouse) ? [activeWarehouse] : [];
      setDetailRows(data.detail_rows || []);
      setDailyRows(data.rows || []);
      setTotals(data.totals || {});
      setCategoryOptions([
        { value: ALL_CATEGORY_VALUE, label: 'Todas las categorías' },
        ...(data.category_options || []).map((item) => ({ value: String(item.id), label: item.name })),
      ]);
      setExecutedFilters({ ...nextFilters, warehouseId: validBranches.length ? validBranches : fallback });
    } catch {
      toast.error('Error cargando datos del reporte');
    } finally {
      setLoading(false);
    }
  }, [activeWarehouse, allBranchValues, filters]);

  useEffect(() => { fetchData(defaultFilters(activeWarehouse)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const chartSeries = [{ name: 'Gastos', data: dailyRows.map((row) => Math.round(row.total)) }];
  const chartOptions = useMemo(() => ({
    chart: {
      id: CHART_ID,
      type: 'bar',
      background: 'transparent',
      fontFamily: 'inherit',
      toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } },
    },
    plotOptions: { bar: { borderRadius: 3, columnWidth: '55%' } },
    colors: ['#f59e0b'],
    dataLabels: { enabled: false },
    xaxis: {
      categories: dailyRows.map((row) => fmt(row.iso)),
      labels: { style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (value) => `$${(value / 1000).toFixed(0)}K`,
        style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' },
      },
    },
    grid: { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (value) => money(value) } },
    theme: { mode: isDark ? 'dark' : 'light' },
  }), [dailyRows, isDark]);

  const topDay = [...dailyRows].sort((left, right) => Number(right.total || 0) - Number(left.total || 0))[0];
  const avgExpense = Number(totals.count || 0) > 0 ? Math.round(Number(totals.total || 0) / Number(totals.count || 1)) : 0;

  const kpiItems = [
    { id: 'total', label: 'Total período', value: money(totals.total), hint: `${fmt(executedFilters.dateFrom)} — ${fmt(executedFilters.dateTo)}` },
    { id: 'count', label: 'Gastos registrados', value: Number(totals.count || 0).toLocaleString('es-CL'), hint: 'movimientos de caja chica' },
    { id: 'avg', label: 'Gasto promedio', value: money(avgExpense), hint: 'por registro' },
    { id: 'approved', label: 'Aprobados', value: Number(totals.approved || 0).toLocaleString('es-CL'), hint: `${Number(totals.pending || 0)} pendientes · ${Number(totals.rejected || 0)} rechazados` },
    { id: 'receipt', label: 'Con comprobante', value: Number(totals.with_receipt || 0).toLocaleString('es-CL'), hint: 'gastos con evidencia' },
    { id: 'top-day', label: 'Día más alto', value: topDay?.iso ? fmt(topDay.iso) : '—', hint: topDay ? money(topDay.total) : '' },
  ];

  const buildExportMetadata = () => [
    ['Reporte', 'Caja chica - detalle'],
    ['Periodo', `${fmt(executedFilters.dateFrom)} - ${fmt(executedFilters.dateTo)}`],
    ['Locación', branchLabel(executedBranchValues)],
    ['Categoría', categoryLabel(executedFilters.categoryId)],
    ['Estado', statusLabel(executedFilters.status)],
    ['Moneda', CURRENCY_LABEL],
    ['Vista', viewMode === 'detail' ? 'Detalle' : 'Por día'],
    ['Generado el', new Date().toLocaleString('es-CL')],
  ];

  const buildExportData = () => {
    if (viewMode === 'detail') {
      return {
        headers: ['Fecha', 'Código', 'Sucursal', 'Fondo', 'Categoría', 'Comercio', 'Responsable', 'Estado', 'Comprobante', `Monto ${CURRENCY_LABEL}`, 'Descripción'],
        data: detailRows.map((row) => [
          row.expense_date,
          row.expense_code,
          row.warehouse_name,
          row.fund_code,
          row.category_name,
          row.vendor_name || '',
          row.responsible_name || '',
          STATUS_LABELS[row.expense_status] || row.expense_status,
          row.has_receipt ? 'Sí' : 'No',
          row.expense_amount,
          row.expense_description,
        ]),
      };
    }
    return {
      headers: ['Fecha', 'Gastos', `Total ${CURRENCY_LABEL}`, 'Pendientes', 'Aprobados', 'Rechazados', 'Con comprobante'],
      data: dailyRows.map((row) => [row.iso, row.count, row.total, row.pending, row.approved, row.rejected, row.with_receipt]),
    };
  };

  const handleCsvExport = async () => {
    const { headers, data } = buildExportData();
    return buildCsvBlobUrl(headers, data, { metadataRows: buildExportMetadata() });
  };

  const handleXlsxExport = async () => {
    const { headers, data } = buildExportData();
    return buildXlsxBlobUrl(headers, data, 'Caja chica detalle', { metadataRows: buildExportMetadata() });
  };

  const handlePdfExport = async () => {
    try {
      const chartImg = await ApexCharts.exec(CHART_ID, 'dataURI');
      const formData = new FormData();
      formData.append('date_from', executedFilters.dateFrom);
      formData.append('date_to', executedFilters.dateTo);
      formData.append('warehouse_id', executedBranchValues.length ? executedBranchValues.join(',') : 'all');
      formData.append('category_id', executedFilters.categoryId || ALL_CATEGORY_VALUE);
      formData.append('status', executedFilters.status || 'all');
      formData.append('view_mode', viewMode);
      if (chartImg?.imgURI) {
        const blob = await (await fetch(chartImg.imgURI)).blob();
        formData.append('chart_bar', blob, 'chart_bar.png');
      }
      const { data: pdfBlob } = await apiClient.post('/reports/petty-cash/detail/pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      });
      return URL.createObjectURL(pdfBlob);
    } catch {
      toast.error('No se pudo generar el PDF. Verifique que el servicio Gotenberg esté activo.');
      throw new Error('pdf_failed');
    }
  };

  return (
    <ReportLayout
      title="Caja chica - detalle"
      description={`${fmt(executedFilters.dateFrom)} — ${fmt(executedFilters.dateTo)} · ${Number(totals.count || 0).toLocaleString('es-CL')} gastos`}
      actions={[
        { id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate(pathname) },
      ]}
      filterBar={(
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
            {PERIODS.map((period) => (
              <button
                key={period.id}
                type="button"
                onClick={() => applyPeriod(period.id)}
                className={`h-10 px-3 text-sm whitespace-nowrap transition-colors ${
                  filters.period === period.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
          <DateRangePicker
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            maxDays={365}
            onChange={({ from, to }) => setFilters((current) => ({ ...current, period: 'custom', dateFrom: from, dateTo: to }))}
          />
        </>
      )}
      filterBarActions={isFiltered ? (
        <button
          type="button"
          onClick={clearFilters}
          className="flex h-10 items-center gap-1.5 rounded-md px-3 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-3.5 w-3.5" /> Limpiar
        </button>
      ) : null}
      filterBarTrailing={(
        <>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm text-slate-500">Categoría</span>
            <div className="w-56">
              <AutocompleteSelect
                value={[filters.categoryId]}
                onChange={([value]) => set('categoryId', value || ALL_CATEGORY_VALUE)}
                options={categoryOptions}
                clearable={false}
                buttonClassName="h-10 shadow-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm text-slate-500">Estado</span>
            <div className="w-44">
              <AutocompleteSelect
                value={[filters.status]}
                onChange={([value]) => set('status', value || 'all')}
                options={STATUS_OPTIONS}
                clearable={false}
                buttonClassName="h-10 shadow-none"
              />
            </div>
          </div>
        </>
      )}
      onRunReport={() => fetchData(filters)}
      runReportLoading={loading}
      kpiItems={kpiItems}
      charts={[{
        title: 'Gastos por día',
        subtitle: 'Serie diaria del período ejecutado',
        icon: ReceiptText,
        content: dailyRows.length > 0 ? (
          <ReactApexChart
            options={chartOptions}
            series={chartSeries}
            type="bar"
            height={280}
            key={`petty-cash-${executedFilters.dateFrom}-${executedFilters.dateTo}`}
          />
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">Sin datos para el período seleccionado</div>
        ),
      }]}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      viewModeOptions={[{ id: 'detail', label: 'Detalle' }, { id: 'grouped', label: 'Por día' }]}
      tableTitle={viewMode === 'detail' ? 'Detalle de gastos' : 'Gastos por día'}
      tableSubtitle={loading ? 'Cargando...' : viewMode === 'detail' ? `${detailRows.length} registros` : `${dailyRows.length} días`}
      tableIcon={ReceiptText}
      onExportCsv={handleCsvExport}
      csvFilename={`caja-chica-detalle_${executedFilters.dateFrom}_${executedFilters.dateTo}.csv`}
      onExportExcel={handleXlsxExport}
      excelFilename={`caja-chica-detalle_${executedFilters.dateFrom}_${executedFilters.dateTo}.xlsx`}
      onExportPdf={handlePdfExport}
      pdfFilename={`caja-chica-detalle_${executedFilters.dateFrom}_${executedFilters.dateTo}.pdf`}
      exportDescription={`${fmt(executedFilters.dateFrom)} — ${fmt(executedFilters.dateTo)} · ${statusLabel(executedFilters.status)}`}
      tableFooter={viewMode === 'grouped' && dailyRows.length > 0 ? (
        <div className="grid grid-cols-7 gap-3 text-right text-sm">
          <span className="col-span-2 text-left font-semibold text-slate-700 dark:text-slate-200">Total período</span>
          <span className="font-bold tabular-nums">{Number(totals.count || 0).toLocaleString('es-CL')}</span>
          <span className="font-bold tabular-nums">{money(totals.total)}</span>
          <span className="font-bold tabular-nums">{Number(totals.pending || 0).toLocaleString('es-CL')}</span>
          <span className="font-bold tabular-nums">{Number(totals.approved || 0).toLocaleString('es-CL')}</span>
          <span className="font-bold tabular-nums">{Number(totals.rejected || 0).toLocaleString('es-CL')}</span>
        </div>
      ) : null}
    >
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">Cargando datos...</div>
        ) : viewMode === 'detail' ? (
          detailRows.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-400">Sin gastos en el período seleccionado</div>
          ) : (
            <table className="w-full min-w-[1120px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <Th>Fecha</Th>
                  <Th>Código</Th>
                  <Th>Sucursal</Th>
                  <Th>Categoría</Th>
                  <Th>Comercio</Th>
                  <Th>Responsable</Th>
                  <Th>Estado</Th>
                  <Th>Comprobante</Th>
                  <Th right>Monto</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {detailRows.map((row) => (
                  <tr key={row.expense_code}>
                    <Td muted><span className="text-xs">{row.expense_date}</span></Td>
                    <Td><span className="text-xs font-mono">{row.expense_code}</span></Td>
                    <Td muted><span className="text-xs">{row.warehouse_name}</span></Td>
                    <Td>{row.category_name}</Td>
                    <Td muted>{row.vendor_name || '-'}</Td>
                    <Td muted><span className="text-xs">{row.responsible_name || '-'}</span></Td>
                    <Td>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {STATUS_LABELS[row.expense_status] || row.expense_status}
                      </span>
                    </Td>
                    <Td muted>{row.has_receipt ? 'Sí' : 'No'}</Td>
                    <Td right bold>{money(row.expense_amount)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : dailyRows.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">Sin gastos en el período seleccionado</div>
        ) : (
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Fecha</Th>
                <Th right>Gastos</Th>
                <Th right>Total</Th>
                <Th right>Pendientes</Th>
                <Th right>Aprobados</Th>
                <Th right>Rechazados</Th>
                <Th right>Con comprobante</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {dailyRows.map((row) => (
                <tr key={row.iso}>
                  <Td>{fmt(row.iso)}</Td>
                  <Td right muted>{Number(row.count || 0).toLocaleString('es-CL')}</Td>
                  <Td right bold>{money(row.total)}</Td>
                  <Td right muted>{Number(row.pending || 0).toLocaleString('es-CL')}</Td>
                  <Td right muted>{Number(row.approved || 0).toLocaleString('es-CL')}</Td>
                  <Td right muted>{Number(row.rejected || 0).toLocaleString('es-CL')}</Td>
                  <Td right muted>{Number(row.with_receipt || 0).toLocaleString('es-CL')}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ReportLayout>
  );
};

export default PettyCashDetail;
