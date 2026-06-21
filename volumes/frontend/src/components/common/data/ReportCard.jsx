/* eslint-disable react/prop-types */
const ReportCard = ({ title, subtitle, icon: Icon, children, footer, actions, className = '' }) => (
  <div className={`flex flex-col rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${className}`}>
    {(title || Icon || actions) && (
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" />}
        <div className="min-w-0 flex-1">
          {title && <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</span>}
          {subtitle && <span className="ml-2 text-xs text-slate-400">{subtitle}</span>}
        </div>
        {actions && <div className="ml-2 flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
    )}
    <div className="flex-1 p-5">{children}</div>
    {footer && <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800">{footer}</div>}
  </div>
);

export default ReportCard;
