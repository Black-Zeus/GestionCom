import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Download, Users } from 'lucide-react';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import { agreementsService } from '@/services/sales/agreementsService';

const money = (v) => (v != null ? Number(v).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }) : '—');

const downloadCSV = (filename, headers, rows) => {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))];
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
};

const Card = ({ title, subtitle, icon: Icon, children, actions }) => (
  <div className="flex flex-col rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
      {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" />}
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</span>
        {subtitle && <span className="ml-2 text-xs text-slate-400">{subtitle}</span>}
      </div>
      {actions && <div className="ml-2 flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
    <div className="flex-1 p-5">{children}</div>
  </div>
);

const Th = ({ children, right }) => (
  <th className={`pb-2 px-3 first:pl-0 last:pr-0 text-xs font-medium uppercase text-slate-400 ${right ? 'text-right' : 'text-left'}`}>
    {children}
  </th>
);
const Td = ({ children, right, muted, bold }) => (
  <td className={`py-2.5 px-3 first:pl-0 last:pr-0 text-sm ${right ? 'text-right tabular-nums' : ''} ${muted ? 'text-slate-400' : ''} ${bold ? 'font-semibold' : ''}`}>
    {children}
  </td>
);

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
];

const AgreementBeneficiaries = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [agreements, setAgreements] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loadingAgreements, setLoadingAgreements] = useState(true);
  const [loadingBeneficiaries, setLoadingBeneficiaries] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    agreementsService.list()
      .then(setAgreements)
      .catch(() => setError('No se pudieron cargar los convenios.'))
      .finally(() => setLoadingAgreements(false));
  }, []);

  useEffect(() => {
    if (!selectedId) { setBeneficiaries([]); return; }
    setLoadingBeneficiaries(true);
    agreementsService.listBeneficiaries(selectedId)
      .then(setBeneficiaries)
      .catch(() => setError('No se pudieron cargar los beneficiarios.'))
      .finally(() => setLoadingBeneficiaries(false));
  }, [selectedId]);

  const agreementOptions = useMemo(
    () => agreements.map((a) => ({ value: String(a.id), label: a.agreement_name })),
    [agreements],
  );

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

  const KPI_ITEMS = [
    { id: 'count', label: 'Total beneficiarios', value: totals.count.toString(), hint: 'en convenio' },
    { id: 'active', label: 'Activos', value: totals.active.toString(), hint: 'habilitados' },
    { id: 'with', label: 'Con usos', value: totals.withUsage.toString(), hint: 'han utilizado el convenio' },
    { id: 'without', label: 'Sin usos', value: totals.withoutUsage.toString(), hint: 'aún no han utilizado' },
  ];

  const exportCSV = () => {
    const selected = agreements.find((a) => String(a.id) === selectedId);
    const headers = ['Nombre', 'Identificador', 'Tipo ID', 'Beneficio individual', 'Usos registrados', 'Estado'];
    const data = rows.map((b) => [
      b.beneficiary_name,
      b.beneficiary_identifier,
      b.identifier_type,
      b.benefit_amount != null ? Number(b.benefit_amount) : '',
      b.interactions_count || 0,
      b.is_active ? 'Activo' : 'Inactivo',
    ]);
    downloadCSV(`beneficiarios-${selected?.agreement_name || 'convenio'}.csv`, headers, data);
  };

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Beneficiarios por convenio"
        description="Lista de beneficiarios registrados en un convenio con sus usos y estado"
        actions={[
          { id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate(pathname) },
        ]}
      />

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="w-64 shrink-0">
          <AutocompleteSelect
            value={selectedId}
            onChange={(v) => setSelectedId(v || '')}
            options={agreementOptions}
            placeholder="Seleccionar convenio..."
            clearable={false}
            buttonClassName="h-10 shadow-none"
          />
        </div>
        {selectedId && (
          <div className="w-48 shrink-0">
            <AutocompleteSelect
              value={statusFilter}
              onChange={(v) => setStatusFilter(v || 'all')}
              options={STATUS_OPTIONS}
              placeholder="Todos los estados"
              clearable={false}
              buttonClassName="h-10 shadow-none"
            />
          </div>
        )}
      </div>

      {selectedId && <KpiBar items={KPI_ITEMS} className="mb-5" />}

      <Card
        title="Beneficiarios"
        subtitle={selectedId ? `${rows.length} registros` : undefined}
        icon={Users}
        actions={
          selectedId ? (
            <button
              type="button"
              onClick={exportCSV}
              title="Exportar CSV"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <Download className="h-4 w-4" />
            </button>
          ) : undefined
        }
      >
        {!selectedId ? (
          <div className="py-12 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-700" />
            <p className="text-sm text-slate-400">Selecciona un convenio para ver sus beneficiarios.</p>
          </div>
        ) : loadingAgreements || loadingBeneficiaries ? (
          <p className="py-8 text-center text-sm text-slate-400">Cargando...</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-red-500">{error}</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Este convenio no tiene beneficiarios registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <Th>Nombre</Th>
                  <Th>Identificador</Th>
                  <Th>Tipo ID</Th>
                  <Th right>Beneficio individual</Th>
                  <Th right>Usos</Th>
                  <Th>Estado</Th>
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
          </div>
        )}
      </Card>
    </section>
  );
};

export default AgreementBeneficiaries;
