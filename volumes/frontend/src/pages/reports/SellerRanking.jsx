/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ApexCharts from 'apexcharts';
import ReactApexChart from 'react-apexcharts';
import { ArrowLeft, Trophy, Eye, X } from 'lucide-react';
import ReportLayout from '@/components/common/navigation/ReportLayout';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import DateRangePicker from '@/components/common/forms/DateRangePicker';
import SaleDetailModal from '@/components/sales/SaleDetailModal';
import apiClient from '@/services/api/apiClient';
import { toast } from '@/services/ui/notify';
import { useSessionStore } from '@/store/useSessionStore';
import { buildCsvBlobUrl, buildXlsxBlobUrl } from '@/utils/exportFile';

// ── Helpers ───────────────────────────────────────────────────────────────────

const money   = (v) => Number(v || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const toISO   = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmt     = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
const pct     = (v) => `${Number(v || 0).toFixed(1)}%`;

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
    label: location?.warehouse_name || location?.label || location?.name || `Sucursal ${value}`,
  };
};

// ── Constants ─────────────────────────────────────────────────────────────────

const PERIODS = [
  { id: 'today', label: 'Hoy',         days: 1 },
  { id: 'week',  label: 'Esta semana', getFrom: getMondayISO },
  { id: '7d',    label: '7 días',      days:  7 },
  { id: '15d',   label: '15 días',     days: 15 },
  { id: '30d',   label: '30 días',     days: 30 },
  { id: '60d',   label: '60 días',     days: 60 },
  { id: '90d',   label: '90 días',     days: 90 },
];

const ALL_WAREHOUSE_VALUE = '__all__';
const CURRENCY_LABEL      = 'Peso chileno (CLP)';
const CHART_ID            = 'seller-ranking-bar';

const defaultFilters = (warehouseValue = '') => ({
  dateFrom:    getMondayISO(),
  dateTo:      toISO(new Date()),
  period:      'week',
  warehouseId: warehouseValue ? [warehouseValue] : [],
});

// ── Table helpers ─────────────────────────────────────────────────────────────

const MEDALS = ['🥇', '🥈', '🥉'];

const Th = ({ children, right }) => (
  <th className={`pb-2 px-3 first:pl-0 last:pr-0 text-xs font-medium uppercase text-slate-400 ${right ? 'text-right' : 'text-left'}`}>
    {children}
  </th>
);
const Td = ({ children, right, muted, bold, className: cls = '' }) => (
  <td className={`py-2.5 px-3 first:pl-0 last:pr-0 text-sm ${right ? 'text-right tabular-nums' : ''} ${muted ? 'text-slate-400' : ''} ${bold ? 'font-semibold' : ''} ${cls}`}>
    {children}
  </td>
);

// ── Component ─────────────────────────────────────────────────────────────────

const SellerRanking = () => {
  const navigate     = useNavigate();
  const { pathname } = useLocation();
  const isDark       = document.documentElement.classList.contains('dark');

  const activeLocationRecord = useSessionStore((state) => state.getActiveLocation());
  const locations            = useSessionStore((state) => state.locations);
  const activeWarehouse      = useMemo(() => activeWarehouseValue(activeLocationRecord), [activeLocationRecord]);

  const [filters,         setFilters]         = useState(() => defaultFilters(activeWarehouse));
  const [executedFilters, setExecutedFilters] = useState(() => defaultFilters(activeWarehouse));
  const [rows,            setRows]            = useState([]);
  const [detailRows,      setDetailRows]      = useState([]);
  const [totals,          setTotals]          = useState({ total: 0, txn_count: 0, seller_count: 0 });
  const [loading,         setLoading]         = useState(false);
  const [viewMode,        setViewMode]        = useState('grouped');
  const [detailSaleCode,  setDetailSaleCode]  = useState(null);

  const set = (key, val) => setFilters((f) => ({ ...f, [key]: val }));

  const applyPeriod = (id) => {
    const p = PERIODS.find((x) => x.id === id);
    if (p) setFilters((f) => ({ ...f, period: id, dateFrom: p.getFrom ? p.getFrom() : periodFrom(p.days), dateTo: toISO(new Date()) }));
  };

  // Locaciones
  const realBranchOptions    = useMemo(() => locations.map(locationOption).filter(Boolean), [locations]);
  const branchOptions        = useMemo(() => [{ value: ALL_WAREHOUSE_VALUE, label: 'Todas las sucursales' }, ...realBranchOptions], [realBranchOptions]);
  const allBranchValues      = useMemo(() => realBranchOptions.map((o) => String(o.value)), [realBranchOptions]);
  const selectedBranchValues = useMemo(() => (Array.isArray(filters.warehouseId) ? filters.warehouseId : []), [filters.warehouseId]);
  const executedBranchValues = useMemo(() => (Array.isArray(executedFilters.warehouseId) ? executedFilters.warehouseId : []), [executedFilters.warehouseId]);

  const setSelectedBranches = (values = []) => {
    const next = values.map(String);
    set('warehouseId', next.includes(ALL_WAREHOUSE_VALUE) ? allBranchValues : next);
  };

  const branchLabel = (values) => {
    const sel = new Set((values || []).map(String));
    const labels = realBranchOptions.filter((o) => sel.has(String(o.value))).map((o) => o.label);
    return labels.length ? labels.join(', ') : 'Todas las sucursales';
  };

  const defaultBranchValues = useMemo(
    () => (activeWarehouse && allBranchValues.includes(activeWarehouse) ? [activeWarehouse] : []),
    [activeWarehouse, allBranchValues],
  );

  const clearFilters = () => setFilters(() => ({
    ...defaultFilters(activeWarehouse),
    warehouseId: defaultBranchValues.length ? defaultBranchValues : [],
  }));

  const isFiltered = filters.period !== 'week'
    || (allBranchValues.length > 0 && selectedBranchValues.join(',') !== defaultBranchValues.join(','));

  // Fetch
  const fetchData = useCallback(async (nextFilters = filters) => {
    setLoading(true);
    try {
      const branches = Array.isArray(nextFilters.warehouseId) ? nextFilters.warehouseId : [];
      const params   = {
        date_from: nextFilters.dateFrom,
        date_to:   nextFilters.dateTo,
      };
      if (branches.length) params.warehouse_ids = branches.join(',');

      const { data } = await apiClient.get('/reports/sales/seller-ranking/data', { params });

      const validBranches = branches.filter((v) => allBranchValues.includes(String(v)));
      const fallback      = activeWarehouse && allBranchValues.includes(activeWarehouse) ? [activeWarehouse] : [];
      setRows(data.rows || []);
      setDetailRows(data.detail_rows || []);
      setTotals(data.totals || { total: 0, txn_count: 0, seller_count: 0 });
      setExecutedFilters({ ...nextFilters, warehouseId: validBranches.length ? validBranches : fallback });
    } catch {
      toast.error('Error cargando datos del reporte');
    } finally {
      setLoading(false);
    }
  }, [activeWarehouse, allBranchValues, filters]);

  useEffect(() => { fetchData(defaultFilters(activeWarehouse)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // KPIs
  const topRow    = rows[0] || null;
  const avgTicket = totals.txn_count > 0 ? Math.round(totals.total / totals.txn_count) : 0;

  const KPI_ITEMS = [
    { id: 'total',   label: 'Total período',      value: money(totals.total),                     hint: `${fmt(executedFilters.dateFrom)} — ${fmt(executedFilters.dateTo)}` },
    { id: 'sellers', label: 'Vendedores activos', value: rows.length.toString(),                  hint: 'con ventas en el período' },
    { id: 'txn',     label: 'Transacciones',       value: totals.txn_count.toLocaleString('es-CL'), hint: 'documentos de venta' },
    { id: 'avg',     label: 'Ticket promedio',     value: money(avgTicket),                        hint: 'por transacción' },
    { id: 'top',     label: 'Vendedor líder',      value: topRow?.seller_name || '—',             hint: topRow ? money(topRow.total) : '' },
    { id: 'topavg',  label: 'Ticket prom. líder',  value: topRow ? money(topRow.avg_ticket) : '—', hint: topRow ? `${topRow.txn_count} transacción${topRow.txn_count === 1 ? '' : 'es'}` : '' },
  ];

  // Chart – horizontal bar
  const chartData       = rows.slice(0, 10);
  const chartCategories = chartData.map((r) => r.seller_name);
  const chartValues     = chartData.map((r) => Math.round(r.total));

  const chartSeries = [{ name: 'Total por vendedor', data: chartValues }];

  const chartOptions = useMemo(() => ({
    chart: {
      id:         CHART_ID,
      type:       'bar',
      background: 'transparent',
      fontFamily: 'inherit',
      toolbar: {
        show:  true,
        tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false },
        export: {
          png: { filename: `ranking-vendedores_${executedFilters.dateFrom}_${executedFilters.dateTo}` },
          csv: { filename: `ranking-vendedores_${executedFilters.dateFrom}_${executedFilters.dateTo}` },
        },
      },
    },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '60%' } },
    colors:      ['#f59e0b'],
    dataLabels:  { enabled: false },
    xaxis: {
      categories: chartCategories,
      labels: {
        formatter: (v) => `$${(v / 1000).toFixed(0)}K`,
        style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' },
      },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: isDark ? '#cbd5e1' : '#475569', fontSize: '11px' },
        maxWidth: 160,
      },
    },
    grid:    { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => money(v) } },
    theme:   { mode: isDark ? 'dark' : 'light' },
  }), [chartCategories, isDark, executedFilters.dateFrom, executedFilters.dateTo]);

  // Exports
  const buildExportMetadata = () => [
    ['Reporte',    'Ranking de vendedores'],
    ['Periodo',    `${fmt(executedFilters.dateFrom)} - ${fmt(executedFilters.dateTo)}`],
    ['Sucursal',   branchLabel(executedBranchValues)],
    ['Moneda',     CURRENCY_LABEL],
    ['Vista',      viewMode === 'detail' ? 'Detalle' : 'Por vendedor'],
    ['Generado el', new Date().toLocaleString('es-CL')],
  ];

  const buildExportData = () => {
    if (viewMode === 'detail') {
      return {
        headers: ['Vendedor', 'Fecha', 'Folio', 'Sucursal', 'Método de pago', `Total ${CURRENCY_LABEL}`],
        data: detailRows.map((r) => [
          r.seller_name, r.sale_date, r.folio, r.warehouse_name, r.payment_method_name, r.total,
        ]),
      };
    }
    return {
      headers: ['Posición', 'Vendedor', 'Transacciones', `Total ${CURRENCY_LABEL}`, '% del total', 'Ticket prom.'],
      data: rows.map((r, i) => [i + 1, r.seller_name, r.txn_count, r.total, r.pct, r.avg_ticket]),
    };
  };

  const handleCsvExport = async () => {
    const { headers, data } = buildExportData();
    return buildCsvBlobUrl(headers, data, { metadataRows: buildExportMetadata() });
  };

  const handleXlsxExport = async () => {
    const { headers, data } = buildExportData();
    return buildXlsxBlobUrl(headers, data, 'Ranking de vendedores', { metadataRows: buildExportMetadata() });
  };

  const handlePdfExport = async () => {
    try {
      const chartImg = await ApexCharts.exec(CHART_ID, 'dataURI');
      const formData = new FormData();
      formData.append('date_from',    executedFilters.dateFrom);
      formData.append('date_to',      executedFilters.dateTo);
      formData.append('warehouse_id', executedBranchValues.length ? executedBranchValues.join(',') : 'all');
      if (chartImg?.imgURI) {
        const blob = await (await fetch(chartImg.imgURI)).blob();
        formData.append('chart_bar', blob, 'chart_bar.png');
      }
      const { data: pdfBlob } = await apiClient.post('/reports/sales/seller-ranking/pdf', formData, {
        headers:      { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      });
      return URL.createObjectURL(pdfBlob);
    } catch {
      toast.error('No se pudo generar el PDF. Verifique que el servicio Gotenberg esté activo.');
      throw new Error('pdf_failed');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <ReportLayout
        title="Ranking de vendedores"
        description={`${fmt(executedFilters.dateFrom)} — ${fmt(executedFilters.dateTo)} · ${rows.length} vendedor${rows.length === 1 ? '' : 'es'}`}
        actions={[
          { id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate(pathname) },
        ]}

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

        viewMode={viewMode}
        onViewModeChange={setViewMode}
        viewModeOptions={[{ id: 'detail', label: 'Detalle' }, { id: 'grouped', label: 'Por vendedor' }]}
        onRunReport={() => fetchData(filters)}
        runReportLoading={loading}

        kpiItems={KPI_ITEMS}

        charts={[
          {
            title:    'Ranking de vendedores',
            subtitle: 'Clasificación por monto total de ventas en el período',
            icon:     Trophy,
            content:  rows.length > 0 ? (
              <ReactApexChart
                options={chartOptions}
                series={chartSeries}
                type="bar"
                height={Math.max(220, Math.min(chartData.length * 36, 400))}
                key={`seller-bar-${executedFilters.dateFrom}-${executedFilters.dateTo}`}
              />
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-slate-400">Sin datos para el período seleccionado</div>
            ),
          },
        ]}

        tableTitle={viewMode === 'detail' ? 'Detalle de ventas' : 'Ranking de vendedores'}
        tableSubtitle={loading ? 'Cargando…' : viewMode === 'detail'
          ? `${detailRows.length} transacción${detailRows.length === 1 ? '' : 'es'}`
          : `${rows.length} vendedor${rows.length === 1 ? '' : 'es'}`}
        tableIcon={Trophy}
        onExportCsv={handleCsvExport}
        csvFilename={`ranking-vendedores_${executedFilters.dateFrom}_${executedFilters.dateTo}.csv`}
        onExportExcel={handleXlsxExport}
        excelFilename={`ranking-vendedores_${executedFilters.dateFrom}_${executedFilters.dateTo}.xlsx`}
        onExportPdf={handlePdfExport}
        exportDescription={`${fmt(executedFilters.dateFrom)} — ${fmt(executedFilters.dateTo)}`}
        pdfFilename={`ranking-vendedores_${executedFilters.dateFrom}_${executedFilters.dateTo}.pdf`}
        tableFooter={viewMode === 'grouped' && rows.length > 0 ? (
          <div className="grid grid-cols-5 gap-4 text-right text-sm">
            <span className="col-span-2 text-left font-semibold text-slate-700 dark:text-slate-200">Total período</span>
            <span className="font-bold tabular-nums">{totals.txn_count.toLocaleString('es-CL')}</span>
            <span className="font-bold tabular-nums">{money(totals.total)}</span>
            <span className="font-bold tabular-nums">100%</span>
          </div>
        ) : null}
      >

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-400">Cargando datos…</div>
          ) : viewMode === 'detail' ? (
            detailRows.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-sm text-slate-400">Sin ventas en el período seleccionado</div>
            ) : (
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <Th>Vendedor</Th>
                    <Th>Fecha</Th>
                    <Th>Folio</Th>
                    <Th>Sucursal</Th>
                    <Th>Pago</Th>
                    <Th right>Total</Th>
                    <Th right>Acciones</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                  {detailRows.map((r, i) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <tr key={`${r.sale_code}-${i}`}>
                      <Td>
                        <p className="text-sm font-medium leading-tight">{r.seller_name}</p>
                      </Td>
                      <Td muted><span className="text-xs">{r.sale_date}</span></Td>
                      <Td><span className="text-xs font-mono">{r.folio}</span></Td>
                      <Td muted><span className="text-xs">{r.warehouse_name}</span></Td>
                      <Td muted><span className="text-xs">{r.payment_method_name || '—'}</span></Td>
                      <Td right bold>{money(r.total)}</Td>
                      <Td right>
                        {r.sale_code && (
                          <button
                            type="button"
                            onClick={() => setDetailSaleCode(r.sale_code)}
                            title="Ver detalle de venta"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-300"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : rows.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-400">Sin ventas en el período seleccionado</div>
          ) : (
            <table className="w-full min-w-[580px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <Th>#</Th>
                  <Th>Vendedor</Th>
                  <Th right>Transacciones</Th>
                  <Th right>Total</Th>
                  <Th right>% del total</Th>
                  <Th right>Ticket prom.</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {rows.map((r, i) => (
                  <tr key={r.seller_id ?? r.seller_name} className={i === 0 ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}>
                    <Td muted>
                      <span className="text-base leading-none">{MEDALS[i] ?? `${i + 1}`}</span>
                    </Td>
                    <Td>
                      <span className={i === 0 ? 'font-semibold' : ''}>{r.seller_name}</span>
                    </Td>
                    <Td right muted>{r.txn_count.toLocaleString('es-CL')}</Td>
                    <Td right bold>{money(r.total)}</Td>
                    <Td right>
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(r.pct, 100)}%` }} />
                        </div>
                        <span className="w-10 text-right tabular-nums text-slate-500">{pct(r.pct)}</span>
                      </div>
                    </Td>
                    <Td right muted>{money(r.avg_ticket)}</Td>
                  </tr>
                ))}
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

export default SellerRanking;
