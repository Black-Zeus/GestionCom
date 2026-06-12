/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Banknote, CheckCircle2, ClipboardList, CreditCard, Eye, Mail, Percent, Receipt, RefreshCcw, Trash2, Wallet, XCircle } from 'lucide-react';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import BottomActionBar from '@/components/common/actions/BottomActionBar';
import DataTable from '@/components/common/data/DataTable';
import StatusBadge from '@/components/common/data/StatusBadge';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import ModalManager from '@/components/ui/modal';
import { salesDocumentsService } from '@/services/sales/salesDocumentsService';
import { documentConfigService } from '@/services/admin/documentConfigService';
import { paymentMethodsService } from '@/services/admin/paymentMethodsService';
import { getBackendMessage, toast } from '@/services/ui/notify';
import { useSessionStore } from '@/store/useSessionStore';

const fieldClassName = 'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const disabledFieldClassName = 'h-10 w-full rounded-md border border-slate-200 bg-slate-100 px-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 cursor-not-allowed';

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

const TICKET_CODE = 'TICKET';

const AUTO_DOCUMENT_PREFIX = {
  TICKET: 'TKT',
  RETURN_TICKET: 'DEV',
  EXCHANGE_DRAFT: 'CMB',
};

const generateTicketNumber = (documentTypeCode = TICKET_CODE) => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const prefix = AUTO_DOCUMENT_PREFIX[documentTypeCode] || 'DOC';
  return `${prefix}-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

const SaleDetailModal = ({ items = [], onClose }) => (
  <div className="flex max-h-[calc(90vh-7.5rem)] min-h-0 flex-col gap-4">
    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      <DataTable
        data={items}
        getRowKey={(row) => row.id}
        emptyMessage="Sin productos."
        className="shadow-none"
        columns={[
          { id: 'product', label: 'Producto', render: (item) => <div><div className="font-medium">{item.name}</div><div className="font-mono text-xs text-slate-500">{item.code || '—'}</div></div> },
          { id: 'quantity', label: 'Cant.', align: 'right', render: (item) => item.quantity },
          { id: 'unit_price', label: 'Precio', align: 'right', render: (item) => money(item.unit_price) },
          { id: 'discount', label: 'Desc.', align: 'right', render: (item) => `${Number(item.discount_percent || 0).toLocaleString('es-CL')}%` },
          { id: 'subtotal', label: 'Subtotal', align: 'right', render: (item) => <span className="font-semibold tabular-nums">{money(item.paid_total_amount || item.line_subtotal)}</span> },
        ]}
      />
    </div>
    <div className="flex shrink-0 justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
      <ActionButton label="Cerrar" icon={XCircle} variant="neutral" onClick={onClose} />
    </div>
  </div>
);

const METHOD_ICONS = { CASH: Banknote, CARD: CreditCard, TRANSFER: Receipt, OTHER: CheckCircle2 };
const inputCls = 'h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-blue-500';

const PaymentModal = ({ total, onConfirm, onClose }) => {
  const [step, setStep] = useState(1);
  const [methods, setMethods] = useState([]);
  const [selected, setSelected] = useState(null);
  const [importe, setImporte] = useState('');
  const [email, setEmail] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    paymentMethodsService.list({ active_only: true }).then(setMethods).catch(() => {});
  }, []);

  const isCash = selected?.method_type === 'CASH';
  const isRefund = total < 0;
  const absoluteTotal = Math.abs(total);
  const importeNum = Number(importe || 0);
  const vuelto = isCash && !isRefund ? Math.max(importeNum - total, 0) : 0;
  const importeInsuficiente = isCash && !isRefund && importe !== '' && importeNum < total;
  const canContinue = selected && (isRefund || !isCash || importeNum >= total);

  const confirm = async () => {
    setProcessing(true);
    try {
      await onConfirm({
        payment_method_code: selected.method_code,
        payment_method_name: selected.method_name,
        amount_tendered: isRefund ? 0 : isCash ? importeNum : total,
        change_amount: isRefund ? absoluteTotal : isCash ? vuelto : 0,
        email: email.trim() || null,
      });
      onClose?.();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex max-h-[calc(90vh-7.5rem)] min-h-0 flex-col gap-5">
      {step === 1 ? (
        <>
          <div className="flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/30">
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">{isRefund ? 'Monto a devolver' : 'Total a pagar'}</span>
            <span className="text-2xl font-bold tabular-nums text-blue-900 dark:text-blue-100">{money(absoluteTotal)}</span>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Medio de pago</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {methods.map((m) => {
                const Icon = METHOD_ICONS[m.method_type] || CheckCircle2;
                const active = selected?.id === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { setSelected(m); setImporte(''); }}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-left text-sm transition ${active ? 'border-blue-400 bg-blue-50 font-semibold text-blue-800 dark:border-blue-600 dark:bg-blue-950/40 dark:text-blue-200' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{m.method_name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {isCash && !isRefund && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Importe recibido</span>
                <input
                  className={inputCls}
                  type="number"
                  min={total}
                  step="1"
                  placeholder={money(total)}
                  value={importe}
                  onChange={(e) => setImporte(e.target.value)}
                  autoFocus
                />
                {importeInsuficiente && (
                  <p className="text-xs text-red-600 dark:text-red-400">El importe es menor al total.</p>
                )}
              </label>
              <div className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Vuelto</span>
                <div className={`flex h-11 items-center rounded-md border px-3 text-lg font-bold tabular-nums ${vuelto > 0 ? 'border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900'}`}>
                  {money(vuelto)}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <ActionButton label="Cancelar" icon={XCircle} variant="neutral" onClick={onClose} />
            <ActionButton label="Continuar" icon={CheckCircle2} onClick={() => setStep(2)} disabled={!canContinue} />
          </div>
        </>
      ) : (
        <>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex justify-between gap-3"><span className="text-slate-500">Medio de pago</span><span className="font-semibold">{selected.method_name}</span></div>
            {isRefund ? (
              <div className="flex justify-between gap-3 mt-1"><span className="text-slate-500">Monto a entregar</span><span className="font-semibold tabular-nums text-red-700 dark:text-red-400">{money(absoluteTotal)}</span></div>
            ) : isCash && (
              <>
                <div className="flex justify-between gap-3 mt-1"><span className="text-slate-500">Importe</span><span className="font-semibold tabular-nums">{money(importeNum)}</span></div>
                <div className="flex justify-between gap-3 mt-1"><span className="text-slate-500">Vuelto</span><span className="font-semibold tabular-nums text-green-700 dark:text-green-400">{money(vuelto)}</span></div>
              </>
            )}
            <div className="flex justify-between gap-3 mt-2 border-t border-slate-200 pt-2 dark:border-slate-700"><span className="font-medium">{isRefund ? 'Total devolucion' : 'Total cobrado'}</span><span className="font-bold tabular-nums">{money(absoluteTotal)}</span></div>
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <Mail className="h-4 w-4" />
              Correo para comprobante <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input
              className={inputCls}
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-slate-400">El envio de comprobante por correo no esta disponible aun.</p>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <ActionButton label="Volver" icon={XCircle} variant="neutral" onClick={() => setStep(1)} />
            <ActionButton label={processing ? 'Procesando...' : isRefund ? 'Confirmar devolucion' : 'Confirmar pago'} icon={CheckCircle2} onClick={confirm} disabled={processing} />
          </div>
        </>
      )}
    </div>
  );
};

const NoCashRegisterAccess = () => (
  <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
    <ModuleHeader title="Cobro en caja POS" description="Validacion de acceso al modulo de caja." />
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center">
      <div className="w-full max-w-2xl rounded-md border border-amber-200 bg-white p-8 text-center shadow-sm dark:border-amber-900/40 dark:bg-slate-900">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-500 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">Caja no configurada</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          No hay una caja activa asignada a esta sesión. Selecciona una caja en la barra inferior antes de continuar.
        </p>
        <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          <div className="font-semibold text-slate-800 dark:text-slate-100">¿Cómo solucionarlo?</div>
          <div className="mt-1">Usa el menú de <strong>Caja</strong> <Wallet className="inline h-3.5 w-3.5 align-text-bottom" /> en la barra inferior para asignar una caja activa. Si no aparecen opciones, contacta al administrador.</div>
        </div>
      </div>
    </div>
  </section>
);

const CashPos = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeCashRegisterRecord = useSessionStore((state) => state.getActiveCashRegister());
  const sessionContextReady = useSessionStore((state) => state._sessionContextReady);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [pendingSales, setPendingSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [closing, setClosing] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [documentTypeCode, setDocumentTypeCode] = useState(TICKET_CODE);
  const [discountType, setDiscountType] = useState('NONE');
  const [discountValue, setDiscountValue] = useState(0);

  const isAutoDocument = Boolean(AUTO_DOCUMENT_PREFIX[documentTypeCode]);
  const isReturnDocument = selectedSale?.document_type_code === 'RETURN_TICKET' || selectedSale?.is_return_document;
  const isExchangeDocument = selectedSale?.document_type_code === 'EXCHANGE_DRAFT' || selectedSale?.is_exchange_document;

  useEffect(() => {
    if (isAutoDocument) {
      setTicketNumber(generateTicketNumber(documentTypeCode));
    } else {
      setTicketNumber('');
    }
  }, [documentTypeCode, isAutoDocument]);

  // Solo actualiza la lista de pendientes — no toca el formulario ni selectedSale
  const refreshPendingList = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await salesDocumentsService.listPending();
      setPendingSales(data);
    } catch (err) {
      toast.error(getBackendMessage(err, 'No fue posible actualizar la lista.'));
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Carga inicial completa: lista + tipos de documento + selección por URL
  const loadAll = useCallback(async () => {
    setLoadingList(true);
    try {
      const [data, allTypes] = await Promise.all([
        salesDocumentsService.listPending(),
        documentConfigService.listTypes({ active_only: true }).catch(() => []),
      ]);
      setPendingSales(data);
      const saleTypes = allTypes
        .filter((t) => t.document_category === 'SALE' && t.movement_type === 'OUT')
        .map((t) => ({ code: t.document_type_code, name: t.document_type_name }));
      if (saleTypes.length > 0) {
        setDocumentTypes(saleTypes);
        setDocumentTypeCode((current) => (saleTypes.some((t) => t.code === current) ? current : saleTypes[0].code));
      }
      const saleId = searchParams.get('saleId');
      if (saleId) {
        const sale = data.find((item) => item.sale_code === saleId)
          || await salesDocumentsService.getByCode(saleId).catch(() => null);
        if (sale) {
          setSelectedSale(sale);
          setDocumentTypeCode(sale.document_type_code || TICKET_CODE);
          if (sale.ticket_number) setTicketNumber(sale.ticket_number);
        }
      }
    } catch (err) {
      toast.error(getBackendMessage(err, 'No fue posible cargar ventas pendientes.'));
    } finally {
      setLoadingList(false);
    }
  }, [searchParams]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const selectedDocumentType = useMemo(
    () => documentTypes.find((item) => item.code === documentTypeCode) || {
      code: documentTypeCode,
      name: documentTypeCode === 'RETURN_TICKET'
        ? 'Ticket de devolucion'
        : documentTypeCode === 'EXCHANGE_DRAFT'
          ? 'Cambio de productos'
          : documentTypes[0]?.name || documentTypeCode,
    },
    [documentTypes, documentTypeCode],
  );

  const closingTotals = useMemo(() => {
    const base = Number(selectedSale?.total_amount || 0);
    if (base < 0) return { base, discount: 0, total: base };
    const value = Number(discountValue || 0);
    const discount = discountType === 'PERCENT'
      ? base * value / 100
      : discountType === 'AMOUNT'
        ? value
        : 0;
    const boundedDiscount = Math.min(Math.max(discount, 0), base);
    return { base, discount: boundedDiscount, total: Math.max(base - boundedDiscount, 0) };
  }, [discountType, discountValue, selectedSale]);

  const selectSale = (sale) => {
    const isDifferentSale = selectedSale?.id !== sale.id;
    setSelectedSale(sale);
    if (sale.ticket_number) {
      setTicketNumber(sale.ticket_number);
    } else if (isDifferentSale) {
      setTicketNumber('');
    }
    setDocumentTypeCode(sale.document_type_code || TICKET_CODE);
    setDiscountType('NONE');
    setDiscountValue(0);
    navigate(`/cash/pos?saleId=${sale.sale_code}`, { replace: true });
  };

  const openDetail = (sale) => {
    ModalManager.show({
      type: 'custom',
      title: 'Items de la venta',
      size: 'large',
      showFooter: false,
      contentComponent: SaleDetailModal,
      contentProps: { items: sale.items || [] },
    });
  };

  const deleteSale = async (sale) => {
    if (!await ModalManager.confirm({
      title: 'Eliminar venta pendiente',
      message: `Eliminar la venta ${sale.sale_code} de ${customerName(sale.customer)}. Esta accion no se puede deshacer.`,
      buttons: { cancel: 'Cancelar', confirm: 'Eliminar' },
    })) return;
    try {
      await salesDocumentsService.deletePending(sale.id);
      toast.success('Venta eliminada.');
      if (selectedSale?.id === sale.id) setSelectedSale(null);
      await refreshPendingList();
    } catch (err) {
      toast.error(getBackendMessage(err, 'No fue posible eliminar la venta.'));
    }
  };

  const closeSale = () => {
    if (!selectedSale) return;
    const folio = selectedSale.ticket_number || ticketNumber;
    if (!folio.trim()) {
      ModalManager.warning({ title: 'Folio requerido', message: 'Ingresa el numero de ticket o boleta antes de cerrar.' });
      return;
    }

    const doClose = async ({ payment_method_code = null, payment_method_name = null, amount_tendered = 0, change_amount = 0 } = {}) => {
      setClosing(true);
      try {
        await salesDocumentsService.close(selectedSale.id, {
          ticket_number: folio.trim(),
          document_type_code: selectedDocumentType.code,
          document_type_name: selectedDocumentType.name,
          cash_register_id: activeCashRegisterRecord?.id || selectedSale.cash_register_id || null,
          discount_type: discountType,
          discount_value: Number(discountValue || 0),
          payment_method_code,
          payment_method_name,
          amount_tendered,
          change_amount,
        });
        const successTitle = isExchangeDocument ? 'Cambio procesado' : isReturnDocument ? 'Devolucion procesada' : 'Venta cerrada';
        const successMsg = isExchangeDocument ? 'El cambio fue cerrado correctamente.' : isReturnDocument ? 'La devolucion fue cerrada correctamente.' : 'La venta fue cerrada y registrada correctamente.';
        setSelectedSale(null);
        setTicketNumber('');
        setDocumentTypeCode(TICKET_CODE);
        setDiscountType('NONE');
        setDiscountValue(0);
        await refreshPendingList();
        ModalManager.success({ title: successTitle, message: successMsg });
      } catch (err) {
        ModalManager.error({ title: 'Error al procesar', message: getBackendMessage(err, 'No fue posible cerrar el documento.') });
        throw err;
      } finally {
        setClosing(false);
      }
    };

    // Exchange with unused credit: forfeited, no refund — skip PaymentModal
    if (isExchangeDocument && closingTotals.total <= 0) {
      doClose();
      return;
    }

    ModalManager.show({
      type: 'custom',
      title: 'Procesar pago',
      size: 'large',
      showFooter: false,
      contentComponent: PaymentModal,
      contentProps: {
        total: closingTotals.total,
        onConfirm: async ({ payment_method_code, payment_method_name, amount_tendered, change_amount }) => {
          await doClose({ payment_method_code, payment_method_name, amount_tendered, change_amount });
        },
      },
    });
  };

  const isClosed = selectedSale?.status === 'CLOSED';
  const canClose = Boolean(selectedSale && !isClosed && !closing);

  if (!sessionContextReady) return null;
  if (!activeCashRegisterRecord) {
    return <NoCashRegisterAccess />;
  }

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Cobro en caja POS"
        description="Cierra ventas, cambios y devoluciones pendientes de caja."
        actions={[{ id: 'refresh', label: 'Actualizar', icon: RefreshCcw, variant: 'neutral', onClick: loadAll }]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,24rem)_1fr]">
        <div className="rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h2 className="text-sm font-semibold">Pendientes de caja</h2>
            <p className="text-xs text-slate-500">Selecciona una venta, cambio o devolucion para procesar.</p>
          </div>
          <DataTable
            data={pendingSales}
            loading={loadingList}
            getRowKey={(row) => row.id}
            emptyMessage="No hay ventas pendientes."
            className="rounded-none border-0 shadow-none"
            columns={[
              {
                id: 'sale',
                label: 'Venta',
                render: (item) => (
                  <button type="button" className="w-full text-left" onClick={() => selectSale(item)}>
                    <div className="font-mono text-xs font-medium">···{item.sale_code.slice(-5)}</div>
                    <div className="text-xs text-slate-500">{customerName(item.customer)}</div>
                    {(item.is_return_document || item.is_exchange_document) && (
                      <div className="mt-1 text-[11px] font-semibold uppercase text-blue-600 dark:text-blue-300">
                        {item.is_return_document ? 'Devolucion' : 'Cambio'}
                      </div>
                    )}
                  </button>
                ),
              },
              {
                id: 'total',
                label: 'Total',
                align: 'right',
                render: (item) => <span className={`font-semibold tabular-nums ${Number(item.total_amount || 0) < 0 ? 'text-red-700 dark:text-red-400' : ''}`}>{money(Math.abs(Number(item.total_amount || 0)))}</span>,
              },
              {
                id: 'actions',
                label: '',
                align: 'center',
                render: (item) => (
                  <div className="flex justify-center gap-1">
                    <RowActionButton label="Ver detalle" icon={Eye} onClick={() => openDetail(item)} />
                    <RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => deleteSale(item)} />
                  </div>
                ),
              },
            ]}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-600" />
                <h2 className="text-sm font-semibold">Documento</h2>
              </div>
              <StatusBadge variant={isClosed ? 'active' : 'pending'}>{isClosed ? 'Cerrada' : 'Pendiente'}</StatusBadge>
            </div>

            {selectedSale ? (
              <div className="grid gap-3 lg:grid-cols-4">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                  <div className="text-xs text-slate-500">Venta</div>
                  <div className="font-mono text-xs font-semibold">···{selectedSale.sale_code.slice(-5)}</div>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                  <div className="text-xs text-slate-500">Cliente</div>
                  <div className="truncate font-semibold">{customerName(selectedSale.customer)}</div>
                </div>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-200">Tipo documento</span>
                  <select className={fieldClassName} value={documentTypeCode} onChange={(e) => setDocumentTypeCode(e.target.value)} disabled={isClosed || isReturnDocument || isExchangeDocument}>
                    {!documentTypes.some((item) => item.code === documentTypeCode) && (
                      <option value={documentTypeCode}>{selectedDocumentType.name}</option>
                    )}
                    {documentTypes.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {isAutoDocument ? 'Folio (auto)' : 'Numero ticket / boleta'}
                  </span>
                  <input
                    className={isAutoDocument || isClosed ? disabledFieldClassName : fieldClassName}
                    value={selectedSale.ticket_number || ticketNumber}
                    onChange={(e) => setTicketNumber(e.target.value)}
                    disabled={isAutoDocument || isClosed}
                    readOnly={isAutoDocument}
                  />
                </label>
              </div>
            ) : (
              <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700">
                Selecciona una venta pendiente.
              </div>
            )}
          </div>

          {selectedSale && (
            <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
              <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-center gap-2">
                  <Percent className="h-5 w-5 text-blue-600" />
                  <h2 className="text-sm font-semibold">Descuento final</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">Tipo descuento</span>
                    <select className={fieldClassName} value={discountType} onChange={(e) => setDiscountType(e.target.value)} disabled={isClosed || isReturnDocument || isExchangeDocument}>
                      <option value="NONE">Sin descuento</option>
                      <option value="PERCENT">Porcentaje</option>
                      <option value="AMOUNT">Monto</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">Valor</span>
                    <input className={fieldClassName} type="number" min="0" max={discountType === 'PERCENT' ? 100 : undefined} step="0.01" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value || 0))} disabled={discountType === 'NONE' || isClosed || isReturnDocument || isExchangeDocument} />
                  </label>
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                  <h2 className="text-sm font-semibold">Resumen caja</h2>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">{isReturnDocument ? 'Credito devolucion' : isExchangeDocument ? 'Total cambio' : 'Total venta'}</span><span className="font-medium">{money(Math.abs(closingTotals.base))}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Descuento final</span><span className="font-medium">{money(selectedSale.document_discount_amount || closingTotals.discount)}</span></div>
                  <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold dark:border-slate-800"><span>{closingTotals.total < 0 ? (isExchangeDocument ? 'Credito no utilizado' : 'Monto a devolver') : 'Total a pagar'}</span><span>{money(Math.abs(isClosed ? selectedSale.total_amount : closingTotals.total))}</span></div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-auto">
            <BottomActionBar
              leftContent={
                selectedSale && !isClosed
                  ? `${isExchangeDocument && closingTotals.total < 0 ? 'Credito no utilizado' : closingTotals.total < 0 ? 'Monto a devolver' : 'Total a pagar'}: ${money(Math.abs(closingTotals.total))}`
                  : isClosed
                    ? 'Venta cerrada correctamente.'
                    : 'Selecciona una venta para continuar.'
              }
              actions={[
                { id: 'close-sale', label: closing ? 'Cerrando...' : isExchangeDocument ? 'Cerrar cambio' : closingTotals.total < 0 ? 'Cerrar devolucion' : 'Cerrar venta', icon: CheckCircle2, variant: 'primary', onClick: closeSale, disabled: !canClose },
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CashPos;
