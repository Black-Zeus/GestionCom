/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, BarChart2, FileText, X } from 'lucide-react';
import ReactApexChart from 'react-apexcharts';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import ReportLayout from '@/components/common/navigation/ReportLayout';
import { agreementsService } from '@/services/sales/agreementsService';
import { buildCsvBlobUrl } from '@/utils/exportFile';

const money = (v) => Number(v || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const CURRENCY_LABEL = 'Peso chileno (CLP)';
const CHART_ID = 'agreements-usage-chart';

const Th = ({ children, right }) => <th className={`pb-2 px-3 first:pl-0 last:pr-0 text-xs font-medium uppercase text-slate-400 ${right ? 'text-right' : 'text-left'}`}>{children}</th>;
const Td = ({ children, right, muted, bold }) => <td className={`py-2.5 px-3 first:pl-0 last:pr-0 text-sm ${right ? 'text-right tabular-nums' : ''} ${muted ? 'text-slate-400' : ''} ${bold ? 'font-semibold' : ''}`}>{children}</td>;

const AgreementUsage = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDark = document.documentElement.classList.contains('dark');
  const [agreements, setAgreements] = useState([]);
  const [usage, setUsage] = useState([]);
  const [selectedId, setSelectedId] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => { agreementsService.list().then(setAgreements).catch(() => {}); }, []);

  const loadUsage = useCallback(async (id = selectedId) => {
    setLoading(true);
    try {
      const params = id !== 'all' ? { agreement_id: id } : {};
      setUsage(await agreementsService.usage(params));
    } catch {
      setUsage([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadUsage(selectedId); }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const agreementOptions = useMemo(() => [
    { value: 'all', label: 'Todos los convenios' },
    ...agreements.map((a) => ({ value: String(a.id), label: a.agreement_name })),
  ], [agreements]);

  const totals = useMemo(() => ({
    count: usage.length,
    discountTotal: usage.reduce((s, u) => s + Number(u.discount_amount || 0), 0),
    uniqueBeneficiaries: new Set(usage.map((u) => u.associate_identifier).filter(Boolean)).size,
  }), [usage]);

  const byAgreement = useMemo(() => {
    const map = {};
    for (const u of usage) {
      const key = u.agreement_name || 'Sin convenio';
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [usage]);

  const chartOptions = useMemo(() => ({
    chart: { id: CHART_ID, type: 'bar', background: 'transparent', fontFamily: 'inherit', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '60%' } },
    colors: ['#2563eb'],
    dataLabels: { enabled: false },
    xaxis: { categories: byAgreement.map(([name]) => name), labels: { style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: isDark ? '#cbd5e1' : '#475569', fontSize: '11px' }, maxWidth: 200 } },
    grid: { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => `${v} usos` } },
    theme: { mode: isDark ? 'dark' : 'light' },
  }), [byAgreement, isDark]);

  const chartSeries = [{ name: 'Usos', data: byAgreement.map(([, count]) => count) }];

  const handleCsvExport = () => {
    const headers = ['Fecha', 'Convenio', 'Beneficiario', 'Identificador', 'Tipo', 'Código venta', 'Ticket', `Monto original ${CURRENCY_LABEL}`, `Descuento/crédito ${CURRENCY_LABEL}`, `Monto final ${CURRENCY_LABEL}`];
    const data = usage.map((u) => [
      fmtDateTime(u.created_at), u.agreement_name, u.associate_name || u.beneficiary_name || '—', u.associate_identifier || '—',
      u.agreement_type === 'DISCOUNT' ? 'Descuento' : 'Crédito', u.sale_code || '—', u.ticket_number || '—',
      u.original_amount || 0, u.discount_amount || 0, u.final_amount || 0,
    ]);
    return buildCsvBlobUrl(headers, data, { metadataRows: [['Reporte', 'Uso de convenios'], ['Generado el', new Date().toLocaleString('es-CL')]] });
  };

  return (
    <ReportLayout
      title="Uso de convenios"
      description={`${usage.length} usos registrados · ${totals.uniqueBeneficiaries} beneficiarios distintos`}
      actions={[{ id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate(pathname) }]}
      filterBar={
        <div className="w-64 shrink-0">
          <AutocompleteSelect value={selectedId} onChange={(v) => setSelectedId(v || 'all')} options={agreementOptions} placeholder="Todos los convenios" clearable={false} buttonClassName="h-10 shadow-none" />
        </div>
      }
      filterBarActions={selectedId !== 'all' ? (
        <button type="button" onClick={() => setSelectedId('all')} className="flex h-10 items-center gap-1.5 rounded-md px-3 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
          <X className="h-3.5 w-3.5" /> Limpiar
        </button>
      ) : null}
      onRunReport={() => loadUsage(selectedId)}
      runReportLabel="Actualizar"
      runReportLoading={loading}
      kpiItems={[
        { id: 'count', label: 'Usos registrados', value: totals.count.toString(), hint: 'transacciones' },
        { id: 'discount', label: 'Beneficio total aplicado', value: money(totals.discountTotal), hint: 'descuento / crédito' },
        { id: 'ben', label: 'Beneficiarios únicos', value: totals.uniqueBeneficiaries.toString(), hint: 'distintos' },
      ]}
      charts={[{
        title: 'Usos por convenio',
        subtitle: 'Top 10 convenios con más transacciones',
        icon: BarChart2,
        content: usage.length > 0
          ? <ReactApexChart options={chartOptions} series={chartSeries} type="bar" height={Math.max(240, Math.min(byAgreement.length * 42, 420))} />
          : <div className="flex h-40 items-center justify-center text-sm text-slate-400">Sin datos para los filtros seleccionados</div>,
      }]}
      tableTitle="Historial de uso"
      tableSubtitle={loading ? 'Cargando...' : `${usage.length} registros`}
      tableIcon={FileText}
      onExportCsv={handleCsvExport}
      csvFilename="uso-convenios.csv"
    >
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">Cargando datos...</div>
        ) : usage.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">No hay registros de uso para los filtros seleccionados.</div>
        ) : (
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Fecha</Th><Th>Convenio</Th><Th>Beneficiario</Th><Th>Tipo</Th><Th>Código venta</Th><Th right>Monto original</Th><Th right>Descuento / crédito</Th><Th right>Monto final</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {usage.map((u) => (
                <tr key={u.id}>
                  <Td muted><span className="text-xs">{fmtDateTime(u.created_at)}</span></Td>
                  <Td>{u.agreement_name}</Td>
                  <Td><p>{u.associate_name || u.beneficiary_name || '—'}</p>{u.associate_identifier && <p className="text-xs text-slate-400">{u.associate_identifier}</p>}</Td>
                  <Td>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${u.agreement_type === 'CREDIT' ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'}`}>
                      {u.agreement_type === 'DISCOUNT' ? 'Descuento' : 'Crédito'}
                    </span>
                  </Td>
                  <Td muted><span className="font-mono text-xs">{u.sale_code || '—'}</span></Td>
                  <Td right muted>{money(u.original_amount || 0)}</Td>
                  <Td right bold>{money(u.discount_amount || 0)}</Td>
                  <Td right>{money(u.final_amount || 0)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ReportLayout>
  );
};

export default AgreementUsage;
