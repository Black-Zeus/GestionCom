import { useState } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthShell from './AuthShell';
import { useAuthStore } from '@/store/useAuthStore';
import { useSessionStore } from '@/store/useSessionStore';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const login = useAuthStore((state) => state.login);
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.error);
  const isDemoSession = useAuthStore((state) => state.isDemoSession);
  const initializeFromUser = useSessionStore((state) => state.initializeFromUser);
  const isLoading = status === 'loading';

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const credentials = {
      username: formData.get('username'),
      password: formData.get('password'),
      remember_me: formData.get('remember_me') === 'on',
    };

    try {
      const session = await login(credentials);
      initializeFromUser(session.user);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch {
      // El store deja el detalle del error listo para la interfaz.
    }
  };

  return (
    <AuthShell title="Acceso al sistema" subtitle="Ingresa tus credenciales para continuar">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="username">
            Usuario o correo
          </label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            disabled={isLoading}
            className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            defaultValue="root"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="password">
            Contrasena
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              disabled={isLoading}
              className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 pr-11 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              defaultValue="GCom#R7xP9!v2"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Mostrar u ocultar contrasena"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <label className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <input name="remember_me" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600" />
            Recordar sesion
          </label>
          <button type="button" onClick={() => navigate('/forgot-password')} className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
            Olvide mi contrasena
          </button>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
        >
          <LogIn className="h-4 w-4" />
          {isLoading ? 'Validando...' : 'Ingresar'}
        </button>
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}
        {isDemoSession && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            Sesion demo activa mientras el backend de autenticacion no responda en desarrollo.
          </div>
        )}
      </form>
    </AuthShell>
  );
};

export default Login;
