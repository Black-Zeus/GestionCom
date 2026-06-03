import { Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthShell from './AuthShell';

const ForgotPassword = () => {
  const navigate = useNavigate();

  return (
    <AuthShell title="Recuperar contrasena" subtitle="Solicita un enlace de recuperacion para tu cuenta">
      <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="email">
            Correo electronico
          </label>
          <input
            id="email"
            type="email"
            className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            placeholder="usuario@empresa.cl"
          />
        </div>
        <button type="submit" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
          <Mail className="h-4 w-4" />
          Enviar enlace
        </button>
        <button type="button" onClick={() => navigate('/login')} className="w-full text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
          Volver al login
        </button>
      </form>
    </AuthShell>
  );
};

export default ForgotPassword;
