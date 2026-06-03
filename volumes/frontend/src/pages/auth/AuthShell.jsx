import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';

const AuthShell = ({ title, subtitle, children }) => {
  const { isDark, toggleTheme } = useTheme();
  const appName = import.meta.env.VITE_FRONTEND_NAME || 'GesCom';
  const appVersion = import.meta.env.VITE_FRONTEND_VERSION || '1.0.0';
  const appEnv = (import.meta.env.VITE_FRONTEND_ENV || '').toUpperCase();
  const showEnvBadge = ['DEV', 'QA'].includes(appEnv);
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-white">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:px-8">
        <div className="flex items-center gap-3">
          <img src="/assets/logo.png" alt="Logo del aplicativo" loading="eager" decoding="async" className="h-14 w-14 rounded-md object-contain" />
          <div>
            <div className="text-sm font-semibold">GesCom</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Sistema de inventarios y gestion comercial</div>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Cambiar tema"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </header>

      <main
        className="relative flex flex-1 items-center justify-center overflow-hidden bg-cover bg-center px-4 py-8"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(15, 23, 42, 0.70), rgba(15, 23, 42, 0.26)), url('/assets/backgroundLogin.webp')",
        }}
      >
        <section className="w-full max-w-md rounded-md border border-white/25 bg-white/95 p-7 shadow-2xl backdrop-blur-md dark:bg-slate-900/95 sm:p-8">
          <div className="mb-7 border-b border-slate-200 pb-6 dark:border-slate-800">
            <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">{title}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
          </div>
          {children}
        </section>
      </main>

      <footer className="flex min-h-12 items-center justify-center border-t border-slate-200 bg-white px-5 py-3 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">{appName}</span>
          <span>Version {appVersion}</span>
          <span>{currentYear}</span>
          {showEnvBadge && (
            <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
              {appEnv}
            </span>
          )}
        </div>
      </footer>
    </div>
  );
};

export default AuthShell;
