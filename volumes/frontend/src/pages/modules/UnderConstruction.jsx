import { Construction } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { navigablePages } from '@/data/modules';

const UnderConstruction = () => {
  const location = useLocation();
  const module = navigablePages.find((item) => item.path === location.pathname);
  const moduleName = module?.label || 'Modulo';

  return (
    <section className="flex min-h-full items-center justify-center">
      <div className="w-full max-w-2xl rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
          <Construction className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Under Construction</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          {moduleName}
        </p>
      </div>
    </section>
  );
};

export default UnderConstruction;
