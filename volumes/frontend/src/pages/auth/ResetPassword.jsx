import { KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthShell from './AuthShell';

const ResetPassword = () => {
  const navigate = useNavigate();

  return (
    <AuthShell title="Restablecer contrasena" subtitle="Define una nueva contrasena para tu cuenta">
      <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="password">
            Nueva contrasena
          </label>
          <input id="password" type="password" className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="confirm">
            Confirmar contrasena
          </label>
          <input id="confirm" type="password" className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </div>
        <button type="submit" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
          <KeyRound className="h-4 w-4" />
          Actualizar contrasena
        </button>
        <button type="button" onClick={() => navigate('/login')} className="w-full text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
          Volver al login
        </button>
      </form>
    </AuthShell>
  );
};

export default ResetPassword;
