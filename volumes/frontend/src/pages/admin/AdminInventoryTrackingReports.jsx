import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, CalendarClock, MapPin, RefreshCw } from 'lucide-react';
import { ActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import StatusBadge from '@/components/common/data/StatusBadge';
import { stockMovementsService } from '@/services/inventory/stockMovementsService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';

const fieldClassName = 'h-11 rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const quantity = (value) => Number(value || 0).toLocaleString('es-CL', { maximumFractionDigits: 4 });
const trackingLabel = (item) => [item.batch_lot_number, item.expiry_date, item.serial_number].filter(Boolean).join(' / ') || '-';
const locationLabel = (item) => [item.warehouse_name, item.zone_name, item.location_name].filter(Boolean).join(' / ') || item.warehouse_name || '-';

const expiryVariant = (status) => {
  if (status === 'EXPIRED' || status === 'MISSING') return 'danger';
  if (status === 'CRITICAL' || status === 'WARNING') return 'warning';
  return 'active';
};

const expiryLabel = (status) => ({
  EXPIRED: 'Vencido',
  MISSING: 'Sin fecha',
  CRITICAL: 'Critico',
  WARNING: 'Proximo',
  OK: 'Vigente',
}[status] || status || '-');

const AdminInventoryTrackingReports = () => {
  const [locationGaps, setLocationGaps] = useState([]);
  const [expiringLots, setExpiringLots] = useState([]);
  const [days, setDays] = useState(30);
  const [activeView, setActiveView] = useState('locations');
  const [loading, setLoading] = useState(false);
  const [emittingAlerts, setEmittingAlerts] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextLocationGaps, nextExpiringLots] = await Promise.all([
        stockMovementsService.listLocationGaps(),
        stockMovementsService.listExpiringLots({ days, include_missing: true }),
      ]);
      setLocationGaps(nextLocationGaps);
      setExpiringLots(nextExpiringLots);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const expiredCount = useMemo(() => expiringLots.filter((item) => item.expiry_status === 'EXPIRED').length, [expiringLots]);
  const missingExpiryCount = useMemo(() => expiringLots.filter((item) => item.expiry_status === 'MISSING').length, [expiringLots]);
  const criticalCount = useMemo(() => expiringLots.filter((item) => ['CRITICAL', 'WARNING'].includes(item.expiry_status)).length, [expiringLots]);

  const refresh = () => notifyPromise(load(), {
    loading: 'Actualizando reportes...',
    success: 'Reportes actualizados.',
    error: (requestError) => getBackendMessage(requestError, 'No fue posible actualizar los reportes.'),
  });

  const emitAlerts = async () => {
    setEmittingAlerts(true);
    try {
      const result = await notifyPromise(stockMovementsService.emitExpiringLotAlerts({ days, include_missing: true }), {
        loading: 'Emitiendo alertas...',
        success: (response) => `${response.notifications_created || 0} alertas emitidas.`,
        error: (requestError) => getBackendMessage(requestError, 'No fue posible emitir las alertas.'),
      });
      window.dispatchEvent(new Event('notifications:updated'));
      return result;
    } finally {
      setEmittingAlerts(false);
    }
  };

  const locationColumns = [
    { id: 'product', label: 'SKU / producto', sortable: true, render: (item) => <div><div className="font-medium">{item.variant_name}</div><div className="text-xs text-slate-500">{item.product_name}</div></div> },
    { id: 'warehouse', label: 'Bodega / zona', sortable: true, render: (item) => [item.warehouse_name, item.zone_name].filter(Boolean).join(' / ') || '-' },
    { id: 'tracking', label: 'Tracking', render: trackingLabel },
    { id: 'quantity', label: 'Stock', align: 'right', sortable: true, sortValue: (item) => Number(item.current_quantity || 0), render: (item) => quantity(item.current_quantity) },
    { id: 'last_movement_date', label: 'Ultimo mov.', sortable: true, render: (item) => item.last_movement_date || '-' },
  ];

  const expiringColumns = [
    { id: 'product', label: 'SKU / producto', sortable: true, render: (item) => <div><div className="font-medium">{item.variant_name}</div><div className="text-xs text-slate-500">{item.product_name}</div></div> },
    { id: 'location', label: 'Ubicacion', sortable: true, render: locationLabel },
    { id: 'tracking', label: 'Lote / serial', render: (item) => [item.batch_lot_number, item.serial_number].filter(Boolean).join(' / ') || '-' },
    { id: 'expiry_date', label: 'Vencimiento', sortable: true, render: (item) => item.expiry_date || '-' },
    { id: 'days_to_expiry', label: 'Dias', align: 'right', sortable: true, sortValue: (item) => Number(item.days_to_expiry ?? -9999), render: (item) => item.days_to_expiry ?? '-' },
    { id: 'status', label: 'Estado', render: (item) => <StatusBadge variant={expiryVariant(item.expiry_status)}>{expiryLabel(item.expiry_status)}</StatusBadge> },
    { id: 'quantity', label: 'Stock', align: 'right', sortable: true, sortValue: (item) => Number(item.current_quantity || 0), render: (item) => quantity(item.current_quantity) },
  ];

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Control de tracking"
        description="Brechas operativas de ubicacion, lotes, vencimientos y seriales."
        icon={AlertTriangle}
        actions={<ActionButton label="Actualizar" icon={RefreshCw} onClick={refresh} disabled={loading} />}
      />

      <KpiBar
        columnsClassName="sm:grid-cols-4"
        items={[
          { id: 'locations', label: 'Sin ubicacion', value: locationGaps.length, hint: 'Stock que exige ubicacion', active: activeView === 'locations', onClick: () => setActiveView('locations') },
          { id: 'expired', label: 'Vencidos', value: expiredCount, hint: 'Stock con fecha vencida', active: activeView === 'expiry', onClick: () => setActiveView('expiry') },
          { id: 'critical', label: 'Por vencer', value: criticalCount, hint: `Dentro de ${days} dias`, active: activeView === 'expiry', onClick: () => setActiveView('expiry') },
          { id: 'missing', label: 'Sin vencimiento', value: missingExpiryCount, hint: 'Productos que lo exigen', active: activeView === 'expiry', onClick: () => setActiveView('expiry') },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="inline-flex rounded-md border border-slate-200 p-1 dark:border-slate-700">
          <button type="button" onClick={() => setActiveView('locations')} className={`inline-flex h-9 items-center gap-2 rounded px-3 text-sm font-medium ${activeView === 'locations' ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
            <MapPin className="h-4 w-4" />
            Ubicaciones
          </button>
          <button type="button" onClick={() => setActiveView('expiry')} className={`inline-flex h-9 items-center gap-2 rounded px-3 text-sm font-medium ${activeView === 'expiry' ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
            <CalendarClock className="h-4 w-4" />
            Vencimientos
          </button>
        </div>

        {activeView === 'expiry' && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">Dias</span>
              <input className={`${fieldClassName} w-24`} type="number" min="0" max="365" value={days} onChange={(event) => setDays(Number(event.target.value || 0))} />
            </label>
            <ActionButton label="Emitir alertas" icon={Bell} onClick={emitAlerts} disabled={loading || emittingAlerts || expiringLots.length === 0} />
          </div>
        )}
      </div>

      {activeView === 'locations' ? (
        <DataTable loading={loading} data={locationGaps} columns={locationColumns} emptyMessage="No hay stock con ubicacion faltante." />
      ) : (
        <DataTable loading={loading} data={expiringLots} columns={expiringColumns} emptyMessage="No hay lotes vencidos, proximos o sin fecha." />
      )}
    </div>
  );
};

export default AdminInventoryTrackingReports;
