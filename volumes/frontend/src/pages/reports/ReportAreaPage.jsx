/* eslint-disable react/prop-types */
import { Suspense, lazy } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import { REPORT_GROUPS } from './reportGroups';

const REPORT_COMPONENTS = {
  'daily-sales':              lazy(() => import('./DailySales')),
  'returns-exchanges':        lazy(() => import('./ReturnsExchangesReport')),
  'category-sales':           lazy(() => import('./CategorySales')),
  'customer-sales':           lazy(() => import('./CustomerSales')),
  'seller-ranking':           lazy(() => import('./SellerRanking')),
  'petty-cash-detail':        lazy(() => import('./PettyCashDetail')),
  'petty-cash-weekly':        lazy(() => import('./PettyCashWeekly')),
  'petty-cash-fund-status':   lazy(() => import('./PettyCashFundStatus')),
  'petty-cash-replenishments': lazy(() => import('./PettyCashReplenishments')),
  'petty-cash-by-category':   lazy(() => import('./PettyCashByCategory')),
  'cash-sessions':            lazy(() => import('./CashPosSessions')),
  'cash-discrepancies':       lazy(() => import('./CashPosDiscrepancies')),
  'cash-extra-movements':     lazy(() => import('./CashPosExtraMovements')),
  'pos-collection-by-method': lazy(() => import('./CashPosCollectionByMethod')),
  'agreement-summary':        lazy(() => import('./AgreementSummary')),
  'agreement-usage':          lazy(() => import('./AgreementUsage')),
  'agreement-beneficiaries':  lazy(() => import('./AgreementBeneficiaries')),
  'agreement-validity':       lazy(() => import('./AgreementValidity')),
};

// ─── Card ──────────────────────────────────────────────────────────────────

const ReportCard = ({ report, groupIcon: GroupIcon, groupIconCls, groupIconBg, onOpen }) => (
  <div
    className={[
      'flex flex-col rounded-xl border bg-white transition-shadow',
      'dark:bg-slate-900',
      report.available
        ? 'cursor-pointer border-slate-200 hover:shadow-lg dark:border-slate-700'
        : 'border-slate-200 dark:border-slate-800',
    ].join(' ')}
    onClick={report.available ? onOpen : undefined}
    role={report.available ? 'button' : undefined}
    tabIndex={report.available ? 0 : undefined}
    onKeyDown={report.available ? (e) => e.key === 'Enter' && onOpen() : undefined}
  >
    {/* Card body */}
    <div className="flex-1 p-5">
      {/* Icon + badge row */}
      <div className="mb-4 flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${groupIconBg}`}>
          <GroupIcon className={`h-5 w-5 ${groupIconCls}`} />
        </div>
        {report.available ? (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Disponible
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <Clock className="h-3 w-3" />
            En desarrollo
          </span>
        )}
      </div>

      {/* Title */}
      <p className="mb-2 text-base font-semibold text-slate-800 dark:text-slate-100">
        {report.label}
      </p>

      {/* Description */}
      <p className="mb-4 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        {report.description}
      </p>

      {/* Tags */}
      {report.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {report.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>

    {/* Card footer */}
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 dark:border-slate-800">
      <span className="text-xs text-slate-400">{report.type}</span>
      {report.available && (
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
        >
          Ir al reporte
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  </div>
);

// ─── Page ──────────────────────────────────────────────────────────────────

const ReportAreaPage = () => {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const area = pathname.replace(/\/$/, '').split('/').pop();
  const navigate = useNavigate();

  const reportId = searchParams.get('report');
  if (reportId) {
    const ReportComponent = REPORT_COMPONENTS[reportId];
    if (ReportComponent) {
      return (
        <Suspense fallback={null}>
          <ReportComponent />
        </Suspense>
      );
    }
  }

  const group = REPORT_GROUPS.find((g) => g.id === area);
  if (!group) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-slate-400">
        Área de reportes no encontrada.
      </div>
    );
  }

  const { Icon, iconCls, iconBg, label, description, reports } = group;
  const available = reports.filter((r) => r.available).length;

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title={label}
        description={`${description} · ${available} de ${reports.length} ${reports.length === 1 ? 'reporte disponible' : 'reportes disponibles'}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            groupIcon={Icon}
            groupIconCls={iconCls}
            groupIconBg={iconBg}
            onOpen={() => navigate(report.path)}
          />
        ))}
      </div>
    </section>
  );
};

export default ReportAreaPage;
