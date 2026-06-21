/* eslint-disable react/prop-types */
import { Fragment } from 'react';
import { CircleAlert } from 'lucide-react';
import ActionButton from '@/components/common/actions/ActionButton';

const ModuleHeader = ({
  title,
  description,
  actions = [],
  children,
  showAuditMarker = true,
  className = '',
}) => (
  <div className={`mb-5 flex flex-wrap justify-between gap-3 ${className}`}>
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-2">
        {showAuditMarker && (
          <CircleAlert
            className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
            aria-label="Cabecera migrada"
          />
        )}
        <h1 className="truncate text-xl font-semibold">{title}</h1>
      </div>
      {description && (
        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</div>
      )}
    </div>
    {(actions.length > 0 || children) && (
      <div className="flex flex-wrap gap-2">
        {actions.filter(Boolean).map((action) => (
          <Fragment key={action.id || action.label}>
            {action.node || (
              <ActionButton
                label={action.label}
                icon={action.icon}
                variant={action.variant}
                disabled={action.disabled}
                onClick={action.onClick}
                className={action.className}
              />
            )}
          </Fragment>
        ))}
        {children}
      </div>
    )}
  </div>
);

export default ModuleHeader;
