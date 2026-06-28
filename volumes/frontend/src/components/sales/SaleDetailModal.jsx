/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Banknote, CreditCard, Landmark, PencilLine, X } from 'lucide-react';
import { salesDocumentsService } from '@/services/sales/salesDocumentsService';
import { getBackendMessage } from '@/services/ui/notify';

const money = (value) => Number(value || 0).toLocaleString('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-CL');
};

const customerName = (customer) => (
  customer?.commercial_name
  || customer?.legal_name
  || customer?.customer_name
  || customer?.name
  || customer?.customer_code
  || 'Cliente Generico'
);

const paymentIcon = (code = '') => {
  const normalized = String(code).toUpperCase();
  if (normalized.includes('CASH') || normalized.includes('EFECT')) return Banknote;
  if (normalized.includes('TRANSFER')) return Landmark;
  return CreditCard;
};

const paymentRows = (sale) => {
  const details = sale?.payment_details;
  if (details?.type === 'MIXED' && Array.isArray(details.payments)) {
    return details.payments.map((payment, index) => ({
      id: `${payment.payment_method_code || 'method'}-${index}`,
      code: payment.payment_method_code,
      name: payment.payment_method_name || payment.payment_method_code || 'Medio de pago',
      amount: Number(payment.clp_amount ?? payment.amount ?? payment.received_amount ?? 0),
    }));
  }

  if (!sale) return [];
  const received = Number(sale.amount_tendered || sale.total_amount || 0) - Number(sale.change_amount || 0);
  return [{
    id: sale.payment_method_code || 'payment-method',
    code: sale.payment_method_code,
    name: sale.payment_method_name || sale.payment_method_code || 'Sin metodo',
    amount: received,
  }];
};

const itemTotal = (item) => {
  const qty = Number(item.quantity || 0);
  const price = Number(item.unit_price || 0);
  const disc = Number(item.discount_percent || 0);
  return disc > 0 ? qty * price * (1 - disc / 100) : qty * price;
};

const groupedSaleItems = (items = []) => {
  const grouped = new Map();
  items.forEach((item) => {
    const unitPrice = Number(item.unit_price || 0);
    const key = [
      item.product_id || '',
      item.product_variant_id || '',
      item.code || '',
      item.name || '',
      unitPrice,
      Number(item.discount_percent || 0),
      unitPrice < 0 ? 'credit' : 'regular',
    ].join('|');
    const current = grouped.get(key) || {
      ...item,
      id: key,
      quantity: 0,
      paid_total_amount: 0,
    };
    current.quantity += Number(item.quantity || 0);
    current.paid_total_amount += itemTotal(item);
    grouped.set(key, current);
  });
  return Array.from(grouped.values());
};

const totalDiscount = (sale) => (
  Number(sale?.line_discount_amount || 0)
  + Number(sale?.document_discount_amount || 0)
  + Number(sale?.agreement_discount_amount || 0)
);

const InfoRow = ({ label, value, strong = false }) => (
  <div className="grid grid-cols-[minmax(7rem,0.8fr)_minmax(0,1.2fr)] items-start gap-4 py-2">
    <span className="text-slate-500 dark:text-slate-400">{label}</span>
    <span className={`min-w-0 break-words text-right ${strong ? 'font-semibold text-slate-950 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-200'}`}>
      {value || '-'}
    </span>
  </div>
);

const PaymentRow = ({ row }) => {
  const Icon = paymentIcon(row.code || row.name);
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 py-2.5 last:border-b-0 dark:border-slate-700/80">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400">
          <Icon className="h-4 w-4" />
        </span>
        <span className="truncate text-slate-600 dark:text-slate-300">{row.name}</span>
      </div>
      <span className="shrink-0 font-semibold tabular-nums text-slate-950 dark:text-white">{money(row.amount)}</span>
    </div>
  );
};

const ModalFrame = ({ title, onClose, children, footer }) => (
  <div
    className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm dark:bg-black/70"
    role="dialog"
    aria-modal="true"
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
  >
    <div className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-950 shadow-2xl dark:border-slate-700/80 dark:bg-slate-950/95 dark:text-white">
      <header className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <PencilLine className="h-8 w-8 shrink-0 text-slate-700 dark:text-white" />
          <h2 className="truncate text-xl font-semibold sm:text-2xl">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="Cerrar detalle de venta"
        >
          <X className="h-6 w-6" />
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden px-5 pb-5 sm:px-8">
        {children}
      </main>

      <footer className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700/80 dark:bg-slate-900/70 sm:px-8">
        {footer}
      </footer>
    </div>
  </div>
);

const SaleDetailBody = ({ sale }) => {
  const payments = useMemo(() => paymentRows(sale), [sale]);
  const paidTotal = payments.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const subtotal = Number(sale.subtotal_amount || 0);
  const discount = totalDiscount(sale);
  const items = useMemo(() => groupedSaleItems(sale.items || []), [sale.items]);

  return (
    <div className="grid min-h-0 gap-5 lg:grid-cols-[0.9fr_1.7fr]">
      <div className="space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white/70 p-5 text-sm dark:border-slate-700/80 dark:bg-slate-900/45">
          <InfoRow label="Documento" value={sale.document_type_name || sale.document_type_code || 'Ticket de Venta'} strong />
          <InfoRow label="Folio" value={sale.ticket_number || sale.sale_code} strong />
          <InfoRow label="Fecha Venta" value={formatDateTime(sale.updated_at || sale.created_at)} strong />
          <InfoRow label="Cliente" value={customerName(sale.customer)} strong />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white/70 p-5 dark:border-slate-700/80 dark:bg-slate-900/45">
          <div className="mb-3 grid grid-cols-[1fr_auto] gap-4 border-b border-slate-200 pb-3 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
            <span>Medios de pago</span>
            <span>Valor</span>
          </div>
          {payments.length > 0 ? (
            <div>
              {payments.map((row) => <PaymentRow key={row.id} row={row} />)}
            </div>
          ) : (
            <p className="py-4 text-sm text-slate-500 dark:text-slate-400">Sin pagos registrados.</p>
          )}
          <div className="mt-3 flex items-center justify-between gap-4 text-base font-semibold">
            <span className="text-slate-600 dark:text-slate-300">Total pagado</span>
            <span className="tabular-nums text-slate-950 dark:text-white">{money(paidTotal || sale.total_amount)}</span>
          </div>
        </section>
      </div>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white/70 dark:border-slate-700/80 dark:bg-slate-900/45">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed">
            <colgroup>
              <col className="w-[56%]" />
              <col className="w-[12%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="px-5 py-4 text-left font-semibold">Producto</th>
                <th className="px-5 py-4 text-right font-semibold">Cant.</th>
                <th className="px-5 py-4 text-right font-semibold">Precio</th>
                <th className="px-5 py-4 text-right font-semibold">Total</th>
              </tr>
            </thead>
          </table>
        </div>

        <div className="min-h-0 max-h-[25rem] overflow-auto">
          <table className="w-full min-w-[720px] table-fixed">
            <colgroup>
              <col className="w-[56%]" />
              <col className="w-[12%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
            </colgroup>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {items.map((item) => (
                <tr key={item.id || `${item.code}-${item.name}`}>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-950 dark:text-white">{item.name || 'Producto sin nombre'}</p>
                    <p className="mt-0.5 font-mono text-sm text-slate-500 dark:text-slate-400">{item.code || '-'}</p>
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums text-slate-600 dark:text-slate-300">{Number(item.quantity || 0).toLocaleString('es-CL')}</td>
                  <td className="px-5 py-4 text-right tabular-nums text-slate-600 dark:text-slate-300">{money(item.unit_price)}</td>
                  <td className="px-5 py-4 text-right font-semibold tabular-nums text-slate-950 dark:text-white">{money(itemTotal(item))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-auto border-t border-slate-200 px-5 py-5 dark:border-slate-700">
          <div className="ml-auto grid w-full max-w-sm gap-3 text-right text-base text-slate-600 dark:text-slate-300">
            <div className="grid grid-cols-2 gap-4">
              <span>Subtotal</span>
              <span className="font-semibold tabular-nums text-slate-950 dark:text-white">{money(subtotal)}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <span>Descuento</span>
              <span className="font-semibold tabular-nums text-slate-950 dark:text-white">-{money(discount)}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-1 text-xl font-bold text-slate-950 dark:text-white">
              <span>Total</span>
              <span className="tabular-nums">{money(sale.total_amount)}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const SaleDetailModal = ({ sale: initialSale, saleCode, onClose, title = 'Detalle de venta realizada' }) => {
  const [sale, setSale] = useState(initialSale || null);
  const [loading, setLoading] = useState(Boolean(saleCode && !initialSale));
  const [error, setError] = useState('');

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    if (!saleCode || initialSale) {
      setSale(initialSale || null);
      setLoading(false);
      setError('');
      return undefined;
    }

    let mounted = true;
    setLoading(true);
    setError('');
    salesDocumentsService.getByCode(saleCode)
      .then((result) => { if (mounted) setSale(result); })
      .catch((err) => {
        if (mounted) setError(getBackendMessage(err, 'No fue posible cargar el detalle de la venta.'));
      })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [initialSale, saleCode]);

  return createPortal(
    <ModalFrame
      title={title}
      onClose={onClose}
      footer={(
        <button
          type="button"
          onClick={onClose}
          className="h-11 rounded-lg border border-slate-300 px-8 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Cerrar
        </button>
      )}
    >
      {loading && (
        <div className="flex min-h-[390px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
          Cargando venta...
        </div>
      )}
      {!loading && error && (
        <div className="min-h-[390px] rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}
      {!loading && !error && sale && <SaleDetailBody sale={sale} />}
    </ModalFrame>,
    document.body
  );
};

export default SaleDetailModal;
