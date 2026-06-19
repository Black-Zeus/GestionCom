import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import { agreementsService } from '@/services/sales/agreementsService';

const money = (v) => Number(v).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const pct = (v) => `${Number(v).toFixed(1)}%`;
const fmtDate = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL') : '—');

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

const AgreementSummary = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    agreementsService.list()
      .then(setAgreements)
      .catch(() => setError('No se pudieron cargar los convenios.'))
      .finally(() => setLoading(false));
  }, []);

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

  const KPI_ITEMS = [
    { id: 'count', label: 'Total convenios', value: totals.count.toString(), hint: `${totals.active} activos` },
    { id: 'ben', label: 'Beneficiarios', value: totals.beneficiaries.toString(), hint: 'registrados' },
    { id: 'committed', label: 'Monto comprometido', value: money(totals.committed), hint: 'suma de beneficios' },
    { id: 'consumed', label: 'Monto consumido', value: money(totals.consumed), hint: `${pct(usagePct)} del total` },
  ];

  const exportCSV = () => {
    const headers = ['Código', 'Convenio', 'Empresa', 'RUT', 'Tipo', 'Beneficio', 'Consumido', '% Uso', 'Beneficiarios', 'Vigencia desde', 'Vigencia hasta', 'Estado'];
    const data = rows.map((r) => {
      const benefit = Number(r.benefit_amount || 0);
      const consumed = Number(r.consumed_amount || 0);
      const pctUso = benefit > 0 ? ((consumed / benefit) * 100).toFixed(1) : '0.0';
      return [
        r.agreement_code, r.agreement_name, r.company_name, r.company_tax_id,
        r.agreement_type === 'DISCOUNT' ? 'Descuento' : 'Crédito',
        benefit, consumed, pctUso,
        r.beneficiaries_count || 0,
        r.valid_from || '', r.valid_to || '',
        r.is_active ? 'Activo' : 'Inactivo',
      ];
    });
    downloadCSV('resumen-convenios.csv', headers, data);
  };

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Resumen de convenios"
        description="Vista consolidada de todos los convenios con monto comprometido y consumido"
        actions={[
          { id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate(pathname) },
        ]}
      />

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="w-48 shrink-0">
          <AutocompleteSelect
            value={typeFilter}
            onChange={(v) => setTypeFilter(v || 'all')}
            options={TYPE_OPTIONS}
            placeholder="Todos los tipos"
            clearable={false}
            buttonClassName="h-10 shadow-none"
          />
        </div>
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
      </div>

      <KpiBar items={KPI_ITEMS} className="mb-5" />

      <Card
        title="Convenios"
        subtitle={`${rows.length} registros`}
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
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No hay convenios que coincidan con los filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <Th>Convenio</Th>
                  <Th>Empresa</Th>
                  <Th>Tipo</Th>
                  <Th right>Beneficiarios</Th>
                  <Th right>Monto beneficio</Th>
                  <Th right>Consumido</Th>
                  <Th right>% Uso</Th>
                  <Th>Vigencia</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {rows.map((r) => {
                  const benefit = Number(r.benefit_amount || 0);
                  const consumed = Number(r.consumed_amount || 0);
                  const pctUso = benefit > 0 ? (consumed / benefit) * 100 : 0;
                  return (
                    <tr key={r.id}>
                      <Td>
                        <p className="font-medium">{r.agreement_name}</p>
                        <p className="text-xs text-slate-400">{r.agreement_code}</p>
                      </Td>
                      <Td>
                        <p>{r.company_name}</p>
                        <p className="text-xs text-slate-400">{r.company_tax_id}</p>
                      </Td>
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
                      <Td muted>
                        <span className="text-xs">
                          {fmtDate(r.valid_from)} — {r.valid_to ? fmtDate(r.valid_to) : 'Sin vencimiento'}
                        </span>
                      </Td>
                      <Td>
                        {r.is_active
                          ? <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Activo</span>
                          : <span className="text-xs font-medium text-slate-400">Inactivo</span>}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
};

export default AgreementSummary;
