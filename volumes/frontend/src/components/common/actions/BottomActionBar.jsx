/* eslint-disable react/prop-types */
const variants = {
  primary: 'bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-500 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 dark:disabled:bg-slate-500',
  neutral: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400',
};

const BottomActionBar = ({
  actions = [],
  leftContent,
  className = '',
}) => (
  <div className={`border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900 ${className}`}>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0 flex-[1_1_28rem] text-sm text-slate-500 dark:text-slate-400">
        {leftContent}
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-2">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.id || action.label}
              type={action.type || 'button'}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[action.variant || 'neutral'] || variants.neutral} ${action.className || ''}`}
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

export default BottomActionBar;
