import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

const ModuleSpinner = ({ message = 'Cargando modulo...', className = '' }) => (
  <div className={cn('flex min-h-full w-full items-center justify-center p-8', className)}>
    <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" aria-hidden="true" />
      <div>
        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{message}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">Preparando interfaz</div>
      </div>
    </div>
  </div>
);

export default ModuleSpinner;
