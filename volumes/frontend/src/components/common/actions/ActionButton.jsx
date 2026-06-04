/* eslint-disable react/prop-types */
import { Plus } from 'lucide-react';

const variants = {
  primary: 'bg-blue-600 text-white shadow-sm hover:bg-blue-700',
  neutral: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
  danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50 dark:border-red-900 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/30',
};

export const ActionButton = ({
  label,
  icon: Icon = Plus,
  variant = 'primary',
  className = '',
  children,
  ...props
}) => (
  <button
    type="button"
    className={`inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant] || variants.primary} ${className}`}
    {...props}
  >
    {Icon ? <Icon className="h-4 w-4" /> : <span className="text-base leading-none">+</span>}
    <span>{children || label}</span>
  </button>
);

export const RowActionButton = ({
  label,
  icon: Icon,
  variant = 'neutral',
  className = '',
  ...props
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={`inline-flex h-9 w-9 items-center justify-center rounded-md transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant] || variants.neutral} ${className}`}
    {...props}
  >
    {Icon && <Icon className="h-4 w-4" />}
  </button>
);

export default ActionButton;
