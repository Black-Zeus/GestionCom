import { useMemo, useState } from 'react';
import { RefreshCcw, RotateCcw, Search, Shuffle } from 'lucide-react';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import DataTable from '@/components/common/data/DataTable';
import StatusBadge from '@/components/common/data/StatusBadge';
import { ActionButton } from '@/components/common/actions/ActionButton';
import { salesDocumentsService } from '@/services/sales/salesDocumentsService';
import { getBackendMessage, toast } from '@/services/ui/notify';

const fieldClassName = 'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';

const money = (value) => Number(value || 0).toLocaleString('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const customerName = (customer) => (
  customer?.commercial_name
  || customer?.legal_name
  || customer?.customer_name
  || customer?.name
  || customer?.customer_code
  || 'Cliente'
);

const SalesReturns = () => {
  const [ticketNumber, setTicketNumber] = useState('');
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processingUnitId, setProcessingUnitId] = useState(null);
  const [reason, setReason] = useState('');

  const units = useMemo(() => (
    (sale?.items || []).flatMap((line) => (line.units || []).map((unit) => ({
      ...unit,
      line_id: line.id,
      product: line.name,
      code: line.code,
      unit_name: line.unit_name,
    })))
  ), [sale]);

  const searchTicket = async () => {
    if (!ticketNumber.trim()) {
      toast.error('Ingresa el numero de ticket o boleta.');
      return;
    }
    setLoading(true);
    try {
      setSale(await salesDocumentsService.findByTicket(ticketNumber.trim()));
    } catch (err) {
      setSale(null);
      toast.error(getBackendMessage(err, 'No fue posible encontrar el ticket.'));
    } finally {
      setLoading(false);
    }
  };

  const registerAction = async (unit, actionType) => {
    setProcessingUnitId(unit.id);
    try {
      const result = await salesDocumentsService.registerReturn({
        sale_line_unit_id: unit.id,
        action_type: actionType,
        reason: reason.trim() || null,
      });
      toast.success(`${actionType === 'RETURN' ? 'Devolucion' : 'Cambio'} registrado por ${money(result.amount)}.`);
      setSale(await salesDocumentsService.findByTicket(ticketNumber.trim()));
    } catch (err) {
      toast.error(getBackendMessage(err, 'No fue posible registrar la operacion.'));
    } finally {
      setProcessingUnitId(null);
    }
  };

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Devoluciones de ventas"
        description="Busca un ticket, selecciona una unidad vendida y registra devolucion o cambio."
      />

      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 lg:grid-cols-[minmax(16rem,24rem)_minmax(16rem,1fr)_auto]">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Ticket / boleta</span>
            <input className={fieldClassName} value={ticketNumber} onChange={(event) => setTicketNumber(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') searchTicket(); }} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Motivo</span>
            <input className={fieldClassName} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Opcional" />
          </label>
          <div className="flex items-end">
            <ActionButton label={loading ? 'Buscando...' : 'Buscar'} icon={Search} onClick={searchTicket} disabled={loading} />
          </div>
        </div>
      </div>

      {sale && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-4">
            <div>
              <div className="text-xs text-slate-500">Documento</div>
              <div className="font-semibold">{sale.document_type_name} {sale.ticket_number}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Cliente</div>
              <div className="font-semibold">{customerName(sale.customer)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Total pagado</div>
              <div className="font-semibold">{money(sale.total_amount)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Estado</div>
              <StatusBadge variant="active">{sale.status}</StatusBadge>
            </div>
          </div>

          <DataTable
            data={units}
            getRowKey={(row) => row.id}
            emptyMessage="No hay unidades disponibles para este ticket."
            columns={[
              { id: 'product', label: 'Producto', render: (item) => <div><div className="font-medium">{item.product}</div><div className="font-mono text-xs text-slate-500">{item.code || '-'} · Unidad {item.unit_sequence}</div></div> },
              { id: 'paid_amount', label: 'Pagado exacto', align: 'right', render: (item) => <span className="font-semibold tabular-nums">{money(item.paid_amount)}</span> },
              { id: 'status', label: 'Estado', align: 'center', render: (item) => <StatusBadge variant={item.status === 'SOLD' ? 'active' : 'warning'}>{item.status}</StatusBadge> },
              {
                id: 'actions',
                label: 'Acciones',
                align: 'center',
                render: (item) => (
                  <div className="flex gap-2">
                    <ActionButton label="Devolver" icon={RotateCcw} variant="neutral" onClick={() => registerAction(item, 'RETURN')} disabled={item.status !== 'SOLD' || processingUnitId === item.id} />
                    <ActionButton label="Cambiar" icon={Shuffle} onClick={() => registerAction(item, 'EXCHANGE')} disabled={item.status !== 'SOLD' || processingUnitId === item.id} />
                  </div>
                ),
              },
            ]}
          />

          <ActionButton label="Buscar nuevamente" icon={RefreshCcw} variant="neutral" onClick={() => setSale(null)} />
        </div>
      )}
    </section>
  );
};

export default SalesReturns;
