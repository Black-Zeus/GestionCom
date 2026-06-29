/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, EyeOff, Pencil, Plus } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import StatusBadge from '@/components/common/data/StatusBadge';
import { printService } from '@/services/admin/printService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { formatDateTime } from '@/utils/dateTime';

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const textareaClassName = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const selectClassName = `${fieldClassName} bg-white dark:bg-slate-950`;

const TICKET_TYPES = [
  { code: 'TICKET_VENTA',      label: 'Ticket de Venta'         },
  { code: 'TICKET_CAMBIO',     label: 'Ticket de Cambio'        },
  { code: 'TICKET_DEVOLUCION', label: 'Ticket de Devolución'    },
  { code: 'TICKET_PRUEBA',     label: 'Ticket de Prueba'        },
  { code: 'TICKET_APERTURA',   label: 'Apertura de Caja'        },
  { code: 'TICKET_ARQUEO',     label: 'Arqueo de Caja'          },
  { code: 'TICKET_CIERRE',     label: 'Cierre de Caja'          },
  { code: 'TICKET_ANULACION',  label: 'Anulación de Venta'      },
  { code: 'TICKET_RETIRO',     label: 'Retiro de Efectivo'      },
  { code: 'TICKET_INGRESO',    label: 'Ingreso de Efectivo'     },
  { code: 'TICKET_GASTO',      label: 'Gasto Menor'             },
  { code: 'TICKET_REPORTE_X',  label: 'Reporte X (Corte Parc.)' },
  { code: 'TICKET_REPORTE_Z',  label: 'Reporte Z (Cierre Cons.)'},
];

// Todos los tipos de operación de caja (sin productos, sin totales de venta)
const CASH_OP_CODES = new Set([
  'TICKET_APERTURA', 'TICKET_ARQUEO',  'TICKET_CIERRE',
  'TICKET_ANULACION','TICKET_RETIRO',  'TICKET_INGRESO',
  'TICKET_GASTO',    'TICKET_REPORTE_X','TICKET_REPORTE_Z',
]);

const BARCODE_TYPES = [
  { value: 'CODE128', label: 'CODE128',          numeric: false, hint: 'Alfanumérico — el más versátil, compatible con cualquier campo' },
  { value: 'CODE39',  label: 'CODE39',            numeric: false, hint: 'Mayúsculas, dígitos y símbolos básicos (-, ., espacio, $, /, +, %)' },
  { value: 'GS1128',  label: 'GS1-128 / EAN128', numeric: false, hint: 'Alfanumérico con identificadores de aplicación GS1' },
  { value: 'EAN13',   label: 'EAN13',             numeric: true,  hint: 'Exactamente 12 dígitos numéricos (el 13° es el dígito verificador)' },
  { value: 'EAN8',    label: 'EAN8',              numeric: true,  hint: 'Exactamente 7 dígitos numéricos (el 8° es el dígito verificador)' },
  { value: 'UPCA',    label: 'UPC-A',             numeric: true,  hint: 'Exactamente 11 dígitos numéricos (el 12° es el dígito verificador)' },
  { value: 'ITF',     label: 'ITF / ITF-14',      numeric: true,  hint: 'Solo dígitos numéricos, cantidad par de caracteres' },
];

const BARCODE_FIELDS = [
  { value: 'ticket_number', label: 'N° de ticket',     example: 'T-000042',                    numeric: false },
  { value: 'sale_code',     label: 'Código de venta',  example: 'a1b2c3d4-…',                  numeric: false },
];

const DEFAULT_CONTENT = {
  header: {
    show_banner: true,
    show_commercial_name: true,
    show_fantasy_name: true,
    show_rut: true,
    show_address: true,
    show_date: true,
  },
  body: {
    show_unit_price: false,
    show_discount: true,
    show_credit_section: true,
    show_received_section: true,
  },
  footer: {
    show_subtotal: true,
    show_tax: true,
    show_discounts: true,
    show_total: true,
    show_payment_method: true,
    show_payment_breakdown: true,
    show_change: true,
    show_agreement: true,
    show_email: true,
    show_barcode: true,
    barcode_field: 'ticket_number',
    barcode_type: 'CODE128',
    footer_message: 'Guarda este ticket para cambios',
  },
};

const DEFAULT_CONTENT_PRUEBA = {
  header: {
    show_banner: true,
    show_commercial_name: true,
    show_fantasy_name: true,
    show_rut: true,
    show_address: true,
    show_date: true,
  },
  body: {
    show_unit_price: true,
    show_discount: true,
    show_credit_section: false,
    show_received_section: false,
  },
  footer: {
    show_subtotal: true,
    show_tax: true,
    show_discounts: false,
    show_total: true,
    show_payment_method: false,
    show_payment_breakdown: false,
    show_change: false,
    show_agreement: false,
    show_email: false,
    show_barcode: false,
    barcode_field: 'ticket_number',
    barcode_type: 'CODE128',
    footer_message: '',
  },
};

const DEFAULT_CONTENT_APERTURA = {
  header: {
    show_banner: true,
    show_commercial_name: true,
    show_fantasy_name: true,
    show_rut: true,
    show_address: false,
    show_date: true,
  },
  body: {
    show_cash_detail: true,
    show_observations: true,
    show_signature: true,
  },
  footer: {
    show_subtotal: false,
    show_tax: false,
    show_discounts: false,
    show_total: false,
    show_payment_method: false,
    show_payment_breakdown: false,
    show_change: false,
    show_agreement: false,
    show_email: false,
    show_barcode: false,
    barcode_field: 'ticket_number',
    barcode_type: 'CODE128',
    footer_message: '',
  },
};

const DEFAULT_CONTENT_ARQUEO = {
  header: {
    show_banner: false,
    show_commercial_name: true,
    show_fantasy_name: true,
    show_rut: true,
    show_address: false,
    show_date: true,
  },
  body: {
    show_sales_by_method: true,
    show_adjustments: true,
    show_cash_count: true,
    show_observations: true,
    show_signature: true,
  },
  footer: {
    show_subtotal: false,
    show_tax: false,
    show_discounts: false,
    show_total: false,
    show_payment_method: false,
    show_payment_breakdown: false,
    show_change: false,
    show_agreement: false,
    show_email: false,
    show_barcode: false,
    barcode_field: 'ticket_number',
    barcode_type: 'CODE128',
    footer_message: '',
  },
};

const DEFAULT_CONTENT_CIERRE = {
  header: {
    show_banner: false,
    show_commercial_name: true,
    show_fantasy_name: true,
    show_rut: true,
    show_address: false,
    show_date: true,
  },
  body: {
    show_sales_by_method: true,
    show_adjustments: true,
    show_cash_count: true,
    show_observations: true,
    show_signature: true,
  },
  footer: {
    show_subtotal: false,
    show_tax: false,
    show_discounts: false,
    show_total: false,
    show_payment_method: false,
    show_payment_breakdown: false,
    show_change: false,
    show_agreement: false,
    show_email: false,
    show_barcode: false,
    barcode_field: 'ticket_number',
    barcode_type: 'CODE128',
    footer_message: '',
  },
};

const _CASH_OP_FOOTER = {
  show_subtotal: false, show_tax: false, show_discounts: false, show_total: false,
  show_payment_method: false, show_payment_breakdown: false, show_change: false,
  show_agreement: false, show_email: false, show_barcode: false,
  barcode_field: 'ticket_number', barcode_type: 'CODE128', footer_message: '',
};
const _CASH_OP_HEADER_FULL  = { show_banner: false, show_commercial_name: true, show_fantasy_name: true, show_rut: true, show_address: false, show_date: true };
const _CASH_OP_HEADER_FULL2 = { show_banner: true,  show_commercial_name: true, show_fantasy_name: true, show_rut: true, show_address: false, show_date: true };

const DEFAULT_CONTENT_ANULACION = {
  header: { ..._CASH_OP_HEADER_FULL },
  body:   { show_original_folio: true, show_reason: true, show_authorizer: true, show_payment_method: true, show_status: true },
  footer: { ..._CASH_OP_FOOTER },
};

const DEFAULT_CONTENT_RETIRO = {
  header: { ..._CASH_OP_HEADER_FULL },
  body:   { show_cash_before_after: true, show_receiver: true, show_authorizer: true, show_observations: true, show_signature: true },
  footer: { ..._CASH_OP_FOOTER },
};

const DEFAULT_CONTENT_INGRESO = {
  header: { ..._CASH_OP_HEADER_FULL },
  body:   { show_cash_before_after: true, show_deliverer: true, show_authorizer: true, show_observations: true, show_signature: true },
  footer: { ..._CASH_OP_FOOTER },
};

const DEFAULT_CONTENT_GASTO = {
  header: { ..._CASH_OP_HEADER_FULL },
  body:   { show_supplier: true, show_associated_doc: false, show_authorizer: true, show_cash_before_after: true, show_observations: true, show_signature: true },
  footer: { ..._CASH_OP_FOOTER },
};

const DEFAULT_CONTENT_REPORTE_X = {
  header: { ..._CASH_OP_HEADER_FULL2 },
  body:   { show_sales_by_method: true, show_cancellations: true, show_refunds: true, show_exchanges: true, show_withdrawals: true, show_deposits: true, show_expenses: true, show_cash_count: false },
  footer: { ..._CASH_OP_FOOTER },
};

const DEFAULT_CONTENT_REPORTE_Z = {
  header: { ..._CASH_OP_HEADER_FULL2 },
  body:   { show_sales_by_method: true, show_cancellations: true, show_transaction_count: true, show_adjustments: true, show_cash_count: true },
  footer: { ..._CASH_OP_FOOTER },
};

const defaultContentFor = (code) => {
  if (code === 'TICKET_PRUEBA')    return DEFAULT_CONTENT_PRUEBA;
  if (code === 'TICKET_APERTURA')  return DEFAULT_CONTENT_APERTURA;
  if (code === 'TICKET_ARQUEO')    return DEFAULT_CONTENT_ARQUEO;
  if (code === 'TICKET_CIERRE')    return DEFAULT_CONTENT_CIERRE;
  if (code === 'TICKET_ANULACION') return DEFAULT_CONTENT_ANULACION;
  if (code === 'TICKET_RETIRO')    return DEFAULT_CONTENT_RETIRO;
  if (code === 'TICKET_INGRESO')   return DEFAULT_CONTENT_INGRESO;
  if (code === 'TICKET_GASTO')     return DEFAULT_CONTENT_GASTO;
  if (code === 'TICKET_REPORTE_X') return DEFAULT_CONTENT_REPORTE_X;
  if (code === 'TICKET_REPORTE_Z') return DEFAULT_CONTENT_REPORTE_Z;
  return DEFAULT_CONTENT;
};

const SAMPLE = {
  commercial_name: 'Empresa Demo SpA',
  fantasy_name: 'Mi Empresa',
  rut: '76.000.000-0',
  address: 'Av. Providencia 1234, Providencia, Santiago',
  date: new Date().toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
  ticket_number: 'T-000042',
  items: [
    { name: 'Blusa Floral Talla M', qty: 1, unit_price: 25210, discount: 0,    total: 25210 },
    { name: 'Falda Plisada Negra',  qty: 2, unit_price: 18490, discount: 1849, total: 35131 },
    { name: 'Accesorio Cinturón',   qty: 1, unit_price: 8900,  discount: 0,    total: 8900  },
  ],
  subtotal: 59392,
  tax: 11285,
  discounts: 1849,
  total: 69241,
  payment_method: 'Mixto',
  payment_breakdown: [
    { method: 'Convenio', amount: 55000 },
    { method: 'Efectivo', amount: 14241 },
  ],
  change: 0,
  agreement_discount: 5000,
  agreement: {
    organization_name: 'Mutual de Seguridad',
    associate_name: 'María González',
    associate_identifier: '12.345.678-9',
    agreement_type: 'CREDIT',
    agreement_single_purchase: false,
    remaining_credit: 15000,
  },
  receipt_email: 'cliente@ejemplo.com',
};

const clp = (n) => `$ ${n.toLocaleString('es-CL')}`;
const bumpVersion = (version) => {
  const parts = String(version || '1.0.0').split('.');
  let major = parseInt(parts[0] || '1', 10);
  let minor = parseInt(parts[1] || '0', 10);
  let patch = parseInt(parts[2] || '0', 10) + 1;
  if (patch > 9) { patch = 0; minor += 1; }
  if (minor > 9) { minor = 0; major += 1; }
  return `${major}.${minor}.${patch}`;
};

// ─── Toggle switch ────────────────────────────────────────────────────────────
const ToggleField = ({ label, checked, onChange }) => (
  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-1 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
    <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
      role="switch"
      aria-checked={checked}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  </label>
);

// ─── Thermal receipt preview ──────────────────────────────────────────────────
const Row = ({ left, right, className = '' }) => (
  <div className={`flex items-baseline justify-between gap-1 leading-snug ${className}`}>
    <span className="shrink-0">{left}</span>
    <span className="text-right">{right}</span>
  </div>
);

const SAMPLE_PRUEBA = {
  items: [
    { name: 'Producto de muestra A', qty: 2, unit_price: 12990, total: 25980, discount: 0 },
    { name: 'Artículo de muestra B', qty: 1, unit_price: 8900,  total: 8900,  discount: 0 },
    { name: 'Ítem de muestra C',     qty: 3, unit_price: 5990,  total: 17970, discount: 0 },
  ],
  subtotal: 44412,
  tax: 8438,
  total_amount: 52850,
};

const SAMPLE_APERTURA = {
  session_folio: 'A-000023',
  cashier_name: 'Ana García',
  supervisor_name: 'Luis Pérez',
  cash_register_name: 'Caja 1',
  branch_name: 'Sucursal Centro',
  initial_amount: 50000,
  cash_detail: [
    { denomination: 10000, qty: 3, total: 30000 },
    { denomination: 5000,  qty: 3, total: 15000 },
    { denomination: 1000,  qty: 5, total: 5000  },
  ],
};

const SAMPLE_ARQUEO = {
  session_folio: 'ARQ-000011',
  cashier_name: 'Ana García',
  cash_register_name: 'Caja 1',
  branch_name: 'Sucursal Centro',
  initial_amount: 50000,
  total_sales: 320500,
  sales_by_method: [
    { method: 'Efectivo', amount: 185000 },
    { method: 'Débito',   amount: 95500  },
    { method: 'Crédito',  amount: 40000  },
  ],
  withdrawals: 30000,
  deposits: 0,
  cancellations: 12000,
  refunds: 8000,
  expected_cash: 205000,
  counted_cash: 204500,
  difference: -500,
};

const SAMPLE_CIERRE = {
  session_folio: 'C-000019',
  cashier_name: 'Ana García',
  supervisor_name: 'Luis Pérez',
  cash_register_name: 'Caja 1',
  branch_name: 'Sucursal Centro',
  shift: 'Turno Mañana',
  open_date: '09:00',
  close_date: '18:00',
  total_sales: 650800,
  sales_by_method: [
    { method: 'Efectivo', amount: 380000 },
    { method: 'Débito',   amount: 195000 },
    { method: 'Crédito',  amount: 75800  },
  ],
  total_discounts: 22500,
  total_refunds: 15990,
  total_cancellations: 18000,
  initial_amount: 50000,
  total_withdrawals: 60000,
  total_deposits: 0,
  expected_cash: 370000,
  declared_cash: 370000,
  difference: 0,
  close_status: 'CUADRADO',
};

const SAMPLE_ANULACION = {
  session_folio: 'ANU-000007', original_folio: 'T-001234',
  cashier_name: 'Ana García', authorizer_name: 'Luis Pérez',
  cash_register_name: 'Caja 1', branch_name: 'Sucursal Centro', shift: 'Turno Mañana',
  cancelled_amount: 45990, payment_method: 'Débito',
  reason: 'Error en precio ingresado', cancellation_status: 'ANULADA',
};

const SAMPLE_RETIRO = {
  session_folio: 'RET-000014',
  cashier_name: 'Ana García', authorizer_name: 'Luis Pérez', receiver_name: 'Carlos Muñoz',
  cash_register_name: 'Caja 1', branch_name: 'Sucursal Centro', shift: 'Turno Mañana',
  amount: 100000, reason: 'Depósito bancario', cash_before: 285000, cash_after: 185000,
};

const SAMPLE_INGRESO = {
  session_folio: 'ING-000009',
  cashier_name: 'Ana García', authorizer_name: 'Luis Pérez', deliverer_name: 'Carlos Muñoz',
  cash_register_name: 'Caja 1', branch_name: 'Sucursal Centro', shift: 'Turno Mañana',
  amount: 30000, reason: 'Reposición de sencillo', cash_before: 185000, cash_after: 215000,
};

const SAMPLE_GASTO = {
  session_folio: 'GST-000003',
  cashier_name: 'Ana García', authorizer_name: 'Luis Pérez',
  cash_register_name: 'Caja 1', branch_name: 'Sucursal Centro', shift: 'Turno Mañana',
  amount: 3500, concept: 'Locomoción despacho', supplier: 'Varios', associated_doc: '',
  cash_before: 215000, cash_after: 211500,
};

const SAMPLE_REPORTE_X = {
  report_folio: 'X-000021',
  cashier_name: 'Ana García', cash_register_name: 'Caja 1',
  branch_name: 'Sucursal Centro', shift: 'Turno Mañana', open_date: '09:00',
  total_sales: 420300,
  sales_by_method: [{ method: 'Efectivo', amount: 245000 }, { method: 'Débito', amount: 130000 }, { method: 'Crédito', amount: 45300 }],
  total_cancellations: 15990, total_refunds: 8900, total_exchanges: 25000,
  total_withdrawals: 100000, total_deposits: 30000, total_expenses: 3500,
  expected_cash: 171500,
};

const SAMPLE_REPORTE_Z = {
  report_folio: 'Z-000005', period: '26/06/2026',
  responsible_name: 'Ana García', cash_register_name: 'Caja 1',
  branch_name: 'Sucursal Centro', shift: 'Turno Mañana',
  gross_total: 850600, total_discounts: 32100, total_refunds: 24890,
  total_cancellations: 28450, net_total: 765160, tax: 121697,
  sales_by_method: [{ method: 'Efectivo', amount: 390000 }, { method: 'Débito', amount: 280000 }, { method: 'Crédito', amount: 95160 }],
  transaction_count: 87, product_count: 214,
  total_withdrawals: 100000, total_deposits: 30000, total_expenses: 8700,
  expected_cash: 311300, declared_cash: 311300, difference: 0, close_status: 'CUADRADO',
};

const SAMPLE_DEVOLUCION = {
  return_items: [{ name: 'Polera Talla M', qty: 1, unit_price: 15990, total: 15990, discount: 0 }],
  subtotal: 13445,
  tax: 2545,
  refund_total: 15990,
};

const SAMPLE_CAMBIO = {
  credit_items: [{ name: 'Polera Talla M (dev.)', qty: 1, unit_price: 15990, total: 15990, discount: 0 }],
  received_items: [{ name: 'Polera Talla L', qty: 1, unit_price: 15990, total: 15990, discount: 0 }],
  exchange_credit: 15990,
  subtotal: 13445,
  tax: 2545,
  total: 0,
};

const ReceiptPreview = ({ content, paperWidth, templateCode }) => {
  const { header, body, footer } = content;
  const isCambio     = templateCode === 'TICKET_CAMBIO';
  const isDevolucion = templateCode === 'TICKET_DEVOLUCION';
  const isPrueba     = templateCode === 'TICKET_PRUEBA';
  const isApertura   = templateCode === 'TICKET_APERTURA';
  const isArqueo     = templateCode === 'TICKET_ARQUEO';
  const isCierre     = templateCode === 'TICKET_CIERRE';
  const isAnulacion  = templateCode === 'TICKET_ANULACION';
  const isRetiro     = templateCode === 'TICKET_RETIRO';
  const isIngreso    = templateCode === 'TICKET_INGRESO';
  const isGasto      = templateCode === 'TICKET_GASTO';
  const isReporteX   = templateCode === 'TICKET_REPORTE_X';
  const isReporteZ   = templateCode === 'TICKET_REPORTE_Z';
  const isCashSession = CASH_OP_CODES.has(templateCode);
  const cols = paperWidth === 58 ? 32 : 48;
  const divider = '─'.repeat(cols);

  return (
    <div className="flex flex-col items-center">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Vista previa — {paperWidth} mm</p>
      {/* paper */}
      <div
        className="relative w-full max-w-[260px] overflow-hidden rounded-sm bg-white shadow-lg"
        style={{ fontFamily: "'Courier New', Courier, monospace" }}
      >
        {/* top tear */}
        <div className="h-2 bg-slate-100" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 6px, white 6px, white 8px)' }} />

        <div className="px-3 py-2 text-[10px] leading-[1.5] text-slate-900">

          {/* HEADER */}
          {header.show_banner && (
            <>
              <div className="flex items-center justify-center rounded border border-dashed border-slate-300 py-3 text-[9px] uppercase tracking-widest text-slate-400">
                [ BANNER ]
              </div>
              <p className="my-1 text-slate-300">{divider}</p>
            </>
          )}
          {header.show_fantasy_name && (
            <p className="text-center text-[11px] font-bold uppercase">{SAMPLE.fantasy_name}</p>
          )}
          {header.show_commercial_name && (
            <p className="text-center text-[10px]">{SAMPLE.commercial_name}</p>
          )}
          {header.show_rut && (
            <p className="text-center">RUT: {SAMPLE.rut}</p>
          )}
          {header.show_address && (
            <p className="text-center text-[9px] text-slate-500">{SAMPLE.address}</p>
          )}
          {header.show_date && (
            <p className="text-center text-[9px] text-slate-500">{SAMPLE.date}</p>
          )}

          {/* divider */}
          <p className="my-1 text-slate-300">{divider}</p>

          {/* TICKET NUMBER / prueba banner */}
          {isPrueba ? (
            <>
              <p className="my-0.5 text-slate-300">{divider}</p>
              <p className="text-center font-bold text-[10px]">*** TICKET DE PRUEBA ***</p>
              <p className="text-center text-[8px] text-slate-500">NO ES UNA VENTA REAL</p>
              <p className="my-0.5 text-slate-300">{divider}</p>
              <p className="text-center font-bold">TICKET DE PRUEBA</p>
              <p className="text-center text-[9px] text-slate-500">T-00000</p>
            </>
          ) : (
            <p className="text-center font-bold">
              {isCambio    ? 'CAMBIO DE PRODUCTO'
                : isDevolucion ? 'TICKET DE DEVOLUCIÓN'
                : isApertura   ? 'APERTURA DE CAJA'
                : isArqueo     ? 'ARQUEO DE CAJA'
                : isCierre     ? 'CIERRE DE CAJA'
                : isAnulacion  ? 'ANULACIÓN DE VENTA'
                : isRetiro     ? 'RETIRO DE EFECTIVO'
                : isIngreso    ? 'INGRESO DE EFECTIVO'
                : isGasto      ? 'GASTO MENOR'
                : isReporteX   ? 'REPORTE X — CORTE PARCIAL'
                : isReporteZ   ? 'REPORTE Z'
                : 'BOLETA'
              }{' '}
              {isCashSession
                ? (isApertura  ? SAMPLE_APERTURA.session_folio
                  : isArqueo   ? SAMPLE_ARQUEO.session_folio
                  : isCierre   ? SAMPLE_CIERRE.session_folio
                  : isAnulacion? SAMPLE_ANULACION.session_folio
                  : isRetiro   ? SAMPLE_RETIRO.session_folio
                  : isIngreso  ? SAMPLE_INGRESO.session_folio
                  : isGasto    ? SAMPLE_GASTO.session_folio
                  : isReporteX ? SAMPLE_REPORTE_X.report_folio
                  : SAMPLE_REPORTE_Z.report_folio)
                : `#${SAMPLE.ticket_number}`
              }
            </p>
          )}
          <p className="my-1 text-slate-300">{divider}</p>

          {isCambio ? (
            <>
              {body.show_credit_section && (
                <>
                  <p className="text-center font-bold text-[9px] uppercase">Devuelto</p>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  {SAMPLE_CAMBIO.credit_items.map((item, i) => (
                    <div key={i} className="mb-1">
                      <div className="flex justify-between gap-1">
                        <span className="flex-1 truncate font-medium">{item.name}</span>
                        <span className="shrink-0">{clp(item.total)}</span>
                      </div>
                      {body.show_unit_price && <p className="text-slate-500">  {item.qty} x {clp(item.unit_price)}</p>}
                    </div>
                  ))}
                </>
              )}
              <p className="my-0.5 text-slate-300">{divider}</p>
              {body.show_received_section && <p className="text-center font-bold text-[9px] uppercase">Recibido</p>}
              <p className="my-0.5 text-slate-300">{divider}</p>
              {SAMPLE_CAMBIO.received_items.map((item, i) => (
                <div key={i} className="mb-1">
                  <div className="flex justify-between gap-1">
                    <span className="flex-1 truncate font-medium">{item.name}</span>
                    <span className="shrink-0">{clp(item.total)}</span>
                  </div>
                  {body.show_unit_price && <p className="text-slate-500">  {item.qty} x {clp(item.unit_price)}</p>}
                  {body.show_discount && item.discount > 0 && <p className="text-slate-500">  Desc: -{clp(item.discount)}</p>}
                </div>
              ))}
            </>
          ) : isDevolucion ? (
            <>
              <p className="text-center font-bold text-[9px] uppercase">Productos devueltos</p>
              <p className="my-0.5 text-slate-300">{divider}</p>
              {SAMPLE_DEVOLUCION.return_items.map((item, i) => (
                <div key={i} className="mb-1">
                  <div className="flex justify-between gap-1">
                    <span className="flex-1 truncate font-medium">{item.name}</span>
                    <span className="shrink-0">{clp(item.total)}</span>
                  </div>
                  {body.show_unit_price && <p className="text-slate-500">  {item.qty} x {clp(item.unit_price)}</p>}
                  {body.show_discount && item.discount > 0 && <p className="text-slate-500">  Desc: -{clp(item.discount)}</p>}
                </div>
              ))}
            </>
          ) : isPrueba ? (
            SAMPLE_PRUEBA.items.map((item, i) => (
              <div key={i} className="mb-1">
                <div className="flex justify-between gap-1">
                  <span className="flex-1 truncate font-medium">{item.name}</span>
                  <span className="shrink-0">{clp(item.total)}</span>
                </div>
                {body.show_unit_price && <p className="text-slate-500">  {item.qty} x {clp(item.unit_price)}</p>}
                {body.show_discount && item.discount > 0 && <p className="text-slate-500">  Desc: -{clp(item.discount)}</p>}
              </div>
            ))
          ) : isApertura ? (
            <>
              <p className="text-[9px] text-slate-600">Sucursal: {SAMPLE_APERTURA.branch_name}</p>
              <p className="text-[9px] text-slate-600">Caja: {SAMPLE_APERTURA.cash_register_name}</p>
              <p className="text-[9px] text-slate-600">Cajero: {SAMPLE_APERTURA.cashier_name}</p>
              <p className="text-[9px] text-slate-600">Supervisor: {SAMPLE_APERTURA.supervisor_name}</p>
              <p className="my-0.5 text-slate-300">{divider}</p>
              <Row left="MONTO INICIAL:" right={clp(SAMPLE_APERTURA.initial_amount)} className="font-bold" />
              {body.show_cash_detail && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <p className="text-center text-[9px] font-semibold">Detalle efectivo inicial</p>
                  {SAMPLE_APERTURA.cash_detail.map((d, i) => (
                    <Row key={i} left={`  ${clp(d.denomination)} x ${d.qty}`} right={clp(d.total)} className="text-[9px] text-slate-600" />
                  ))}
                </>
              )}
              {body.show_observations && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <p className="text-[9px] text-slate-600">Obs.: —</p>
                </>
              )}
              {body.show_signature && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <p className="text-center text-[9px] text-slate-500">Firma: ___________________________</p>
                </>
              )}
            </>
          ) : isArqueo ? (
            <>
              <p className="text-[9px] text-slate-600">Sucursal: {SAMPLE_ARQUEO.branch_name}</p>
              <p className="text-[9px] text-slate-600">Caja: {SAMPLE_ARQUEO.cash_register_name}</p>
              <p className="text-[9px] text-slate-600">Cajero: {SAMPLE_ARQUEO.cashier_name}</p>
              <p className="text-[9px] text-slate-600">M. inicial: {clp(SAMPLE_ARQUEO.initial_amount)}</p>
              {body.show_sales_by_method && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <p className="text-center text-[9px] font-semibold">Ventas por medio de pago</p>
                  {SAMPLE_ARQUEO.sales_by_method.map((m, i) => (
                    <Row key={i} left={`  ${m.method}:`} right={clp(m.amount)} className="text-[9px] text-slate-600" />
                  ))}
                  <Row left="TOTAL VENTAS:" right={clp(SAMPLE_ARQUEO.total_sales)} className="font-bold" />
                </>
              )}
              {body.show_adjustments && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <Row left="Retiros:"      right={`-${clp(SAMPLE_ARQUEO.withdrawals)}`}   className="text-[9px] text-slate-600" />
                  <Row left="Anulaciones:"  right={`-${clp(SAMPLE_ARQUEO.cancellations)}`} className="text-[9px] text-slate-600" />
                  <Row left="Devoluciones:" right={`-${clp(SAMPLE_ARQUEO.refunds)}`}       className="text-[9px] text-slate-600" />
                </>
              )}
              {body.show_cash_count && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <Row left="Efectivo esperado:" right={clp(SAMPLE_ARQUEO.expected_cash)} className="text-[9px] text-slate-600" />
                  <Row left="Efectivo contado:"  right={clp(SAMPLE_ARQUEO.counted_cash)}  className="text-[9px] text-slate-600" />
                  <Row left="DIFERENCIA:" right={clp(SAMPLE_ARQUEO.difference)} className="font-bold text-red-700" />
                </>
              )}
              {body.show_observations && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <p className="text-[9px] text-slate-600">Obs.: —</p>
                </>
              )}
              {body.show_signature && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <p className="text-center text-[9px] text-slate-500">Firma: ___________________________</p>
                </>
              )}
            </>
          ) : isCierre ? (
            <>
              <p className="text-[9px] text-slate-600">Sucursal: {SAMPLE_CIERRE.branch_name}</p>
              <p className="text-[9px] text-slate-600">Caja: {SAMPLE_CIERRE.cash_register_name} / {SAMPLE_CIERRE.shift}</p>
              <p className="text-[9px] text-slate-600">Cajero: {SAMPLE_CIERRE.cashier_name} / Superv.: {SAMPLE_CIERRE.supervisor_name}</p>
              <p className="text-[9px] text-slate-600">Apertura: {SAMPLE_CIERRE.open_date} · Cierre: {SAMPLE_CIERRE.close_date}</p>
              {body.show_sales_by_method && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <p className="text-center text-[9px] font-semibold">Ventas por medio de pago</p>
                  {SAMPLE_CIERRE.sales_by_method.map((m, i) => (
                    <Row key={i} left={`  ${m.method}:`} right={clp(m.amount)} className="text-[9px] text-slate-600" />
                  ))}
                  <Row left="TOTAL VENTAS:" right={clp(SAMPLE_CIERRE.total_sales)} className="font-bold" />
                </>
              )}
              {body.show_adjustments && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <Row left="Descuentos:"   right={`-${clp(SAMPLE_CIERRE.total_discounts)}`}    className="text-[9px] text-slate-600" />
                  <Row left="Devoluciones:" right={`-${clp(SAMPLE_CIERRE.total_refunds)}`}      className="text-[9px] text-slate-600" />
                  <Row left="Anulaciones:"  right={`-${clp(SAMPLE_CIERRE.total_cancellations)}`} className="text-[9px] text-slate-600" />
                  <Row left="Retiros:"      right={`-${clp(SAMPLE_CIERRE.total_withdrawals)}`}  className="text-[9px] text-slate-600" />
                </>
              )}
              {body.show_cash_count && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <Row left="M. inicial:"        right={clp(SAMPLE_CIERRE.initial_amount)}  className="text-[9px] text-slate-600" />
                  <Row left="Efectivo esperado:" right={clp(SAMPLE_CIERRE.expected_cash)}   className="text-[9px] text-slate-600" />
                  <Row left="Efectivo declarado:" right={clp(SAMPLE_CIERRE.declared_cash)}  className="text-[9px] text-slate-600" />
                  <Row left="DIFERENCIA:" right={clp(SAMPLE_CIERRE.difference)} className="font-bold" />
                  <p className="text-center text-[9px] font-bold text-emerald-700">Estado: {SAMPLE_CIERRE.close_status}</p>
                </>
              )}
              {body.show_observations && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <p className="text-[9px] text-slate-600">Obs.: —</p>
                </>
              )}
              {body.show_signature && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <p className="text-center text-[9px] text-slate-500">Cajero: ___________________________</p>
                  <p className="text-center text-[9px] text-slate-500">Supervisor: _______________________</p>
                </>
              )}
            </>
          ) : isAnulacion ? (
            <>
              <p className="text-[9px] text-slate-600">Sucursal: {SAMPLE_ANULACION.branch_name}</p>
              <p className="text-[9px] text-slate-600">Caja: {SAMPLE_ANULACION.cash_register_name} · {SAMPLE_ANULACION.shift}</p>
              <p className="text-[9px] text-slate-600">Cajero: {SAMPLE_ANULACION.cashier_name}</p>
              {body.show_original_folio && <p className="text-[9px] text-slate-600">Folio original: {SAMPLE_ANULACION.original_folio}</p>}
              <p className="my-0.5 text-slate-300">{divider}</p>
              <Row left="MONTO ANULADO:" right={clp(SAMPLE_ANULACION.cancelled_amount)} className="font-bold" />
              {body.show_payment_method && <p className="text-[9px] text-slate-600">Medio de pago: {SAMPLE_ANULACION.payment_method}</p>}
              {body.show_reason && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <p className="text-[9px] text-slate-600">Motivo: {SAMPLE_ANULACION.reason}</p>
                </>
              )}
              {body.show_authorizer && <p className="text-[9px] text-slate-600">Autorizador: {SAMPLE_ANULACION.authorizer_name}</p>}
              {body.show_status && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <p className="text-center text-[9px] font-bold">Estado: {SAMPLE_ANULACION.cancellation_status}</p>
                </>
              )}
            </>
          ) : isRetiro ? (
            <>
              <p className="text-[9px] text-slate-600">Sucursal: {SAMPLE_RETIRO.branch_name}</p>
              <p className="text-[9px] text-slate-600">Caja: {SAMPLE_RETIRO.cash_register_name} · {SAMPLE_RETIRO.shift}</p>
              <p className="text-[9px] text-slate-600">Cajero: {SAMPLE_RETIRO.cashier_name}</p>
              <p className="my-0.5 text-slate-300">{divider}</p>
              <Row left="MONTO RETIRADO:" right={clp(SAMPLE_RETIRO.amount)} className="font-bold" />
              <p className="text-[9px] text-slate-600">Motivo: {SAMPLE_RETIRO.reason}</p>
              {body.show_receiver    && <p className="text-[9px] text-slate-600">Recibe: {SAMPLE_RETIRO.receiver_name}</p>}
              {body.show_authorizer  && <p className="text-[9px] text-slate-600">Supervisor: {SAMPLE_RETIRO.authorizer_name}</p>}
              {body.show_cash_before_after && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <Row left="Efectivo antes:"   right={clp(SAMPLE_RETIRO.cash_before)} className="text-[9px] text-slate-600" />
                  <Row left="Efectivo después:" right={clp(SAMPLE_RETIRO.cash_after)}  className="text-[9px] text-slate-600" />
                </>
              )}
              {body.show_signature && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <p className="text-center text-[9px] text-slate-500">Firma: ___________________________</p>
                </>
              )}
            </>
          ) : isIngreso ? (
            <>
              <p className="text-[9px] text-slate-600">Sucursal: {SAMPLE_INGRESO.branch_name}</p>
              <p className="text-[9px] text-slate-600">Caja: {SAMPLE_INGRESO.cash_register_name} · {SAMPLE_INGRESO.shift}</p>
              <p className="text-[9px] text-slate-600">Cajero: {SAMPLE_INGRESO.cashier_name}</p>
              <p className="my-0.5 text-slate-300">{divider}</p>
              <Row left="MONTO INGRESADO:" right={clp(SAMPLE_INGRESO.amount)} className="font-bold" />
              <p className="text-[9px] text-slate-600">Motivo: {SAMPLE_INGRESO.reason}</p>
              {body.show_deliverer   && <p className="text-[9px] text-slate-600">Entrega: {SAMPLE_INGRESO.deliverer_name}</p>}
              {body.show_authorizer  && <p className="text-[9px] text-slate-600">Supervisor: {SAMPLE_INGRESO.authorizer_name}</p>}
              {body.show_cash_before_after && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <Row left="Efectivo antes:"   right={clp(SAMPLE_INGRESO.cash_before)} className="text-[9px] text-emerald-700" />
                  <Row left="Efectivo después:" right={clp(SAMPLE_INGRESO.cash_after)}  className="text-[9px] text-emerald-700" />
                </>
              )}
              {body.show_signature && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <p className="text-center text-[9px] text-slate-500">Firma: ___________________________</p>
                </>
              )}
            </>
          ) : isGasto ? (
            <>
              <p className="text-[9px] text-slate-600">Sucursal: {SAMPLE_GASTO.branch_name}</p>
              <p className="text-[9px] text-slate-600">Caja: {SAMPLE_GASTO.cash_register_name} · {SAMPLE_GASTO.shift}</p>
              <p className="text-[9px] text-slate-600">Cajero: {SAMPLE_GASTO.cashier_name}</p>
              <p className="my-0.5 text-slate-300">{divider}</p>
              <Row left="MONTO:" right={clp(SAMPLE_GASTO.amount)} className="font-bold" />
              <p className="text-[9px] text-slate-600">Concepto: {SAMPLE_GASTO.concept}</p>
              {body.show_supplier       && <p className="text-[9px] text-slate-600">Proveedor: {SAMPLE_GASTO.supplier}</p>}
              {body.show_associated_doc && SAMPLE_GASTO.associated_doc && <p className="text-[9px] text-slate-600">Doc.: {SAMPLE_GASTO.associated_doc}</p>}
              {body.show_authorizer     && <p className="text-[9px] text-slate-600">Supervisor: {SAMPLE_GASTO.authorizer_name}</p>}
              {body.show_cash_before_after && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <Row left="Efectivo antes:"   right={clp(SAMPLE_GASTO.cash_before)} className="text-[9px] text-slate-600" />
                  <Row left="Efectivo después:" right={clp(SAMPLE_GASTO.cash_after)}  className="text-[9px] text-slate-600" />
                </>
              )}
              {body.show_signature && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <p className="text-center text-[9px] text-slate-500">Firma: ___________________________</p>
                </>
              )}
            </>
          ) : isReporteX ? (
            <>
              <p className="text-[9px] text-slate-600">Sucursal: {SAMPLE_REPORTE_X.branch_name}</p>
              <p className="text-[9px] text-slate-600">Caja: {SAMPLE_REPORTE_X.cash_register_name} · {SAMPLE_REPORTE_X.shift}</p>
              <p className="text-[9px] text-slate-600">Cajero: {SAMPLE_REPORTE_X.cashier_name} · Apertura: {SAMPLE_REPORTE_X.open_date}</p>
              {body.show_sales_by_method && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <p className="text-center text-[9px] font-semibold">Ventas por medio de pago</p>
                  {SAMPLE_REPORTE_X.sales_by_method.map((m, i) => (
                    <Row key={i} left={`  ${m.method}:`} right={clp(m.amount)} className="text-[9px] text-slate-600" />
                  ))}
                  <Row left="TOTAL VENTAS:" right={clp(SAMPLE_REPORTE_X.total_sales)} className="font-bold" />
                </>
              )}
              <p className="my-0.5 text-slate-300">{divider}</p>
              {body.show_cancellations && <Row left="Anulaciones:"  right={`-${clp(SAMPLE_REPORTE_X.total_cancellations)}`} className="text-[9px] text-slate-600" />}
              {body.show_refunds       && <Row left="Devoluciones:" right={`-${clp(SAMPLE_REPORTE_X.total_refunds)}`}       className="text-[9px] text-slate-600" />}
              {body.show_exchanges     && <Row left="Cambios:"      right={clp(SAMPLE_REPORTE_X.total_exchanges)}           className="text-[9px] text-slate-600" />}
              {body.show_withdrawals   && <Row left="Retiros:"      right={`-${clp(SAMPLE_REPORTE_X.total_withdrawals)}`}   className="text-[9px] text-slate-600" />}
              {body.show_deposits      && <Row left="Ingresos:"     right={`+${clp(SAMPLE_REPORTE_X.total_deposits)}`}      className="text-[9px] text-slate-600" />}
              {body.show_expenses      && <Row left="Gastos:"       right={`-${clp(SAMPLE_REPORTE_X.total_expenses)}`}      className="text-[9px] text-slate-600" />}
              <p className="my-0.5 text-slate-300">{divider}</p>
              {body.show_cash_count
                ? <Row left="Efectivo esperado:" right={clp(SAMPLE_REPORTE_X.expected_cash)} className="text-[9px] text-slate-600" />
                : <Row left="EFECTIVO ESPERADO:" right={clp(SAMPLE_REPORTE_X.expected_cash)} className="font-bold" />
              }
            </>
          ) : isReporteZ ? (
            <>
              <p className="text-[9px] text-slate-600">Periodo: {SAMPLE_REPORTE_Z.period}</p>
              <p className="text-[9px] text-slate-600">Sucursal: {SAMPLE_REPORTE_Z.branch_name}</p>
              <p className="text-[9px] text-slate-600">Caja: {SAMPLE_REPORTE_Z.cash_register_name} · {SAMPLE_REPORTE_Z.shift}</p>
              <p className="text-[9px] text-slate-600">Responsable: {SAMPLE_REPORTE_Z.responsible_name}</p>
              {body.show_sales_by_method && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <p className="text-center text-[9px] font-semibold">Ventas por medio de pago</p>
                  {SAMPLE_REPORTE_Z.sales_by_method.map((m, i) => (
                    <Row key={i} left={`  ${m.method}:`} right={clp(m.amount)} className="text-[9px] text-slate-600" />
                  ))}
                  <Row left="TOTAL BRUTO:" right={clp(SAMPLE_REPORTE_Z.gross_total)} className="font-bold" />
                </>
              )}
              {body.show_cancellations && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <Row left="Descuentos:"   right={`-${clp(SAMPLE_REPORTE_Z.total_discounts)}`}    className="text-[9px] text-slate-600" />
                  <Row left="Devoluciones:" right={`-${clp(SAMPLE_REPORTE_Z.total_refunds)}`}      className="text-[9px] text-slate-600" />
                  <Row left="Anulaciones:"  right={`-${clp(SAMPLE_REPORTE_Z.total_cancellations)}`} className="text-[9px] text-slate-600" />
                  <Row left="TOTAL NETO:" right={clp(SAMPLE_REPORTE_Z.net_total)} className="font-bold" />
                  <Row left="IVA (19%):"  right={clp(SAMPLE_REPORTE_Z.tax)}      className="text-[9px] text-slate-500" />
                </>
              )}
              {body.show_transaction_count && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <Row left="Transacciones:" right={String(SAMPLE_REPORTE_Z.transaction_count)} className="text-[9px] text-slate-600" />
                  <Row left="Productos:"     right={String(SAMPLE_REPORTE_Z.product_count)}     className="text-[9px] text-slate-600" />
                </>
              )}
              {body.show_adjustments && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <Row left="Retiros:"  right={`-${clp(SAMPLE_REPORTE_Z.total_withdrawals)}`} className="text-[9px] text-slate-600" />
                  <Row left="Ingresos:" right={`+${clp(SAMPLE_REPORTE_Z.total_deposits)}`}    className="text-[9px] text-slate-600" />
                  <Row left="Gastos:"   right={`-${clp(SAMPLE_REPORTE_Z.total_expenses)}`}    className="text-[9px] text-slate-600" />
                </>
              )}
              {body.show_cash_count && (
                <>
                  <p className="my-0.5 text-slate-300">{divider}</p>
                  <Row left="Efectivo esperado:"  right={clp(SAMPLE_REPORTE_Z.expected_cash)} className="text-[9px] text-slate-600" />
                  <Row left="Efectivo declarado:" right={clp(SAMPLE_REPORTE_Z.declared_cash)} className="text-[9px] text-slate-600" />
                  <Row left="DIFERENCIA:" right={clp(SAMPLE_REPORTE_Z.difference)} className="font-bold" />
                  <p className="text-center text-[9px] font-bold text-emerald-700">Estado: {SAMPLE_REPORTE_Z.close_status}</p>
                </>
              )}
            </>
          ) : (
            SAMPLE.items.map((item, i) => (
              <div key={i} className="mb-1">
                <div className="flex justify-between gap-1">
                  <span className="flex-1 truncate font-medium">{item.name}</span>
                  <span className="shrink-0">{clp(item.total)}</span>
                </div>
                {body.show_unit_price && <p className="text-slate-500">  {item.qty} x {clp(item.unit_price)}</p>}
                {body.show_discount && item.discount > 0 && <p className="text-slate-500">  Desc: -{clp(item.discount)}</p>}
              </div>
            ))
          )}

          {!isCashSession && <p className="my-1 text-slate-300">{divider}</p>}

          {/* FOOTER TOTALS */}
          {isCashSession ? null : isCambio ? (
            <>
              {footer.show_subtotal && <Row left="Subtotal recibido:" right={clp(SAMPLE_CAMBIO.subtotal)} />}
              {footer.show_tax && <Row left="IVA (19%):" right={clp(SAMPLE_CAMBIO.tax)} />}
              <Row left="Crédito devuelto:" right={`-${clp(SAMPLE_CAMBIO.exchange_credit)}`} className="text-slate-600" />
              {footer.show_total && <Row left="TOTAL:" right="Sin cobro adicional" className="font-bold" />}
            </>
          ) : isDevolucion ? (
            <>
              {footer.show_subtotal && <Row left="Subtotal devuelto:" right={clp(SAMPLE_DEVOLUCION.subtotal)} />}
              {footer.show_tax && <Row left="IVA (19%):" right={clp(SAMPLE_DEVOLUCION.tax)} />}
              {footer.show_total && <Row left="TOTAL DEVUELTO:" right={clp(SAMPLE_DEVOLUCION.refund_total)} className="font-bold text-red-700" />}
            </>
          ) : isPrueba ? (
            <>
              {footer.show_subtotal && <Row left="Subtotal (neto):" right={clp(SAMPLE_PRUEBA.subtotal)} />}
              {footer.show_tax && <Row left="IVA (19%):" right={clp(SAMPLE_PRUEBA.tax)} />}
              {footer.show_total && <Row left="TOTAL:" right={clp(SAMPLE_PRUEBA.total_amount)} className="font-bold" />}
              <p className="my-1 text-slate-300">{divider}</p>
              <p className="text-[8px] text-slate-400">Template: TICKET_PRUEBA  v1.0.0</p>
              <p className="text-[8px] text-slate-400">Fuente: calibri  26px</p>
              <p className="text-[8px] text-slate-400">Impres.: Impresora de prueba</p>
              <p className="my-0.5 text-slate-300">{divider}</p>
              <p className="text-center text-[9px] text-slate-500">Si ves este ticket,</p>
              <p className="text-center text-[9px] font-bold">el agente funciona OK.</p>
            </>
          ) : (
            <>
              {footer.show_subtotal && (
                <Row left="Subtotal (neto):" right={clp(SAMPLE.subtotal)} />
              )}
              {footer.show_tax && (
                <Row left="IVA (19%):" right={clp(SAMPLE.tax)} />
              )}
              {footer.show_discounts && SAMPLE.discounts > 0 && (
                <Row left="Descuentos:" right={`-${clp(SAMPLE.discounts)}`} />
              )}
              {SAMPLE.agreement_discount > 0 && (
                <Row left="Desc. convenio:" right={`-${clp(SAMPLE.agreement_discount)}`} className="text-blue-700" />
              )}
              {footer.show_total && (
                <Row left="TOTAL:" right={clp(SAMPLE.total - SAMPLE.agreement_discount)} className="font-bold" />
              )}
              {footer.show_payment_method && (
                <Row left="Pago:" right={SAMPLE.payment_method} className="text-slate-600" />
              )}
              {footer.show_payment_breakdown && SAMPLE.payment_breakdown?.length > 0 && (
                SAMPLE.payment_breakdown.map((item, i) => (
                  <Row key={i} left={`  ${item.method}:`} right={clp(item.amount)} className="text-[9px] text-slate-500" />
                ))
              )}
              {footer.show_change && (
                <Row left="Vuelto:" right={clp(SAMPLE.change)} className="text-slate-600" />
              )}
            </>
          )}

          {/* CONVENIO */}
          {!isPrueba && !isCashSession && footer.show_agreement && SAMPLE.agreement && (
            <>
              <p className="my-1 text-slate-300">{divider}</p>
              <p className="text-center text-[8px] font-semibold uppercase tracking-wide text-slate-500">
                {SAMPLE.agreement.agreement_type === 'CREDIT' ? 'Convenio Crédito' : 'Convenio Descuento'}
              </p>
              <Row left="Organización:" right={SAMPLE.agreement.organization_name} className="text-[9px] text-slate-600" />
              <Row left="Beneficiario:" right={SAMPLE.agreement.associate_name} className="text-[9px] text-slate-600" />
              <Row left="Identificador:" right={SAMPLE.agreement.associate_identifier} className="text-[9px] text-slate-600" />
              {SAMPLE.agreement.agreement_type === 'CREDIT' && (
                <>
                  {SAMPLE.agreement.remaining_credit != null && (
                    <Row left="Crédito disponible:" right={clp(SAMPLE.agreement.remaining_credit)} className="text-[9px] text-emerald-700" />
                  )}
                  {SAMPLE.agreement.agreement_single_purchase && (
                    <p className="text-[9px] text-center text-amber-600">Uso único — crédito saldado</p>
                  )}
                </>
              )}
              {SAMPLE.agreement.agreement_type === 'DISCOUNT' && SAMPLE.agreement.discount_percent && (
                <Row left="Descuento:" right={`${SAMPLE.agreement.discount_percent}%`} className="text-[9px] text-slate-600" />
              )}
            </>
          )}

          {/* EMAIL */}
          {!isPrueba && !isCashSession && footer.show_email && SAMPLE.receipt_email && (
            <>
              <p className="my-1 text-slate-300">{divider}</p>
              <p className="text-center text-[9px] text-slate-500">{SAMPLE.receipt_email}</p>
            </>
          )}

          {/* BARCODE */}
          {!isPrueba && !isCashSession && footer.show_barcode && (
            <>
              <p className="my-1 text-slate-300">{divider}</p>
              <div className="flex flex-col items-center py-1">
                {/* Simulated barcode strips */}
                <div className="flex h-8 items-end gap-px">
                  {Array.from({ length: 38 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-slate-900"
                      style={{
                        width: [1, 2, 1, 3, 1, 2, 2, 1][i % 8],
                        height: `${60 + ((i * 17 + 7) % 40)}%`,
                      }}
                    />
                  ))}
                </div>
                <p className="mt-0.5 text-[8px] tracking-widest text-slate-600">{SAMPLE.ticket_number}</p>
                <p className="text-[7px] text-slate-400">{footer.barcode_type}</p>
              </div>
            </>
          )}

          {/* FOOTER MESSAGE */}
          {!isPrueba && !isCashSession && footer.footer_message && (
            <>
              <p className="my-1 text-slate-300">{divider}</p>
              <p className="text-center text-[9px] italic text-slate-500">{footer.footer_message}</p>
            </>
          )}

          <p className="mt-2 text-slate-300">{divider}</p>
        </div>

        {/* bottom tear */}
        <div className="h-2 bg-slate-100" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 6px, white 6px, white 8px)' }} />
      </div>
    </div>
  );
};

// ─── Template form (used as modal content) ───────────────────────────────────
export const TemplateFormModal = ({ mode = 'create', initialValues, onSubmit, onClose }) => {
  const isEdit = mode === 'edit';
  const [templateCode, setTemplateCode] = useState(initialValues?.template_code || '');
  const [templateName, setTemplateName] = useState(initialValues?.template_name || '');
  const [version, setVersion] = useState(initialValues?.version || '1.0.0');
  const [paperWidth, setPaperWidth] = useState(initialValues?.paper_width_mm ?? 80);
  const [isActive, setIsActive] = useState(initialValues?.is_active !== false);
  const [content, setContent] = useState(() => {
    const base = defaultContentFor(initialValues?.template_code || '');
    return {
      header: { ...base.header, ...(initialValues?.content?.header || {}) },
      body:   { ...base.body,   ...(initialValues?.content?.body   || {}) },
      footer: { ...base.footer, ...(initialValues?.content?.footer || {}) },
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  const setHeader = (f, v) => { setContent((c) => ({ ...c, header: { ...c.header, [f]: v } })); setIsDirty(true); };
  const setBody   = (f, v) => { setContent((c) => ({ ...c, body:   { ...c.body,   [f]: v } })); setIsDirty(true); };
  const setFooter = (f, v) => { setContent((c) => ({ ...c, footer: { ...c.footer, [f]: v } })); setIsDirty(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!templateCode.trim()) { setError('El código del ticket es requerido.'); return; }
    if (!templateName.trim()) { setError('El nombre es requerido.'); return; }
    setSaving(true);
    try {
      await onSubmit({
        template_code: templateCode.trim().toUpperCase(),
        template_name: templateName.trim(),
        version: version.trim() || '1.0.0',
        paper_width_mm: Number(paperWidth),
        is_active: isActive,
        content,
      });
      onClose();
    } catch (err) {
      setError(getBackendMessage(err) || 'Error al guardar el template.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col" style={{ maxHeight: 'calc(90vh - 120px)' }}>

      {/* ── Área scrolleable: ambas columnas ── */}
      <div className="flex min-h-0 flex-1 gap-5 overflow-y-auto pb-2">

      {/* ── Columna izquierda: configuración ── */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">

        {/* Identificación */}
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Ticket de Impresión</span>
            {isEdit ? (
              <div className={`${fieldClassName} flex items-center bg-slate-50 text-slate-500 dark:bg-slate-900`}>{templateCode}</div>
            ) : (
              <select className={selectClassName} value={templateCode} onChange={(e) => {
                const newCode = e.target.value;
                const found = TICKET_TYPES.find((t) => t.code === newCode);
                setTemplateCode(newCode);
                if (found) setTemplateName(found.label);
                if (newCode !== templateCode) {
                  const base = defaultContentFor(newCode);
                  setContent({ header: { ...base.header }, body: { ...base.body }, footer: { ...base.footer } });
                }
              }} required>
                <option value="">Seleccionar tipo...</option>
                <optgroup label="── Operaciones de Caja ─">
                  <option value="TICKET_ANULACION">Anulación de Venta</option>
                  <option value="TICKET_APERTURA">Apertura de Caja</option>
                  <option value="TICKET_ARQUEO">Arqueo de Caja</option>
                  <option value="TICKET_CIERRE">Cierre de Caja</option>
                  <option value="TICKET_GASTO">Gasto Menor</option>
                  <option value="TICKET_INGRESO">Ingreso de Efectivo</option>
                  <option value="TICKET_RETIRO">Retiro de Efectivo</option>
                </optgroup>
                <optgroup label="── Reportes ────────────">
                  <option value="TICKET_REPORTE_X">Reporte X (Corte Parc.)</option>
                  <option value="TICKET_REPORTE_Z">Reporte Z (Cierre Cons.)</option>
                </optgroup>
                <optgroup label="── Sistema ─────────────">
                  <option value="TICKET_PRUEBA">Ticket de Prueba</option>
                </optgroup>
                <optgroup label="── Ventas ──────────────">
                  <option value="TICKET_CAMBIO">Ticket de Cambio</option>
                  <option value="TICKET_DEVOLUCION">Ticket de Devolución</option>
                  <option value="TICKET_VENTA">Ticket de Venta</option>
                </optgroup>
              </select>
            )}
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Nombre descriptivo</span>
            <input className={fieldClassName} value={templateName} onChange={(e) => { setTemplateName(e.target.value); setIsDirty(true); }} placeholder="Ej: Ticket de Venta Estándar" required />
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Versión</span>
            <div className={`${fieldClassName} flex items-center bg-slate-50 font-mono text-slate-600 dark:bg-slate-900 dark:text-slate-400`}>
              {version}
            </div>
            {isEdit && (
              <button type="button" onClick={() => { setVersion(bumpVersion(version)); setIsDirty(true); }} className="text-xs text-blue-600 hover:underline dark:text-blue-400">
                Incrementar (+patch)
              </button>
            )}
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Ancho de papel</span>
            <select className={selectClassName} value={paperWidth} onChange={(e) => { setPaperWidth(Number(e.target.value)); setIsDirty(true); }}>
              <option value={58}>58 mm</option>
              <option value={80}>80 mm</option>
            </select>
          </label>
        </div>

        {/* Secciones de contenido */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Encabezado</p>
            <div className="space-y-0.5">
              <ToggleField label="Banner"               checked={content.header.show_banner}          onChange={(v) => setHeader('show_banner', v)} />
              <ToggleField label="Nombre fantasía"    checked={content.header.show_fantasy_name}    onChange={(v) => setHeader('show_fantasy_name', v)} />
              <ToggleField label="Razón social"       checked={content.header.show_commercial_name} onChange={(v) => setHeader('show_commercial_name', v)} />
              <ToggleField label="RUT empresa"        checked={content.header.show_rut}             onChange={(v) => setHeader('show_rut', v)} />
              <ToggleField label="Dirección"          checked={content.header.show_address}         onChange={(v) => setHeader('show_address', v)} />
              <ToggleField label="Fecha y hora"       checked={content.header.show_date}            onChange={(v) => setHeader('show_date', v)} />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {CASH_OP_CODES.has(templateCode) ? 'Cuerpo — Sesión' : 'Cuerpo — Productos'}
            </p>
            <div className="space-y-0.5">
              {CASH_OP_CODES.has(templateCode) ? (
                <>
                  {templateCode === 'TICKET_APERTURA' && (
                    <ToggleField label="Detalle efectivo inicial" checked={content.body.show_cash_detail ?? true} onChange={(v) => setBody('show_cash_detail', v)} />
                  )}
                  {(templateCode === 'TICKET_ARQUEO' || templateCode === 'TICKET_CIERRE') && (<>
                    <ToggleField label="Ventas por medio de pago" checked={content.body.show_sales_by_method ?? true} onChange={(v) => setBody('show_sales_by_method', v)} />
                    <ToggleField label="Movimientos"             checked={content.body.show_adjustments    ?? true} onChange={(v) => setBody('show_adjustments', v)} />
                    <ToggleField label="Conteo de efectivo"       checked={content.body.show_cash_count     ?? true} onChange={(v) => setBody('show_cash_count', v)} />
                  </>)}
                  {templateCode === 'TICKET_ANULACION' && (<>
                    <ToggleField label="Folio venta original"   checked={content.body.show_original_folio  ?? true} onChange={(v) => setBody('show_original_folio', v)} />
                    <ToggleField label="Motivo de anulación"    checked={content.body.show_reason           ?? true} onChange={(v) => setBody('show_reason', v)} />
                    <ToggleField label="Autorizador"            checked={content.body.show_authorizer       ?? true} onChange={(v) => setBody('show_authorizer', v)} />
                    <ToggleField label="Medio de pago afectado" checked={content.body.show_payment_method   ?? true} onChange={(v) => setBody('show_payment_method', v)} />
                    <ToggleField label="Estado de anulación"    checked={content.body.show_status           ?? true} onChange={(v) => setBody('show_status', v)} />
                  </>)}
                  {templateCode === 'TICKET_RETIRO' && (<>
                    <ToggleField label="Efectivo antes/después"  checked={content.body.show_cash_before_after ?? true} onChange={(v) => setBody('show_cash_before_after', v)} />
                    <ToggleField label="Responsable que recibe"  checked={content.body.show_receiver          ?? true} onChange={(v) => setBody('show_receiver', v)} />
                    <ToggleField label="Autorizador"             checked={content.body.show_authorizer        ?? true} onChange={(v) => setBody('show_authorizer', v)} />
                    <ToggleField label="Observaciones"           checked={content.body.show_observations      ?? true} onChange={(v) => setBody('show_observations', v)} />
                    <ToggleField label="Firma / Validación"      checked={content.body.show_signature         ?? true} onChange={(v) => setBody('show_signature', v)} />
                  </>)}
                  {templateCode === 'TICKET_INGRESO' && (<>
                    <ToggleField label="Efectivo antes/después"  checked={content.body.show_cash_before_after ?? true} onChange={(v) => setBody('show_cash_before_after', v)} />
                    <ToggleField label="Responsable que entrega" checked={content.body.show_deliverer         ?? true} onChange={(v) => setBody('show_deliverer', v)} />
                    <ToggleField label="Autorizador"             checked={content.body.show_authorizer        ?? true} onChange={(v) => setBody('show_authorizer', v)} />
                    <ToggleField label="Observaciones"           checked={content.body.show_observations      ?? true} onChange={(v) => setBody('show_observations', v)} />
                    <ToggleField label="Firma / Validación"      checked={content.body.show_signature         ?? true} onChange={(v) => setBody('show_signature', v)} />
                  </>)}
                  {templateCode === 'TICKET_GASTO' && (<>
                    <ToggleField label="Proveedor/Referencia"    checked={content.body.show_supplier          ?? true}  onChange={(v) => setBody('show_supplier', v)} />
                    <ToggleField label="Documento asociado"      checked={content.body.show_associated_doc    ?? false} onChange={(v) => setBody('show_associated_doc', v)} />
                    <ToggleField label="Autorizador"             checked={content.body.show_authorizer        ?? true}  onChange={(v) => setBody('show_authorizer', v)} />
                    <ToggleField label="Efectivo antes/después"  checked={content.body.show_cash_before_after ?? true}  onChange={(v) => setBody('show_cash_before_after', v)} />
                    <ToggleField label="Observaciones"           checked={content.body.show_observations      ?? true}  onChange={(v) => setBody('show_observations', v)} />
                    <ToggleField label="Firma / Validación"      checked={content.body.show_signature         ?? true}  onChange={(v) => setBody('show_signature', v)} />
                  </>)}
                  {templateCode === 'TICKET_REPORTE_X' && (<>
                    <ToggleField label="Ventas por medio de pago" checked={content.body.show_sales_by_method ?? true}  onChange={(v) => setBody('show_sales_by_method', v)} />
                    <ToggleField label="Anulaciones"              checked={content.body.show_cancellations   ?? true}  onChange={(v) => setBody('show_cancellations', v)} />
                    <ToggleField label="Devoluciones"             checked={content.body.show_refunds         ?? true}  onChange={(v) => setBody('show_refunds', v)} />
                    <ToggleField label="Cambios"                  checked={content.body.show_exchanges       ?? true}  onChange={(v) => setBody('show_exchanges', v)} />
                    <ToggleField label="Retiros de efectivo"      checked={content.body.show_withdrawals     ?? true}  onChange={(v) => setBody('show_withdrawals', v)} />
                    <ToggleField label="Ingresos manuales"        checked={content.body.show_deposits        ?? true}  onChange={(v) => setBody('show_deposits', v)} />
                    <ToggleField label="Gastos menores"           checked={content.body.show_expenses        ?? true}  onChange={(v) => setBody('show_expenses', v)} />
                    <ToggleField label="Conteo de efectivo"       checked={content.body.show_cash_count      ?? false} onChange={(v) => setBody('show_cash_count', v)} />
                  </>)}
                  {templateCode === 'TICKET_REPORTE_Z' && (<>
                    <ToggleField label="Ventas por medio de pago"     checked={content.body.show_sales_by_method  ?? true} onChange={(v) => setBody('show_sales_by_method', v)} />
                    <ToggleField label="Deducciones"                  checked={content.body.show_cancellations    ?? true} onChange={(v) => setBody('show_cancellations', v)} />
                    <ToggleField label="Cantidad de transacciones"    checked={content.body.show_transaction_count ?? true} onChange={(v) => setBody('show_transaction_count', v)} />
                    <ToggleField label="Movimientos"                  checked={content.body.show_adjustments      ?? true} onChange={(v) => setBody('show_adjustments', v)} />
                    <ToggleField label="Conteo de efectivo y estado"  checked={content.body.show_cash_count       ?? true} onChange={(v) => setBody('show_cash_count', v)} />
                  </>)}
                  {(templateCode === 'TICKET_APERTURA' || templateCode === 'TICKET_ARQUEO' || templateCode === 'TICKET_CIERRE') && (<>
                    <ToggleField label="Observaciones"      checked={content.body.show_observations ?? true} onChange={(v) => setBody('show_observations', v)} />
                    <ToggleField label="Firma / Validación" checked={content.body.show_signature    ?? true} onChange={(v) => setBody('show_signature', v)} />
                  </>)}
                </>
              ) : (
                <>
                  <ToggleField label="Precio unitario"     checked={content.body.show_unit_price ?? false} onChange={(v) => setBody('show_unit_price', v)} />
                  <ToggleField label="Descuento por línea" checked={content.body.show_discount   ?? true}  onChange={(v) => setBody('show_discount', v)} />
                  {templateCode === 'TICKET_CAMBIO' && (
                    <>
                      <ToggleField label="Sección Devuelto"  checked={content.body.show_credit_section   ?? true} onChange={(v) => setBody('show_credit_section', v)} />
                      <ToggleField label="Etiqueta Recibido" checked={content.body.show_received_section ?? true} onChange={(v) => setBody('show_received_section', v)} />
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Pie — Totales</p>
            <div className="space-y-0.5">
              {CASH_OP_CODES.has(templateCode) ? (
                <p className="text-xs text-slate-400 italic">Sin opciones de pie para este tipo.</p>
              ) : (<>
                <ToggleField label="Subtotal (neto)" checked={content.footer.show_subtotal} onChange={(v) => setFooter('show_subtotal', v)} />
                <ToggleField label="IVA (19%)"       checked={content.footer.show_tax}      onChange={(v) => setFooter('show_tax', v)} />
                {templateCode !== 'TICKET_PRUEBA' && (
                  <ToggleField label="Descuentos" checked={content.footer.show_discounts} onChange={(v) => setFooter('show_discounts', v)} />
                )}
                <ToggleField label="Total a pagar" checked={content.footer.show_total} onChange={(v) => setFooter('show_total', v)} />
                {templateCode !== 'TICKET_PRUEBA' && (<>
                  <ToggleField label="Método de pago"         checked={content.footer.show_payment_method}    onChange={(v) => setFooter('show_payment_method', v)} />
                  <ToggleField label="Detalle pagos mixtos"   checked={content.footer.show_payment_breakdown} onChange={(v) => setFooter('show_payment_breakdown', v)} />
                  <ToggleField label="Vuelto"                 checked={content.footer.show_change}            onChange={(v) => setFooter('show_change', v)} />
                  <ToggleField label="Datos convenio"         checked={content.footer.show_agreement}         onChange={(v) => setFooter('show_agreement', v)} />
                  <ToggleField label="Email cliente"          checked={content.footer.show_email}             onChange={(v) => setFooter('show_email', v)} />
                  <ToggleField label="Código de barras"       checked={content.footer.show_barcode}           onChange={(v) => setFooter('show_barcode', v)} />
                </>)}
              </>)}
            </div>
          </div>
        </div>

        {/* Barcode + activo (fila 1) | Compatibilidad (fila 2) | Mensaje de pie (fila 3) */}
        <div className="grid grid-cols-3 gap-3">
          {/* Fila 1, col 1: campo barcode (solo si está activo y aplica al tipo) */}
          {content.footer.show_barcode && templateCode !== 'TICKET_PRUEBA' && !CASH_OP_CODES.has(templateCode) ? (
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Campo del barcode</span>
              <select className={selectClassName} value={content.footer.barcode_field} onChange={(e) => setFooter('barcode_field', e.target.value)}>
                {BARCODE_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label} — {f.example}</option>
                ))}
              </select>
            </label>
          ) : <div />}

          {/* Fila 1, col 2: tipo barcode (solo si está activo y aplica al tipo) */}
          {content.footer.show_barcode && templateCode !== 'TICKET_PRUEBA' && !CASH_OP_CODES.has(templateCode) ? (
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Tipo de barcode</span>
              <select className={selectClassName} value={content.footer.barcode_type} onChange={(e) => setFooter('barcode_type', e.target.value)}>
                {BARCODE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
          ) : <div />}

          {/* Fila 1, col 3: Template activo — siempre visible */}
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Template activo</span>
            <div className="flex h-11 items-center justify-between rounded-md border border-slate-200 px-3 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400">{isActive ? 'Activo' : 'Inactivo'}</span>
              <button type="button" onClick={() => { setIsActive((v) => !v); setIsDirty(true); }} className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${isActive ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`} role="switch" aria-checked={isActive}>
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* Fila 2: aviso de compatibilidad barcode */}
          {content.footer.show_barcode && templateCode !== 'TICKET_PRUEBA' && !CASH_OP_CODES.has(templateCode) && (() => {
            const bt = BARCODE_TYPES.find((t) => t.value === content.footer.barcode_type);
            const bf = BARCODE_FIELDS.find((f) => f.value === content.footer.barcode_field);
            if (!bt) return <div className="col-span-3" />;
            const incompatible = bt.numeric && bf && !bf.numeric;
            return (
              <div className={`col-span-3 rounded-md px-3 py-2 text-xs leading-relaxed ${
                incompatible
                  ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
                  : 'bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400'
              }`}>
                <span className="font-semibold">{bt.label}:</span> {bt.hint}.
                {incompatible && (
                  <span className="ml-1">
                    El campo <span className="font-semibold">"{bf.label}"</span> contiene valores alfanuméricos
                    (ej: <span className="font-mono">{bf.example}</span>), lo que puede causar errores al
                    generar el código de barras. Considera usar <span className="font-semibold">CODE128</span> para este campo.
                  </span>
                )}
              </div>
            );
          })()}

          {/* Fila 3: Mensaje de pie — ocupa las 3 columnas (no aplica a TICKET_PRUEBA) */}
          {templateCode !== 'TICKET_PRUEBA' && !CASH_OP_CODES.has(templateCode) && (
            <label className="col-span-3 space-y-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Mensaje de pie</span>
              <textarea className={textareaClassName} rows={2} value={content.footer.footer_message} onChange={(e) => setFooter('footer_message', e.target.value)} placeholder="Ej: Gracias por su compra." maxLength={200} />
              <span className="text-xs text-slate-400">{content.footer.footer_message.length}/200</span>
            </label>
          )}
        </div>

      </div>

      {/* ── Columna derecha: preview ── */}
      <div className="w-[280px] shrink-0">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <ReceiptPreview content={content} paperWidth={paperWidth} templateCode={templateCode} />
        </div>
      </div>

      </div>{/* fin área scrolleable */}

      {/* ── Footer fijo: error + botones ── */}
      <div className="shrink-0 border-t border-slate-100 pt-3 dark:border-slate-800">
        {error && <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            {isDirty && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Cambios pendientes de guardar
              </span>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={onClose} className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear template'}
            </button>
          </div>
        </div>
      </div>

    </form>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminPrintTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setTemplates(await printService.listTemplates());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openModal = (template = null) => {
    const isEdit = Boolean(template);
    ModalManager.show({
      type: 'custom',
      title: isEdit ? `Editar: ${template.template_name}` : 'Nuevo template de impresión',
      size: 'modalLarge',
      showFooter: false,
      contentComponent: TemplateFormModal,
      contentProps: {
        mode: isEdit ? 'edit' : 'create',
        initialValues: template || null,
        onSubmit: async (payload) => {
          if (!isEdit && payload.is_active) {
            const currentActive = templates.find((t) => t.template_code === payload.template_code && t.is_active);
            if (currentActive) {
              const ok = await ModalManager.confirm({
                title: 'Reemplazar template activo',
                message: `Ya existe un template activo para ${payload.template_code}: "${currentActive.template_name}" (${currentActive.version}). Al crear este nuevo template activo, ese quedará inactivo.`,
                buttons: { cancel: 'Cancelar', confirm: 'Crear y reemplazar' },
              });
              if (!ok) return;
            }
          }
          const action = isEdit
            ? printService.updateTemplate(template.id, payload)
            : printService.createTemplate(payload);
          await notifyPromise(action, {
            loading: isEdit ? 'Guardando cambios...' : 'Creando template...',
            success: isEdit ? 'Template actualizado — el agente descargará la nueva versión en su próximo ciclo' : 'Template creado',
            error: (e) => getBackendMessage(e) || 'Error al guardar',
          });
          await load();
        },
      },
    });
  };

  const handleToggleActive = async (template) => {
    const nextState = !template.is_active;
    const currentActive = nextState
      ? templates.find((t) => t.id !== template.id && t.template_code === template.template_code && t.is_active)
      : null;
    const confirmed = await ModalManager.confirm({
      title: `${nextState ? 'Activar' : 'Desactivar'} template`,
      message: nextState && currentActive
        ? `Activar "${template.template_name}" desactivará el template vigente actual: "${currentActive.template_name}" (${currentActive.version}). Solo puede haber un template activo por tipo.`
        : `¿Confirmas que deseas ${nextState ? 'activar' : 'desactivar'} "${template.template_name}"?`,
      buttons: { cancel: 'Cancelar', confirm: nextState ? 'Activar' : 'Desactivar' },
    });
    if (!confirmed) return;
    await notifyPromise(
      printService.updateTemplate(template.id, { is_active: nextState }),
      {
        loading: 'Actualizando...',
        success: nextState ? 'Template activado' : 'Template desactivado',
        error: (e) => getBackendMessage(e) || 'Error',
      },
    );
    await load();
  };

  const kpiItems = useMemo(() => [
    { label: 'Templates totales',  value: templates.length },
    { label: 'Activos',            value: templates.filter((t) => t.is_active).length },
    { label: 'Tipos configurados', value: new Set(templates.filter((t) => t.is_active).map((t) => t.template_code)).size },
  ], [templates]);

  const columns = [
    {
      id: 'template_code',
      label: 'Tipo',
      render: (t) => (
        <div>
          <p className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{t.template_code}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t.template_name}</p>
        </div>
      ),
    },
    {
      id: 'version',
      label: 'Versión',
      render: (t) => (
        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          v{t.version}
        </span>
      ),
    },
    {
      id: 'paper_width_mm',
      label: 'Papel',
      render: (t) => <span className="text-sm text-slate-600 dark:text-slate-400">{t.paper_width_mm} mm</span>,
    },
    {
      id: 'is_active',
      label: 'Estado',
      render: (t) => <StatusBadge variant={t.is_active ? 'active' : 'inactive'}>{t.is_active ? 'Activo' : 'Inactivo'}</StatusBadge>,
    },
    {
      id: 'updated_at',
      label: 'Última actualización',
      render: (t) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(t.updated_at)}</span>,
    },
    {
      id: 'actions',
      label: 'Acciones',
      align: 'right',
      render: (t) => (
        <div className="flex items-center justify-end gap-1">
          <RowActionButton
            icon={t.is_active ? EyeOff : CheckCircle2}
            label={t.is_active ? 'Desactivar' : 'Activar'}
            onClick={() => handleToggleActive(t)}
            variant={t.is_active ? 'warning' : 'success'}
          />
          <RowActionButton icon={Pencil} label="Editar" onClick={() => openModal(t)} />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <ModuleHeader
        title="Templates de impresión"
        description="Define el formato de cada tipo de ticket térmico. El agente descarga el template activo automáticamente."
        actions={[{ label: 'Nuevo template', icon: Plus, onClick: () => openModal() }]}
      />

      <KpiBar items={kpiItems} />

      <DataTable
        columns={columns}
        data={templates}
        loading={loading}
        emptyMessage="No hay templates configurados. Crea uno para cada tipo de ticket."
        getRowKey={(t) => t.id}
      />
    </div>
  );
}
