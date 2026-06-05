/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, Clock3, ExternalLink, Eye, Mail, MailOpen, RefreshCw, Trash2, XCircle } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import DataTablePagination from '@/components/common/data/DataTablePagination';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import StatusBadge from '@/components/common/data/StatusBadge';
import { notificationService } from '@/services/notifications/notificationService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { PAGE_SIZE_OPTIONS, usePreferencesStore } from '@/store/usePreferencesStore';
import { formatDateTime } from '@/utils/dateTime';

const severityLabels = { INFO: 'Informacion', SUCCESS: 'Exito', WARNING: 'Alerta', ERROR: 'Error' };
const severityVariant = { INFO: 'info', SUCCESS: 'active', WARNING: 'warning', ERROR: 'danger' };

const NotificationDetail = ({ notification, timezone, onClose }) => (
  <div className="space-y-5">
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
            <Bell className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold text-slate-950 dark:text-white">{notification.title}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{notification.type_name || notification.type_code}</span>
              <span>{notification.source_label || notification.source_table || 'Sistema'}</span>
              <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{formatDateTime(notification.delivered_at, timezone)}</span>
            </div>
          </div>
        </div>
        <StatusBadge variant={severityVariant[notification.severity] || 'info'}>{severityLabels[notification.severity] || notification.severity}</StatusBadge>
      </div>
    </div>
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{notification.message}</p>
    </div>
    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
      {notification.action_url && (
        <a href={notification.action_url} className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-950">
          <ExternalLink className="h-4 w-4" />
          {notification.action_label || 'Abrir'}
        </a>
      )}
      <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium dark:border-slate-700">Cerrar</button>
    </div>
  </div>
);

const NotificationInbox = () => {
  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [source, setSource] = useState('all');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const tablePageSize = usePreferencesStore((state) => state.tablePageSize);
  const setTablePageSize = usePreferencesStore((state) => state.setTablePageSize);
  const timezone = usePreferencesStore((state) => state.timezone);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setNotifications(await notificationService.list({ limit: 300 }));
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar notificaciones.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(0); }, [search, filter, source, type, tablePageSize]);
  useEffect(() => {
    setSelectedIds((current) => {
      const available = new Set(notifications.map((notification) => notification.id));
      const next = new Set([...current].filter((id) => available.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [notifications]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return notifications.filter((notification) => {
      const matchesFilter = filter === 'all' || (filter === 'unread' && !notification.is_read) || (filter === 'read' && notification.is_read);
      const notificationSource = notification.source_label || notification.source_table || 'Sistema';
      const matchesSource = source === 'all' || notificationSource === source;
      const notificationType = notification.type_code || notification.type_name || 'GENERAL';
      const matchesType = type === 'all' || notificationType === type;
      const matchesSearch = !term || [notification.title, notification.message, notification.type_name, notification.type_code, notificationSource].filter(Boolean).some((value) => value.toLowerCase().includes(term));
      return matchesFilter && matchesSource && matchesType && matchesSearch;
    });
  }, [filter, notifications, search, source, type]);

  const sourceOptions = useMemo(() => {
    const values = [...new Set(notifications.map((notification) => notification.source_label || notification.source_table || 'Sistema'))].filter(Boolean).sort();
    return [{ value: 'all', label: 'Todos los origenes' }, ...values.map((value) => ({ value, label: value }))];
  }, [notifications]);

  const typeOptions = useMemo(() => {
    const values = [...new Map(notifications.map((notification) => {
      const value = notification.type_code || notification.type_name || 'GENERAL';
      const label = notification.type_name || notification.type_code || 'General';
      return [value, label];
    })).entries()].sort((left, right) => left[1].localeCompare(right[1]));
    return [{ value: 'all', label: 'Todos los tipos' }, ...values.map(([value, label]) => ({ value, label }))];
  }, [notifications]);

  const visible = filtered.slice(page * tablePageSize, page * tablePageSize + tablePageSize);
  const unread = notifications.filter((notification) => !notification.is_read).length;
  const selectedCount = selectedIds.size;
  const selected = [...selectedIds];
  const visibleIds = visible.map((notification) => notification.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  const dispatchNotificationsUpdated = () => {
    window.dispatchEvent(new Event('notifications:updated'));
  };

  const reloadAfterAction = async () => {
    await load();
    dispatchNotificationsUpdated();
  };

  const toggleSelected = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleVisible = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const openNotification = async (notification) => {
    const detail = await notificationService.get(notification.id);
    ModalManager.show({
      type: 'custom',
      title: 'Detalle de notificacion',
      size: 'medium',
      showFooter: false,
      contentComponent: NotificationDetail,
      contentProps: { notification: detail, timezone },
    });
    await load();
    dispatchNotificationsUpdated();
  };

  const runBulkAction = async ({ action, scope = 'selected', ids = selected, confirm = false }) => {
    if (scope !== 'all' && ids.length === 0) return;
    if (confirm) {
      const confirmed = await ModalManager.confirm({
        title: scope === 'all' ? 'Limpiar bandeja' : 'Eliminar seleccionadas',
        message: scope === 'all' ? 'Esta accion eliminara todas tus notificaciones visibles de la bandeja.' : `Esta accion eliminara ${ids.length} notificacion(es) seleccionada(s).`,
        buttons: { cancel: 'Cancelar', confirm: 'Eliminar' },
      });
      if (!confirmed) return;
    }
    const labels = {
      read: 'marcadas como leidas',
      unread: 'marcadas como no leidas',
      delete: 'eliminadas',
    };
    await notifyPromise(notificationService.bulkAction({ action, scope, ids }), {
      loading: 'Actualizando notificaciones...',
      success: `Notificaciones ${labels[action]}.`,
      error: (requestError) => getBackendMessage(requestError, 'No fue posible actualizar.'),
    });
    if (action === 'delete') setSelectedIds(new Set());
    await reloadAfterAction();
  };

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Centro de notificaciones</h1>
          <p className="mt-1 text-sm text-slate-500">Bandeja de entrada de avisos emitidos por el sistema.</p>
        </div>
      </div>

      <KpiBar items={[{ label: 'Total', value: notifications.length }, { label: 'Nuevas', value: unread }, { label: 'Leidas', value: notifications.length - unread }, { label: 'Filtradas', value: filtered.length }]} className="mb-4" />
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <FilterBar
        className="mb-4"
        gridClassName="lg:grid-cols-[minmax(280px,1fr)_180px_220px_220px]"
        searchValue={search}
        searchPlaceholder="Buscar titulo, mensaje o tipo"
        onSearchChange={setSearch}
        fields={[{ id: 'filter', value: filter, onChange: setFilter, options: [{ value: 'all', label: 'Todas' }, { value: 'unread', label: 'No leidas' }, { value: 'read', label: 'Leidas' }] }, { id: 'source', value: source, onChange: setSource, options: sourceOptions }, { id: 'type', value: type, onChange: setType, options: typeOptions }]}
      />

      <div className="mb-4 rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Acciones de bandeja</div>
            <div className="mt-1 text-xs text-slate-500">
              {selectedCount > 0 ? `${selectedCount} seleccionada(s)` : 'Selecciona una o mas notificaciones para habilitar acciones individuales.'}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={load} className={loading ? '[&>svg]:animate-spin' : ''} />
            <ActionButton label="Limpiar filtros" icon={XCircle} variant="neutral" onClick={() => { setSearch(''); setFilter('all'); setSource('all'); setType('all'); }} />
            <ActionButton label="Todo leido" icon={CheckCheck} disabled={!unread} onClick={() => runBulkAction({ action: 'read', scope: 'all' })} />
            <ActionButton label="Todo no leido" icon={Mail} variant="neutral" disabled={!notifications.length} onClick={() => runBulkAction({ action: 'unread', scope: 'all' })} />
            <ActionButton label="Leido seleccion" icon={MailOpen} variant="neutral" disabled={!selectedCount} onClick={() => runBulkAction({ action: 'read' })} />
            <ActionButton label="No leido seleccion" icon={Mail} variant="neutral" disabled={!selectedCount} onClick={() => runBulkAction({ action: 'unread' })} />
            <ActionButton label="Quitar seleccion" icon={XCircle} variant="neutral" disabled={!selectedCount} onClick={() => setSelectedIds(new Set())} />
            <ActionButton label="Eliminar seleccion" icon={Trash2} variant="danger" disabled={!selectedCount} onClick={() => runBulkAction({ action: 'delete', confirm: true })} />
            <ActionButton label="Limpiar todo" icon={Trash2} variant="danger" disabled={!notifications.length} onClick={() => runBulkAction({ action: 'delete', scope: 'all', confirm: true })} />
          </div>
        </div>
      </div>

      <DataTable
        loading={loading}
        data={visible}
        emptyMessage="No hay notificaciones para mostrar."
        footer={<DataTablePagination page={page} pageSize={tablePageSize} pageSizeOptions={PAGE_SIZE_OPTIONS} total={filtered.length} hasMore={(page + 1) * tablePageSize < filtered.length} loading={loading} onPageChange={setPage} onPageSizeChange={(size) => { setTablePageSize(size); setPage(0); }} />}
        columns={[
          {
            id: 'select',
            label: (
              <input
                type="checkbox"
                checked={allVisibleSelected}
                disabled={!visible.length}
                onChange={toggleVisible}
                aria-label="Seleccionar notificaciones visibles"
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            ),
            render: (item) => (
              <input
                type="checkbox"
                checked={selectedIds.has(item.id)}
                onChange={() => toggleSelected(item.id)}
                aria-label={`Seleccionar ${item.title}`}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            ),
          },
          { id: 'title', label: 'Notificacion', render: (item) => <><div className="font-medium">{item.title}</div><div className="line-clamp-1 text-xs text-slate-500">{item.message}</div></> },
          { id: 'type', label: 'Tipo', render: (item) => <div><div className="font-medium">{item.type_name || item.type_code || 'General'}</div><StatusBadge variant={severityVariant[item.severity] || 'info'}>{severityLabels[item.severity] || item.severity}</StatusBadge></div> },
          { id: 'source', label: 'Origen', render: (item) => <div><div className="font-medium">{item.source_label || item.source_table || 'Sistema'}</div>{item.source_id && <div className="font-mono text-xs text-slate-500">#{item.source_id}</div>}</div> },
          { id: 'state', label: 'Estado', render: (item) => <StatusBadge variant={item.is_read ? 'inactive' : 'active'}>{item.is_read ? 'Leida' : 'Nueva'}</StatusBadge> },
          { id: 'date', label: 'Recibida', render: (item) => formatDateTime(item.delivered_at, timezone) },
          { id: 'actions', label: 'Acciones', align: 'right', render: (item) => <RowActionButton label="Ver notificacion" icon={Eye} onClick={() => openNotification(item)} /> },
        ]}
      />
    </section>
  );
};

export default NotificationInbox;
