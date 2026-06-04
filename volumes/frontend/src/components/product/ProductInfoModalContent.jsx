/* eslint-disable react/prop-types */
import { X } from 'lucide-react';
import { appConfig } from '@/config/appConfig';
import { cn } from '@/utils/cn';

const ProductInfoModalContent = ({ isDark = false, onClose }) => {
  const appDisplayName = appConfig.name;
  const appVersion = import.meta.env.VITE_FRONTEND_VERSION || '1.0.0';
  const appEnv = (import.meta.env.VITE_FRONTEND_ENV || '').toUpperCase();

  return (
    <div className={cn('-m-6 overflow-hidden rounded-md bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100', isDark && 'dark')}>
      <div className="relative p-6 sm:p-7">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-md border border-blue-300 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 dark:border-blue-400/70 dark:text-slate-200 dark:hover:bg-blue-500/10 dark:hover:text-white"
          aria-label="Cerrar información del producto"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-7 flex items-center gap-3 pr-14">
          <img src="/assets/logo.png" alt="Logo del aplicativo" loading="eager" decoding="async" className="h-12 w-12 rounded-md bg-white object-contain p-2 shadow-sm" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold leading-none text-slate-950 dark:text-white">{appDisplayName}</h2>
              <span className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 dark:border-slate-500/70 dark:text-slate-200">
                {appVersion}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Sistema de inventarios y gestión comercial</div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <div className="flex aspect-square items-center justify-center rounded-md border border-slate-200 bg-slate-50 p-8 shadow-inner dark:border-slate-600/80 dark:bg-slate-800">
            <img src="/assets/logo.png" alt={`Logo ${appDisplayName}`} width="192" height="192" loading="eager" decoding="async" className="h-48 w-48 object-contain drop-shadow-xl" />
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Descripción</h3>
              <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-200">
                <p>
                  {appDisplayName} es una plataforma diseñada para apoyar la administración diaria de
                  inventarios y operaciones comerciales, facilitando el control de productos, movimientos
                  de stock, ventas, documentos y reportes desde un entorno centralizado.
                </p>
                <p>
                  Su objetivo es entregar una herramienta clara, ordenada y fácil de usar, orientada a
                  mejorar la trazabilidad, reducir tareas manuales y entregar mayor visibilidad sobre la
                  operación del negocio.
                </p>
              </div>
            </div>

            <div className="grid gap-x-8 gap-y-4 text-sm text-slate-600 dark:text-slate-200 sm:grid-cols-2">
              <div className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500 dark:bg-blue-300" />
                <span><strong className="text-slate-950 dark:text-white">Inventario</strong> Control de productos, stock disponible, movimientos, transferencias y ajustes.</span>
              </div>
              <div className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500 dark:bg-blue-300" />
                <span><strong className="text-slate-950 dark:text-white">Ventas</strong> Registro de ventas, asociación con clientes, caja y documentación comercial.</span>
              </div>
              <div className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500 dark:bg-blue-300" />
                <span><strong className="text-slate-950 dark:text-white">Trazabilidad</strong> Seguimiento de operaciones relevantes para mantener control y respaldo de la información.</span>
              </div>
              <div className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500 dark:bg-blue-300" />
                <span><strong className="text-slate-950 dark:text-white">Crecimiento modular</strong> Base preparada para incorporar nuevos módulos y funcionalidades según las necesidades del negocio.</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Desarrollado para {appDisplayName} · Sistema de inventario y gestión comercial · Ambiente {appEnv || 'DEV'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 sm:px-7">
        <span>Producto · {appDisplayName}</span>
        <span>Gestión · Trazabilidad · Modularidad</span>
      </div>
    </div>
  );
};

export default ProductInfoModalContent;
