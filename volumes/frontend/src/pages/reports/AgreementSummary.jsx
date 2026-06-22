/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, BarChart2, FileText } from 'lucide-react';
import ReactApexChart from 'react-apexcharts';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import ReportLayout from '@/components/common/navigation/ReportLayout';
import { agreementsService } from '@/services/sales/agreementsService';
import { buildCsvBlobUrl } from '@/utils/exportFile';

const money = (v) => Number(v || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const pct = (v) => `${Number(v || 0).toFixed(1)}%`;
const fmtDate = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL') : '—');
const CURRENCY_LABEL = 'Peso chileno (CLP)';
const CHART_ID = 'agreements-summary-chart';

const TYPE_OPTIONS = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'DISCOUNT', label: 'Descuento' },
  { value: 'CREDIT', label: 'Crédito' },
];
const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
];

const Th = ({ children, right }) => <th className={`pb-2 px-3 first:pl-0 last:pr-0 text-xs font-medium uppercase text-slate-400 ${right ? 'text-right' : 'text-left'}`}>{children}</th>;
const Td = ({ children, right, muted, bold }) => <td className={`py-2.5 px-3 first:pl-0 last:pr-0 text-sm ${right ? 'text-right tabular-nums' : ''} ${muted ? 'text-slate-400' : ''} ${bold ? 'font-semibold' : ''}`}>{children}</td>;

const AgreementSummary = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDark = document.documentElement.classList.contains('dark');
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadAgreements = useCallback(async () => {
    setLoading(true);
    try { setAgreements(await agreementsService.list()); } catch { /* table shows empty */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAgreements(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => agreements.filter((a) => {
    if (typeFilter !== 'all' && a.agreement_type !== typeFilter) return false;
    if (statusFilter === 'active' && !a.is_active) return false;
    if (statusFilter === 'inactive' && a.is_active) return false;
    return true;
  }), [agreements, typeFilter, statusFilter]);

  const totals = useMemo(() => ({
    count: rows.length,
    active: rows.filter((r) => r.is_active).length,
    committed: rows.reduce((s, r) => s + Number(r.benefit_amount || 0), 0),
    consumed: rows.reduce((s, r) => s + Number(r.consumed_amount || 0), 0),
    beneficiaries: rows.reduce((s, r) => s + Number(r.beneficiaries_count || 0), 0),
  }), [rows]);

  const usagePct = totals.committed > 0 ? (totals.consumed / totals.committed) * 100 : 0;

  const chartRows = rows.slice(0, 10);
  const chartOptions = useMemo(() => ({
    chart: { id: CHART_ID, type: 'bar', background: 'transparent', fontFamily: 'inherit', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '60%' } },
    colors: ['#0d9488', '#e2e8f0'],
    dataLabels: { enabled: false },
    xaxis: { categories: chartRows.map((r) => r.agreement_name || 'Sin nombre'), labels: { formatter: (v) => `$${(Number(v || 0) / 1000).toFixed(0)}K`, style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: isDark ? '#cbd5e1' : '#475569', fontSize: '11px' }, maxWidth: 180 } },
    grid: { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => money(v) } },
    legend: { show: true, position: 'top', labels: { colors: isDark ? '#cbd5e1' : '#475569' } },
    theme: { mode: isDark ? 'dark' : 'light' },
  }), [chartRows, isDark]);

  const chartSeries = [
    { name: 'Comprometido', data: chartRows.map((r) => Number(r.benefit_amount || 0)) },
    { name: 'Consumido', data: chartRows.map((r) => Number(r.consumed_amount || 0)) },
  ];

  const handleCsvExport = () => {
    const headers = ['Código', 'Convenio', 'Empresa', 'RUT', 'Tipo', `Beneficio ${CURRENCY_LABEL}`, `Consumido ${CURRENCY_LABEL}`, '% Uso', 'Beneficiarios', 'Vigencia desde', 'Vigencia hasta', 'Estado'];
    const data = rows.map((r) => {
      const benefit = Number(r.benefit_amount || 0);
      const consumed = Number(r.consumed_amount || 0);
      const pctUso = benefit > 0 ? ((consumed / benefit) * 100).toFixed(1) : '0.0';
      return [r.agreement_code, r.agreement_name, r.company_name, r.company_tax_id, r.agreement_type === 'DISCOUNT' ? 'Descuento' : 'Crédito', benefit, consumed, pctUso, r.beneficiaries_count || 0, r.valid_from || '', r.valid_to || '', r.is_active ? 'Activo' : 'Inactivo'];
    });
    return buildCsvBlobUrl(headers, data, { metadataRows: [['Reporte', 'Resumen de convenios'], ['Generado el', new Date().toLocaleString('es-CL')]] });
  };

  return (
    <ReportLayout
      title="Resumen de convenios"
      description={`${rows.length} convenios · consumido ${pct(usagePct)} del comprometido`}
      actions={[{ id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate(pathname) }]}
      filterBar={
        <>
          <div className="w-48 shrink-0">
            <AutocompleteSelect value={typeFilter} onChange={(v) => setTypeFilter(v || 'all')} options={TYPE_OPTIONS} placeholder="Todos los tipos" clearable={false} buttonClassName="h-10 shadow-none" />
          </div>
          <div className="w-48 shrink-0">
            <AutocompleteSelect value={statusFilter} onChange={(v) => setStatusFilter(v || 'all')} options={STATUS_OPTIONS} placeholder="Todos los estados" clearable={false} buttonClassName="h-10 shadow-none" />
          </div>
        </>
      }
      onRunReport={loadAgreements}
      runReportLabel="Actualizar"
      runReportLoading={loading}
      kpiItems={[
        { id: 'count', label: 'Total convenios', value: totals.count.toString(), hint: `${totals.active} activos` },
        { id: 'ben', label: 'Beneficiarios', value: totals.beneficiaries.toString(), hint: 'registrados' },
        { id: 'committed', label: 'Monto comprometido', value: money(totals.committed), hint: 'suma de beneficios' },
        { id: 'consumed', label: 'Monto consumido', value: money(totals.consumed), hint: `${pct(usagePct)} del total` },
      ]}
      charts={[{
        title: 'Comprometido vs consumido',
        subtitle: 'Top 10 convenios por monto',
        icon: BarChart2,
        content: rows.length > 0
          ? <ReactApexChart options={chartOptions} series={chartSeries} type="bar" height={Math.max(240, Math.min(chartRows.length * 48, 480))} />
          : <div className="flex h-40 items-center justify-center text-sm text-slate-400">Sin datos para los filtros seleccionados</div>,
      }]}
      tableTitle="Convenios"
      tableSubtitle={loading ? 'Cargando...' : `${rows.length} registros`}
      tableIcon={FileText}
      onExportCsv={handleCsvExport}
      csvFilename="resumen-convenios.csv"
    >
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">Cargando datos...</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">No hay convenios que coincidan con los filtros.</div>
        ) : (
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Convenio</Th><Th>Empresa</Th><Th>Tipo</Th><Th right>Beneficiarios</Th><Th right>Monto beneficio</Th><Th right>Consumido</Th><Th right>% Uso</Th><Th>Vigencia</Th><Th>Estado</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {rows.map((r) => {
                const benefit = Number(r.benefit_amount || 0);
                const consumed = Number(r.consumed_amount || 0);
                const pctUso = benefit > 0 ? (consumed / benefit) * 100 : 0;
                return (
                  <tr key={r.id}>
                    <Td><p className="font-medium">{r.agreement_name}</p><p className="text-xs text-slate-400">{r.agreement_code}</p></Td>
                    <Td><p>{r.company_name}</p><p className="text-xs text-slate-400">{r.company_tax_id}</p></Td>
                    <Td>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${r.agreement_type === 'CREDIT' ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'}`}>
                        {r.agreement_type === 'DISCOUNT' ? 'Descuento' : 'Crédito'}
                      </span>
                    </Td>
                    <Td right muted>{r.beneficiaries_count || 0}</Td>
                    <Td right>{money(benefit)}</Td>
                    <Td right>{money(consumed)}</Td>
                    <Td right>
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.min(pctUso, 100)}%` }} />
                        </div>
                        <span className="text-xs tabular-nums">{pct(pctUso)}</span>
                      </div>
                    </Td>
                    <Td muted><span className="text-xs">{fmtDate(r.valid_from)} — {r.valid_to ? fmtDate(r.valid_to) : 'Sin vencimiento'}</span></Td>
                    <Td>
                      {r.is_active ? <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Activo</span> : <span className="text-xs font-medium text-slate-400">Inactivo</span>}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </ReportLayout>
  );
};

export default AgreementSummary;
