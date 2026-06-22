/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, BarChart2, Users } from 'lucide-react';
import ReactApexChart from 'react-apexcharts';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import ReportLayout from '@/components/common/navigation/ReportLayout';
import { agreementsService } from '@/services/sales/agreementsService';
import { buildCsvBlobUrl } from '@/utils/exportFile';

const money = (v) => (v != null ? Number(v).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }) : '—');
const CURRENCY_LABEL = 'Peso chileno (CLP)';
const CHART_ID = 'agreements-beneficiaries-chart';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
];

const Th = ({ children, right }) => <th className={`pb-2 px-3 first:pl-0 last:pr-0 text-xs font-medium uppercase text-slate-400 ${right ? 'text-right' : 'text-left'}`}>{children}</th>;
const Td = ({ children, right, muted, bold }) => <td className={`py-2.5 px-3 first:pl-0 last:pr-0 text-sm ${right ? 'text-right tabular-nums' : ''} ${muted ? 'text-slate-400' : ''} ${bold ? 'font-semibold' : ''}`}>{children}</td>;

const AgreementBeneficiaries = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDark = document.documentElement.classList.contains('dark');
  const [agreements, setAgreements] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => { agreementsService.list().then(setAgreements).catch(() => {}); }, []);

  const loadBeneficiaries = useCallback(async (id = selectedId) => {
    if (!id) { setBeneficiaries([]); return; }
    setLoading(true);
    try { setBeneficiaries(await agreementsService.listBeneficiaries(id)); } catch { setBeneficiaries([]); } finally { setLoading(false); }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadBeneficiaries(selectedId); }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const agreementOptions = useMemo(() => agreements.map((a) => ({ value: String(a.id), label: a.agreement_name })), [agreements]);

  const rows = useMemo(() => beneficiaries.filter((b) => {
    if (statusFilter === 'active' && !b.is_active) return false;
    if (statusFilter === 'inactive' && b.is_active) return false;
    return true;
  }), [beneficiaries, statusFilter]);

  const totals = useMemo(() => ({
    count: rows.length,
    active: rows.filter((b) => b.is_active).length,
    withUsage: rows.filter((b) => Number(b.interactions_count || 0) > 0).length,
    withoutUsage: rows.filter((b) => Number(b.interactions_count || 0) === 0).length,
  }), [rows]);

  const selectedAgreement = useMemo(() => agreements.find((a) => String(a.id) === selectedId), [agreements, selectedId]);

  const chartOptions = useMemo(() => ({
    chart: { id: CHART_ID, type: 'bar', background: 'transparent', fontFamily: 'inherit', toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 3, columnWidth: '50%' } },
    colors: ['#7c3aed', '#e2e8f0'],
    dataLabels: { enabled: false },
    xaxis: { categories: ['Activos', 'Inactivos', 'Con usos', 'Sin usos'], labels: { style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '12px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: (v) => Math.round(v).toString(), style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' } } },
    grid: { borderColor: isDark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => `${v} personas` } },
    theme: { mode: isDark ? 'dark' : 'light' },
  }), [isDark]);

  const chartSeries = [{ name: 'Beneficiarios', data: [totals.active, totals.count - totals.active, totals.withUsage, totals.withoutUsage] }];

  const handleCsvExport = () => {
    const headers = ['Nombre', 'Identificador', 'Tipo ID', `Beneficio individual ${CURRENCY_LABEL}`, 'Usos registrados', 'Estado'];
    const data = rows.map((b) => [b.beneficiary_name, b.beneficiary_identifier, b.identifier_type, b.benefit_amount != null ? Number(b.benefit_amount) : '', b.interactions_count || 0, b.is_active ? 'Activo' : 'Inactivo']);
    return buildCsvBlobUrl(headers, data, { metadataRows: [['Reporte', 'Beneficiarios por convenio'], ['Convenio', selectedAgreement?.agreement_name || ''], ['Generado el', new Date().toLocaleString('es-CL')]] });
  };

  return (
    <ReportLayout
      title="Beneficiarios por convenio"
      description={selectedId ? `${rows.length} beneficiarios · ${totals.active} activos` : 'Selecciona un convenio para ver sus beneficiarios'}
      actions={[{ id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate(pathname) }]}
      filterBar={
        <div className="w-64 shrink-0">
          <AutocompleteSelect value={selectedId} onChange={(v) => setSelectedId(v || '')} options={agreementOptions} placeholder="Seleccionar convenio..." clearable={false} buttonClassName="h-10 shadow-none" />
        </div>
      }
      filterBarTrailing={selectedId ? (
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm text-slate-500">Estado</span>
          <div className="w-48">
            <AutocompleteSelect value={statusFilter} onChange={(v) => setStatusFilter(v || 'all')} options={STATUS_OPTIONS} clearable={false} buttonClassName="h-10 shadow-none" />
          </div>
        </div>
      ) : null}
      onRunReport={selectedId ? () => loadBeneficiaries(selectedId) : null}
      runReportLabel="Actualizar"
      runReportLoading={loading}
      kpiItems={selectedId ? [
        { id: 'count', label: 'Total beneficiarios', value: totals.count.toString(), hint: 'en convenio' },
        { id: 'active', label: 'Activos', value: totals.active.toString(), hint: 'habilitados' },
        { id: 'with', label: 'Con usos', value: totals.withUsage.toString(), hint: 'han utilizado el convenio' },
        { id: 'without', label: 'Sin usos', value: totals.withoutUsage.toString(), hint: 'aún no han utilizado' },
      ] : []}
      charts={[{
        title: 'Distribución de beneficiarios',
        subtitle: selectedId ? 'Estado y actividad de los beneficiarios del convenio' : 'Selecciona un convenio para ver el gráfico',
        icon: BarChart2,
        content: selectedId && rows.length > 0
          ? <ReactApexChart options={chartOptions} series={chartSeries} type="bar" height={260} />
          : <div className="flex h-40 items-center justify-center text-sm text-slate-400">{selectedId ? 'Sin beneficiarios registrados' : 'Selecciona un convenio para ver la distribución'}</div>,
      }]}
      tableTitle="Beneficiarios"
      tableSubtitle={selectedId ? (loading ? 'Cargando...' : `${rows.length} registros`) : undefined}
      tableIcon={Users}
      onExportCsv={selectedId ? handleCsvExport : undefined}
      csvFilename={`beneficiarios-${selectedAgreement?.agreement_name || 'convenio'}.csv`}
    >
      <div className="overflow-x-auto">
        {!selectedId ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Users className="mb-3 h-8 w-8 text-slate-300 dark:text-slate-700" />
            <p className="text-sm text-slate-400">Selecciona un convenio para ver sus beneficiarios.</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">Cargando datos...</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">Este convenio no tiene beneficiarios registrados.</div>
        ) : (
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Nombre</Th><Th>Identificador</Th><Th>Tipo ID</Th><Th right>Beneficio individual</Th><Th right>Usos</Th><Th>Estado</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {rows.map((b) => (
                <tr key={b.id}>
                  <Td bold>{b.beneficiary_name}</Td>
                  <Td muted><span className="font-mono text-xs">{b.beneficiary_identifier}</span></Td>
                  <Td muted>{b.identifier_type}</Td>
                  <Td right>{money(b.benefit_amount)}</Td>
                  <Td right>
                    {Number(b.interactions_count || 0) > 0
                      ? <span className="font-semibold text-teal-600 dark:text-teal-400">{b.interactions_count}</span>
                      : <span className="text-slate-300 dark:text-slate-600">0</span>}
                  </Td>
                  <Td>
                    {b.is_active
                      ? <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Activo</span>
                      : <span className="text-xs font-medium text-slate-400">Inactivo</span>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ReportLayout>
  );
};

export default AgreementBeneficiaries;
