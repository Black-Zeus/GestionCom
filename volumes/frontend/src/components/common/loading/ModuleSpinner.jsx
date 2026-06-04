/* eslint-disable react/prop-types */
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

const sizeClass = {
  page: 'min-h-[calc(100vh-9rem)]',
  container: 'min-h-64',
  inline: 'min-h-24',
};

const ModuleSpinner = ({
  message = 'Cargando modulo...',
  detail = 'Preparando interfaz',
  variant = 'page',
  className = '',
}) => (
  <div className={cn('flex w-full items-center justify-center p-8', sizeClass[variant] || sizeClass.page, className)}>
    <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" aria-hidden="true" />
      <div>
        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{message}</div>
        {detail && <div className="text-xs text-slate-500 dark:text-slate-400">{detail}</div>}
      </div>
    </div>
  </div>
);

export default ModuleSpinner;
