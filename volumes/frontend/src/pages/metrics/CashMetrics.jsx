import { useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { BarChart3, Download, Wallet, X } from 'lucide-react';
import KpiBar from '@/components/common/data/KpiBar';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import DateRangePicker from '@/components/common/forms/DateRangePicker';

const money  = (v) => Number(v).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const toISO  = (d) => d.toISOString().slice(0, 10);
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
const fmt    = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });

const downloadCSV = (filename, headers, rows) => {
  const esc   = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))];
  const blob  = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url   = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
};

// --- Constants -----------------------------------------------------------

const BRANCH_LIST    = ['Centro', 'Mall', 'Norte'];
const BRANCH_COLORS  = { Centro: '#3b82f6', Mall: '#10b981', Norte: '#f59e0b' };

const REGISTER_LIST = [
  { id: 'C-1', name: 'Caja 1', sucursal: 'Centro', label: 'Centro · Caja 1' },
  { id: 'C-2', name: 'Caja 2', sucursal: 'Centro', label: 'Centro · Caja 2' },
  { id: 'C-3', name: 'Caja 3', sucursal: 'Centro', label: 'Centro · Caja 3' },
  { id: 'M-1', name: 'Caja 1', sucursal: 'Mall',   label: 'Mall · Caja 1'   },
  { id: 'M-2', name: 'Caja 2', sucursal: 'Mall',   label: 'Mall · Caja 2'   },
  { id: 'N-1', name: 'Caja 1', sucursal: 'Norte',  label: 'Norte · Caja 1'  },
];

const METHODS       = ['Efectivo', 'Débito', 'Crédito', 'Transferencia'];
const METHOD_COLORS = { Efectivo: '#10b981', Débito: '#3b82f6', Crédito: '#f59e0b', Transferencia: '#8b5cf6' };
const METHOD_WEIGHT = { Efectivo: 0.25, Débito: 0.40, Crédito: 0.20, Transferencia: 0.15 };

const SESSIONS_ALL = [
  { id: 'S-1048', sucursal: 'Centro', caja: 'Caja 1', operator: 'María González', open: '09:02', close: '18:51', txn: 52, collected: 312400, expected: 314000, diff: -1600, status: 'CLOSED' },
  { id: 'S-1047', sucursal: 'Centro', caja: 'Caja 2', operator: 'Carlos Pérez',   open: '09:15', close: '18:44', txn: 44, collected: 268900, expected: 268900, diff:     0, status: 'CLOSED' },
  { id: 'S-1046', sucursal: 'Mall',   caja: 'Caja 1', operator: 'Ana Martínez',   open: '10:01', close: '21:03', txn: 68, collected: 489200, expected: 487500, diff:  1700, status: 'CLOSED' },
  { id: 'S-1045', sucursal: 'Mall',   caja: 'Caja 2', operator: 'Ana Martínez',   open: '10:00', close: '20:58', txn: 41, collected: 214300, expected: 214300, diff:     0, status: 'CLOSED' },
  { id: 'S-1044', sucursal: 'Norte',  caja: 'Caja 1', operator: 'Luis Rojas',     open: '09:30', close: '18:30', txn: 37, collected: 198700, expected: 199500, diff:  -800, status: 'CLOSED' },
  { id: 'S-1043', sucursal: 'Centro', caja: 'Caja 1', operator: 'María González', open: '09:00', close: '18:55', txn: 49, collected: 295600, expected: 295600, diff:     0, status: 'CLOSED' },
  { id: 'S-1042', sucursal: 'Centro', caja: 'Caja 2', operator: 'Carlos Pérez',   open: '09:10', close: '19:01', txn: 38, collected: 241800, expected: 243000, diff: -1200, status: 'CLOSED' },
  { id: 'S-1041', sucursal: 'Mall',   caja: 'Caja 1', operator: 'Ana Martínez',   open: '10:00', close: '21:00', txn: 71, collected: 512400, expected: 511000, diff:  1400, status: 'CLOSED' },
  { id: 'S-1040', sucursal: 'Norte',  caja: 'Caja 1', operator: 'Luis Rojas',     open: '09:28', close: '18:35', txn: 33, collected: 187900, expected: 187900, diff:     0, status: 'CLOSED' },
  { id: 'S-1039', sucursal: 'Centro', caja: 'Caja 3', operator: '—',              open: '—',     close: '—',     txn:  0, collected:      0, expected:      0, diff:     0, status: 'OPEN'   },
];

const STATUS_MAP_SESSION = {
  CLOSED: { label: 'Cerrada', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  OPEN:   { label: 'Abierta', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'            },
};

const PERIODS = [
  { id: '7d',  label: '7 días',  days:  7 },
  { id: '15d', label: '15 días', days: 15 },
  { id: '30d', label: '30 días', days: 30 },
  { id: '45d', label: '45 días', days: 45 },
  { id: '60d', label: '60 días', days: 60 },
  { id: '90d', label: '90 días', days: 90 },
];

const BRANCH_OPTIONS = [
  { value: 'all',    label: 'Todas las sucursales' },
  { value: 'Centro', label: 'Sucursal Centro'       },
  { value: 'Mall',   label: 'Sucursal Mall'          },
  { value: 'Norte',  label: 'Sucursal Norte'         },
];
const REGISTER_OPTIONS = [
  { value: 'all', label: 'Todas las cajas' },
  ...REGISTER_LIST.map((r) => ({ value: r.id, label: r.label })),
];

const seeded = (base, seed) => {
  const r = Math.abs(Math.sin(seed * 9301 + 49297) * 233280);
  return Math.round(base + (r % (base * 0.6)) - base * 0.3);
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
  sucursal: 'all', register: 'all', period: '30d',
  dateFrom: toISO(addDays(new Date(), -29)), dateTo: toISO(new Date()),
});

const CashMetrics = () => {
  const [filters, setFilters] = useState(defaultFilters);
  const isDark = document.documentElement.classList.contains('dark');

  const set = (key, val) => setFilters((f) => ({ ...f, [key]: val }));
  const applyPeriod = (id) => {
    const p = PERIODS.find((x) => x.id === id);
    if (p) setFilters((f) => ({ ...f, period: id, dateFrom: periodFrom(p.days), dateTo: toISO(new Date()) }));
  };
  const clearFilters = () => setFilters(defaultFilters());
  const isFiltered   = filters.sucursal !== 'all' || filters.register !== 'all' || filters.period !== '30d';

  const chartDays = useMemo(() => {
    if (!filters.dateFrom || !filters.dateTo) return [];
    const from = new Date(`${filters.dateFrom}T00:00:00`);
    const to   = new Date(`${filters.dateTo}T00:00:00`);
    const days = []; const cur = new Date(from);
    while (cur <= to) { days.push(toISO(cur)); cur.setDate(cur.getDate() + 1); }
    return days;
  }, [filters.dateFrom, filters.dateTo]);

  const chartLabels = chartDays.map((iso) => { const [, m, d] = iso.split('-'); return `${d}/${m}`; });

  // Active branches / registers
  const activeBranches = filters.sucursal === 'all' ? BRANCH_LIST : [filters.sucursal];
  const activeRegisters = useMemo(() =>
    REGISTER_LIST.filter((r) =>
      (filters.sucursal === 'all' || r.sucursal === filters.sucursal) &&
      (filters.register === 'all' || r.id === filters.register)
    ),
  [filters.sucursal, filters.register]);

  // Bar chart: recaudación por sucursal por día
  const barSeries = useMemo(() => activeBranches.map((branch) => {
    const bi = BRANCH_LIST.indexOf(branch);
    return {
      name: `Suc. ${branch}`,
      data: chartDays.map((_, di) => seeded(280000 + bi * 80000, di * 7 + bi * 11)),
      color: BRANCH_COLORS[branch],
    };
  }), [activeBranches, chartDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const periodTotals = useMemo(() =>
    barSeries.map((s) => ({ branch: s.name.replace('Suc. ', ''), total: s.data.reduce((a, b) => a + b, 0), color: BRANCH_COLORS[s.name.replace('Suc. ', '')] })),
  [barSeries]);

  const grandTotal   = periodTotals.reduce((a, s) => a + s.total, 0);
  const totalTxn     = useMemo(() => activeRegisters.reduce((acc, _, i) => acc + seeded(220 + i * 40, chartDays.length * 3 + i), 0), [activeRegisters, chartDays.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const closedSessions = SESSIONS_ALL.filter((s) => s.status === 'CLOSED' && (filters.sucursal === 'all' || s.sucursal === filters.sucursal));
  const diffSum      = closedSessions.reduce((a, s) => a + s.diff, 0);
  const sessionsWithDiff = closedSessions.filter((s) => s.diff !== 0).length;

  // Method distribution
  const methodData = useMemo(() =>
    METHODS.map((m, i) => ({
      label: m, color: METHOD_COLORS[m],
      total: Math.round(grandTotal * METHOD_WEIGHT[m] * (0.8 + Math.abs(Math.sin(i * 5 + chartDays.length)) * 0.4)),
    })),
  [grandTotal, chartDays.length]);

  // Session differences bar
  const sessionDiffs = closedSessions.slice(0, 8).map((s) => s.diff);
  const sessionIds   = closedSessions.slice(0, 8).map((s) => s.id);

  // Filtered sessions table
  const filteredSessions = SESSIONS_ALL.filter((s) =>
    (filters.sucursal === 'all' || s.sucursal === filters.sucursal) &&
    (filters.register === 'all' || REGISTER_LIST.some((r) => r.id === filters.register && r.name === s.caja && r.sucursal === s.sucursal))
  );

  // Chart options
  const barOptions = useMemo(() => ({
    chart: {
      type: 'bar', stacked: false, background: 'transparent', fontFamily: 'inherit',
      toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } },
    },
    plotOptions: { bar: { columnWidth: chartDays.length > 30 ? '90%' : '65%', borderRadius: 2 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: chartLabels,
      labels: { rotate: chartDays.length > 20 ? -45 : 0, style: { fontSize: '10px', colors: isDark ? '#94a3b8' : '#64748b' }, show: chartDays.length <= 90 },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: (v) => `$${(v / 1000).toFixed(0)}K`, style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' } } },
    grid: { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
    legend: { show: activeBranches.length > 1, position: 'top', horizontalAlign: 'left', labels: { colors: isDark ? '#cbd5e1' : '#475569' } },
    tooltip: { y: { formatter: (v) => money(v) } },
    theme: { mode: isDark ? 'dark' : 'light' },
  }), [chartLabels, chartDays.length, isDark, activeBranches.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const donutOptions = useMemo(() => ({
    chart: { type: 'donut', background: 'transparent', fontFamily: 'inherit' },
    labels: methodData.map((m) => m.label),
    colors: methodData.map((m) => m.color),
    legend: { position: 'bottom', labels: { colors: isDark ? '#cbd5e1' : '#475569' } },
    dataLabels: { formatter: (val) => `${Number(val).toFixed(1)}%`, dropShadow: { enabled: false }, style: { fontSize: '11px', fontWeight: 600 } },
    tooltip: { y: { formatter: (_, { seriesIndex }) => money(methodData[seriesIndex]?.total ?? 0) } },
    plotOptions: { pie: { donut: { size: '55%' } } },
    theme: { mode: isDark ? 'dark' : 'light' },
  }), [methodData, isDark]);

  const diffBarOptions = useMemo(() => ({
    chart: {
      type: 'bar', background: 'transparent', fontFamily: 'inherit',
      toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } },
    },
    plotOptions: { bar: { columnWidth: '60%', borderRadius: 2, colors: { ranges: [{ from: -999999, to: -1, color: '#ef4444' }, { from: 0, to: 0, color: '#94a3b8' }, { from: 1, to: 999999, color: '#10b981' }] } } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: sessionIds,
      labels: { style: { fontSize: '10px', colors: isDark ? '#94a3b8' : '#64748b' } },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: (v) => money(v), style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '10px' } } },
    grid: { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => `${v >= 0 ? '+' : ''}${money(v)}` } },
    theme: { mode: isDark ? 'dark' : 'light' },
  }), [sessionIds, isDark]); // eslint-disable-line react-hooks/exhaustive-deps

  const KPI_ITEMS = [
    { id: 'total',    label: 'Total recaudado',      value: money(grandTotal),                                      hint: `en ${chartDays.length} días`          },
    { id: 'sessions', label: 'Sesiones cerradas',    value: closedSessions.length.toString(),                       hint: `de ${SESSIONS_ALL.length} registradas` },
    { id: 'diff',     label: 'Diferencia acumulada', value: `${diffSum >= 0 ? '+' : ''}${money(diffSum)}`,          hint: diffSum === 0 ? 'sin diferencias' : diffSum > 0 ? 'sobrante' : 'faltante' },
    { id: 'avg',      label: 'Promedio por sesión',  value: money(closedSessions.length > 0 ? Math.round(grandTotal / closedSessions.length) : 0), hint: 'recaudado por sesión' },
    { id: 'withdiff', label: 'Sesiones con diff.',   value: sessionsWithDiff.toString(),                            hint: `${((sessionsWithDiff / Math.max(closedSessions.length, 1)) * 100).toFixed(1)}% del total` },
    { id: 'txn',      label: 'Transacciones',         value: totalTxn.toString(),                                   hint: 'documentos emitidos'                  },
  ];

  const exportSessions = () => {
    const headers = ['ID Sesión', 'Sucursal', 'Caja', 'Operador', 'Apertura', 'Cierre', 'Transacciones', 'Recaudado (CLP)', 'Esperado (CLP)', 'Diferencia (CLP)', 'Estado'];
    const rows = filteredSessions.map((s) => [s.id, s.sucursal, s.caja, s.operator, s.open, s.close, s.txn, s.collected, s.expected, s.diff, STATUS_MAP_SESSION[s.status]?.label ?? s.status]);
    downloadCSV(`sesiones-caja_${filters.dateFrom}_${filters.dateTo}.csv`, headers, rows);
  };

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Métricas de caja</h1>
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
        <div className="w-48 shrink-0">
          <AutocompleteSelect value={filters.register} onChange={(v) => set('register', v || 'all')}
            options={REGISTER_OPTIONS} placeholder="Todas las cajas" clearable={false} buttonClassName="h-10 shadow-none" />
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

      {/* Recaudación por sucursal */}
      <Card
        title={`Recaudación por sucursal · ${filters.sucursal === 'all' ? 'todas' : `Suc. ${filters.sucursal}`}`}
        icon={BarChart3} className="mb-5"
      >
        <ReactApexChart options={barOptions} series={barSeries} type="bar" height={270}
          key={`cash-bar-${filters.sucursal}-${filters.dateFrom}-${filters.dateTo}`} />
      </Card>

      {/* 3 cols */}
      <div className="mb-5 grid gap-5 lg:grid-cols-3">

        <Card title="Por método de pago" icon={BarChart3}>
          <ReactApexChart options={donutOptions} series={methodData.map((m) => m.total)} type="donut" height={260}
            key={`cash-donut-${filters.sucursal}-${filters.dateFrom}-${filters.dateTo}`} />
        </Card>

        <Card title="Diferencias por sesión" subtitle="sobrante / faltante" icon={BarChart3}>
          <ReactApexChart options={diffBarOptions} series={[{ name: 'Diferencia', data: sessionDiffs }]} type="bar" height={260}
            key={`cash-diff-${filters.sucursal}-${filters.dateFrom}-${filters.dateTo}`} />
        </Card>

        <Card title="Recaudación por sucursal" icon={Wallet}
          footer={
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Total período</span>
              <span className="text-sm font-bold tabular-nums">{money(grandTotal)}</span>
            </div>
          }
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {periodTotals.map((s) => {
              const pct = grandTotal > 0 ? ((s.total / grandTotal) * 100).toFixed(1) : '100.0';
              return (
                <div key={s.branch} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Suc. {s.branch}</p>
                    <p className="text-xs text-slate-400">{pct}% del total</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{money(s.total)}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Sesiones */}
      <SectionLabel>Historial de sesiones · {fmt(filters.dateFrom)} — {fmt(filters.dateTo)}</SectionLabel>
      <Card title="Sesiones de caja" subtitle={`${filteredSessions.length} registros`}
        icon={Wallet}
        actions={<DlBtn onClick={exportSessions} />}
        footer={
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total recaudado</span>
            <span className="text-sm font-bold tabular-nums">{money(filteredSessions.reduce((a, s) => a + s.collected, 0))}</span>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Sesión</Th><Th>Sucursal</Th><Th>Caja</Th><Th>Operador</Th>
                <Th>Apertura</Th><Th>Cierre</Th><Th right>Txn</Th>
                <Th right>Recaudado</Th><Th right>Diferencia</Th><Th>Estado</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {filteredSessions.map((s) => {
                const st  = STATUS_MAP_SESSION[s.status] ?? { label: s.status, cls: 'bg-slate-100 text-slate-500' };
                const up  = s.diff > 0;
                const zero = s.diff === 0;
                return (
                  <tr key={s.id}>
                    <Td><span className="font-mono text-xs text-blue-600 dark:text-blue-400">{s.id}</span></Td>
                    <Td muted>{s.sucursal}</Td>
                    <Td muted>{s.caja}</Td>
                    <Td>{s.operator}</Td>
                    <Td muted>{s.open}</Td>
                    <Td muted>{s.close}</Td>
                    <Td right muted>{s.txn || '—'}</Td>
                    <Td right><span className="font-medium">{s.collected > 0 ? money(s.collected) : '—'}</span></Td>
                    <Td right>
                      {s.status === 'OPEN' ? <span className="text-slate-300 dark:text-slate-600">—</span> : (
                        <span className={`font-semibold ${zero ? 'text-slate-400' : up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                          {zero ? '—' : `${up ? '+' : ''}${money(s.diff)}`}
                        </span>
                      )}
                    </Td>
                    <Td>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${st.cls}`}>{st.label}</span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

    </section>
  );
};

export default CashMetrics;
