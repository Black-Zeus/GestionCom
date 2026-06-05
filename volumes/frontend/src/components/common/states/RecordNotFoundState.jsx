/* eslint-disable react/prop-types */
import { AlertTriangle, ArrowLeft } from 'lucide-react';

const RecordNotFoundState = ({
  title = 'Registro no encontrado',
  description = 'No existen datos para el codigo buscado.',
  actionLabel = 'Volver',
  onAction,
  logos = [],
}) => (
  <section className="flex min-h-full items-center justify-center">
    <div className="w-full max-w-xl rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {logos.length > 0 && (
        <div className="mb-6 flex items-center justify-center gap-3">
          {logos.filter((logo) => logo.src).map((logo) => (
            <img
              key={logo.alt || logo.src}
              src={logo.src}
              alt={logo.alt || 'Logo'}
            className="h-[100px] w-[100px] rounded-md border border-slate-200 bg-white object-contain p-2 dark:border-slate-700"
            />
          ))}
        </div>
      )}
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-md bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">404</div>
      <h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{title}</h1>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {actionLabel}
        </button>
      )}
    </div>
  </section>
);

export default RecordNotFoundState;
