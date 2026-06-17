import { useNavigate } from 'react-router-dom';
import { BarChart3, ChevronRight, Clock } from 'lucide-react';
import { REPORT_GROUPS } from './reportGroups';

const totalAvailable = REPORT_GROUPS.reduce(
  (n, g) => n + g.reports.filter((r) => r.available).length,
  0,
);
const totalReports = REPORT_GROUPS.reduce((n, g) => n + g.reports.length, 0);

const ReportCard = ({ report, onOpen }) => (
  <div
    className={[
      'group flex flex-col rounded-lg border bg-white p-4 transition-shadow',
      'dark:bg-slate-900',
      report.available
        ? 'cursor-pointer border-slate-200 hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:hover:border-slate-600'
        : 'border-slate-200 opacity-70 dark:border-slate-800',
    ].join(' ')}
    onClick={report.available ? onOpen : undefined}
    role={report.available ? 'button' : undefined}
    tabIndex={report.available ? 0 : undefined}
    onKeyDown={report.available ? (e) => e.key === 'Enter' && onOpen() : undefined}
  >
    <div className="mb-3 flex items-center gap-1.5">
      {report.available ? (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Disponible</span>
        </>
      ) : (
        <>
          <Clock className="h-3 w-3 text-slate-400" />
          <span className="text-xs text-slate-400">En desarrollo</span>
        </>
      )}
    </div>
    <p className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{report.label}</p>
    <p className="mb-3 flex-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{report.description}</p>
    {report.tags?.length > 0 && (
      <div className="mb-3 flex flex-wrap gap-1">
        {report.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          >
            {tag}
          </span>
        ))}
      </div>
    )}
    {report.available && (
      <div className="flex items-center justify-end">
        <span className="flex items-center gap-1 text-xs font-medium text-blue-600 group-hover:underline dark:text-blue-400">
          Abrir
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    )}
  </div>
);

const ReportsHub = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-slate-400" />
            <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
              Reportes de gestión
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {totalAvailable} de {totalReports} reportes disponibles
          </p>
        </div>
      </div>

      {REPORT_GROUPS.map(({ id, label, Icon, iconCls, headCls, reports, path }) => (
        <section key={id}>
          <div
            className={`mb-3 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-opacity hover:opacity-80 ${headCls ?? 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900'}`}
            onClick={() => navigate(path)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(path)}
          >
            <Icon className={`h-4 w-4 ${iconCls}`} />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label.replace('Reportes de ', '')}</span>
            <span className="ml-auto text-xs text-slate-400">
              {reports.filter((r) => r.available).length}/{reports.length}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onOpen={() => navigate(report.path)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default ReportsHub;
