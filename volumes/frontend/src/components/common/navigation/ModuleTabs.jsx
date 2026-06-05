/* eslint-disable react/prop-types */
const ModuleTabs = ({ tabs = [], activeTab, onChange, className = '' }) => (
  <div className={`inline-flex flex-wrap gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
    {tabs.map((tab) => {
      const Icon = tab.icon;
      const isActive = activeTab === tab.id;

      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange?.(tab.id)}
          disabled={tab.disabled}
          className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
            isActive
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          {Icon && <Icon className="h-4 w-4" />}
          {tab.label}
          {tab.count !== undefined && (
            <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
              {tab.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default ModuleTabs;
