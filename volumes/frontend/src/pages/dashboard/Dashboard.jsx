import { useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { AlertTriangle, ShoppingCart, TrendingDown, TrendingUp, X } from 'lucide-react';
import KpiBar from '@/components/common/data/KpiBar';

import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import DateRangePicker from '@/components/common/forms/DateRangePicker';

const money = (v) => Number(v).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const todayLabel = new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const toISO = (d) => d.toISOString().slice(0, 10);
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };

// --- Mockup data ---------------------------------------------------------

const BRANCH_LIST = ['Centro', 'Mall', 'Norte'];
const BRANCH_COLORS = { Centro: '#3b82f6', Mall: '#10b981', Norte: '#f59e0b' };

const seeded = (base, seed) => {
  const r = Math.abs(Math.sin(seed * 9301 + 49297) * 233280);
  return Math.round(base + (r % (base * 0.6)) - base * 0.3);
};

const SESSIONS_ALL = [
  { id: 1, sucursal: 'Centro', register: 'Caja 1', operator: 'María González', since: '09:00', balance: 45200,  open: true  },
  { id: 2, sucursal: 'Centro', register: 'Caja 2', operator: 'Carlos Pérez',   since: '09:15', balance: 62800,  open: true  },
  { id: 3, sucursal: 'Centro', register: 'Caja 3', operator: '—',              since: '—',     balance: 0,      open: false },
  { id: 4, sucursal: 'Mall',   register: 'Caja 1', operator: 'Ana Martínez',   since: '10:00', balance: 88400,  open: true  },
  { id: 5, sucursal: 'Mall',   register: 'Caja 2', operator: '—',              since: '—',     balance: 0,      open: false },
  { id: 6, sucursal: 'Norte',  register: 'Caja 1', operator: 'Luis Rojas',     since: '09:30', balance: 31600,  open: true  },
];

const RECENT_ALL = [
  { id: 'V-00847', time: '14:32', sucursal: 'Centro', caja: 'Caja 1', vendor: 'María González', customer: 'Consumidor final', items: 3, total: 28900,  method: 'Débito',        status: 'CLOSED'          },
  { id: 'V-00846', time: '14:18', sucursal: 'Mall',   caja: 'Caja 1', vendor: 'Ana Martínez',   customer: 'Ana Martínez',     items: 1, total: 14500,  method: 'Efectivo',      status: 'CLOSED'          },
  { id: 'V-00845', time: '13:55', sucursal: 'Centro', caja: 'Caja 2', vendor: 'Carlos Pérez',   customer: 'Consumidor final', items: 5, total: 67200,  method: 'Crédito',       status: 'CLOSED'          },
  { id: 'V-00844', time: '13:41', sucursal: 'Norte',  caja: 'Caja 1', vendor: 'Luis Rojas',     customer: 'Luis Rojas',       items: 2, total: 19800,  method: 'Transferencia', status: 'CLOSED'          },
  { id: 'V-00843', time: '13:22', sucursal: 'Mall',   caja: 'Caja 1', vendor: 'Ana Martínez',   customer: 'Consumidor final', items: 1, total: 8900,   method: 'Efectivo',      status: 'CANCELLED'       },
  { id: 'V-00842', time: '13:10', sucursal: 'Centro', caja: 'Caja 1', vendor: 'María González', customer: 'Rosa Vidal',       items: 4, total: 52300,  method: 'Débito',        status: 'CLOSED'          },
  { id: 'V-00841', time: '12:48', sucursal: 'Norte',  caja: 'Caja 1', vendor: 'Luis Rojas',     customer: 'Consumidor final', items: 2, total: 17600,  method: 'Efectivo',      status: 'CLOSED'          },
  { id: 'V-00840', time: '12:31', sucursal: 'Mall',   caja: 'Caja 1', vendor: 'Ana Martínez',   customer: 'Jorge Soto',       items: 6, total: 93400,  method: 'Crédito',       status: 'PENDING_CASHIER' },
];

const LOW_STOCK = [
  { sku: 'CAM-BLU-M',  name: 'Camisa azul talla M',  stock: 2, min: 10 },
  { sku: 'PAN-NEG-32', name: 'Pantalón negro 32',     stock: 0, min: 5  },
  { sku: 'ZAP-MAR-38', name: 'Zapato marrón 38',      stock: 1, min: 8  },
  { sku: 'CIN-CAF-L',  name: 'Cinturón café L',       stock: 3, min: 6  },
];
const TOP_PRODUCTS = [
  { sku: 'BLU-BLK-L',  name: 'Blusa negra L',        units: 38, total: 380000 },
  { sku: 'PAR-BEI-M',  name: 'Parka beige M',         units: 31, total: 930000 },
  { sku: 'CAL-GRI-S',  name: 'Calza gris S',          units: 29, total: 145000 },
  { sku: 'POL-VER-XL', name: 'Polera verde XL',       units: 24, total: 192000 },
  { sku: 'FAL-AZU-M',  name: 'Falda azul M',          units: 20, total: 300000 },
];
const LOW_MOVERS = [
  { sku: 'SAC-ROS-XS', name: 'Saco rosado XS',        units: 1, stock: 12 },
  { sku: 'VES-AMA-S',  name: 'Vestido amarillo S',     units: 1, stock: 8  },
  { sku: 'BOL-CAF-UN', name: 'Bolso café unisex',      units: 2, stock: 15 },
  { sku: 'BUF-GRI-UN', name: 'Bufanda gris unisex',    units: 2, stock: 20 },
  { sku: 'GOR-AZU-UN', name: 'Gorro azul unisex',      units: 3, stock: 18 },
];

const BRANCH_OPTIONS = [
  { value: 'all',    label: 'Todas las sucursales' },
  { value: 'Centro', label: 'Sucursal Centro' },
  { value: 'Mall',   label: 'Sucursal Mall' },
  { value: 'Norte',  label: 'Sucursal Norte' },
];

// Period presets
const PERIODS = [
  { id: 'today', label: 'Hoy',     days: 1  },
  { id: '7d',    label: '7 días',  days: 7  },
  { id: '15d',   label: '15 días', days: 15 },
  { id: '30d',   label: '30 días', days: 30 },
  { id: '45d',   label: '45 días', days: 45 },
  { id: '60d',   label: '60 días', days: 60 },
  { id: '90d',   label: '90 días', days: 90 },
];

const defaultFilters = () => {
  const to = toISO(new Date());
  const from = toISO(addDays(new Date(), -29));
  return { sucursal: 'all', period: '30d', dateFrom: from, dateTo: to };
};

const periodFrom = (days) => toISO(addDays(new Date(), -(days - 1)));

// --- Sub-components ------------------------------------------------------

const Card = ({ title, subtitle, icon: Icon, children, footer, className = '' }) => (
  <div className={`flex flex-col rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${className}`}>
    <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
      {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" />}
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</span>
        {subtitle && <span className="ml-2 text-xs text-slate-400">{subtitle}</span>}
      </div>
    </div>
    <div className="flex-1 p-5">{children}</div>
    {footer && (
      <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800">{footer}</div>
    )}
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

// --- Main ----------------------------------------------------------------

const Dashboard = () => {
  const [filters, setFilters] = useState(defaultFilters);
  const isDark = document.documentElement.classList.contains('dark');

  const set = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  const applyPeriod = (periodId) => {
    const preset = PERIODS.find((p) => p.id === periodId);
    if (!preset) return;
    setFilters((f) => ({ ...f, period: periodId, dateFrom: periodFrom(preset.days), dateTo: toISO(new Date()) }));
  };

  const clearFilters = () => setFilters(defaultFilters());

  const isFiltered = filters.sucursal !== 'all' || filters.period !== '30d';

  // Build chart days from date range
  const chartDays = useMemo(() => {
    if (!filters.dateFrom || !filters.dateTo) return [];
    const from = new Date(`${filters.dateFrom}T00:00:00`);
    const to   = new Date(`${filters.dateTo}T00:00:00`);
    const days = [];
    const cur = new Date(from);
    while (cur <= to) { days.push(toISO(cur)); cur.setDate(cur.getDate() + 1); }
    return days;
  }, [filters.dateFrom, filters.dateTo]);

  const chartLabels = chartDays.map((iso) => {
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
  });

  const activeBranches = filters.sucursal === 'all' ? BRANCH_LIST : [filters.sucursal];

  const chartSeries = useMemo(() => activeBranches.map((branch) => {
    const bi = BRANCH_LIST.indexOf(branch);
    return {
      name: `Suc. ${branch}`,
      data: chartDays.map((_, di) => seeded(400000 + bi * 120000, di * 7 + bi * 13)),
      color: BRANCH_COLORS[branch],
    };
  }), [activeBranches, chartDays]);  // eslint-disable-line react-hooks/exhaustive-deps

  const periodTotals = useMemo(() =>
    chartSeries.map((s) => {
      const branch = s.name.replace('Suc. ', '');
      return { branch, total: s.data.reduce((a, b) => a + b, 0), color: BRANCH_COLORS[branch] };
    }),
  [chartSeries]);

  const grandTotal = periodTotals.reduce((a, s) => a + s.total, 0);
  const avgDaily = chartDays.length > 0 ? Math.round(grandTotal / chartDays.length) : 0;

  const fmt = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const periodLabel = (() => {
    const preset = PERIODS.find((p) => p.id === filters.period);
    if (preset) return preset.label.toLowerCase();
    if (filters.dateFrom && filters.dateTo) return `${fmt(filters.dateFrom)} — ${fmt(filters.dateTo)}`;
    return 'período';
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
      show: activeBranches.length > 1,
      position: 'top', horizontalAlign: 'left',
      labels: { colors: isDark ? '#cbd5e1' : '#475569' },
    },
    tooltip: { y: { formatter: (v) => money(v) } },
    theme: { mode: isDark ? 'dark' : 'light' },
  }), [chartLabels, chartDays.length, isDark, activeBranches.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Variación vs período anterior equivalente (misma cantidad de días, ventana anterior)
  const prevTotals = useMemo(() => activeBranches.map((branch) => {
    const bi = BRANCH_LIST.indexOf(branch);
    const nDays = chartDays.length || 1;
    const prev = Array.from({ length: nDays }, (_, di) =>
      seeded(400000 + bi * 120000, (di + nDays) * 7 + bi * 13)
    );
    return { branch, total: prev.reduce((a, b) => a + b, 0) };
  }), [activeBranches, chartDays.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const sessions = useMemo(() =>
    filters.sucursal === 'all' ? SESSIONS_ALL : SESSIONS_ALL.filter((s) => s.sucursal === filters.sucursal),
  [filters.sucursal]);

  const recent = useMemo(() =>
    filters.sucursal === 'all' ? RECENT_ALL : RECENT_ALL.filter((r) => r.sucursal === filters.sucursal),
  [filters.sucursal]);

  const KPI_ITEMS = [
    { id: 'sales',  label: 'Ventas del día',    value: money(1284500), hint: '+12% vs ayer' },
    { id: 'txn',    label: 'Transacciones',      value: '47',           hint: 'en el día' },
    { id: 'avg',    label: 'Ticket promedio',    value: money(27330),   hint: `meta: ${money(25000)}` },
    { id: 'stock',  label: 'Stock crítico',      value: '8 SKU',        hint: 'requieren reposición' },
  ];

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm capitalize text-slate-500 dark:text-slate-400">{todayLabel}</p>
        </div>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          Mockup — datos estáticos de referencia
        </span>
      </div>

      {/* Filter bar — mismo estilo visual que FilterBar.jsx */}
      <div className="mb-5 grid gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        style={{ gridTemplateColumns: 'minmax(180px,220px) auto 1fr auto' }}>

        {/* Sucursal */}
        <AutocompleteSelect
          value={filters.sucursal}
          onChange={(v) => set('sucursal', v || 'all')}
          options={BRANCH_OPTIONS}
          placeholder="Todas las sucursales"
          searchPlaceholder="Buscar sucursal"
          clearable={false}
          buttonClassName="h-10 shadow-none"
        />

        {/* Period presets */}
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

        {/* Custom date range */}
        <DateRangePicker
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          maxDays={365}
          onChange={({ from, to }) => setFilters((f) => ({ ...f, period: 'custom', dateFrom: from, dateTo: to }))}
        />

        {/* Clear */}
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

      {/* Row 1: KPIs diarios */}
      <KpiBar items={KPI_ITEMS} className="mb-5" />

      {/* Row 2: Bar chart — ancho completo */}
      <Card
        title={`Ventas por sucursal · ${filters.sucursal === 'all' ? 'todas las sucursales' : `Suc. ${filters.sucursal}`}`}
        icon={TrendingUp}
        className="mb-5"
      >
        <ReactApexChart
          options={chartOptions}
          series={chartSeries}
          type="bar"
          height={280}
          key={`bar-${filters.sucursal}-${filters.dateFrom}-${filters.dateTo}`}
        />
      </Card>

      {/* Row 3: Totales por sucursal + torta + variación */}
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
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {periodTotals.map((s) => {
              const pct = grandTotal > 0 ? ((s.total / grandTotal) * 100).toFixed(1) : '100.0';
              return (
                <div key={s.branch} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Sucursal {s.branch}</p>
                    <p className="text-xs text-slate-400">
                      {fmt(filters.dateFrom)} — {fmt(filters.dateTo)} · {chartDays.length} días
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{money(s.total)}</p>
                    {periodTotals.length > 1 && (
                      <p className="text-xs text-slate-400">{pct}% del total</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Participación por sucursal" icon={TrendingUp}>
          {periodTotals.length > 1 ? (
            <ReactApexChart
              options={{
                chart: { type: 'pie', background: 'transparent', fontFamily: 'inherit', toolbar: { show: false } },
                labels: periodTotals.map((s) => `Suc. ${s.branch}`),
                colors: periodTotals.map((s) => s.color),
                legend: { position: 'bottom', labels: { colors: isDark ? '#cbd5e1' : '#475569' } },
                dataLabels: {
                  style: { fontSize: '13px', fontWeight: 600 },
                  formatter: (val) => `${Number(val).toFixed(1)}%`,
                  dropShadow: { enabled: false },
                },
                tooltip: { y: { formatter: (_, { seriesIndex }) => money(periodTotals[seriesIndex]?.total ?? 0) } },
                theme: { mode: isDark ? 'dark' : 'light' },
              }}
              series={periodTotals.map((s) => s.total)}
              type="pie"
              height={300}
              key={`pie-${filters.sucursal}-${filters.dateFrom}-${filters.dateTo}`}
            />
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">
              Selecciona "Todas las sucursales" para ver la distribución.
            </div>
          )}
        </Card>

        <Card
          title="Variación vs período anterior"
          icon={TrendingUp}
          footer={(() => {
            if (periodTotals.length <= 1) return null;
            const prevGrand = prevTotals.reduce((a, s) => a + s.total, 0);
            const totalDiff = prevGrand > 0 ? ((grandTotal - prevGrand) / prevGrand) * 100 : 0;
            const up = totalDiff >= 0;
            return (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Total período</span>
                <span className={`flex items-center gap-1 text-sm font-bold ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {up ? '+' : ''}{totalDiff.toFixed(1)}%
                </span>
              </div>
            );
          })()}
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {periodTotals.map((s) => {
              const prev = prevTotals.find((p) => p.branch === s.branch);
              const diff = prev && prev.total > 0 ? ((s.total - prev.total) / prev.total) * 100 : 0;
              const up = diff >= 0;
              return (
                <div key={s.branch} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Sucursal {s.branch}</p>
                    <p className="text-xs text-slate-400">anterior: {money(prev?.total ?? 0)}</p>
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-semibold ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {up ? '+' : ''}{diff.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Row 4: Recent sales — ancho completo */}
      <SectionLabel>Actividad reciente</SectionLabel>
      <Card title="Últimas ventas" subtitle={`Hoy · ${new Date().toLocaleDateString('es-CL')}`} icon={ShoppingCart} className="mb-5">
        {recent.length === 0 ? (
          <p className="text-center text-sm text-slate-400">Sin ventas para la sucursal seleccionada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <Th>Folio</Th><Th>Hora</Th><Th>Estado</Th><Th>Sucursal</Th><Th>Caja</Th>
                  <Th>Vendedor</Th><Th>Cliente</Th><Th right>Items</Th><Th right>Total</Th><Th>Método</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {recent.map((r) => {
                  const statusMap = {
                    CLOSED:          { label: 'Cerrada',   cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
                    PENDING_CASHIER: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
                    CANCELLED:       { label: 'Anulada',   cls: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' },
                  };
                  const st = statusMap[r.status] ?? { label: r.status, cls: 'bg-slate-100 text-slate-500' };
                  return (
                    <tr key={r.id}>
                      <Td><span className="font-mono text-xs text-blue-600 dark:text-blue-400">{r.id}</span></Td>
                      <Td muted>{r.time}</Td>
                      <Td>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${st.cls}`}>{st.label}</span>
                      </Td>
                      <Td muted>{r.sucursal}</Td>
                      <Td muted>{r.caja}</Td>
                      <Td muted>{r.vendor}</Td>
                      <Td>{r.customer}</Td>
                      <Td right muted>{r.items}</Td>
                      <Td right><span className="font-medium">{money(r.total)}</span></Td>
                      <Td muted>{r.method}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Row 5: Más vendidos + Menos vendidos + Stock crítico */}
      <SectionLabel>Análisis de productos · {periodLabel}</SectionLabel>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Más vendidos" icon={TrendingUp}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Producto</Th><Th right>Uds.</Th><Th right>Total</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {TOP_PRODUCTS.map((p, i) => (
                <tr key={p.sku}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                        {i + 1}
                      </span>
                      <span className="truncate text-sm">{p.name}</span>
                    </div>
                  </Td>
                  <Td right muted>{p.units}</Td>
                  <Td right><span className="font-medium">{money(p.total)}</span></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Menos vendidos" icon={TrendingDown}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Producto</Th><Th right>Uds.</Th><Th right>Stock</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {LOW_MOVERS.map((p) => (
                <tr key={p.sku}>
                  <Td>
                    <div className="min-w-0">
                      <p className="truncate text-sm">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.sku}</p>
                    </div>
                  </Td>
                  <Td right>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                      {p.units}
                    </span>
                  </Td>
                  <Td right muted>{p.stock}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card
          title="Stock crítico"
          icon={AlertTriangle}
          footer={<p className="text-center text-xs text-slate-400">4 de 8 productos con stock crítico</p>}
        >
          <div className="space-y-3">
            {LOW_STOCK.map((p) => (
              <div key={p.sku} className="flex items-center gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                  p.stock === 0
                    ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                }`}>
                  {p.stock}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.sku} · mín. {p.min}</p>
                </div>
                {p.stock === 0 && (
                  <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700 dark:bg-red-950/40 dark:text-red-400">
                    Sin stock
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
};

export default Dashboard;
