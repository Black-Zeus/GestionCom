import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import { ArrowLeft, BarChart3, Download, FileText, Loader2, X } from 'lucide-react';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import DateRangePicker from '@/components/common/forms/DateRangePicker';
import { toast } from '@/services/ui/notify';

const money   = (v) => Number(v).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const toISO   = (d) => d.toISOString().slice(0, 10);
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
const fmt     = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDay  = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: '2-digit' });
const fmtLong = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

const downloadCSV = (filename, headers, rows) => {
  const esc   = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))];
  const blob  = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url   = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
};

// --- Constants -----------------------------------------------------------

const BRANCH_LIST   = ['Centro', 'Mall', 'Norte'];
const BRANCH_COLORS = { Centro: '#3b82f6', Mall: '#10b981', Norte: '#f59e0b' };

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

// Method weights per branch (seeded but stable ratios)
const METHOD_WEIGHT = { Efectivo: 0.25, Débito: 0.40, Crédito: 0.20, Transferencia: 0.15 };

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

const Th = ({ children, right, center }) => (
  <th className={`pb-2 px-3 first:pl-0 last:pr-0 text-xs font-medium uppercase text-slate-400 ${right ? 'text-right' : center ? 'text-center' : 'text-left'}`}>{children}</th>
);
const Td = ({ children, right, center, muted, bold, className: cls = '' }) => (
  <td className={`py-2.5 px-3 first:pl-0 last:pr-0 text-sm ${right ? 'text-right tabular-nums' : center ? 'text-center' : ''} ${muted ? 'text-slate-400' : ''} ${bold ? 'font-semibold' : ''} ${cls}`}>
    {children}
  </td>
);

// --- Main ----------------------------------------------------------------

const defaultFilters = () => ({
  sucursal: 'all', period: '30d',
  dateFrom: toISO(addDays(new Date(), -29)), dateTo: toISO(new Date()),
});

const DailySales = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [filters, setFilters] = useState(defaultFilters);
  const [pdfLoading, setPdfLoading] = useState(false);
  const isDark = document.documentElement.classList.contains('dark');

  const set = (key, val) => setFilters((f) => ({ ...f, [key]: val }));
  const applyPeriod = (id) => {
    const p = PERIODS.find((x) => x.id === id);
    if (p) setFilters((f) => ({ ...f, period: id, dateFrom: periodFrom(p.days), dateTo: toISO(new Date()) }));
  };
  const clearFilters = () => setFilters(defaultFilters());
  const isFiltered   = filters.sucursal !== 'all' || filters.period !== '30d';

  // Days in range
  const days = useMemo(() => {
    if (!filters.dateFrom || !filters.dateTo) return [];
    const from = new Date(`${filters.dateFrom}T00:00:00`);
    const to   = new Date(`${filters.dateTo}T00:00:00`);
    const list = []; const cur = new Date(from);
    while (cur <= to) { list.push(toISO(cur)); cur.setDate(cur.getDate() + 1); }
    return list;
  }, [filters.dateFrom, filters.dateTo]);

  const activeBranches = filters.sucursal === 'all' ? BRANCH_LIST : [filters.sucursal];

  // Generate daily rows
  const rows = useMemo(() => days.map((iso, di) => {
    // Aggregate across active branches
    let total = 0; let txn = 0;
    const byBranch = activeBranches.map((branch) => {
      const bi   = BRANCH_LIST.indexOf(branch);
      const t    = seeded(400000 + bi * 120000, di * 7 + bi * 13);
      const n    = seeded(40 + bi * 10, di * 5 + bi * 3);
      total += t; txn += n;
      return { branch, total: t, txn: n };
    });

    const cancelled = Math.max(0, Math.round(txn * (0.03 + Math.abs(Math.sin(di * 2.1)) * 0.03)));
    const avgTicket = txn > 0 ? Math.round(total / txn) : 0;

    return {
      iso,
      total,
      txn,
      cancelled,
      avgTicket,
      efectivo:      Math.round(total * METHOD_WEIGHT.Efectivo),
      debito:        Math.round(total * METHOD_WEIGHT.Débito),
      credito:       Math.round(total * METHOD_WEIGHT.Crédito),
      transferencia: Math.round(total * METHOD_WEIGHT.Transferencia),
      byBranch,
    };
  }), [days, activeBranches]); // eslint-disable-line react-hooks/exhaustive-deps

  // Totals
  const totals = useMemo(() => ({
    total:         rows.reduce((a, r) => a + r.total,         0),
    txn:           rows.reduce((a, r) => a + r.txn,           0),
    cancelled:     rows.reduce((a, r) => a + r.cancelled,     0),
    efectivo:      rows.reduce((a, r) => a + r.efectivo,      0),
    debito:        rows.reduce((a, r) => a + r.debito,        0),
    credito:       rows.reduce((a, r) => a + r.credito,       0),
    transferencia: rows.reduce((a, r) => a + r.transferencia, 0),
  }), [rows]);

  const avgTicketTotal = totals.txn > 0 ? Math.round(totals.total / totals.txn) : 0;
  const bestDay  = rows.reduce((best, r) => (!best || r.total > best.total ? r : best), null);
  const worstDay = rows.reduce((worst, r) => (!worst || r.total < worst.total ? r : worst), null);

  // Chart series (one per branch, or single aggregate)
  const chartSeries = useMemo(() => {
    if (activeBranches.length === 1) {
      return [{ name: `Suc. ${activeBranches[0]}`, data: rows.map((r) => r.total), color: BRANCH_COLORS[activeBranches[0]] }];
    }
    return activeBranches.map((branch) => ({
      name: `Suc. ${branch}`,
      data: rows.map((r) => r.byBranch.find((b) => b.branch === branch)?.total ?? 0),
      color: BRANCH_COLORS[branch],
    }));
  }, [rows, activeBranches]); // eslint-disable-line react-hooks/exhaustive-deps

  const chartLabels = days.map((iso) => { const [, m, d] = iso.split('-'); return `${d}/${m}`; });

  const areaOptions = useMemo(() => ({
    chart: {
      type: 'area', stacked: false, background: 'transparent', fontFamily: 'inherit',
      toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false },
        export: { png: { filename: `ventas-diarias_${filters.dateFrom}_${filters.dateTo}` }, csv: { filename: `ventas-diarias_${filters.dateFrom}_${filters.dateTo}` } },
      },
    },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.03, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: chartLabels,
      labels: { rotate: days.length > 20 ? -45 : 0, style: { fontSize: '10px', colors: isDark ? '#94a3b8' : '#64748b' }, show: days.length <= 90 },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: (v) => `$${(v / 1000).toFixed(0)}K`, style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' } } },
    grid: { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
    legend: { show: activeBranches.length > 1, position: 'top', horizontalAlign: 'left', labels: { colors: isDark ? '#cbd5e1' : '#475569' } },
    tooltip: { shared: true, y: { formatter: (v) => money(v) } },
    theme: { mode: isDark ? 'dark' : 'light' },
  }), [chartLabels, days.length, isDark, activeBranches.length, filters.dateFrom, filters.dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const KPI_ITEMS = [
    { id: 'total',    label: 'Total período',       value: money(totals.total),        hint: `en ${days.length} días`           },
    { id: 'txn',      label: 'Transacciones',        value: totals.txn.toString(),      hint: 'documentos emitidos'              },
    { id: 'avg',      label: 'Ticket promedio',      value: money(avgTicketTotal),      hint: 'por transacción'                  },
    { id: 'best',     label: 'Mejor día',            value: bestDay  ? money(bestDay.total)  : '—', hint: bestDay  ? fmtDay(bestDay.iso)  : '' },
    { id: 'worst',    label: 'Peor día',             value: worstDay ? money(worstDay.total) : '—', hint: worstDay ? fmtDay(worstDay.iso) : '' },
    { id: 'cancel',   label: 'Anulaciones',          value: totals.cancelled.toString(), hint: `${((totals.cancelled / Math.max(totals.txn, 1)) * 100).toFixed(1)}% del total` },
  ];

  const exportPDF = async () => {
    setPdfLoading(true);
    try {
      const params = new URLSearchParams({
        date_from: filters.dateFrom,
        date_to:   filters.dateTo,
        branch:    filters.sucursal,
      });
      const resp = await fetch(`/api/reports/daily-sales/pdf?${params}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const url  = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), {
        href:     url,
        download: `ventas-diarias_${filters.dateFrom}_${filters.dateTo}.pdf`,
      }).click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('No se pudo generar el PDF. Verifique que el servicio Gotenberg esté activo.');
    } finally {
      setPdfLoading(false);
    }
  };

  const exportReport = () => {
    const headers = ['Fecha', 'Día', 'Transacciones', 'Total (CLP)', 'Ticket prom. (CLP)', 'Efectivo (CLP)', 'Débito (CLP)', 'Crédito (CLP)', 'Transferencia (CLP)', 'Anulaciones'];
    const rows_ = rows.map((r) => [
      fmt(r.iso),
      new Date(`${r.iso}T00:00:00`).toLocaleDateString('es-CL', { weekday: 'long' }),
      r.txn, r.total, r.avgTicket,
      r.efectivo, r.debito, r.credito, r.transferencia,
      r.cancelled,
    ]);
    // Totals row
    rows_.push([
      'TOTAL', '',
      totals.txn, totals.total, avgTicketTotal,
      totals.efectivo, totals.debito, totals.credito, totals.transferencia,
      totals.cancelled,
    ]);
    downloadCSV(`ventas-diarias_${filters.dateFrom}_${filters.dateTo}.csv`, headers, rows_);
  };

  // Highlight: best day iso
  const bestIso = bestDay?.iso;

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">

      <ModuleHeader
        title="Ventas diarias"
        description={`${fmt(filters.dateFrom)} — ${fmt(filters.dateTo)} · ${days.length} días`}
        actions={[
          { id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate(pathname) },
          {
            id: 'mockup',
            node: (
              <span className="inline-flex h-10 items-center rounded-md border border-amber-300 bg-amber-50 px-3 text-xs font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                Mockup — datos estáticos
              </span>
            ),
          },
          {
            id: 'pdf',
            label: pdfLoading ? 'Generando…' : 'PDF',
            icon: pdfLoading ? Loader2 : FileText,
            disabled: pdfLoading,
            onClick: exportPDF,
          },
        ]}
      />

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

      {/* KPIs */}
      <KpiBar items={KPI_ITEMS} className="mb-5" />

      {/* Trend chart */}
      <Card title="Evolución de ventas por día" icon={BarChart3} className="mb-5">
        <ReactApexChart options={areaOptions} series={chartSeries} type="area" height={240}
          key={`daily-area-${filters.sucursal}-${filters.dateFrom}-${filters.dateTo}`} />
      </Card>

      {/* Main report table */}
      <Card
        title="Detalle por día"
        subtitle={`${rows.length} días`}
        icon={BarChart3}
        actions={
          <button type="button" onClick={exportReport} title="Exportar CSV"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
            <Download className="h-4 w-4" />
          </button>
        }
        footer={
          <div className="grid grid-cols-6 gap-4 text-right text-sm">
            <span className="col-span-2 text-left font-semibold text-slate-700 dark:text-slate-200">Total período</span>
            <span className="font-bold tabular-nums">{totals.txn}</span>
            <span className="font-bold tabular-nums">{money(totals.total)}</span>
            <span className="font-bold tabular-nums">{money(avgTicketTotal)}</span>
            <span className="font-bold tabular-nums text-red-500 dark:text-red-400">{totals.cancelled}</span>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Fecha</Th>
                <Th right>Txn</Th>
                <Th right>Total</Th>
                <Th right>Ticket prom.</Th>
                <Th right>Efectivo</Th>
                <Th right>Débito</Th>
                <Th right>Crédito</Th>
                <Th right>Transferencia</Th>
                <Th right>Anuladas</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {rows.map((r) => {
                const isBest = r.iso === bestIso;
                return (
                  <tr key={r.iso} className={isBest ? 'bg-emerald-50/60 dark:bg-emerald-950/10' : ''}>
                    <Td>
                      <div className="flex items-center gap-2">
                        {isBest && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" title="Mejor día" />}
                        <div>
                          <p className="text-sm font-medium">{fmt(r.iso)}</p>
                          <p className="text-xs text-slate-400">{new Date(`${r.iso}T00:00:00`).toLocaleDateString('es-CL', { weekday: 'long' })}</p>
                        </div>
                      </div>
                    </Td>
                    <Td right muted>{r.txn}</Td>
                    <Td right bold>{money(r.total)}</Td>
                    <Td right muted>{money(r.avgTicket)}</Td>
                    <Td right muted>{money(r.efectivo)}</Td>
                    <Td right muted>{money(r.debito)}</Td>
                    <Td right muted>{money(r.credito)}</Td>
                    <Td right muted>{money(r.transferencia)}</Td>
                    <Td right>
                      {r.cancelled > 0
                        ? <span className="text-red-500 dark:text-red-400">{r.cancelled}</span>
                        : <span className="text-slate-300 dark:text-slate-600">—</span>}
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

export default DailySales;
