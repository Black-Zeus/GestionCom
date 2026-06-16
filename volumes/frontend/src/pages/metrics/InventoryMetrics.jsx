import { useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { AlertTriangle, BarChart3, Boxes, Download, X } from 'lucide-react';
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

const CATEGORIES  = ['Blusas', 'Pantalones', 'Zapatos', 'Accesorios', 'Outerwear', 'Vestidos'];
const CAT_COLORS  = { Blusas: '#3b82f6', Pantalones: '#10b981', Zapatos: '#f59e0b', Accesorios: '#8b5cf6', Outerwear: '#ef4444', Vestidos: '#ec4899' };

const PRODUCTS = [
  { sku: 'BLU-BLK-L',  name: 'Blusa negra L',       category: 'Blusas',     stock: 45, min: 10, cost:  8500, price: 14900, sold30: 38 },
  { sku: 'CAL-GRI-S',  name: 'Calza gris S',         category: 'Blusas',     stock: 62, min: 15, cost:  4200, price:  7900, sold30: 29 },
  { sku: 'PAN-AZU-30', name: 'Pantalón azul 30',     category: 'Pantalones', stock: 28, min:  8, cost: 15000, price: 26900, sold30: 16 },
  { sku: 'FAL-AZU-M',  name: 'Falda azul M',         category: 'Vestidos',   stock: 18, min:  8, cost: 12000, price: 21900, sold30: 20 },
  { sku: 'BOL-CAF-UN', name: 'Bolso café unisex',    category: 'Accesorios', stock: 15, min:  5, cost: 18000, price: 32900, sold30:  5 },
  { sku: 'SAC-ROS-XS', name: 'Saco rosado XS',       category: 'Outerwear',  stock: 12, min:  6, cost: 24000, price: 44900, sold30:  3 },
  { sku: 'VES-AMA-S',  name: 'Vestido amarillo S',   category: 'Vestidos',   stock:  8, min:  6, cost: 19000, price: 34900, sold30:  3 },
  { sku: 'PAR-BEI-M',  name: 'Parka beige M',        category: 'Outerwear',  stock:  8, min: 10, cost: 32000, price: 59900, sold30: 31 },
  { sku: 'GOR-AZU-UN', name: 'Gorro azul unisex',    category: 'Accesorios', stock: 18, min:  5, cost:  3500, price:  6900, sold30:  2 },
  { sku: 'BUF-GRI-UN', name: 'Bufanda gris unisex',  category: 'Accesorios', stock: 20, min:  5, cost:  4000, price:  7500, sold30:  2 },
  { sku: 'POL-VER-XL', name: 'Polera verde XL',      category: 'Blusas',     stock:  3, min: 12, cost:  5800, price:  9900, sold30: 24 },
  { sku: 'CAM-BLU-M',  name: 'Camisa azul M',        category: 'Blusas',     stock:  2, min: 10, cost:  9500, price: 16900, sold30: 18 },
  { sku: 'CIN-CAF-L',  name: 'Cinturón café L',      category: 'Accesorios', stock:  3, min:  6, cost:  6500, price: 11900, sold30:  8 },
  { sku: 'ZAP-MAR-38', name: 'Zapato marrón 38',     category: 'Zapatos',    stock:  1, min:  8, cost: 22000, price: 39900, sold30: 12 },
  { sku: 'PAN-NEG-32', name: 'Pantalón negro 32',    category: 'Pantalones', stock:  0, min:  5, cost: 14000, price: 24900, sold30: 15 },
];

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
const CAT_OPTIONS = [
  { value: 'all', label: 'Todas las categorías' },
  ...CATEGORIES.map((c) => ({ value: c, label: c })),
];

const seeded = (base, seed) => {
  const r = Math.abs(Math.sin(seed * 9301 + 49297) * 233280);
  return Math.round(Math.max(base * 0.1, base + (r % (base * 0.6)) - base * 0.3));
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
  sucursal: 'all', category: 'all', period: '30d',
  dateFrom: toISO(addDays(new Date(), -29)), dateTo: toISO(new Date()),
});

const InventoryMetrics = () => {
  const [filters, setFilters] = useState(defaultFilters);
  const isDark = document.documentElement.classList.contains('dark');

  const set = (key, val) => setFilters((f) => ({ ...f, [key]: val }));
  const applyPeriod = (id) => {
    const p = PERIODS.find((x) => x.id === id);
    if (p) setFilters((f) => ({ ...f, period: id, dateFrom: periodFrom(p.days), dateTo: toISO(new Date()) }));
  };
  const clearFilters  = () => setFilters(defaultFilters());
  const isFiltered    = filters.sucursal !== 'all' || filters.category !== 'all' || filters.period !== '30d';

  // Days range (for movements chart)
  const chartDays = useMemo(() => {
    if (!filters.dateFrom || !filters.dateTo) return [];
    const from = new Date(`${filters.dateFrom}T00:00:00`);
    const to   = new Date(`${filters.dateTo}T00:00:00`);
    const days = []; const cur = new Date(from);
    while (cur <= to) { days.push(toISO(cur)); cur.setDate(cur.getDate() + 1); }
    return days;
  }, [filters.dateFrom, filters.dateTo]);

  const chartLabels = chartDays.map((iso) => { const [, m, d] = iso.split('-'); return `${d}/${m}`; });

  // Filtered products
  const filteredProducts = useMemo(() =>
    PRODUCTS.filter((p) => filters.category === 'all' || p.category === filters.category),
  [filters.category]);

  // KPIs
  const totalValue    = filteredProducts.reduce((a, p) => a + p.stock * p.price, 0);
  const criticalItems = filteredProducts.filter((p) => p.stock > 0 && p.stock < p.min);
  const outItems      = filteredProducts.filter((p) => p.stock === 0);
  const avgCoverage   = Math.round(
    filteredProducts.reduce((a, p) => a + (p.sold30 > 0 ? (p.stock / p.sold30) * 30 : 90), 0) /
    Math.max(filteredProducts.length, 1)
  );
  const riskValue     = [...criticalItems, ...outItems].reduce((a, p) => a + (p.min - Math.max(p.stock, 0)) * p.cost, 0);

  // Movements area chart
  const movSeries = useMemo(() => {
    const base = filteredProducts.reduce((a, p) => a + p.sold30, 0);
    return [
      { name: 'Entradas', color: '#10b981', data: chartDays.map((_, di) => seeded(base * 12, di * 7 + 3)) },
      { name: 'Salidas',  color: '#3b82f6', data: chartDays.map((_, di) => seeded(base * 15, di * 7 + 5)) },
    ];
  }, [filteredProducts, chartDays]); // eslint-disable-line react-hooks/exhaustive-deps

  // Category value data (all categories, for chart)
  const catData = useMemo(() =>
    CATEGORIES.map((cat) => ({
      cat,
      value: PRODUCTS.filter((p) => p.category === cat).reduce((a, p) => a + p.stock * p.price, 0),
      color: CAT_COLORS[cat],
    })).sort((a, b) => b.value - a.value),
  []);

  const totalCatValue = catData.reduce((a, c) => a + c.value, 0);

  // Sorted by rotation
  const byRotation = [...filteredProducts].sort((a, b) => b.sold30 - a.sold30);
  const topMovers  = byRotation.slice(0, 5);
  const lowMovers  = [...byRotation].reverse().slice(0, 5);

  // Chart options
  const movOptions = useMemo(() => ({
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
    yaxis: { labels: { formatter: (v) => `${v}u`, style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' } } },
    grid: { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
    legend: { position: 'top', horizontalAlign: 'left', labels: { colors: isDark ? '#cbd5e1' : '#475569' } },
    tooltip: { shared: true, y: { formatter: (v) => `${v} uds.` } },
    theme: { mode: isDark ? 'dark' : 'light' },
  }), [chartLabels, chartDays.length, isDark]); // eslint-disable-line react-hooks/exhaustive-deps

  const catBarOptions = useMemo(() => ({
    chart: {
      type: 'bar', background: 'transparent', fontFamily: 'inherit',
      toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } },
    },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '55%', distributed: true } },
    dataLabels: { enabled: false },
    xaxis: { labels: { formatter: (v) => `$${(v / 1000000).toFixed(1)}M`, style: { fontSize: '10px', colors: isDark ? '#94a3b8' : '#64748b' } } },
    yaxis: { labels: { style: { fontSize: '12px', colors: isDark ? '#cbd5e1' : '#475569' } } },
    colors: catData.map((c) => c.color),
    legend: { show: false },
    grid: { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => money(v) } },
    theme: { mode: isDark ? 'dark' : 'light' },
  }), [catData, isDark]);

  const KPI_ITEMS = [
    { id: 'skus',     label: 'SKUs activos',        value: filteredProducts.length.toString(),    hint: 'productos en catálogo' },
    { id: 'value',    label: 'Valor de inventario', value: money(totalValue),                     hint: 'al precio de venta'   },
    { id: 'critical', label: 'SKUs críticos',        value: criticalItems.length.toString(),       hint: 'stock < mínimo'       },
    { id: 'out',      label: 'Sin stock',            value: outItems.length.toString(),            hint: 'requieren reposición' },
    { id: 'cover',    label: 'Cobertura prom.',      value: `${avgCoverage} días`,                 hint: 'al ritmo de ventas'   },
    { id: 'risk',     label: 'Costo de reposición', value: money(riskValue),                      hint: 'para cubrir mínimos'  },
  ];

  const exportCritical = () => {
    const headers = ['SKU', 'Producto', 'Categoría', 'Stock actual', 'Mínimo', 'Diferencia', 'Costo unitario (CLP)', 'Costo reposición (CLP)'];
    const rows = [...criticalItems, ...outItems].map((p) => [
      p.sku, p.name, p.category, p.stock, p.min, p.min - p.stock, p.cost, (p.min - Math.max(p.stock, 0)) * p.cost,
    ]);
    downloadCSV(`inventario-critico_${filters.dateFrom}.csv`, headers, rows);
  };

  const exportRotation = () => {
    const headers = ['SKU', 'Producto', 'Categoría', 'Vendidos 30d', 'Stock', 'Cobertura (días)', 'Precio (CLP)'];
    const rows = byRotation.map((p) => [
      p.sku, p.name, p.category, p.sold30, p.stock,
      p.sold30 > 0 ? Math.round((p.stock / p.sold30) * 30) : '—', p.price,
    ]);
    downloadCSV(`rotacion-inventario_${filters.dateFrom}.csv`, headers, rows);
  };

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Métricas de inventario</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Movimientos {fmt(filters.dateFrom)} — {fmt(filters.dateTo)} · stock al {fmt(toISO(new Date()))}
          </p>
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
          <AutocompleteSelect value={filters.category} onChange={(v) => set('category', v || 'all')}
            options={CAT_OPTIONS} placeholder="Todas las categorías" clearable={false} buttonClassName="h-10 shadow-none" />
        </div>
        <div className="flex overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
          {PERIODS.map((p) => (
            <button key={p.id} type="button" onClick={() => applyPeriod(p.id)}
              className={`h-10 px-3 text-sm whitespace-nowrap transition-colors ${
                filters.period === p.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
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

      {/* Movimientos */}
      <Card title="Movimientos de inventario · entradas y salidas" icon={BarChart3} className="mb-5">
        <ReactApexChart options={movOptions} series={movSeries} type="area" height={260}
          key={`inv-mov-${filters.category}-${filters.dateFrom}-${filters.dateTo}`} />
      </Card>

      {/* Valor por categoría */}
      <Card title="Valor de inventario por categoría" icon={BarChart3} className="mb-5"
        footer={
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total inventario</span>
            <span className="text-sm font-bold tabular-nums">{money(totalCatValue)}</span>
          </div>
        }
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <ReactApexChart
            options={catBarOptions}
            series={[{ data: catData.map((c) => c.value) }]}
            type="bar" height={240}
            key={`inv-cat-${filters.category}`}
          />
          <div className="divide-y divide-slate-100 dark:divide-slate-800 self-center">
            {catData.map((c) => {
              const pct = totalCatValue > 0 ? ((c.value / totalCatValue) * 100).toFixed(1) : '0.0';
              return (
                <div key={c.cat} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="min-w-0 flex-1 text-sm">{c.cat}</span>
                  <span className="text-xs text-slate-400">{pct}%</span>
                  <span className="text-sm font-semibold tabular-nums">{money(c.value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Alertas */}
      <SectionLabel>Alertas de stock</SectionLabel>
      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card title="Sin stock" subtitle={`${outItems.length} SKUs`} icon={AlertTriangle}
          actions={<DlBtn onClick={exportCritical} />}
          footer={<p className="text-xs text-slate-400">{outItems.length} producto{outItems.length !== 1 ? 's' : ''} sin disponibilidad</p>}
        >
          {outItems.length === 0 ? (
            <p className="text-center text-sm text-emerald-600 dark:text-emerald-400">Sin productos agotados.</p>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>SKU</Th><Th>Producto</Th><Th>Categoría</Th><Th right>Mín.</Th><Th right>Costo rep.</Th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {outItems.map((p) => (
                  <tr key={p.sku}>
                    <Td><span className="font-mono text-xs text-slate-500">{p.sku}</span></Td>
                    <Td>{p.name}</Td>
                    <Td muted>{p.category}</Td>
                    <Td right muted>{p.min}</Td>
                    <Td right><span className="text-red-500 dark:text-red-400 font-medium">{money(p.min * p.cost)}</span></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Stock crítico" subtitle={`${criticalItems.length} SKUs`} icon={AlertTriangle}
          actions={<DlBtn onClick={exportCritical} />}
          footer={<p className="text-xs text-slate-400">Stock por debajo del mínimo configurado</p>}
        >
          {criticalItems.length === 0 ? (
            <p className="text-center text-sm text-emerald-600 dark:text-emerald-400">Sin stock crítico.</p>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Producto</Th><Th right>Stock</Th><Th right>Mín.</Th><Th right>Faltan</Th><Th right>Costo rep.</Th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {criticalItems.map((p) => (
                  <tr key={p.sku}>
                    <Td>
                      <p className="text-sm">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.sku}</p>
                    </Td>
                    <Td right><span className="text-amber-600 dark:text-amber-400 font-semibold">{p.stock}</span></Td>
                    <Td right muted>{p.min}</Td>
                    <Td right muted>{p.min - p.stock}</Td>
                    <Td right><span className="font-medium">{money((p.min - p.stock) * p.cost)}</span></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* Rotación */}
      <SectionLabel>Rotación de productos · últimos 30 días</SectionLabel>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Mayor rotación" icon={Boxes}
          actions={<DlBtn onClick={exportRotation} />}
          footer={<p className="text-xs text-slate-400">Productos con más unidades vendidas en el período</p>}
        >
          <table className="w-full">
            <thead><tr className="border-b border-slate-100 dark:border-slate-800">
              <Th>Producto</Th><Th>Categoría</Th><Th right>Vendidos</Th><Th right>Stock</Th><Th right>Cobertura</Th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {topMovers.map((p, i) => (
                <tr key={p.sku}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">{i + 1}</span>
                      <span className="truncate text-sm">{p.name}</span>
                    </div>
                  </Td>
                  <Td muted>{p.category}</Td>
                  <Td right><span className="font-medium">{p.sold30}</span></Td>
                  <Td right muted>{p.stock}</Td>
                  <Td right>
                    <span className={`font-medium ${p.sold30 > 0 && (p.stock / p.sold30) * 30 < 10 ? 'text-red-500 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}>
                      {p.sold30 > 0 ? `${Math.round((p.stock / p.sold30) * 30)}d` : '—'}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Menor rotación" icon={Boxes}
          actions={<DlBtn onClick={exportRotation} />}
          footer={<p className="text-xs text-slate-400">Productos con menos movimiento — considerar descuento o liquidación</p>}
        >
          <table className="w-full">
            <thead><tr className="border-b border-slate-100 dark:border-slate-800">
              <Th>Producto</Th><Th>Categoría</Th><Th right>Vendidos</Th><Th right>Stock</Th><Th right>Cobertura</Th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {lowMovers.map((p) => (
                <tr key={p.sku}>
                  <Td>
                    <p className="truncate text-sm">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.sku}</p>
                  </Td>
                  <Td muted>{p.category}</Td>
                  <Td right muted>{p.sold30}</Td>
                  <Td right muted>{p.stock}</Td>
                  <Td right>
                    <span className="text-slate-400">
                      {p.sold30 > 0 ? `${Math.round((p.stock / p.sold30) * 30)}d` : '∞'}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

    </section>
  );
};

export default InventoryMetrics;
