import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Save, SlidersHorizontal } from 'lucide-react';
import { ActionButton } from '@/components/common/actions/ActionButton';
import BottomActionBar from '@/components/common/actions/BottomActionBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import { productConfigService } from '@/services/admin/productConfigService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';

const switchClassName = (active) => `relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${active ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`;
const signature = (items) => JSON.stringify(items.map((item) => ({ field: item.field, is_visible: Boolean(item.is_visible) })));

const AdminProductFlagSettings = () => {
  const [settings, setSettings] = useState([]);
  const [savedSettings, setSavedSettings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasChanges = signature(settings) !== signature(savedSettings);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const nextSettings = await productConfigService.listProductFlagSettings();
      setSettings(nextSettings);
      setSavedSettings(nextSettings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateSetting = (field, isVisible) => {
    setSettings((current) => current.map((item) => (item.field === field ? { ...item, is_visible: isVisible } : item)));
  };

  const refresh = () => notifyPromise(load(), {
    loading: 'Actualizando configuracion...',
    success: 'Configuracion actualizada.',
    error: (error) => getBackendMessage(error, 'No fue posible actualizar la configuracion.'),
  });

  const save = async () => {
    setSaving(true);
    try {
      const payload = settings.map((item) => ({ field: item.field, is_visible: Boolean(item.is_visible) }));
      const nextSettings = await notifyPromise(productConfigService.updateProductFlagSettings(payload), {
        loading: 'Guardando configuracion...',
        success: 'Configuracion guardada.',
        error: (error) => getBackendMessage(error, 'No fue posible guardar la configuracion.'),
      });
      setSettings(nextSettings);
      setSavedSettings(nextSettings);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Checks de producto"
        description="Visibilidad de capacidades funcionales en el maestro de productos."
        icon={SlidersHorizontal}
        actions={<ActionButton label="Actualizar" icon={RefreshCw} variant="secondary" onClick={refresh} disabled={loading || saving} />}
      />

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 md:grid-cols-[minmax(0,1fr)_9rem]">
          <span>Check</span>
          <span className="text-right">Visible</span>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">Cargando configuracion...</div>
        ) : settings.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">No hay checks configurados.</div>
        ) : settings.map((item) => (
          <div key={item.field} className="grid gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 dark:border-slate-800 md:grid-cols-[minmax(0,1fr)_9rem]">
            <div>
              <div className="font-medium text-slate-950 dark:text-white">{item.label}</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.description}</div>
            </div>
            <div className="flex items-center justify-end">
              <button type="button" className={switchClassName(item.is_visible)} onClick={() => updateSetting(item.field, !item.is_visible)} aria-pressed={item.is_visible}>
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${item.is_visible ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <BottomActionBar
        leftContent={hasChanges ? 'Hay cambios pendientes por guardar.' : 'Sin cambios pendientes.'}
        actions={[
          { id: 'save', label: saving ? 'Guardando...' : 'Guardar cambios', icon: Save, variant: 'primary', disabled: !hasChanges || loading || saving, onClick: save },
        ]}
      />
    </div>
  );
};

export default AdminProductFlagSettings;
