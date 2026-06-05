/* eslint-disable react/prop-types */
import { CheckCircle2, EyeOff, XCircle } from 'lucide-react';

const variants = {
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  inactive: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  danger: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
};

const defaultIcons = {
  active: CheckCircle2,
  inactive: XCircle,
  warning: EyeOff,
  danger: XCircle,
  info: null,
};

const StatusBadge = ({ variant = 'inactive', children, icon, className = '' }) => {
  const Icon = icon === false ? null : icon || defaultIcons[variant];

  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${variants[variant] || variants.inactive} ${className}`}>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
};

export default StatusBadge;
