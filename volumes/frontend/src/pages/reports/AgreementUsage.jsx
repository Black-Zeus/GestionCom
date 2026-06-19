import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Download, FileText, X } from 'lucide-react';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import { agreementsService } from '@/services/sales/agreementsService';

const money = (v) => Number(v).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

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

const AgreementUsage = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [agreements, setAgreements] = useState([]);
  const [usage, setUsage] = useState([]);
  const [selectedId, setSelectedId] = useState('all');
  const [loadingAgreements, setLoadingAgreements] = useState(true);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    agreementsService.list()
      .then(setAgreements)
      .catch(() => setError('No se pudieron cargar los convenios.'))
      .finally(() => setLoadingAgreements(false));
  }, []);

  useEffect(() => {
    setLoadingUsage(true);
    const params = selectedId !== 'all' ? { agreement_id: selectedId } : {};
    agreementsService.usage(params)
      .then(setUsage)
      .catch(() => setError('No se pudieron cargar los registros de uso.'))
      .finally(() => setLoadingUsage(false));
  }, [selectedId]);

  const agreementOptions = useMemo(() => [
    { value: 'all', label: 'Todos los convenios' },
    ...agreements.map((a) => ({ value: String(a.id), label: a.agreement_name })),
  ], [agreements]);

  const totals = useMemo(() => ({
    count: usage.length,
    discountTotal: usage.reduce((s, u) => s + Number(u.discount_amount || 0), 0),
    uniqueBeneficiaries: new Set(usage.map((u) => u.associate_identifier).filter(Boolean)).size,
  }), [usage]);

  const KPI_ITEMS = [
    { id: 'count', label: 'Usos registrados', value: totals.count.toString(), hint: 'transacciones' },
    { id: 'discount', label: 'Beneficio total aplicado', value: money(totals.discountTotal), hint: 'descuento / crédito' },
    { id: 'ben', label: 'Beneficiarios únicos', value: totals.uniqueBeneficiaries.toString(), hint: 'distintos' },
  ];

  const exportCSV = () => {
    const headers = ['Fecha', 'Convenio', 'Beneficiario', 'Identificador', 'Tipo', 'Código venta', 'Ticket', 'Monto original', 'Descuento / crédito', 'Monto final'];
    const data = usage.map((u) => [
      fmtDateTime(u.created_at),
      u.agreement_name,
      u.associate_name || u.beneficiary_name || '—',
      u.associate_identifier || '—',
      u.agreement_type === 'DISCOUNT' ? 'Descuento' : 'Crédito',
      u.sale_code || '—',
      u.ticket_number || '—',
      u.original_amount || 0,
      u.discount_amount || 0,
      u.final_amount || 0,
    ]);
    downloadCSV('uso-convenios.csv', headers, data);
  };

  const loading = loadingAgreements || loadingUsage;

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Uso de convenios"
        description="Historial de transacciones que aplicaron un convenio comercial"
        actions={[
          { id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate(pathname) },
        ]}
      />

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="w-64 shrink-0">
          <AutocompleteSelect
            value={selectedId}
            onChange={(v) => setSelectedId(v || 'all')}
            options={agreementOptions}
            placeholder="Todos los convenios"
            clearable={false}
            buttonClassName="h-10 shadow-none"
          />
        </div>
        {selectedId !== 'all' && (
          <button
            type="button"
            onClick={() => setSelectedId('all')}
            className="flex h-10 items-center gap-1.5 rounded-md px-3 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}
      </div>

      <KpiBar items={KPI_ITEMS} className="mb-5" />

      <Card
        title="Historial de uso"
        subtitle={`${usage.length} registros`}
        icon={FileText}
        actions={
          <button
            type="button"
            onClick={exportCSV}
            title="Exportar CSV"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <Download className="h-4 w-4" />
          </button>
        }
      >
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Cargando...</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-red-500">{error}</p>
        ) : usage.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No hay registros de uso para los filtros seleccionados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <Th>Fecha</Th>
                  <Th>Convenio</Th>
                  <Th>Beneficiario</Th>
                  <Th>Tipo</Th>
                  <Th>Código venta</Th>
                  <Th right>Monto original</Th>
                  <Th right>Descuento / crédito</Th>
                  <Th right>Monto final</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {usage.map((u) => (
                  <tr key={u.id}>
                    <Td muted><span className="text-xs">{fmtDateTime(u.created_at)}</span></Td>
                    <Td>{u.agreement_name}</Td>
                    <Td>
                      <p>{u.associate_name || u.beneficiary_name || '—'}</p>
                      {u.associate_identifier && <p className="text-xs text-slate-400">{u.associate_identifier}</p>}
                    </Td>
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
          </div>
        )}
      </Card>
    </section>
  );
};

export default AgreementUsage;
