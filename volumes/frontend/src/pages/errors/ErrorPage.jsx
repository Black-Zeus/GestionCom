import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const copy = {
  '301': ['301', 'Recurso movido', 'La ruta solicitada fue redirigida o ya no esta disponible.'],
  '302': ['302', 'Redireccion temporal', 'El recurso solicitado apunta temporalmente a otra ubicacion.'],
  '400': ['400', 'Solicitud invalida', 'La solicitud no puede ser procesada.'],
  '401': ['401', 'No autenticado', 'Debes iniciar sesion para acceder a este recurso.'],
  '403': ['403', 'Acceso prohibido', 'No tienes permisos para acceder a esta seccion.'],
  '404': ['404', 'Pagina no encontrada', 'No encontramos la ruta solicitada.'],
  '500': ['500', 'Error interno', 'El sistema no pudo completar la operacion.'],
};

const ErrorPage = ({ code = '404' }) => {
  const navigate = useNavigate();
  const [status, title, description] = copy[code] || copy['404'];

  return (
    <section className="flex min-h-full items-center justify-center">
      <div className="w-full max-w-xl rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-md bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">{status}</div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{title}</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{description}</p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </button>
      </div>
    </section>
  );
};

export default ErrorPage;
