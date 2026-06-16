import { useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { BarChart3, Download, Users, X } from 'lucide-react';
import KpiBar from '@/components/common/data/KpiBar';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import DateRangePicker from '@/components/common/forms/DateRangePicker';

const money   = (v) => Number(v).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const toISO   = (d) => d.toISOString().slice(0, 10);
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
const fmt     = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });

const downloadCSV = (filename, headers, rows) => {
  const esc   = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))];
  const blob  = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url   = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
};

// --- Constants -----------------------------------------------------------

const PERIODS = [
  { id: '7d',  label: '7 días',  days:  7 },
  { id: '15d', label: '15 días', days: 15 },
  { id: '30d', label: '30 días', days: 30 },
  { id: '60d', label: '60 días', days: 60 },
  { id: '90d', label: '90 días', days: 90 },
];

const BRANCH_OPTIONS = [
  { value: 'all',    label: 'Todas las sucursales' },
  { value: 'Centro', label: 'Sucursal Centro'       },
  { value: 'Mall',   label: 'Sucursal Mall'          },
  { value: 'Norte',  label: 'Sucursal Norte'         },
];

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Top customers (registered)
const TOP_CUSTOMERS = [
  { name: 'Carmen López',     purchases: 12, total: 342000, lastBuy: '16/06/2026', sucursal: 'Mall',   type: 'Registrado' },
  { name: 'Pedro Soto',       purchases:  9, total: 289500, lastBuy: '15/06/2026', sucursal: 'Centro', type: 'Registrado' },
  { name: 'Rosa Vidal',       purchases:  8, total: 241800, lastBuy: '16/06/2026', sucursal: 'Centro', type: 'Registrado' },
  { name: 'Jorge Soto',       purchases:  7, total: 198400, lastBuy: '14/06/2026', sucursal: 'Mall',   type: 'Registrado' },
  { name: 'Ricardo Herrera',  purchases:  6, total: 187200, lastBuy: '13/06/2026', sucursal: 'Norte',  type: 'Registrado' },
  { name: 'Ana Martínez',     purchases:  6, total: 176300, lastBuy: '16/06/2026', sucursal: 'Mall',   type: 'Registrado' },
  { name: 'María Fuentes',    purchases:  5, total: 142900, lastBuy: '12/06/2026', sucursal: 'Centro', type: 'Registrado' },
  { name: 'Luis Rojas',       purchases:  5, total: 138700, lastBuy: '15/06/2026', sucursal: 'Norte',  type: 'Registrado' },
];

// Inactive customers (no purchase in 30+ days)
const INACTIVE_CUSTOMERS = [
  { name: 'Patricia Torres',  lastBuy: '10/05/2026', daysSince: 37, totalHistoric: 489200, sucursal: 'Centro' },
  { name: 'Andrés Mora',      lastBuy: '05/05/2026', daysSince: 42, totalHistoric: 321400, sucursal: 'Mall'   },
  { name: 'Claudia Reyes',    lastBuy: '28/04/2026', daysSince: 49, totalHistoric: 214800, sucursal: 'Norte'  },
  { name: 'Felipe Navarro',   lastBuy: '22/04/2026', daysSince: 55, totalHistoric: 198300, sucursal: 'Centro' },
  { name: 'Valentina Cruz',   lastBuy: '15/04/2026', daysSince: 62, totalHistoric: 156700, sucursal: 'Mall'   },
];

const seeded = (base, seed) => {
  const r = Math.abs(Math.sin(seed * 9301 + 49297) * 233280);
  return Math.round(Math.max(1, base + (r % (base * 0.6)) - base * 0.3));
};
const periodFrom = (days) => toISO(addDays(new Date(), -(days - 1)));

// --- Sub-components ------------------------------------------------------

const Card = ({ title, subtitle, icon: Icon, children, footer, actions, className = '' }) => (
  <div className={`flex flex-col rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${className}`}>
    <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
      {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" />}
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</span>
        {subtitle && <span className="ml-2 text-xs text-slate-400">{subtitle}</span>}
      </div>
      {actions && <div className="ml-2 flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
    <div className="flex-1 p-5">{children}</div>
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

const DlBtn = ({ onClick }) => (
  <button type="button" onClick={onClick} title="Exportar CSV"
    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
    <Download className="h-4 w-4" />
  </button>
);

// --- Main ----------------------------------------------------------------

const defaultFilters = () => ({
  sucursal: 'all', period: '30d',
  dateFrom: toISO(addDays(new Date(), -29)), dateTo: toISO(new Date()),
});

const CustomerMetrics = () => {
  const [filters, setFilters] = useState(defaultFilters);
  const isDark = document.documentElement.classList.contains('dark');

  const set = (key, val) => setFilters((f) => ({ ...f, [key]: val }));
  const applyPeriod = (id) => {
    const p = PERIODS.find((x) => x.id === id);
    if (p) setFilters((f) => ({ ...f, period: id, dateFrom: periodFrom(p.days), dateTo: toISO(new Date()) }));
  };
  const clearFilters = () => setFilters(defaultFilters());
  const isFiltered   = filters.sucursal !== 'all' || filters.period !== '30d';

  const chartDays = useMemo(() => {
    if (!filters.dateFrom || !filters.dateTo) return [];
    const from = new Date(`${filters.dateFrom}T00:00:00`);
    const to   = new Date(`${filters.dateTo}T00:00:00`);
    const days = []; const cur = new Date(from);
    while (cur <= to) { days.push(toISO(cur)); cur.setDate(cur.getDate() + 1); }
    return days;
  }, [filters.dateFrom, filters.dateTo]);

  const chartLabels = chartDays.map((iso) => { const [, m, d] = iso.split('-'); return `${d}/${m}`; });

  // New customers per day (area chart)
  const newCustomersData = useMemo(() =>
    chartDays.map((_, di) => seeded(4, di * 7 + 3)),
  [chartDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalNew       = newCustomersData.reduce((a, b) => a + b, 0);
  const totalRegistered = 847;
  const recurrentCount  = Math.round(totalRegistered * 0.38);
  const avgTicket       = 31400;
  const consumerFinalPct = 62;
  const avgDaysBetween   = 18;

  // Filtered top customers
  const filteredTop = useMemo(() =>
    TOP_CUSTOMERS.filter((c) => filters.sucursal === 'all' || c.sucursal === filters.sucursal),
  [filters.sucursal]);

  const filteredInactive = useMemo(() =>
    INACTIVE_CUSTOMERS.filter((c) => filters.sucursal === 'all' || c.sucursal === filters.sucursal),
  [filters.sucursal]);

  // Customer type donut
  const typeData = [
    { label: 'Consumidor final', value: Math.round(totalNew * consumerFinalPct / 100), color: '#94a3b8' },
    { label: 'Registrado',       value: Math.round(totalNew * (100 - consumerFinalPct) / 100), color: '#3b82f6' },
  ];

  // Purchase frequency distribution
  const freqData = [
    { label: '1 compra',   value: Math.round(totalRegistered * 0.35) },
    { label: '2–3 compras',value: Math.round(totalRegistered * 0.30) },
    { label: '4–6 compras',value: Math.round(totalRegistered * 0.20) },
    { label: '7–10',       value: Math.round(totalRegistered * 0.10) },
    { label: '10+',        value: Math.round(totalRegistered * 0.05) },
  ];

  // Day of week distribution
  const weekData = useMemo(() =>
    WEEK_DAYS.map((_, i) => seeded(280 + (i === 5 || i === 6 ? 180 : 0), i * 9 + 4)),
  []);

  // Chart options
  const areaOptions = useMemo(() => ({
    chart: {
      type: 'area', background: 'transparent', fontFamily: 'inherit',
      toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } },
    },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.03, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    colors: ['#3b82f6'],
    xaxis: {
      categories: chartLabels,
      labels: { rotate: chartDays.length > 20 ? -45 : 0, style: { fontSize: '10px', colors: isDark ? '#94a3b8' : '#64748b' }, show: chartDays.length <= 90 },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: (v) => `${v}`, style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' } } },
    grid: { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => `${v} clientes nuevos` } },
    theme: { mode: isDark ? 'dark' : 'light' },
  }), [chartLabels, chartDays.length, isDark]); // eslint-disable-line react-hooks/exhaustive-deps

  const donutTypeOptions = useMemo(() => ({
    chart: { type: 'donut', background: 'transparent', fontFamily: 'inherit' },
    labels: typeData.map((t) => t.label),
    colors: typeData.map((t) => t.color),
    legend: { position: 'bottom', labels: { colors: isDark ? '#cbd5e1' : '#475569' } },
    dataLabels: { formatter: (val) => `${Number(val).toFixed(1)}%`, dropShadow: { enabled: false }, style: { fontSize: '11px', fontWeight: 600 } },
    plotOptions: { pie: { donut: { size: '55%' } } },
    theme: { mode: isDark ? 'dark' : 'light' },
  }), [typeData, isDark]);

  const freqBarOptions = useMemo(() => ({
    chart: { type: 'bar', background: 'transparent', fontFamily: 'inherit', toolbar: { show: false } },
    plotOptions: { bar: { columnWidth: '60%', borderRadius: 3 } },
    dataLabels: { enabled: false },
    colors: ['#8b5cf6'],
    xaxis: {
      categories: freqData.map((f) => f.label),
      labels: { style: { fontSize: '10px', colors: isDark ? '#94a3b8' : '#64748b' } },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' } } },
    grid: { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => `${v} clientes` } },
    theme: { mode: isDark ? 'dark' : 'light' },
  }), [freqData, isDark]);

  const weekBarOptions = useMemo(() => ({
    chart: {
      type: 'bar', background: 'transparent', fontFamily: 'inherit',
      toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } },
    },
    plotOptions: { bar: { columnWidth: '60%', borderRadius: 3 } },
    dataLabels: { enabled: false },
    colors: ['#10b981'],
    xaxis: {
      categories: WEEK_DAYS,
      labels: { style: { fontSize: '11px', colors: isDark ? '#94a3b8' : '#64748b' } },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' } } },
    grid: { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => `${v} transacciones` } },
    theme: { mode: isDark ? 'dark' : 'light' },
  }), [isDark]);

  const KPI_ITEMS = [
    { id: 'registered', label: 'Clientes registrados',  value: totalRegistered.toString(), hint: 'en base de datos'             },
    { id: 'new',        label: 'Nuevos en el período',   value: totalNew.toString(),        hint: `en ${chartDays.length} días`  },
    { id: 'recurrent',  label: 'Clientes recurrentes',   value: recurrentCount.toString(),  hint: `${((recurrentCount / totalRegistered) * 100).toFixed(0)}% del total` },
    { id: 'ticket',     label: 'Ticket promedio',        value: money(avgTicket),           hint: 'por cliente registrado'       },
    { id: 'final',      label: 'Consumidor final',       value: `${consumerFinalPct}%`,     hint: 'ventas sin cliente asignado'  },
    { id: 'days',       label: 'Días entre compras',     value: `${avgDaysBetween} días`,   hint: 'frecuencia promedio'          },
  ];

  const exportTopCustomers = () => {
    const headers = ['Cliente', 'Tipo', 'Sucursal preferida', 'Nº compras', 'Total (CLP)', 'Ticket prom. (CLP)', 'Última compra'];
    const rows = filteredTop.map((c) => [c.name, c.type, c.sucursal, c.purchases, c.total, Math.round(c.total / c.purchases), c.lastBuy]);
    downloadCSV(`top-clientes_${filters.dateFrom}_${filters.dateTo}.csv`, headers, rows);
  };

  const exportInactive = () => {
    const headers = ['Cliente', 'Última compra', 'Días inactivo', 'Total histórico (CLP)', 'Sucursal'];
    const rows = filteredInactive.map((c) => [c.name, c.lastBuy, c.daysSince, c.totalHistoric, c.sucursal]);
    downloadCSV(`clientes-inactivos_${filters.dateFrom}.csv`, headers, rows);
  };

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Métricas de clientes</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{fmt(filters.dateFrom)} — {fmt(filters.dateTo)} · {chartDays.length} días</p>
        </div>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          Mockup — datos estáticos de referencia
        </span>
      </div>

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="w-48 shrink-0">
          <AutocompleteSelect value={filters.sucursal} onChange={(v) => set('sucursal', v || 'all')}
            options={BRANCH_OPTIONS} placeholder="Todas las sucursales" clearable={false} buttonClassName="h-10 shadow-none" />
        </div>
        <div className="flex overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
          {PERIODS.map((p) => (
            <button key={p.id} type="button" onClick={() => applyPeriod(p.id)}
              className={`h-10 px-3 text-sm whitespace-nowrap transition-colors ${
                filters.period === p.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}>{p.label}</button>
          ))}
        </div>
        <DateRangePicker dateFrom={filters.dateFrom} dateTo={filters.dateTo} maxDays={365}
          onChange={({ from, to }) => setFilters((f) => ({ ...f, period: 'custom', dateFrom: from, dateTo: to }))} />
        {isFiltered && (
          <button type="button" onClick={clearFilters}
            className="flex h-10 items-center gap-1.5 rounded-md px-3 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}
      </div>

      <KpiBar items={KPI_ITEMS} className="mb-5" />

      {/* Nuevos clientes */}
      <Card title="Nuevos clientes registrados por día" icon={Users} className="mb-5"
        footer={
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total nuevos en el período</span>
            <span className="text-sm font-bold tabular-nums">{totalNew} clientes</span>
          </div>
        }
      >
        <ReactApexChart options={areaOptions} series={[{ name: 'Nuevos clientes', data: newCustomersData }]}
          type="area" height={250}
          key={`cust-area-${filters.sucursal}-${filters.dateFrom}-${filters.dateTo}`} />
      </Card>

      {/* 3 cols */}
      <div className="mb-5 grid gap-5 lg:grid-cols-3">

        <Card title="Tipo de cliente" icon={Users}
          footer={<p className="text-xs text-slate-400">{consumerFinalPct}% de las ventas sin cliente asignado</p>}
        >
          <ReactApexChart options={donutTypeOptions} series={typeData.map((t) => t.value)}
            type="donut" height={260}
            key={`cust-donut-${filters.sucursal}-${filters.dateFrom}-${filters.dateTo}`} />
        </Card>

        <Card title="Frecuencia de compra" subtitle="clientes registrados" icon={BarChart3}
          footer={<p className="text-xs text-slate-400">Distribución de clientes por número de compras históricas</p>}
        >
          <ReactApexChart options={freqBarOptions} series={[{ name: 'Clientes', data: freqData.map((f) => f.value) }]}
            type="bar" height={260} />
        </Card>

        <Card title="Transacciones por día de semana" icon={BarChart3}
          footer={<p className="text-xs text-slate-400">Promedio de ventas según día — sábado y domingo son los de mayor volumen</p>}
        >
          <ReactApexChart options={weekBarOptions} series={[{ name: 'Transacciones', data: weekData }]}
            type="bar" height={260} key={`cust-week-${filters.sucursal}`} />
        </Card>
      </div>

      {/* Top clientes */}
      <SectionLabel>Top clientes por monto comprado</SectionLabel>
      <Card title="Mejores clientes" subtitle={`${filteredTop.length} registros`}
        icon={Users} className="mb-5"
        actions={<DlBtn onClick={exportTopCustomers} />}
        footer={
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total acumulado</span>
            <span className="text-sm font-bold tabular-nums">{money(filteredTop.reduce((a, c) => a + c.total, 0))}</span>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Cliente</Th><Th>Sucursal</Th>
                <Th right>Nº compras</Th><Th right>Total</Th><Th right>Ticket prom.</Th><Th>Última compra</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {filteredTop.map((c, i) => (
                <tr key={c.name}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">{i + 1}</span>
                      <span>{c.name}</span>
                    </div>
                  </Td>
                  <Td muted>{c.sucursal}</Td>
                  <Td right muted>{c.purchases}</Td>
                  <Td right><span className="font-medium">{money(c.total)}</span></Td>
                  <Td right muted>{money(Math.round(c.total / c.purchases))}</Td>
                  <Td muted>{c.lastBuy}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Inactivos */}
      <SectionLabel>Clientes inactivos · sin compra en 30+ días</SectionLabel>
      <Card title="Clientes inactivos" subtitle={`${filteredInactive.length} registros`}
        icon={Users}
        actions={<DlBtn onClick={exportInactive} />}
        footer={<p className="text-xs text-slate-400">Considera campaña de reactivación para clientes con más de 45 días sin comprar</p>}
      >
        {filteredInactive.length === 0 ? (
          <p className="text-center text-sm text-emerald-600 dark:text-emerald-400">Sin clientes inactivos en la sucursal seleccionada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <Th>Cliente</Th><Th>Sucursal</Th><Th>Última compra</Th><Th right>Días inactivo</Th><Th right>Total histórico</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {filteredInactive.map((c) => (
                  <tr key={c.name}>
                    <Td>{c.name}</Td>
                    <Td muted>{c.sucursal}</Td>
                    <Td muted>{c.lastBuy}</Td>
                    <Td right>
                      <span className={`font-semibold ${c.daysSince > 50 ? 'text-red-500 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {c.daysSince}d
                      </span>
                    </Td>
                    <Td right><span className="font-medium">{money(c.totalHistoric)}</span></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

    </section>
  );
};

export default CustomerMetrics;
