/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { AlertTriangle, CreditCard, Eye, RefreshCw, ShoppingCart, TrendingDown, TrendingUp, X } from 'lucide-react';

import SaleDetailModal from '@/components/sales/SaleDetailModal';
import KpiBar from '@/components/common/data/KpiBar';
import { RowActionButton } from '@/components/common/actions/ActionButton';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import DateRangePicker from '@/components/common/forms/DateRangePicker';
import ModuleSpinner from '@/components/common/loading/ModuleSpinner';
import { dashboardService } from '@/services/dashboard/dashboardService';
import { getBackendMessage } from '@/services/ui/notify';

const money = (v) => Number(v || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const todayLabel = new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const colors = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#4f46e5', '#65a30d'];

const toISO = (d) => d.toISOString().slice(0, 10);
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
const defaultFilters = () => ({ warehouseId: 'all', period: '7d', dateFrom: toISO(addDays(new Date(), -6)), dateTo: toISO(new Date()) });
const periodFrom = (days) => toISO(addDays(new Date(), -(days - 1)));

const PERIODS = [
  { id: 'today', label: 'Hoy', days: 1 },
  { id: '7d', label: '7 días', days: 7 },
  { id: '15d', label: '15 días', days: 15 },
  { id: '30d', label: '30 días', days: 30 },
  { id: '45d', label: '45 días', days: 45 },
  { id: '60d', label: '60 días', days: 60 },
  { id: '90d', label: '90 días', days: 90 },
];

const statusMap = {
  CLOSED: { label: 'Cerrada', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  PENDING_CASHIER: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  CANCELLED: { label: 'Anulada', cls: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' },
};

const branchKey = (item) => String(item.warehouse_id ?? item.value ?? 'sin-sucursal');
const branchName = (item) => item.warehouse_name || item.name || 'Sin sucursal';
const branchColor = (key, index) => colors[index % colors.length];
const fmt = (iso) => iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

const buildDays = (dateFrom, dateTo) => {
  if (!dateFrom || !dateTo) return [];
  const days = [];
  const cur = new Date(`${dateFrom}T00:00:00`);
  const end = new Date(`${dateTo}T00:00:00`);
  while (cur <= end) {
    days.push(toISO(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};

const Card = ({ title, subtitle, icon: Icon, children, footer, className = '', bodyClassName = 'p-5' }) => (
  <div className={`flex min-h-[390px] flex-col rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${className}`}>
    <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
      {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" />}
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</span>
        {subtitle && <span className="ml-2 text-xs text-slate-400">{subtitle}</span>}
      </div>
    </div>
    <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    {footer && <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800">{footer}</div>}
  </div>
);

const SectionLabel = ({ children }) => (
  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{children}</p>
);

const Th = ({ children, right }) => (
  <th className={`pb-2 px-2 first:pl-0 last:pr-0 text-xs font-medium uppercase text-slate-400 ${right ? 'text-right' : 'text-left'}`}>{children}</th>
);

const Td = ({ children, right, muted }) => (
  <td className={`py-2 px-2 first:pl-0 last:pr-0 text-sm ${right ? 'text-right tabular-nums' : ''} ${muted ? 'text-slate-400' : ''}`}>{children}</td>
);

const EmptyState = ({ children }) => (
  <div className="flex min-h-[300px] items-center justify-center text-center text-sm text-slate-400">{children}</div>
);

const Dashboard = () => {
  const [filters, setFilters] = useState(defaultFilters);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewSaleCode, setViewSaleCode] = useState(null);
  const isDark = document.documentElement.classList.contains('dark');

  const set = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  const applyPeriod = (periodId) => {
    const preset = PERIODS.find((p) => p.id === periodId);
    if (!preset) return;
    setFilters((current) => ({ ...current, period: periodId, dateFrom: periodFrom(preset.days), dateTo: toISO(new Date()) }));
  };

  const clearFilters = () => setFilters(defaultFilters());
  const isFiltered = filters.warehouseId !== 'all' || filters.period !== '7d';

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const summary = await dashboardService.summary({
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        ...(filters.warehouseId !== 'all' ? { warehouse_id: filters.warehouseId } : {}),
      });
      setData(summary);
    } catch (err) {
      setError(getBackendMessage(err, 'No se pudo cargar el dashboard.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [filters.dateFrom, filters.dateTo, filters.warehouseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const chartDays = useMemo(() => buildDays(filters.dateFrom, filters.dateTo), [filters.dateFrom, filters.dateTo]);
  const chartLabels = chartDays.map((iso) => {
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
  });

  const branchOptions = useMemo(() => [
    { value: 'all', label: 'Todas las sucursales' },
    ...((data?.branches || []).map((branch) => ({ value: String(branch.value), label: branch.label || branch.name }))),
  ], [data?.branches]);

  const periodTotals = useMemo(() => (data?.branch_totals || []).map((item, index) => ({
    branch: branchName(item),
    key: branchKey(item),
    total: Number(item.total || 0),
    transactions: Number(item.transactions || 0),
    color: branchColor(branchKey(item), index),
  })), [data?.branch_totals]);

  const dailyByBranch = useMemo(() => {
    const map = new Map();
    (data?.daily_sales || []).forEach((item) => {
      const key = branchKey(item);
      if (!map.has(key)) {
        const knownIndex = periodTotals.findIndex((branch) => branch.key === key);
        map.set(key, {
          name: branchName(item),
          color: branchColor(key, knownIndex >= 0 ? knownIndex : map.size),
          values: new Map(),
        });
      }
      map.get(key).values.set(item.sale_date, Number(item.total || 0));
    });
    return Array.from(map.entries()).map(([key, item]) => ({
      key,
      name: item.name,
      color: item.color,
      data: chartDays.map((day) => item.values.get(day) || 0),
    }));
  }, [chartDays, data?.daily_sales, periodTotals]);

  const chartSeries = dailyByBranch.map((branch) => ({
    name: `Suc. ${branch.name}`,
    data: branch.data,
    color: branch.color,
  }));

  const previousByBranch = useMemo(() => new Map((data?.previous_totals || []).map((item) => [branchKey(item), Number(item.total || 0)])), [data?.previous_totals]);
  const paymentMethods = useMemo(() => (data?.payment_methods || []).map((item, index) => ({
    key: item.method_code || item.method_name || `method-${index}`,
    name: item.method_name || 'Sin metodo',
    transactions: Number(item.transactions || 0),
    total: Number(item.total || 0),
    color: colors[index % colors.length],
  })), [data?.payment_methods]);
  const grandTotal = periodTotals.reduce((sum, item) => sum + item.total, 0);
  const paymentTotal = paymentMethods.reduce((sum, item) => sum + item.total, 0);
  const previousGrandTotal = Array.from(previousByBranch.values()).reduce((sum, value) => sum + value, 0);
  const kpis = data?.kpis || {};

  const KPI_ITEMS = [
    { id: 'sales', label: 'Ventas del día', value: money(kpis.sales_total), hint: 'ventas cerradas hoy' },
    { id: 'txn', label: 'Transacciones', value: String(kpis.transactions ?? 0), hint: 'en el día' },
    { id: 'avg', label: 'Ticket promedio', value: money(kpis.avg_ticket), hint: 'ventas cerradas' },
    { id: 'stock', label: 'Stock crítico', value: `${kpis.critical_skus ?? 0} SKU`, hint: 'requieren reposición' },
  ];

  const periodLabel = (() => {
    const preset = PERIODS.find((p) => p.id === filters.period);
    if (preset) return preset.label.toLowerCase();
    return `${fmt(filters.dateFrom)} - ${fmt(filters.dateTo)}`;
  })();

  const chartOptions = useMemo(() => ({
    chart: {
      type: 'bar',
      stacked: false,
      toolbar: {
        show: true,
        tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false },
        export: { png: { filename: 'ventas-por-sucursal' }, svg: { filename: 'ventas-por-sucursal' }, csv: { filename: 'ventas-por-sucursal' } },
      },
      background: 'transparent',
      fontFamily: 'inherit',
    },
    plotOptions: { bar: { columnWidth: chartDays.length > 30 ? '90%' : '65%', borderRadius: 2 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: chartLabels,
      labels: {
        rotate: chartDays.length > 20 ? -45 : 0,
        style: { fontSize: '10px', colors: isDark ? '#94a3b8' : '#64748b' },
        show: chartDays.length <= 90,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (v) => `$${(v / 1000).toFixed(0)}K`,
        style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' },
      },
    },
    grid: { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
    legend: {
      show: chartSeries.length > 1,
      position: 'top',
      horizontalAlign: 'left',
      labels: { colors: isDark ? '#cbd5e1' : '#475569' },
    },
    tooltip: { y: { formatter: (v) => money(v) } },
    theme: { mode: isDark ? 'dark' : 'light' },
  }), [chartLabels, chartDays.length, chartSeries.length, isDark]);

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm capitalize text-slate-500 dark:text-slate-400">{todayLabel}</p>
        </div>
        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
          className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      <div className="mb-5 grid gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[minmax(180px,220px)_auto_1fr_auto]">
        <AutocompleteSelect
          value={filters.warehouseId}
          onChange={(v) => set('warehouseId', v || 'all')}
          options={branchOptions}
          placeholder="Todas las sucursales"
          searchPlaceholder="Buscar sucursal"
          clearable={false}
          buttonClassName="h-10 shadow-none"
        />

        <div className="flex overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPeriod(p.id)}
              className={`h-10 whitespace-nowrap px-3 text-sm transition-colors ${
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
          onChange={({ from, to }) => setFilters((current) => ({ ...current, period: 'custom', dateFrom: from, dateTo: to }))}
        />

        {isFiltered ? (
          <button
            type="button"
            onClick={clearFilters}
            className="flex h-10 items-center gap-1.5 rounded-md px-3 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar
          </button>
        ) : <div />}
      </div>

      {error && (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {loading && !data ? (
        <ModuleSpinner message="Cargando dashboard..." detail="Consultando métricas reales" />
      ) : (
        <>
          <KpiBar items={KPI_ITEMS} className="mb-5" />

          <div className="mb-5 grid gap-5 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <Card
                title={`Ventas por sucursal · ${filters.warehouseId === 'all' ? 'todas las sucursales' : branchOptions.find((option) => option.value === filters.warehouseId)?.label || 'sucursal seleccionada'}`}
                icon={TrendingUp}
                className="h-[390px]"
              >
                {chartSeries.length > 0 ? (
                  <ReactApexChart options={chartOptions} series={chartSeries} type="bar" height={280} key={`bar-${filters.warehouseId}-${filters.dateFrom}-${filters.dateTo}`} />
                ) : (
                  <EmptyState>Sin ventas cerradas para el período seleccionado.</EmptyState>
                )}
              </Card>
            </div>

            <div className="min-w-0 lg:col-span-1">
              <PaymentMethodsCard rows={paymentMethods} total={paymentTotal} isDark={isDark} />
            </div>
          </div>

          <div className="mb-5 grid gap-5 lg:grid-cols-3">
            <Card
              title="Ventas por sucursal en el período"
              icon={TrendingUp}
              footer={periodTotals.length > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">Total período</span>
                  <span className="text-sm font-bold tabular-nums">{money(grandTotal)}</span>
                </div>
              )}
            >
              {periodTotals.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {periodTotals.map((s) => {
                    const pct = grandTotal > 0 ? ((s.total / grandTotal) * 100).toFixed(1) : '0.0';
                    return (
                      <div key={s.key} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                        <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">Sucursal {s.branch}</p>
                          <p className="text-xs text-slate-400">{fmt(filters.dateFrom)} - {fmt(filters.dateTo)} · {s.transactions} ventas</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums">{money(s.total)}</p>
                          {periodTotals.length > 1 && <p className="text-xs text-slate-400">{pct}% del total</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <EmptyState>Sin ventas por sucursal para mostrar.</EmptyState>}
            </Card>

            <Card title="Participación por sucursal" icon={TrendingUp}>
              {periodTotals.length > 1 ? (
                <ReactApexChart
                  options={{
                    chart: { type: 'pie', background: 'transparent', fontFamily: 'inherit', toolbar: { show: false } },
                    labels: periodTotals.map((s) => `Suc. ${s.branch}`),
                    colors: periodTotals.map((s) => s.color),
                    legend: { position: 'bottom', labels: { colors: isDark ? '#cbd5e1' : '#475569' } },
                    dataLabels: { style: { fontSize: '13px', fontWeight: 600 }, formatter: (val) => `${Number(val).toFixed(1)}%`, dropShadow: { enabled: false } },
                    tooltip: { y: { formatter: (_, { seriesIndex }) => money(periodTotals[seriesIndex]?.total ?? 0) } },
                    theme: { mode: isDark ? 'dark' : 'light' },
                  }}
                  series={periodTotals.map((s) => s.total)}
                  type="pie"
                  height={300}
                  key={`pie-${filters.warehouseId}-${filters.dateFrom}-${filters.dateTo}`}
                />
              ) : <EmptyState>Selecciona todas las sucursales para ver distribución.</EmptyState>}
            </Card>

            <Card
              title="Variación vs período anterior"
              icon={TrendingUp}
              footer={periodTotals.length > 1 && (
                <VariationFooter current={grandTotal} previous={previousGrandTotal} />
              )}
            >
              {periodTotals.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {periodTotals.map((s) => (
                    <VariationRow key={s.key} label={`Sucursal ${s.branch}`} color={s.color} current={s.total} previous={previousByBranch.get(s.key) || 0} />
                  ))}
                </div>
              ) : <EmptyState>Sin datos para comparar.</EmptyState>}
            </Card>
          </div>

          <SectionLabel>Actividad reciente</SectionLabel>
          <Card title="Últimas ventas" subtitle={`${fmt(filters.dateFrom)} - ${fmt(filters.dateTo)}`} icon={ShoppingCart} className="mb-5">
            {(data?.recent_sales || []).length === 0 ? (
              <EmptyState>Sin ventas para el período seleccionado.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <Th>Folio</Th><Th>Hora</Th><Th>Estado</Th><Th>Sucursal</Th><Th>Caja</Th>
                      <Th>Vendedor</Th><Th>Cliente</Th><Th right>Items</Th><Th right>Total</Th><Th>Método</Th><Th right>Acciones</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {(data?.recent_sales || []).map((r) => {
                      const st = statusMap[r.status] ?? { label: r.status, cls: 'bg-slate-100 text-slate-500' };
                      return (
                        <tr key={r.id}>
                          <Td><span className="font-mono text-xs text-blue-600 dark:text-blue-400">{r.folio}</span></Td>
                          <Td muted>{r.sale_time}</Td>
                          <Td><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${st.cls}`}>{st.label}</span></Td>
                          <Td muted>{r.warehouse_name}</Td>
                          <Td muted>{r.cash_register_name}</Td>
                          <Td muted>{r.vendor_name}</Td>
                          <Td>{r.customer_name}</Td>
                          <Td right muted>{r.items_count}</Td>
                          <Td right><span className="font-medium">{money(r.total_amount)}</span></Td>
                          <Td muted>{r.payment_method}</Td>
                          <Td right>
                            <RowActionButton
                              label="Ver venta"
                              icon={Eye}
                              disabled={!r.sale_code}
                              onClick={() => setViewSaleCode(r.sale_code)}
                            />
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <SectionLabel>Análisis de productos · {periodLabel}</SectionLabel>
          <div className="grid gap-5 lg:grid-cols-3">
            <ProductRanking title="Más vendidos" icon={TrendingUp} rows={data?.top_products || []} mode="top" />
            <ProductRanking title="Menos vendidos" icon={TrendingDown} rows={data?.low_movers || []} mode="low" />
            <Card title="Stock crítico" icon={AlertTriangle} footer={<p className="text-center text-xs text-slate-400">{(data?.low_stock || []).length} productos con stock crítico</p>}>
              {(data?.low_stock || []).length > 0 ? (
                <div className="space-y-3">
                  {(data?.low_stock || []).map((p) => (
                    <div key={`${p.id}-${p.warehouse_name}`} className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                        Number(p.stock || 0) <= 0
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}>
                        {Number(p.stock || 0).toLocaleString('es-CL', { maximumFractionDigits: 1 })}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.sku} · mín. {Number(p.minimum_stock || 0).toLocaleString('es-CL', { maximumFractionDigits: 1 })}</p>
                      </div>
                      {Number(p.stock || 0) <= 0 && (
                        <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700 dark:bg-red-950/40 dark:text-red-400">
                          Sin stock
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : <EmptyState>Sin productos bajo mínimo.</EmptyState>}
            </Card>
          </div>
        </>
      )}
      {viewSaleCode && (
        <SaleDetailModal saleCode={viewSaleCode} onClose={() => setViewSaleCode(null)} />
      )}
    </section>
  );
};

const variation = (current, previous) => {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const VariationFooter = ({ current, previous }) => {
  const diff = variation(current, previous);
  const up = diff >= 0;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-slate-500">Total período</span>
      <span className={`flex items-center gap-1 text-sm font-bold ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
        {up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        {up ? '+' : ''}{diff.toFixed(1)}%
      </span>
    </div>
  );
};

const VariationRow = ({ label, color, current, previous }) => {
  const diff = variation(current, previous);
  const up = diff >= 0;
  return (
    <div className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
      <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-slate-400">anterior: {money(previous)}</p>
      </div>
      <div className={`flex items-center gap-1 text-sm font-semibold ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
        {up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        {up ? '+' : ''}{diff.toFixed(1)}%
      </div>
    </div>
  );
};

const PaymentMethodsCard = ({ rows, total, isDark }) => {
  const visibleRows = rows.slice(0, 8);
  const labels = visibleRows.map((method) => {
    const pct = total > 0 ? (method.total / total) * 100 : 0;
    return `${method.name} · ${pct.toFixed(1)}% (${money(method.total)})`;
  });

  return (
    <Card
      title="Medios de pago"
      subtitle="rango seleccionado"
      icon={CreditCard}
      className="h-[390px]"
      bodyClassName="flex items-center justify-center p-2"
      footer={rows.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">Total recibido</span>
          <span className="text-sm font-bold tabular-nums">{money(total)}</span>
        </div>
      )}
    >
      {visibleRows.length > 0 ? (
        <ReactApexChart
          type="pie"
          height={285}
          series={visibleRows.map((method) => method.total)}
          options={{
            chart: { type: 'pie', background: 'transparent', fontFamily: 'inherit', toolbar: { show: false } },
            labels,
            colors: visibleRows.map((method) => method.color),
            legend: {
              position: 'bottom',
              fontSize: '12px',
              labels: { colors: isDark ? '#cbd5e1' : '#475569' },
              itemMargin: { horizontal: 8, vertical: 4 },
            },
            dataLabels: {
              enabled: true,
              formatter: (val, opts) => {
                const method = visibleRows[opts.seriesIndex];
                return `${method.name}\n${Number(val).toFixed(1)}% (${money(method.total)})`;
              },
              style: { fontSize: '12px', fontWeight: 600 },
              dropShadow: { enabled: false },
            },
            tooltip: {
              custom: ({ seriesIndex }) => {
                const method = visibleRows[seriesIndex];
                if (!method) return '';
                const pct = total > 0 ? (method.total / total) * 100 : 0;
                return `
                  <div class="rounded-md bg-white px-3 py-2 text-xs text-slate-700 shadow-lg dark:bg-slate-800 dark:text-slate-100">
                    <span>${method.name} · ${pct.toFixed(1)}% (${money(method.total)})</span>
                  </div>
                `;
              },
            },
            stroke: { colors: [isDark ? '#0f172a' : '#ffffff'], width: 2 },
            theme: { mode: isDark ? 'dark' : 'light' },
          }}
        />
      ) : <EmptyState>Sin pagos recibidos en el rango seleccionado.</EmptyState>}
    </Card>
  );
};

const ProductRanking = ({ title, icon, rows, mode }) => (
  <Card title={title} icon={icon}>
    {rows.length > 0 ? (
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            <Th>Producto</Th><Th right>Uds.</Th><Th right>{mode === 'top' ? 'Total' : 'Stock'}</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
          {rows.map((p, i) => (
            <tr key={`${p.id}-${p.sku}`}>
              <Td>
                <div className="flex min-w-0 items-center gap-2">
                  {mode === 'top' && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                      {i + 1}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm">{p.name}</p>
                    {mode !== 'top' && <p className="text-xs text-slate-400">{p.sku}</p>}
                  </div>
                </div>
              </Td>
              <Td right muted>{Number(p.units || 0).toLocaleString('es-CL')}</Td>
              <Td right>{mode === 'top' ? <span className="font-medium">{money(p.total)}</span> : <span className="text-slate-400">{Number(p.stock || 0).toLocaleString('es-CL', { maximumFractionDigits: 1 })}</span>}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : <EmptyState>Sin productos para mostrar.</EmptyState>}
  </Card>
);

export default Dashboard;
