/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Calculator, CalendarDays, CreditCard, DollarSign, Eye, FileText, ListChecks, ReceiptText, RefreshCw, SplitSquareHorizontal, Tag, UserRound, XCircle } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import StatusBadge from '@/components/common/data/StatusBadge';
import DatePicker from '@/components/common/forms/DatePicker';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import { tableFooter } from '@/pages/admin/businessFoundationShared';
import { cashMovementsService } from '@/services/cash/cashMovementsService';
import { paymentMethodsService } from '@/services/admin/paymentMethodsService';
import { getBackendMessage } from '@/services/ui/notify';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { formatDateTime } from '@/utils/dateTime';

const movementOptions = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'SALE', label: 'Ventas' },
  { value: 'RETURN', label: 'Devoluciones' },
  { value: 'PETTY_CASH', label: 'Caja chica' },
  { value: 'ADJUSTMENT', label: 'Ajustes' },
  { value: 'OPENING', label: 'Aperturas' },
  { value: 'CLOSING', label: 'Cierres' },
];

const movementMeta = {
  OPENING: { label: 'Apertura', variant: 'info' },
  SALE: { label: 'Venta', variant: 'active' },
  RETURN: { label: 'Devolucion', variant: 'danger' },
  PETTY_CASH: { label: 'Caja chica', variant: 'warning' },
  ADJUSTMENT: { label: 'Ajuste', variant: 'info' },
  CLOSING: { label: 'Cierre', variant: 'inactive' },
};

const money = (value) => Number(value || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const signedMoney = (value) => {
  const number = Number(value || 0);
  return `${number > 0 ? '+' : ''}${money(number)}`;
};
const internalCodePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const publicReference = (movement) => {
  const ticket = movement?.sale_document?.ticket_number || movement?.reference_number;
  if (!ticket || internalCodePattern.test(String(ticket))) return null;
  return ticket;
};

const MovementBadge = ({ movement }) => {
  const meta = movementMeta[movement.movement_type] || { label: movement.movement_label || movement.movement_type, variant: 'inactive' };
  return <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>;
};

const DetailRow = ({ label, value, strong = false }) => (
  <div className="grid grid-cols-[minmax(9rem,0.9fr)_minmax(0,1.1fr)] gap-4 py-1.5">
    <span className="min-w-0 text-slate-500 dark:text-slate-400">{label}</span>
    <span className={`min-w-0 text-right break-words ${strong ? 'font-semibold text-emerald-600 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-100'}`}>{value ?? '-'}</span>
  </div>
);

const iconShell = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-blue-300/50 bg-blue-500/10 text-blue-500 dark:border-blue-700/60 dark:bg-blue-950/50 dark:text-blue-300';
const purpleIconShell = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-600/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300';
const greenIconShell = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-emerald-300/50 bg-emerald-500/10 text-emerald-600 dark:border-emerald-700/60 dark:bg-emerald-950/50 dark:text-emerald-300';
const panelClass = 'rounded-md border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80';

const DetailSection = ({ title, icon: Icon, children, className = '', bodyClassName = '' }) => (
  <div className={`${panelClass} ${className}`}>
    <div className="mb-4 flex items-center gap-3">
      {Icon && <span className={purpleIconShell}><Icon className="h-5 w-5" /></span>}
      <h3 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h3>
    </div>
    <div className={`text-sm ${bodyClassName}`}>{children}</div>
  </div>
);

const HeroPanel = ({ eyebrow, title, subtitle, movement }) => (
  <div className="grid gap-4 rounded-md border border-slate-200 bg-slate-50 px-5 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 md:grid-cols-[1fr_auto] md:items-center">
    <div className="min-w-0">
      {eyebrow && <span className="inline-flex rounded-md bg-slate-200 px-2 py-1 text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">{eyebrow}</span>}
      <p className="mt-3 break-words text-2xl font-bold text-slate-950 dark:text-white">{title}</p>
      {subtitle && <p className="mt-1 text-base text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
    <div className="text-left md:text-right">
      <MovementBadge movement={movement} />
      <div className={Number(movement?.amount || 0) >= 0 ? 'mt-3 text-4xl font-bold tabular-nums text-emerald-600 dark:text-emerald-300' : 'mt-3 text-4xl font-bold tabular-nums text-red-600 dark:text-red-300'}>
        {signedMoney(movement?.amount)}
      </div>
    </div>
  </div>
);

const InfoStripItem = ({ icon: Icon, label, value }) => (
  <div className="flex min-w-0 items-center gap-4 border-slate-200 px-5 py-4 dark:border-slate-800 md:border-r md:last:border-r-0">
    <span className={iconShell}><Icon className="h-5 w-5" /></span>
    <div className="min-w-0">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 break-words text-base font-medium text-slate-950 dark:text-white">{value || '-'}</p>
    </div>
  </div>
);

const StatCard = ({ icon: Icon, label, value, variant = 'blue' }) => {
  const shell = variant === 'green' ? greenIconShell : variant === 'purple' ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-violet-300/50 bg-violet-500/10 text-violet-600 dark:border-violet-700/60 dark:bg-violet-950/50 dark:text-violet-300' : iconShell;
  return (
    <div className="flex min-w-0 items-center gap-4 rounded-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <span className={shell}><Icon className="h-5 w-5" /></span>
      <div className="min-w-0">
        <p className="text-xs uppercase text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-1 truncate text-xl font-semibold tabular-nums text-slate-950 dark:text-white">{value}</p>
      </div>
    </div>
  );
};

const customerLabel = (customer) => customer?.commercial_name || customer?.legal_name || customer?.name || customer?.display_name || customer?.tax_id || null;
const mixedPayments = (sale) => (sale?.payment_details?.type === 'MIXED' ? sale.payment_details.payments || [] : []);
const sourceSaleReference = (sale) => {
  const match = String(sale?.notes || '').match(/Documento origen:\s*([^|]+)/i);
  const reference = match?.[1]?.trim();
  if (!reference || internalCodePattern.test(reference)) return null;
  return reference;
};

const SaleItemsModal = ({ sale, movement, timezone, hourFormat }) => {
  const saleItems = sale?.items || [];
  const reference = publicReference(movement);
  const originReference = sourceSaleReference(sale);
  const detailSubtitle = [
    movement?.register_name,
    formatDateTime(movement?.created_at, timezone, { hourFormat }),
  ].filter(Boolean).join(' / ');
  const subtitle = originReference ? `${detailSubtitle} (Origen: ${originReference})` : detailSubtitle;
  return (
    <div className="space-y-4">
      <HeroPanel
        eyebrow=""
        title={reference || sale?.document_type_name || 'Transaccion'}
        subtitle={subtitle}
        movement={movement}
      />
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard icon={DollarSign} label="Subtotal" value={money(sale?.subtotal_amount)} />
        <StatCard icon={Tag} label="Descuentos" value={money(Number(sale?.line_discount_amount || 0) + Number(sale?.document_discount_amount || 0))} variant="purple" />
        <StatCard icon={Calculator} label="Impuesto" value={money(sale?.tax_amount)} />
        <StatCard icon={ReceiptText} label="Total" value={money(sale?.total_amount)} variant="green" />
      </div>
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <table className="min-w-full table-fixed text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-950/80 dark:text-slate-400">
                <tr>
                  <th className="w-[46%] px-5 py-3 text-left">Producto</th>
                  <th className="w-[12%] px-5 py-3 text-right">Cant.</th>
                  <th className="w-[14%] px-5 py-3 text-right">Precio</th>
                  <th className="w-[14%] px-5 py-3 text-right">Desc.</th>
                  <th className="w-[14%] px-5 py-3 text-right">Total</th>
                </tr>
              </thead>
            </table>
            <div className="max-h-[24rem] overflow-y-auto border-y border-slate-200 dark:border-slate-800">
              <table className="min-w-full table-fixed text-sm">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {saleItems.map((item) => (
                    <tr key={item.id}>
                      <td className="w-[46%] px-5 py-4">
                        <div className="text-base font-semibold text-slate-900 dark:text-white">{item.product_name}</div>
                      </td>
                      <td className="w-[12%] px-5 py-4 text-right tabular-nums">{item.quantity}</td>
                      <td className="w-[14%] px-5 py-4 text-right tabular-nums">{money(item.unit_price)}</td>
                      <td className="w-[14%] px-5 py-4 text-right tabular-nums">{money(Number(item.line_discount_amount || 0) + Number(item.document_discount_amount || 0))}</td>
                      <td className="w-[14%] px-5 py-4 text-right font-semibold tabular-nums">{money(item.paid_total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <table className="min-w-full table-fixed bg-slate-50 text-sm dark:bg-slate-950/70">
              <tfoot>
                <tr>
                  <td className="w-[46%] px-5 py-3 text-right font-semibold text-slate-900 dark:text-white">Total articulos</td>
                  <td className="w-[12%] px-5 py-3 text-right font-semibold tabular-nums">{saleItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}</td>
                  <td className="w-[14%] px-5 py-3" />
                  <td className="w-[14%] px-5 py-3 text-right font-semibold tabular-nums">{money(saleItems.reduce((sum, item) => sum + Number(item.line_discount_amount || 0) + Number(item.document_discount_amount || 0), 0))}</td>
                  <td className="w-[14%] px-5 py-3 text-right font-bold tabular-nums text-slate-950 dark:text-white">{money(saleItems.reduce((sum, item) => sum + Number(item.paid_total_amount || 0), 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
      {saleItems.length === 0 && (
        <p className="rounded-md border border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800">No hay articulos registrados para esta transaccion.</p>
      )}
    </div>
  );
};

const MovementDetailModal = ({ movement, timezone, hourFormat, onClose }) => {
  const sale = movement.sale_document;
  const customer = customerLabel(sale?.customer);
  const originReference = sourceSaleReference(sale);
  const documentSubtitle = originReference && sale?.document_type_name
    ? `${sale.document_type_name} (Origen: ${originReference})`
    : sale?.document_type_name;
  const payments = mixedPayments(sale);
  const paymentRows = payments.length > 0 ? payments : [{
    payment_method_code: movement.payment_method_code,
    payment_method_name: movement.payment_method_name,
    amount: movement.amount,
  }];
  const reference = publicReference(movement);

  return (
    <div className="space-y-4">
      <HeroPanel
        eyebrow="Movimiento de caja"
        title={reference || movement.movement_label || 'Movimiento registrado'}
        subtitle={documentSubtitle}
        movement={movement}
      />

      <div className="grid overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/80 md:grid-cols-3">
        {sale ? (
          <>
            <InfoStripItem icon={FileText} label="Documento" value={sale.document_type_name} />
            <InfoStripItem icon={UserRound} label="Cliente" value={customer || 'Cliente general'} />
            <InfoStripItem icon={CalendarDays} label="Fecha" value={formatDateTime(sale.created_at || movement.created_at, timezone, { hourFormat })} />
          </>
        ) : (
          <div className="p-5 text-sm text-slate-500 dark:text-slate-400 md:col-span-3">Este movimiento no tiene una venta POS asociada.</div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailSection title="Pago y caja" icon={CreditCard}>
          <DetailRow label="Metodo" value={movement.payment_method_name} />
          <DetailRow label="Monto aplicado" value={signedMoney(movement.amount)} strong />
          <DetailRow label="Importe recibido" value={money(movement.received_amount)} />
          <DetailRow label="Vuelto" value={money(movement.change_amount)} />
          <div className="my-3 border-t border-slate-200 dark:border-slate-800" />
          <DetailRow label="Caja" value={movement.register_name || movement.register_code} />
          <DetailRow label="Bodega" value={movement.warehouse_name} />
          <DetailRow label="Usuario" value={movement.created_by_name} />
        </DetailSection>

        <DetailSection title="Metodos de pago" icon={SplitSquareHorizontal} className="flex h-full flex-col" bodyClassName="flex flex-1 flex-col">
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {paymentRows.map((payment, index) => (
              <div key={`${payment.payment_method_code}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-2">
                <span className="min-w-0 truncate text-slate-500 dark:text-slate-400">{payment.payment_method_name || payment.payment_method_code}</span>
                <span className="font-semibold tabular-nums text-slate-950 dark:text-white">{money(payment.amount)}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-t border-slate-200 pt-3 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total</span>
            <span className="font-bold tabular-nums text-slate-950 dark:text-white">
              {money(paymentRows.reduce((sum, payment) => sum + Number(payment.amount || 0), 0))}
            </span>
          </div>
        </DetailSection>
      </div>

      <div className="flex justify-end pt-2">
        <button type="button" onClick={onClose} className="h-11 rounded-md border border-slate-300 bg-slate-100 px-6 text-sm font-semibold text-slate-800 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
          Cerrar
        </button>
      </div>
    </div>
  );
};

const CashMovements = () => {
  const timezone = usePreferencesStore((state) => state.timezone);
  const hourFormat = usePreferencesStore((state) => state.hourFormat);
  const [movements, setMovements] = useState([]);
  const [summary, setSummary] = useState({});
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateError, setDateError] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dateChangedRef = useRef(false);
  const validDateParamsRef = useRef({});

  const loadData = useCallback(async (params = {}, filters = {}) => {
    setLoading(true);
    setError('');
    try {
      const effectiveType = filters.type ?? typeFilter;
      const effectiveMethod = filters.method ?? methodFilter;
      const nextParams = {
        ...params,
        movement_type: effectiveType !== 'all' ? effectiveType : undefined,
        payment_method_code: effectiveMethod !== 'all' ? effectiveMethod : undefined,
      };
      const data = await cashMovementsService.list(nextParams);
      setMovements(data.movements);
      setSummary(data.summary || {});
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar movimientos de caja.'));
    } finally {
      setLoading(false);
    }
  }, [methodFilter, typeFilter]);

  useEffect(() => {
    loadData(validDateParamsRef.current);
  }, [loadData]);

  useEffect(() => {
    paymentMethodsService.list({ active_only: true })
      .then(setPaymentMethods)
      .catch(() => setPaymentMethods([]));
  }, []);

  useEffect(() => { setPage(0); }, [search, typeFilter, methodFilter, dateFrom, dateTo, pageSize]);

  useEffect(() => {
    if (!dateChangedRef.current) return;
    if (dateFrom && dateTo) {
      const diff = (new Date(`${dateTo}T00:00:00`) - new Date(`${dateFrom}T00:00:00`)) / 86400000;
      if (dateTo < dateFrom) {
        setDateError('La fecha hasta debe ser mayor o igual a la fecha desde.');
        validDateParamsRef.current = {};
        return;
      }
      if (diff > 31) {
        setDateError('El rango no puede superar 31 dias.');
        validDateParamsRef.current = {};
        return;
      }
      setDateError('');
      validDateParamsRef.current = { date_from: dateFrom, date_to: dateTo };
      loadData(validDateParamsRef.current);
    } else {
      setDateError('');
      validDateParamsRef.current = {};
      if (!dateFrom && !dateTo) loadData();
    }
  }, [dateFrom, dateTo, loadData]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return movements;
    return movements.filter((movement) => [
      movement.reference_number,
      movement.description,
      movement.session_code,
      movement.register_code,
      movement.register_name,
      movement.warehouse_name,
      movement.payment_method_name,
      movement.created_by_name,
    ].filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [movements, search]);

  const visibleData = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const methodOptions = useMemo(() => [
    { value: 'all', label: 'Todos los medios' },
    ...paymentMethods.map((method) => ({ value: method.method_code, label: method.method_name })),
  ], [paymentMethods]);

  const handleRefresh = () => loadData(validDateParamsRef.current);
  const openDetail = (movement) => ModalManager.show({
    type: 'custom',
    title: 'Informacion general',
    size: 'modalLarge',
    showFooter: false,
    contentComponent: MovementDetailModal,
    contentProps: { movement, timezone, hourFormat },
  });
  const openItems = (movement) => ModalManager.show({
    type: 'custom',
    title: 'Detalle de articulos',
    size: 'modalLarge',
    showFooter: false,
    contentComponent: SaleItemsModal,
    contentProps: { sale: movement.sale_document, movement, timezone, hourFormat },
  });

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setMethodFilter('all');
    setDateFrom('');
    setDateTo('');
    setDateError('');
    validDateParamsRef.current = {};
    dateChangedRef.current = false;
    setPage(0);
    loadData({}, { type: 'all', method: 'all' });
  };

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Movimientos de caja"
        description="Entradas, salidas y trazabilidad financiera asociada a sesiones de caja."
        actions={[{ id: 'refresh', label: 'Refrescar', icon: RefreshCw, variant: 'neutral', onClick: handleRefresh, className: loading ? '[&>svg]:animate-spin' : '' }]}
      />

      <KpiBar
        className="mb-4"
        items={[
          { label: 'Movimientos', value: summary.movement_count || 0, active: typeFilter === 'all', onClick: () => setTypeFilter('all') },
          { label: 'Ventas', value: money(summary.sales_total), active: typeFilter === 'SALE', onClick: () => setTypeFilter('SALE') },
          { label: 'Devoluciones', value: money(summary.returns_total), active: typeFilter === 'RETURN', onClick: () => setTypeFilter('RETURN') },
          { label: 'Neto', value: money(summary.net_total), hint: `Recibido ${money(summary.received_total)} / vuelto ${money(summary.change_total)}` },
        ]}
      />

      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}</div>}

      <FilterBar
        className="mb-4"
        searchValue={search}
        searchPlaceholder="Buscar caja, referencia, metodo o usuario"
        onSearchChange={setSearch}
        gridClassName="lg:grid-cols-[minmax(280px,1fr)_180px_210px_auto_auto_auto]"
        fields={[
          { id: 'type', value: typeFilter, onChange: setTypeFilter, options: movementOptions },
          { id: 'method', value: methodFilter, onChange: setMethodFilter, options: methodOptions },
        ]}
        actions={(
          <>
            <DatePicker value={dateFrom} placeholder="Desde" maxDate={dateTo || undefined} onChange={(value) => { dateChangedRef.current = true; setDateFrom(value); }} />
            <DatePicker value={dateTo} placeholder="Hasta" minDate={dateFrom || undefined} onChange={(value) => { dateChangedRef.current = true; setDateTo(value); }} />
            <ActionButton label="Limpiar" icon={XCircle} variant="neutral" onClick={resetFilters} />
          </>
        )}
      />
      {dateError && <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">{dateError}</div>}

      <DataTable
        loading={loading}
        data={visibleData}
        footer={tableFooter({ page, pageSize, total: filtered.length, loading, setPage, setPageSize })}
        columns={[
          { id: 'date', label: 'Fecha', sortable: true, render: (item) => formatDateTime(item.created_at, timezone, { hourFormat }) },
          { id: 'cash_register', label: 'Caja', render: (item) => <div><div className="font-medium">{item.register_name || '-'}</div>{item.warehouse_name && <div className="text-xs text-slate-500">{item.warehouse_name}</div>}</div> },
          { id: 'type', label: 'Tipo', render: (item) => <MovementBadge movement={item} /> },
          { id: 'method', label: 'Metodo', render: (item) => item.payment_method_name || '-' },
          { id: 'reference', label: 'Referencia', render: (item) => publicReference(item) || 'Sin referencia publica' },
          { id: 'amount', label: 'Monto', align: 'right', sortable: true, sortValue: (item) => Number(item.amount || 0), render: (item) => <span className={Number(item.amount || 0) >= 0 ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'font-semibold text-red-700 dark:text-red-300'}>{Number(item.amount || 0) >= 0 ? <ArrowUpCircle className="mr-1 inline h-4 w-4" /> : <ArrowDownCircle className="mr-1 inline h-4 w-4" />}{signedMoney(item.amount)}</span> },
          {
            id: 'actions',
            label: 'Acciones',
            align: 'center',
            render: (item) => (
              <div className="flex flex-wrap justify-center gap-2">
                <RowActionButton label="Informacion general" icon={Eye} onClick={() => openDetail(item)} />
                <RowActionButton label="Detalle de articulos" icon={ListChecks} disabled={!item.sale_document?.items?.length} onClick={() => openItems(item)} />
              </div>
            ),
          },
        ]}
      />
    </section>
  );
};

export default CashMovements;
