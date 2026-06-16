import { useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { BarChart3, Download, ShoppingCart, Users, X } from 'lucide-react';
import KpiBar from '@/components/common/data/KpiBar';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import DateRangePicker from '@/components/common/forms/DateRangePicker';

const money = (v) => Number(v).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const toISO  = (d) => d.toISOString().slice(0, 10);
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
const fmt = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });

const downloadCSV = (filename, headers, rows) => {
  const esc  = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))];
  const blob  = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url   = URL.createObjectURL(blob);
  const a     = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
};

// --- Constants -----------------------------------------------------------

const BRANCH_LIST   = ['Centro', 'Mall', 'Norte'];
const BRANCH_COLORS = { Centro: '#3b82f6', Mall: '#10b981', Norte: '#f59e0b' };

const METHODS       = ['Efectivo', 'Débito', 'Crédito', 'Transferencia'];
const METHOD_COLORS = { Efectivo: '#10b981', Débito: '#3b82f6', Crédito: '#f59e0b', Transferencia: '#8b5cf6' };
const METHOD_WEIGHT = { Efectivo: 0.25, Débito: 0.40, Crédito: 0.20, Transferencia: 0.15 };

const STATUS_MAP = {
  CLOSED:          { label: 'Cerrada',   color: '#10b981', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  CANCELLED:       { label: 'Anulada',   color: '#ef4444', cls: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'                },
  PENDING_CASHIER: { label: 'Pendiente', color: '#f59e0b', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'        },
};

const VENDORS = [
  { name: 'María González', sucursal: 'Centro' },
  { name: 'Carlos Pérez',   sucursal: 'Centro' },
  { name: 'Ana Martínez',   sucursal: 'Mall'   },
  { name: 'Luis Rojas',     sucursal: 'Norte'  },
];

// Typical retail hourly traffic weights (hours 0-23)
const HOUR_WEIGHTS = [0, 0, 0, 0, 0, 0, 0, 0.05, 0.3, 0.9, 2.1, 2.6, 1.9, 1.1, 1.4, 2.3, 2.8, 2.7, 2.0, 1.4, 0.7, 0.3, 0.1, 0];

const PERIODS = [
  { id: 'today', label: 'Hoy',     days: 1  },
  { id: '7d',    label: '7 días',  days: 7  },
  { id: '15d',   label: '15 días', days: 15 },
  { id: '30d',   label: '30 días', days: 30 },
  { id: '45d',   label: '45 días', days: 45 },
  { id: '60d',   label: '60 días', days: 60 },
  { id: '90d',   label: '90 días', days: 90 },
];

const BRANCH_OPTIONS = [
  { value: 'all',    label: 'Todas las sucursales' },
  { value: 'Centro', label: 'Sucursal Centro' },
  { value: 'Mall',   label: 'Sucursal Mall'   },
  { value: 'Norte',  label: 'Sucursal Norte'  },
];
const STATUS_OPTIONS = [
  { value: 'all',             label: 'Todos los estados'  },
  { value: 'CLOSED',          label: 'Cerradas'           },
  { value: 'PENDING_CASHIER', label: 'Pendientes'         },
  { value: 'CANCELLED',       label: 'Anuladas'           },
];
const METHOD_OPTIONS = [
  { value: 'all',          label: 'Todos los métodos' },
  { value: 'Efectivo',     label: 'Efectivo'          },
  { value: 'Débito',       label: 'Débito'            },
  { value: 'Crédito',      label: 'Crédito'           },
  { value: 'Transferencia',label: 'Transferencia'     },
];

const seeded = (base, seed) => {
  const r = Math.abs(Math.sin(seed * 9301 + 49297) * 233280);
  return Math.round(base + (r % (base * 0.6)) - base * 0.3);
};

// --- Static detail rows --------------------------------------------------

const DETAIL_ALL = [
  { folio: 'V-00847', fecha: '16/06/2026', hora: '14:32', status: 'CLOSED',          tipo: 'Ticket', sucursal: 'Centro', caja: 'Caja 1', vendor: 'María González', customer: 'Consumidor final', subtotal:  28900, discount:    0, total:  28900, method: 'Débito',        items: 3 },
  { folio: 'V-00846', fecha: '16/06/2026', hora: '14:18', status: 'CLOSED',          tipo: 'Ticket', sucursal: 'Mall',   caja: 'Caja 1', vendor: 'Ana Martínez',   customer: 'Ana Martínez',     subtotal:  14500, discount:    0, total:  14500, method: 'Efectivo',      items: 1 },
  { folio: 'V-00845', fecha: '16/06/2026', hora: '13:55', status: 'CLOSED',          tipo: 'Boleta', sucursal: 'Centro', caja: 'Caja 2', vendor: 'Carlos Pérez',   customer: 'Pedro Soto',       subtotal:  74000, discount: 6800, total:  67200, method: 'Crédito',       items: 5 },
  { folio: 'V-00844', fecha: '16/06/2026', hora: '13:41', status: 'CLOSED',          tipo: 'Ticket', sucursal: 'Norte',  caja: 'Caja 1', vendor: 'Luis Rojas',     customer: 'Luis Rojas',       subtotal:  19800, discount:    0, total:  19800, method: 'Transferencia', items: 2 },
  { folio: 'V-00843', fecha: '16/06/2026', hora: '13:22', status: 'CANCELLED',       tipo: 'Ticket', sucursal: 'Mall',   caja: 'Caja 1', vendor: 'Ana Martínez',   customer: 'Consumidor final', subtotal:   8900, discount:    0, total:   8900, method: 'Efectivo',      items: 1 },
  { folio: 'V-00842', fecha: '16/06/2026', hora: '13:10', status: 'CLOSED',          tipo: 'Ticket', sucursal: 'Centro', caja: 'Caja 1', vendor: 'María González', customer: 'Rosa Vidal',       subtotal:  52300, discount:    0, total:  52300, method: 'Débito',        items: 4 },
  { folio: 'V-00841', fecha: '16/06/2026', hora: '12:48', status: 'CLOSED',          tipo: 'Ticket', sucursal: 'Norte',  caja: 'Caja 1', vendor: 'Luis Rojas',     customer: 'Consumidor final', subtotal:  17600, discount:    0, total:  17600, method: 'Efectivo',      items: 2 },
  { folio: 'V-00840', fecha: '16/06/2026', hora: '12:31', status: 'PENDING_CASHIER', tipo: 'Ticket', sucursal: 'Mall',   caja: 'Caja 1', vendor: 'Ana Martínez',   customer: 'Jorge Soto',       subtotal:  93400, discount:    0, total:  93400, method: 'Crédito',       items: 6 },
  { folio: 'V-00839', fecha: '16/06/2026', hora: '12:05', status: 'CLOSED',          tipo: 'Boleta', sucursal: 'Centro', caja: 'Caja 2', vendor: 'Carlos Pérez',   customer: 'María Fuentes',    subtotal:  39000, discount: 3900, total:  35100, method: 'Débito',        items: 3 },
  { folio: 'V-00838', fecha: '16/06/2026', hora: '11:52', status: 'CLOSED',          tipo: 'Ticket', sucursal: 'Mall',   caja: 'Caja 1', vendor: 'Ana Martínez',   customer: 'Consumidor final', subtotal:  45200, discount:    0, total:  45200, method: 'Débito',        items: 4 },
  { folio: 'V-00837', fecha: '16/06/2026', hora: '11:30', status: 'CANCELLED',       tipo: 'Ticket', sucursal: 'Norte',  caja: 'Caja 1', vendor: 'Luis Rojas',     customer: 'Consumidor final', subtotal:  12400, discount:    0, total:  12400, method: 'Efectivo',      items: 1 },
  { folio: 'V-00836', fecha: '16/06/2026', hora: '10:47', status: 'CLOSED',          tipo: 'Ticket', sucursal: 'Centro', caja: 'Caja 1', vendor: 'María González', customer: 'Consumidor final', subtotal:  61800, discount:    0, total:  61800, method: 'Crédito',       items: 5 },
  { folio: 'V-00835', fecha: '16/06/2026', hora: '10:21', status: 'CLOSED',          tipo: 'Boleta', sucursal: 'Mall',   caja: 'Caja 1', vendor: 'Ana Martínez',   customer: 'Carmen López',     subtotal:  88000, discount: 8800, total:  79200, method: 'Transferencia', items: 7 },
  { folio: 'V-00834', fecha: '16/06/2026', hora: '09:58', status: 'CLOSED',          tipo: 'Ticket', sucursal: 'Centro', caja: 'Caja 2', vendor: 'Carlos Pérez',   customer: 'Consumidor final', subtotal:  23100, discount:    0, total:  23100, method: 'Efectivo',      items: 2 },
  { folio: 'V-00833', fecha: '16/06/2026', hora: '09:32', status: 'CLOSED',          tipo: 'Ticket', sucursal: 'Norte',  caja: 'Caja 1', vendor: 'Luis Rojas',     customer: 'Ricardo Herrera',  subtotal:  34500, discount:    0, total:  34500, method: 'Débito',        items: 3 },
];

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

const StatusBadge = ({ status }) => {
  const st = STATUS_MAP[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500' };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${st.cls}`}>{st.label}</span>;
};

// --- Helpers -------------------------------------------------------------

const periodFrom = (days) => toISO(addDays(new Date(), -(days - 1)));
const defaultFilters = () => ({
  sucursal: 'all', period: '30d',
  dateFrom: toISO(addDays(new Date(), -29)), dateTo: toISO(new Date()),
  status: 'all', method: 'all',
});

// --- Main ----------------------------------------------------------------

const SalesMetrics = () => {
  const [filters, setFilters] = useState(defaultFilters);
  const isDark = document.documentElement.classList.contains('dark');

  const set = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  const applyPeriod = (periodId) => {
    const preset = PERIODS.find((p) => p.id === periodId);
    if (!preset) return;
    setFilters((f) => ({ ...f, period: periodId, dateFrom: periodFrom(preset.days), dateTo: toISO(new Date()) }));
  };

  const clearFilters = () => setFilters(defaultFilters());
  const isFiltered = filters.sucursal !== 'all' || filters.period !== '30d' || filters.status !== 'all' || filters.method !== 'all';

  // Days in range
  const chartDays = useMemo(() => {
    if (!filters.dateFrom || !filters.dateTo) return [];
    const from = new Date(`${filters.dateFrom}T00:00:00`);
    const to   = new Date(`${filters.dateTo}T00:00:00`);
    const days = [];
    const cur  = new Date(from);
    while (cur <= to) { days.push(toISO(cur)); cur.setDate(cur.getDate() + 1); }
    return days;
  }, [filters.dateFrom, filters.dateTo]);

  const chartLabels    = chartDays.map((iso) => { const [, m, d] = iso.split('-'); return `${d}/${m}`; });
  const activeBranches = filters.sucursal === 'all' ? BRANCH_LIST : [filters.sucursal];

  // Area series — one per branch
  const chartSeries = useMemo(() => activeBranches.map((branch) => {
    const bi = BRANCH_LIST.indexOf(branch);
    return {
      name: `Suc. ${branch}`,
      data: chartDays.map((_, di) => seeded(400000 + bi * 120000, di * 7 + bi * 13)),
      color: BRANCH_COLORS[branch],
    };
  }), [activeBranches, chartDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const periodTotals = useMemo(() =>
    chartSeries.map((s) => {
      const branch = s.name.replace('Suc. ', '');
      return { branch, total: s.data.reduce((a, b) => a + b, 0), color: BRANCH_COLORS[branch] };
    }),
  [chartSeries]);

  const grandTotal = periodTotals.reduce((a, s) => a + s.total, 0);

  // Previous equivalent period
  const prevTotals = useMemo(() => activeBranches.map((branch) => {
    const bi    = BRANCH_LIST.indexOf(branch);
    const nDays = chartDays.length || 1;
    const prev  = Array.from({ length: nDays }, (_, di) => seeded(400000 + bi * 120000, (di + nDays) * 7 + bi * 13));
    return { branch, total: prev.reduce((a, b) => a + b, 0) };
  }), [activeBranches, chartDays.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevGrand       = prevTotals.reduce((a, s) => a + s.total, 0);
  const totalVariation  = prevGrand > 0 ? ((grandTotal - prevGrand) / prevGrand) * 100 : 0;

  // KPI derivations
  const txnCount     = useMemo(() =>
    activeBranches.reduce((acc, _, i) => acc + seeded(280 + i * 60, chartDays.length * 3 + i), 0),
  [activeBranches, chartDays.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const avgTicket    = txnCount > 0 ? Math.round(grandTotal / txnCount) : 0;
  const avgDaily     = chartDays.length > 0 ? Math.round(grandTotal / chartDays.length) : 0;
  const totalDiscount = Math.round(grandTotal * 0.048);
  const cancelPct    = 4.3;

  // Method donut data
  const methodData = useMemo(() =>
    METHODS.map((m, i) => ({
      label: m,
      color: METHOD_COLORS[m],
      total: Math.round(grandTotal * METHOD_WEIGHT[m] * (0.8 + Math.abs(Math.sin(i * 5 + chartDays.length)) * 0.4)),
    })),
  [grandTotal, chartDays.length]);

  // Status breakdown
  const statusData = useMemo(() => [
    { code: 'CLOSED',          total: Math.round(grandTotal * 0.912), count: Math.round(txnCount * 0.912) },
    { code: 'CANCELLED',       total: Math.round(grandTotal * 0.043), count: Math.round(txnCount * 0.043) },
    { code: 'PENDING_CASHIER', total: Math.round(grandTotal * 0.045), count: Math.round(txnCount * 0.045) },
  ], [grandTotal, txnCount]);

  // Hourly distribution (average day for the period)
  const hourlyData = useMemo(() => {
    const dayBase = grandTotal / Math.max(chartDays.length, 1);
    return HOUR_WEIGHTS.map((w, h) =>
      Math.round(dayBase * w * (0.85 + Math.abs(Math.sin(h * 4.3)) * 0.3))
    );
  }, [grandTotal, chartDays.length]);

  // Vendor performance
  const vendorData = useMemo(() => {
    const vendors = filters.sucursal === 'all'
      ? VENDORS
      : VENDORS.filter((v) => v.sucursal === filters.sucursal);
    const share = grandTotal / VENDORS.length;
    return vendors.map((v) => {
      const bi    = VENDORS.indexOf(v);
      const total = Math.round(seeded(share, bi * 11 + chartDays.length * 3));
      const count = seeded(18 + bi * 4, bi * 7 + 2);
      return { ...v, total, count, avgTicket: Math.round(total / count), cancelled: Math.max(0, Math.round(count * 0.04)) };
    }).sort((a, b) => b.total - a.total);
  }, [filters.sucursal, chartDays.length, grandTotal]); // eslint-disable-line react-hooks/exhaustive-deps

  const vendorGrand = vendorData.reduce((a, v) => a + v.total, 0);

  // Filtered detail table
  const filteredSales = useMemo(() => DETAIL_ALL.filter((r) => {
    if (filters.sucursal !== 'all' && r.sucursal !== filters.sucursal) return false;
    if (filters.status  !== 'all' && r.status   !== filters.status)   return false;
    if (filters.method  !== 'all' && r.method   !== filters.method)   return false;
    return true;
  }), [filters.sucursal, filters.status, filters.method]);

  const detailTotal = filteredSales
    .filter((r) => r.status !== 'CANCELLED')
    .reduce((a, r) => a + r.total, 0);

  const exportVendors = () => {
    const headers = ['Vendedor', 'Sucursal', 'Nº ventas', 'Total (CLP)', 'Ticket promedio (CLP)', '% del total', 'Anuladas'];
    const rows = vendorData.map((v) => {
      const pct = vendorGrand > 0 ? ((v.total / vendorGrand) * 100).toFixed(1) : '0.0';
      return [v.name, v.sucursal, v.count, v.total, v.avgTicket, `${pct}%`, v.cancelled];
    });
    downloadCSV(`ventas-vendedor_${filters.dateFrom}_${filters.dateTo}.csv`, headers, rows);
  };

  const exportSales = () => {
    const headers = ['Folio', 'Fecha', 'Hora', 'Estado', 'Tipo', 'Sucursal', 'Caja', 'Vendedor', 'Cliente', 'Subtotal (CLP)', 'Descuento (CLP)', 'Total (CLP)', 'Método', 'Items'];
    const rows = filteredSales.map((r) => [
      r.folio, r.fecha, r.hora, STATUS_MAP[r.status]?.label ?? r.status, r.tipo,
      r.sucursal, r.caja, r.vendor, r.customer,
      r.subtotal, r.discount, r.total, r.method, r.items,
    ]);
    downloadCSV(`detalle-ventas_${filters.dateFrom}_${filters.dateTo}.csv`, headers, rows);
  };

  // Period label
  const periodLabel = (() => {
    const preset = PERIODS.find((p) => p.id === filters.period);
    if (preset) return preset.label.toLowerCase();
    if (filters.dateFrom && filters.dateTo) return `${fmt(filters.dateFrom)} — ${fmt(filters.dateTo)}`;
    return 'período';
  })();

  // Chart options
  const areaOptions = useMemo(() => ({
    chart: {
      type: 'area', stacked: false, background: 'transparent', fontFamily: 'inherit',
      toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } },
    },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.03, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: chartLabels,
      labels: { rotate: chartDays.length > 20 ? -45 : 0, style: { fontSize: '10px', colors: isDark ? '#94a3b8' : '#64748b' }, show: chartDays.length <= 90 },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: (v) => `$${(v / 1000).toFixed(0)}K`, style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' } } },
    grid: { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
    legend: { show: activeBranches.length > 1, position: 'top', horizontalAlign: 'left', labels: { colors: isDark ? '#cbd5e1' : '#475569' } },
    tooltip: { shared: true, y: { formatter: (v) => money(v) } },
    theme: { mode: isDark ? 'dark' : 'light' },
  }), [chartLabels, chartDays.length, isDark, activeBranches.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const donutMethodOptions = useMemo(() => ({
    chart: { type: 'donut', background: 'transparent', fontFamily: 'inherit' },
    labels: methodData.map((m) => m.label),
    colors: methodData.map((m) => m.color),
    legend: { position: 'bottom', labels: { colors: isDark ? '#cbd5e1' : '#475569' } },
    dataLabels: { formatter: (val) => `${Number(val).toFixed(1)}%`, dropShadow: { enabled: false }, style: { fontSize: '11px', fontWeight: 600 } },
    tooltip: { y: { formatter: (_, { seriesIndex }) => money(methodData[seriesIndex]?.total ?? 0) } },
    plotOptions: { pie: { donut: { size: '55%' } } },
    theme: { mode: isDark ? 'dark' : 'light' },
  }), [methodData, isDark]);

  const hourlyOptions = useMemo(() => ({
    chart: {
      type: 'bar', background: 'transparent', fontFamily: 'inherit',
      toolbar: {
        show: true,
        tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false },
        export: { png: { filename: 'distribucion-horaria' }, svg: { filename: 'distribucion-horaria' }, csv: { filename: 'distribucion-horaria' } },
      },
    },
    plotOptions: { bar: { columnWidth: '75%', borderRadius: 2 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}h`),
      labels: { style: { fontSize: '9px', colors: isDark ? '#94a3b8' : '#64748b' } },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: (v) => `$${(v / 1000).toFixed(0)}K`, style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '10px' } } },
    grid: { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
    colors: ['#3b82f6'],
    tooltip: { y: { formatter: (v) => money(v) } },
    theme: { mode: isDark ? 'dark' : 'light' },
  }), [isDark]);

  const KPI_ITEMS = [
    { id: 'total',    label: 'Total ventas',      value: money(grandTotal),    hint: `${totalVariation >= 0 ? '+' : ''}${totalVariation.toFixed(1)}% vs período ant.` },
    { id: 'txn',      label: 'Transacciones',      value: txnCount.toString(),  hint: 'documentos emitidos'                                                              },
    { id: 'avg',      label: 'Ticket promedio',    value: money(avgTicket),     hint: `meta: ${money(28000)}`                                                            },
    { id: 'daily',    label: 'Promedio diario',    value: money(avgDaily),      hint: `en ${chartDays.length} días`                                                      },
    { id: 'cancel',   label: 'Tasa de anulación',  value: `${cancelPct}%`,      hint: 'ventas anuladas'                                                                  },
    { id: 'discount', label: 'Descuentos totales', value: money(totalDiscount), hint: `${((totalDiscount / grandTotal) * 100).toFixed(1)}% del total`                   },
  ];

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">

      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Métricas de ventas</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {fmt(filters.dateFrom)} — {fmt(filters.dateTo)} · {chartDays.length} días
          </p>
        </div>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          Mockup — datos estáticos de referencia
        </span>
      </div>

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <div className="w-48 shrink-0">
          <AutocompleteSelect
            value={filters.sucursal}
            onChange={(v) => set('sucursal', v || 'all')}
            options={BRANCH_OPTIONS}
            placeholder="Todas las sucursales"
            searchPlaceholder="Buscar sucursal"
            clearable={false}
            buttonClassName="h-10 shadow-none"
          />
        </div>

        <div className="flex overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
          {PERIODS.map((p) => (
            <button key={p.id} type="button" onClick={() => applyPeriod(p.id)}
              className={`h-10 px-3 text-sm whitespace-nowrap transition-colors ${
                filters.period === p.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}>
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

        <div className="w-44 shrink-0">
          <AutocompleteSelect
            value={filters.status}
            onChange={(v) => set('status', v || 'all')}
            options={STATUS_OPTIONS}
            placeholder="Todos los estados"
            searchPlaceholder="Buscar estado"
            clearable={false}
            buttonClassName="h-10 shadow-none"
          />
        </div>

        <div className="w-44 shrink-0">
          <AutocompleteSelect
            value={filters.method}
            onChange={(v) => set('method', v || 'all')}
            options={METHOD_OPTIONS}
            placeholder="Todos los métodos"
            searchPlaceholder="Buscar método"
            clearable={false}
            buttonClassName="h-10 shadow-none"
          />
        </div>

        {isFiltered && (
          <button type="button" onClick={clearFilters}
            className="flex h-10 items-center gap-1.5 rounded-md px-3 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-3.5 w-3.5" />
            Limpiar
          </button>
        )}
      </div>

      {/* KPIs */}
      <KpiBar items={KPI_ITEMS} className="mb-5" />

      {/* Evolución temporal */}
      <Card
        title={`Evolución de ventas · ${filters.sucursal === 'all' ? 'todas las sucursales' : `Suc. ${filters.sucursal}`}`}
        icon={BarChart3}
        className="mb-5"
      >
        <ReactApexChart
          options={areaOptions}
          series={chartSeries}
          type="area"
          height={280}
          key={`area-${filters.sucursal}-${filters.dateFrom}-${filters.dateTo}`}
        />
      </Card>

      {/* 3 cols: por sucursal | por método | por estado */}
      <div className="mb-5 grid gap-5 lg:grid-cols-3">

        <Card
          title="Por sucursal"
          icon={BarChart3}
          footer={periodTotals.length > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Total período</span>
              <span className="text-sm font-bold tabular-nums">{money(grandTotal)}</span>
            </div>
          )}
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {periodTotals.map((s) => {
              const prev = prevTotals.find((p) => p.branch === s.branch);
              const pct  = grandTotal > 0 ? ((s.total / grandTotal) * 100).toFixed(1) : '100.0';
              const diff = prev && prev.total > 0 ? ((s.total - prev.total) / prev.total) * 100 : 0;
              const up   = diff >= 0;
              return (
                <div key={s.branch} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Suc. {s.branch}</p>
                    <p className="text-xs text-slate-400">{pct}% del total</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{money(s.total)}</p>
                    <p className={`text-xs font-medium ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      {up ? '+' : ''}{diff.toFixed(1)}% vs ant.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Por método de pago" icon={BarChart3}>
          <ReactApexChart
            options={donutMethodOptions}
            series={methodData.map((m) => m.total)}
            type="donut"
            height={260}
            key={`donut-${filters.sucursal}-${filters.dateFrom}-${filters.dateTo}`}
          />
        </Card>

        <Card
          title="Por estado de venta"
          icon={BarChart3}
          footer={
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Total documentos</span>
              <span className="text-sm font-bold tabular-nums">{txnCount}</span>
            </div>
          }
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {statusData.map((s) => {
              const st  = STATUS_MAP[s.code];
              const pct = txnCount > 0 ? ((s.count / txnCount) * 100).toFixed(1) : '0.0';
              return (
                <div key={s.code} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <StatusBadge status={s.code} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium tabular-nums">{s.count} docs · {pct}%</p>
                    <p className="text-xs text-slate-400">{st.label}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{money(s.total)}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Distribución horaria */}
      <Card
        title="Distribución horaria de ventas"
        subtitle={`promedio diario · ${periodLabel}`}
        icon={BarChart3}
        className="mb-5"
      >
        <ReactApexChart
          options={hourlyOptions}
          series={[{ name: 'Ventas', data: hourlyData }]}
          type="bar"
          height={220}
          key={`hourly-${filters.sucursal}-${filters.dateFrom}-${filters.dateTo}`}
        />
      </Card>

      {/* Rendimiento por vendedor */}
      <SectionLabel>Rendimiento por vendedor · {periodLabel}</SectionLabel>
      <Card
        title="Ventas por vendedor"
        icon={Users}
        className="mb-5"
        actions={
          <button type="button" onClick={exportVendors} title="Exportar CSV"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
            <Download className="h-4 w-4" />
          </button>
        }
        footer={
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total período</span>
            <span className="text-sm font-bold tabular-nums">{money(vendorGrand)}</span>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Vendedor</Th><Th>Sucursal</Th>
                <Th right>Nº ventas</Th><Th right>Total</Th><Th right>Ticket prom.</Th>
                <Th right>% del total</Th><Th right>Anuladas</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {vendorData.map((v, i) => {
                const pct = vendorGrand > 0 ? ((v.total / vendorGrand) * 100).toFixed(1) : '—';
                return (
                  <tr key={v.name}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                          {i + 1}
                        </span>
                        <span>{v.name}</span>
                      </div>
                    </Td>
                    <Td muted>{v.sucursal}</Td>
                    <Td right muted>{v.count}</Td>
                    <Td right><span className="font-medium">{money(v.total)}</span></Td>
                    <Td right muted>{money(v.avgTicket)}</Td>
                    <Td right muted>{pct}%</Td>
                    <Td right>
                      {v.cancelled > 0
                        ? <span className="text-red-500 dark:text-red-400">{v.cancelled}</span>
                        : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detalle de ventas */}
      <SectionLabel>Detalle de ventas · {periodLabel}</SectionLabel>
      <Card
        title="Documentos de venta"
        subtitle={`${filteredSales.length} registros`}
        icon={ShoppingCart}
        actions={
          <button type="button" onClick={exportSales} title="Exportar CSV"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
            <Download className="h-4 w-4" />
          </button>
        }
        footer={filteredSales.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total (sin anuladas)</span>
            <span className="text-sm font-bold tabular-nums">{money(detailTotal)}</span>
          </div>
        )}
      >
        {filteredSales.length === 0 ? (
          <p className="text-center text-sm text-slate-400">Sin ventas para los filtros seleccionados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <Th>Folio</Th><Th>Fecha</Th><Th>Hora</Th><Th>Estado</Th><Th>Tipo</Th>
                  <Th>Sucursal</Th><Th>Caja</Th><Th>Vendedor</Th><Th>Cliente</Th>
                  <Th right>Subtotal</Th><Th right>Dto.</Th><Th right>Total</Th>
                  <Th>Método</Th><Th right>Items</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {filteredSales.map((r) => (
                  <tr key={r.folio} className={r.status === 'CANCELLED' ? 'opacity-50' : ''}>
                    <Td><span className="font-mono text-xs text-blue-600 dark:text-blue-400">{r.folio}</span></Td>
                    <Td muted>{r.fecha}</Td>
                    <Td muted>{r.hora}</Td>
                    <Td><StatusBadge status={r.status} /></Td>
                    <Td muted>{r.tipo}</Td>
                    <Td muted>{r.sucursal}</Td>
                    <Td muted>{r.caja}</Td>
                    <Td muted>{r.vendor}</Td>
                    <Td>{r.customer}</Td>
                    <Td right muted>{money(r.subtotal)}</Td>
                    <Td right>
                      {r.discount > 0
                        ? <span className="text-amber-600 dark:text-amber-400">-{money(r.discount)}</span>
                        : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </Td>
                    <Td right><span className="font-medium">{money(r.total)}</span></Td>
                    <Td muted>{r.method}</Td>
                    <Td right muted>{r.items}</Td>
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

export default SalesMetrics;
