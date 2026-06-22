/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, BarChart2, CheckCircle, Clock, FileText, XCircle } from 'lucide-react';
import ReactApexChart from 'react-apexcharts';
import ReportLayout from '@/components/common/navigation/ReportLayout';
import { agreementsService } from '@/services/sales/agreementsService';
import { buildCsvBlobUrl, buildXlsxBlobUrl } from '@/utils/exportFile';

const money = (v) => Number(v || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const fmtDate = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL') : '—');
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const diffDays = (from, to) => Math.round((new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / (1000 * 60 * 60 * 24));
const CURRENCY_LABEL = 'Peso chileno (CLP)';
const CHART_ID = 'agreements-validity-chart';
const XLSX_SHEET = 'Vigencia convenios';

const Th = ({ children, right }) => <th className={`pb-2 px-3 first:pl-0 last:pr-0 text-xs font-medium uppercase text-slate-400 ${right ? 'text-right' : 'text-left'}`}>{children}</th>;
const Td = ({ children, right, muted }) => <td className={`py-2.5 px-3 first:pl-0 last:pr-0 text-sm ${right ? 'text-right tabular-nums' : ''} ${muted ? 'text-slate-400' : ''}`}>{children}</td>;

const DaysLeftCell = ({ validTo, today }) => {
  if (!validTo) return <span className="text-xs text-slate-400">Sin vencimiento</span>;
  const days = diffDays(today, validTo);
  if (days < 0) return <span className="text-xs font-medium text-red-500">{Math.abs(days)} días vencido</span>;
  if (days === 0) return <span className="text-xs font-medium text-red-500">Vence hoy</span>;
  if (days <= 30) return <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{days} días</span>;
  return <span className="text-xs text-slate-500">{days} días</span>;
};

const SectionCard = ({ title, icon: Icon, iconCls, items, today, emptyMsg }) => (
  <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
      <Icon className={`h-4 w-4 shrink-0 ${iconCls}`} />
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</span>
      <span className="ml-1 text-xs text-slate-400">({items.length})</span>
    </div>
    <div className="p-5">
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">{emptyMsg}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Convenio</Th><Th>Empresa</Th><Th>Tipo</Th><Th right>Monto beneficio</Th><Th right>Consumido</Th><Th>Vigencia hasta</Th><Th>Días restantes</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {items.map((r) => (
                <tr key={r.id}>
                  <Td><p className="font-medium">{r.agreement_name}</p><p className="text-xs text-slate-400">{r.agreement_code}</p></Td>
                  <Td muted>{r.company_name}</Td>
                  <Td>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${r.agreement_type === 'CREDIT' ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'}`}>
                      {r.agreement_type === 'DISCOUNT' ? 'Descuento' : 'Crédito'}
                    </span>
                  </Td>
                  <Td right>{money(r.benefit_amount || 0)}</Td>
                  <Td right muted>{money(r.consumed_amount || 0)}</Td>
                  <Td muted><span className="text-xs">{fmtDate(r.valid_to)}</span></Td>
                  <Td><DaysLeftCell validTo={r.valid_to} today={today} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
);

const SECTIONS = [
  { key: 'activeAll', title: 'Activos y vigentes', icon: CheckCircle, iconCls: 'text-emerald-500', emptyMsg: 'No hay convenios activos y vigentes.' },
  { key: 'expiringSoon', title: 'Próximos a vencer (≤ 30 días)', icon: AlertTriangle, iconCls: 'text-amber-500', emptyMsg: 'No hay convenios próximos a vencer.' },
  { key: 'expired', title: 'Vencidos', icon: XCircle, iconCls: 'text-red-400', emptyMsg: 'No hay convenios vencidos.' },
  { key: 'inactive', title: 'Inactivos', icon: Clock, iconCls: 'text-slate-400', emptyMsg: 'No hay convenios inactivos.' },
];

const statusLabel = (a, today, soonLimit) => {
  if (!a.is_active) return 'Inactivo';
  if (!a.valid_to) return 'Activo y vigente';
  if (a.valid_to < today) return 'Vencido';
  if (a.valid_to <= soonLimit) return 'Próximo a vencer';
  return 'Activo y vigente';
};

const AgreementValidity = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDark = document.documentElement.classList.contains('dark');
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grouped');

  const loadAgreements = async () => {
    setLoading(true);
    try { setAgreements(await agreementsService.list()); } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { loadAgreements(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const today = todayISO();
  const soonLimit = addDays(today, 30);

  const groups = useMemo(() => {
    const active = [], expiringSoon = [], expired = [], noExpiry = [], inactive = [];
    for (const a of agreements) {
      if (!a.is_active) { inactive.push(a); continue; }
      if (!a.valid_to) { noExpiry.push(a); continue; }
      if (a.valid_to < today) { expired.push(a); continue; }
      if (a.valid_to <= soonLimit) { expiringSoon.push(a); continue; }
      active.push(a);
    }
    return { activeAll: [...active, ...noExpiry], expiringSoon, expired, inactive };
  }, [agreements, today, soonLimit]);

  const chartOptions = useMemo(() => ({
    chart: { id: CHART_ID, type: 'bar', background: 'transparent', fontFamily: 'inherit', toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 3, columnWidth: '50%' } },
    colors: ['#10b981', '#f59e0b', '#ef4444', '#94a3b8'],
    dataLabels: { enabled: false },
    xaxis: { categories: ['Activos y vigentes', 'Próx. a vencer', 'Vencidos', 'Inactivos'], labels: { style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: (v) => Math.round(v).toString(), style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' } } },
    grid: { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => `${v} convenios` } },
    theme: { mode: isDark ? 'dark' : 'light' },
  }), [isDark]);

  const chartSeries = [{
    name: 'Convenios',
    data: [groups.activeAll?.length || 0, groups.expiringSoon?.length || 0, groups.expired?.length || 0, groups.inactive?.length || 0],
  }];

  const exportHeaders = ['Convenio', 'Código', 'Empresa', 'Tipo', 'Estado', `Monto beneficio ${CURRENCY_LABEL}`, `Consumido ${CURRENCY_LABEL}`, 'Vigencia desde', 'Vigencia hasta', 'Días restantes'];
  const exportData = () => agreements.map((a) => {
    const days = a.valid_to ? diffDays(today, a.valid_to) : null;
    return [a.agreement_name, a.agreement_code, a.company_name, a.agreement_type === 'DISCOUNT' ? 'Descuento' : 'Crédito', statusLabel(a, today, soonLimit), a.benefit_amount || 0, a.consumed_amount || 0, a.valid_from || '', a.valid_to || '', days !== null ? days : 'Sin vencimiento'];
  });
  const metadataRows = () => [['Reporte', 'Vigencia de convenios'], ['Vista', viewMode === 'grouped' ? 'Por vigencia' : 'Detalle'], ['Generado el', new Date().toLocaleString('es-CL')]];

  const handleCsvExport = () => buildCsvBlobUrl(exportHeaders, exportData(), { metadataRows: metadataRows() });
  const handleXlsxExport = () => buildXlsxBlobUrl(exportHeaders, exportData(), XLSX_SHEET, { metadataRows: metadataRows() });

  const detailRows = useMemo(() => [...agreements].sort((a, b) => {
    const order = { 'Próximo a vencer': 0, 'Vencido': 1, 'Activo y vigente': 2, 'Inactivo': 3 };
    return (order[statusLabel(a, today, soonLimit)] ?? 9) - (order[statusLabel(b, today, soonLimit)] ?? 9);
  }), [agreements, today, soonLimit]);

  return (
    <ReportLayout
      title="Vigencia de convenios"
      description={`${agreements.length} convenios · ${groups.activeAll?.length || 0} activos y vigentes`}
      actions={[{ id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate(pathname) }]}
      filterBar={<span className="text-sm text-slate-400">Muestra todos los convenios agrupados por vigencia</span>}
      onRunReport={loadAgreements}
      runReportLabel="Actualizar"
      runReportLoading={loading}
      kpiItems={[
        { id: 'active', label: 'Activos y vigentes', value: (groups.activeAll?.length || 0).toString(), hint: 'en regla' },
        { id: 'soon', label: 'Próximos a vencer', value: (groups.expiringSoon?.length || 0).toString(), hint: 'en 30 días' },
        { id: 'expired', label: 'Vencidos', value: (groups.expired?.length || 0).toString(), hint: 'fuera de vigencia' },
        { id: 'inactive', label: 'Inactivos', value: (groups.inactive?.length || 0).toString(), hint: 'deshabilitados' },
      ]}
      charts={[{
        title: 'Convenios por estado de vigencia',
        subtitle: 'Distribución de convenios según su vigencia actual',
        icon: BarChart2,
        content: agreements.length > 0
          ? <ReactApexChart options={chartOptions} series={chartSeries} type="bar" height={260} />
          : <div className="flex h-40 items-center justify-center text-sm text-slate-400">Sin datos</div>,
      }]}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      viewModeOptions={[{ id: 'grouped', label: 'Por vigencia' }, { id: 'detail', label: 'Detalle' }]}
      tableTitle={viewMode === 'grouped' ? 'Convenios por vigencia' : 'Todos los convenios'}
      tableSubtitle={loading ? 'Cargando...' : `${agreements.length} convenios`}
      tableIcon={FileText}
      onExportCsv={handleCsvExport}
      onExportExcel={handleXlsxExport}
      csvFilename="vigencia-convenios.csv"
      excelFilename="vigencia-convenios.xlsx"
    >
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-400">Cargando datos...</div>
      ) : viewMode === 'grouped' ? (
        <div className="space-y-4">
          {SECTIONS.map((section) => (
            <SectionCard
              key={section.key}
              title={section.title}
              icon={section.icon}
              iconCls={section.iconCls}
              items={groups[section.key] || []}
              today={today}
              emptyMsg={section.emptyMsg}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          {detailRows.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">Sin convenios registrados.</div>
          ) : (
            <table className="w-full min-w-max">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <Th>Convenio</Th><Th>Empresa</Th><Th>Tipo</Th><Th>Estado</Th><Th right>Monto beneficio</Th><Th right>Consumido</Th><Th>Vigencia hasta</Th><Th>Días restantes</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {detailRows.map((a) => (
                  <tr key={a.id}>
                    <Td><p className="font-medium">{a.agreement_name}</p><p className="text-xs text-slate-400">{a.agreement_code}</p></Td>
                    <Td muted>{a.company_name}</Td>
                    <Td>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${a.agreement_type === 'CREDIT' ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'}`}>
                        {a.agreement_type === 'DISCOUNT' ? 'Descuento' : 'Crédito'}
                      </span>
                    </Td>
                    <Td>
                      {(() => {
                        const s = statusLabel(a, today, soonLimit);
                        const cls = s === 'Activo y vigente' ? 'text-emerald-600 dark:text-emerald-400' : s === 'Próximo a vencer' ? 'text-amber-600 dark:text-amber-400' : s === 'Vencido' ? 'text-red-500' : 'text-slate-400';
                        return <span className={`text-xs font-medium ${cls}`}>{s}</span>;
                      })()}
                    </Td>
                    <Td right>{money(a.benefit_amount || 0)}</Td>
                    <Td right muted>{money(a.consumed_amount || 0)}</Td>
                    <Td muted><span className="text-xs">{fmtDate(a.valid_to)}</span></Td>
                    <Td><DaysLeftCell validTo={a.valid_to} today={today} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </ReportLayout>
  );
};

export default AgreementValidity;
