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
  { code: 'TICKET_VENTA',  label: 'Ticket de Venta'  },
  { code: 'TICKET_CAMBIO', label: 'Ticket de Cambio' },
  { code: 'TICKET_PRUEBA', label: 'Ticket de Prueba' },
];

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
  const isCambio = templateCode === 'TICKET_CAMBIO';
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
            <div className="mb-1 flex items-center justify-center rounded border border-dashed border-slate-300 py-3 text-[9px] uppercase tracking-widest text-slate-400">
              [ BANNER ]
            </div>
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

          {/* TICKET NUMBER */}
          <p className="text-center font-bold">{isCambio ? 'CAMBIO DE PRODUCTO' : 'BOLETA'} #{SAMPLE.ticket_number}</p>
          <p className="my-1 text-slate-300">{divider}</p>

          {isCambio ? (
            <>
              {/* DEVUELTO */}
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
                      {body.show_unit_price && (
                        <p className="text-slate-500">  {item.qty} x {clp(item.unit_price)}</p>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* RECIBIDO */}
              <p className="my-0.5 text-slate-300">{divider}</p>
              {body.show_received_section && (
                <p className="text-center font-bold text-[9px] uppercase">Recibido</p>
              )}
              <p className="my-0.5 text-slate-300">{divider}</p>
              {SAMPLE_CAMBIO.received_items.map((item, i) => (
                <div key={i} className="mb-1">
                  <div className="flex justify-between gap-1">
                    <span className="flex-1 truncate font-medium">{item.name}</span>
                    <span className="shrink-0">{clp(item.total)}</span>
                  </div>
                  {body.show_unit_price && (
                    <p className="text-slate-500">  {item.qty} x {clp(item.unit_price)}</p>
                  )}
                  {body.show_discount && item.discount > 0 && (
                    <p className="text-slate-500">  Desc: -{clp(item.discount)}</p>
                  )}
                </div>
              ))}
            </>
          ) : (
            /* ITEMS normales */
            SAMPLE.items.map((item, i) => (
              <div key={i} className="mb-1">
                <div className="flex justify-between gap-1">
                  <span className="flex-1 truncate font-medium">{item.name}</span>
                  <span className="shrink-0">{clp(item.total)}</span>
                </div>
                {body.show_unit_price && (
                  <p className="text-slate-500">  {item.qty} x {clp(item.unit_price)}</p>
                )}
                {body.show_discount && item.discount > 0 && (
                  <p className="text-slate-500">  Desc: -{clp(item.discount)}</p>
                )}
              </div>
            ))
          )}

          <p className="my-1 text-slate-300">{divider}</p>

          {/* FOOTER TOTALS */}
          {isCambio ? (
            <>
              {footer.show_subtotal && (
                <Row left="Subtotal recibido:" right={clp(SAMPLE_CAMBIO.subtotal)} />
              )}
              {footer.show_tax && (
                <Row left="IVA (19%):" right={clp(SAMPLE_CAMBIO.tax)} />
              )}
              <Row left="Crédito devuelto:" right={`-${clp(SAMPLE_CAMBIO.exchange_credit)}`} className="text-slate-600" />
              {footer.show_total && (
                <Row left="TOTAL:" right="Sin cobro adicional" className="font-bold" />
              )}
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
          {footer.show_agreement && SAMPLE.agreement && (
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
          {footer.show_email && SAMPLE.receipt_email && (
            <>
              <p className="my-1 text-slate-300">{divider}</p>
              <p className="text-center text-[9px] text-slate-500">{SAMPLE.receipt_email}</p>
            </>
          )}

          {/* BARCODE */}
          {footer.show_barcode && (
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
          {footer.footer_message && (
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
  const [content, setContent] = useState(() => ({
    header: { ...DEFAULT_CONTENT.header, ...(initialValues?.content?.header || {}) },
    body:   { ...DEFAULT_CONTENT.body,   ...(initialValues?.content?.body   || {}) },
    footer: { ...DEFAULT_CONTENT.footer, ...(initialValues?.content?.footer || {}) },
  }));
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
            <span className="font-medium text-slate-700 dark:text-slate-300">Tipo de ticket</span>
            {isEdit ? (
              <div className={`${fieldClassName} flex items-center bg-slate-50 text-slate-500 dark:bg-slate-900`}>{templateCode}</div>
            ) : (
              <select className={selectClassName} value={templateCode} onChange={(e) => {
                const found = TICKET_TYPES.find((t) => t.code === e.target.value);
                setTemplateCode(e.target.value);
                if (found && !templateName) setTemplateName(found.label);
              }} required>
                <option value="">Seleccionar tipo...</option>
                {TICKET_TYPES.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
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
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Cuerpo — Productos</p>
            <div className="space-y-0.5">
              <ToggleField label="Precio unitario"     checked={content.body.show_unit_price} onChange={(v) => setBody('show_unit_price', v)} />
              <ToggleField label="Descuento por línea" checked={content.body.show_discount}   onChange={(v) => setBody('show_discount', v)} />
              {templateCode === 'TICKET_CAMBIO' && (
                <>
                  <ToggleField label="Sección Devuelto"   checked={content.body.show_credit_section}   onChange={(v) => setBody('show_credit_section', v)} />
                  <ToggleField label="Etiqueta Recibido"  checked={content.body.show_received_section} onChange={(v) => setBody('show_received_section', v)} />
                </>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Pie — Totales</p>
            <div className="space-y-0.5">
              <ToggleField label="Subtotal (neto)"    checked={content.footer.show_subtotal}        onChange={(v) => setFooter('show_subtotal', v)} />
              <ToggleField label="IVA (19%)"          checked={content.footer.show_tax}             onChange={(v) => setFooter('show_tax', v)} />
              <ToggleField label="Descuentos"         checked={content.footer.show_discounts}       onChange={(v) => setFooter('show_discounts', v)} />
              <ToggleField label="Total a pagar"      checked={content.footer.show_total}           onChange={(v) => setFooter('show_total', v)} />
              <ToggleField label="Método de pago"         checked={content.footer.show_payment_method}    onChange={(v) => setFooter('show_payment_method', v)} />
              <ToggleField label="Detalle pagos mixtos"   checked={content.footer.show_payment_breakdown} onChange={(v) => setFooter('show_payment_breakdown', v)} />
              <ToggleField label="Vuelto"                 checked={content.footer.show_change}            onChange={(v) => setFooter('show_change', v)} />
              <ToggleField label="Datos convenio"         checked={content.footer.show_agreement}         onChange={(v) => setFooter('show_agreement', v)} />
              <ToggleField label="Email cliente"          checked={content.footer.show_email}             onChange={(v) => setFooter('show_email', v)} />
              <ToggleField label="Código de barras"       checked={content.footer.show_barcode}           onChange={(v) => setFooter('show_barcode', v)} />
            </div>
          </div>
        </div>

        {/* Barcode + activo (fila 1) | Compatibilidad (fila 2) | Mensaje de pie (fila 3) */}
        <div className="grid grid-cols-3 gap-3">
          {/* Fila 1, col 1: campo barcode (solo si está activo) */}
          {content.footer.show_barcode ? (
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Campo del barcode</span>
              <select className={selectClassName} value={content.footer.barcode_field} onChange={(e) => setFooter('barcode_field', e.target.value)}>
                {BARCODE_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label} — {f.example}</option>
                ))}
              </select>
            </label>
          ) : <div />}

          {/* Fila 1, col 2: tipo barcode (solo si está activo) */}
          {content.footer.show_barcode ? (
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
          {content.footer.show_barcode && (() => {
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

          {/* Fila 3: Mensaje de pie — ocupa las 3 columnas */}
          <label className="col-span-3 space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Mensaje de pie</span>
            <textarea className={textareaClassName} rows={2} value={content.footer.footer_message} onChange={(e) => setFooter('footer_message', e.target.value)} placeholder="Ej: Gracias por su compra." maxLength={200} />
            <span className="text-xs text-slate-400">{content.footer.footer_message.length}/200</span>
          </label>
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
    const confirmed = await ModalManager.confirm({
      title: `${nextState ? 'Activar' : 'Desactivar'} template`,
      message: `¿Confirmas que deseas ${nextState ? 'activar' : 'desactivar'} "${template.template_name}"?`,
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
