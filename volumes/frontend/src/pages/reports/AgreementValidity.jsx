import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle, Clock, Download, XCircle } from 'lucide-react';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import { agreementsService } from '@/services/sales/agreementsService';

const money = (v) => Number(v).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const fmtDate = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL') : '—');
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const diffDays = (from, to) => Math.round((new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / (1000 * 60 * 60 * 24));

const downloadCSV = (filename, headers, rows) => {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))];
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
};

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

const DaysLeftCell = ({ validTo, today }) => {
  if (!validTo) return <span className="text-xs text-slate-400">Sin vencimiento</span>;
  const days = diffDays(today, validTo);
  if (days < 0) return <span className="text-xs font-medium text-red-500">{Math.abs(days)} días vencido</span>;
  if (days === 0) return <span className="text-xs font-medium text-red-500">Vence hoy</span>;
  if (days <= 30) return <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{days} días</span>;
  return <span className="text-xs text-slate-500">{days} días</span>;
};

const Section = ({ title, icon: Icon, iconCls, items, today, emptyMsg }) => (
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
                <Th>Convenio</Th>
                <Th>Empresa</Th>
                <Th>Tipo</Th>
                <Th right>Monto beneficio</Th>
                <Th right>Consumido</Th>
                <Th>Vigencia hasta</Th>
                <Th>Días restantes</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {items.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <p className="font-medium">{r.agreement_name}</p>
                    <p className="text-xs text-slate-400">{r.agreement_code}</p>
                  </Td>
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

const AgreementValidity = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    agreementsService.list()
      .then(setAgreements)
      .catch(() => setError('No se pudieron cargar los convenios.'))
      .finally(() => setLoading(false));
  }, []);

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
    return { active, expiringSoon, expired, noExpiry, inactive };
  }, [agreements, today, soonLimit]);

  const KPI_ITEMS = [
    { id: 'active', label: 'Activos y vigentes', value: (groups.active.length + groups.noExpiry.length).toString(), hint: 'en regla' },
    { id: 'soon', label: 'Próximos a vencer', value: groups.expiringSoon.length.toString(), hint: 'en 30 días' },
    { id: 'expired', label: 'Vencidos', value: groups.expired.length.toString(), hint: 'fuera de vigencia' },
    { id: 'inactive', label: 'Inactivos', value: groups.inactive.length.toString(), hint: 'deshabilitados' },
  ];

  const exportCSV = () => {
    const headers = ['Convenio', 'Empresa', 'Tipo', 'Estado', 'Monto beneficio', 'Consumido', 'Vigencia desde', 'Vigencia hasta', 'Días restantes'];
    const data = agreements.map((a) => {
      const days = a.valid_to ? diffDays(today, a.valid_to) : null;
      return [
        a.agreement_name, a.company_name,
        a.agreement_type === 'DISCOUNT' ? 'Descuento' : 'Crédito',
        a.is_active ? 'Activo' : 'Inactivo',
        a.benefit_amount || 0, a.consumed_amount || 0,
        a.valid_from || '', a.valid_to || '',
        days !== null ? days : 'Sin vencimiento',
      ];
    });
    downloadCSV('vigencia-convenios.csv', headers, data);
  };

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Vigencia de convenios"
        description="Estado de vigencia de todos los convenios: activos, próximos a vencer y vencidos"
        actions={[
          { id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate(pathname) },
          { id: 'csv', label: 'Exportar CSV', icon: Download, onClick: exportCSV },
        ]}
      />

      {loading ? (
        <p className="py-16 text-center text-sm text-slate-400">Cargando...</p>
      ) : error ? (
        <p className="py-16 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          <KpiBar items={KPI_ITEMS} className="mb-5" />
          <div className="space-y-4">
            <Section
              title="Activos y vigentes"
              icon={CheckCircle}
              iconCls="text-emerald-500"
              items={[...groups.active, ...groups.noExpiry]}
              today={today}
              emptyMsg="No hay convenios activos y vigentes."
            />
            <Section
              title="Próximos a vencer (≤ 30 días)"
              icon={AlertTriangle}
              iconCls="text-amber-500"
              items={groups.expiringSoon}
              today={today}
              emptyMsg="No hay convenios próximos a vencer."
            />
            <Section
              title="Vencidos"
              icon={XCircle}
              iconCls="text-red-400"
              items={groups.expired}
              today={today}
              emptyMsg="No hay convenios vencidos."
            />
            <Section
              title="Inactivos"
              icon={Clock}
              iconCls="text-slate-400"
              items={groups.inactive}
              today={today}
              emptyMsg="No hay convenios inactivos."
            />
          </div>
        </>
      )}
    </section>
  );
};

export default AgreementValidity;
