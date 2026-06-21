import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckSquare, Eye, RefreshCcw, RotateCcw, Search, Shuffle } from 'lucide-react';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import DataTable from '@/components/common/data/DataTable';
import StatusBadge from '@/components/common/data/StatusBadge';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import ReturnActionModal from './ReturnActionModal';
import ModalManager from '@/components/ui/modal';
import SaleDetailModal from '@/components/sales/SaleDetailModal';
import { salesDocumentsService } from '@/services/sales/salesDocumentsService';
import { documentConfigService } from '@/services/admin/documentConfigService';
import { getBackendMessage, toast } from '@/services/ui/notify';

const fieldClassName = 'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';

const TYPE_PREFIX = {
  TICKET:       'TKT-',
  BOLETA:       'BOL-',
  SALE_INVOICE: 'FAC-',
  MANUAL_39:    'BOL-',
  MANUAL_33:    'FAC-',
  MANUAL_61:    'NC-',
  DTE_33:       'F-',
  DTE_34:       'FE-',
  DTE_39:       'B-',
  DTE_41:       'BE-',
  DTE_61:       'NC-',
  DTE_56:       'ND-',
  PRE_SALE:     'PRV-',
};
const getPrefix = (code) => TYPE_PREFIX[code] ?? '';

const UNIT_STATUS = {
  SOLD:      { label: 'Vendido',   variant: 'active' },
  RETURNED:  { label: 'Devuelto',  variant: 'warning' },
  EXCHANGED: { label: 'Cambiado',  variant: 'info' },
};
const unitStatus = (status) => UNIT_STATUS[status] ?? { label: status, variant: 'inactive' };

const SALE_STATUS = {
  CLOSED:          { label: 'Cerrado',   variant: 'active' },
  CANCELLED:       { label: 'Anulado',   variant: 'danger' },
  PENDING_CASHIER: { label: 'Pendiente', variant: 'warning' },
};
const saleStatus = (status) => SALE_STATUS[status] ?? { label: status, variant: 'inactive' };

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

const isExchangeCreditItem = (item) => (
  Number(item?.unit_price || 0) < 0
  || String(item?.name || item?.product_name || '').toLowerCase().includes('credito por cambio')
);

const exchangeDestinationSummary = (document) => {
  const destinationItems = (document?.items || []).filter((item) => !isExchangeCreditItem(item));
  if (destinationItems.length === 0) return '';
  return destinationItems
    .map((item) => `${item.name}${Number(item.quantity || 0) > 1 ? ` x${item.quantity}` : ''}`)
    .join(', ');
};

const SalesReturns = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [documentTypes, setDocumentTypes] = useState([]);
  const [documentTypeCode, setDocumentTypeCode] = useState('');
  const [folio, setFolio] = useState('');
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState('RETURN');
  const [selectedUnitIds, setSelectedUnitIds] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [relatedDocuments, setRelatedDocuments] = useState({});
  const [detailSale, setDetailSale] = useState(null);

  useEffect(() => {
    documentConfigService.listTypes({ active_only: true }).then((allTypes) => {
      const saleTypes = (allTypes || [])
        .filter((t) => t.document_category === 'SALE' && t.movement_type === 'OUT')
        .map((t) => ({ code: t.document_type_code, name: t.document_type_name }));
      setDocumentTypes(saleTypes);
      const ticket = saleTypes.find((t) => t.code === 'TICKET');
      setDocumentTypeCode(ticket ? ticket.code : saleTypes[0]?.code ?? '');
    }).catch(() => {});
  }, []);

  // Pre-load sale when navigated from CustomerSalesPage with ?sale_code=&action=
  useEffect(() => {
    const saleCode   = searchParams.get('sale_code');
    const actionParam = searchParams.get('action');
    if (!saleCode) return;
    setActionType(actionParam === 'EXCHANGE' ? 'EXCHANGE' : 'RETURN');
    setLoading(true);
    salesDocumentsService.getByCode(saleCode)
      .then((loadedSale) => {
        setSale(loadedSale);
        setSelectedUnitIds([]);
        const dtCode = loadedSale.document_type_code;
        if (dtCode) setDocumentTypeCode(dtCode);
        if (loadedSale.ticket_number) {
          const prefix = getPrefix(dtCode ?? '');
          setFolio(
            loadedSale.ticket_number.startsWith(prefix)
              ? loadedSale.ticket_number.slice(prefix.length)
              : loadedSale.ticket_number,
          );
        }
      })
      .catch(() => toast.error('No fue posible cargar el documento indicado.'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const units = useMemo(() => (
    (sale?.items || []).flatMap((line) => (line.units || []).map((unit) => ({
      ...unit,
      line_id: line.id,
      product: line.name,
      code: line.code,
      related_document: relatedDocuments[unit.return_reference] || null,
    })))
  ), [relatedDocuments, sale]);

  const referenceKey = useMemo(() => {
    const references = (sale?.items || [])
      .flatMap((line) => line.units || [])
      .map((unit) => unit.return_reference)
      .filter(Boolean);
    return [...new Set(references)].sort().join('|');
  }, [sale]);

  useEffect(() => {
    if (!referenceKey) {
      setRelatedDocuments({});
      return undefined;
    }
    let ignore = false;
    const references = referenceKey.split('|').filter(Boolean);
    Promise.all(references.map(async (reference) => {
      try {
        const document = await salesDocumentsService.getByCode(reference);
        return [reference, document];
      } catch {
        return [reference, null];
      }
    })).then((entries) => {
      if (ignore) return;
      setRelatedDocuments(Object.fromEntries(entries));
    });
    return () => { ignore = true; };
  }, [referenceKey]);

  const fullTicket = () => `${getPrefix(documentTypeCode)}${folio.trim()}`;

  const searchSale = async () => {
    if (!folio.trim()) { toast.error('Ingresa el folio del documento.'); return; }
    setLoading(true);
    try {
      setSale(await salesDocumentsService.findByTicket(fullTicket()));
      setRelatedDocuments({});
      setSelectedUnitIds([]);
    } catch (err) {
      setSale(null);
      setRelatedDocuments({});
      setSelectedUnitIds([]);
      toast.error(getBackendMessage(err, 'No fue posible encontrar el documento.'));
    } finally {
      setLoading(false);
    }
  };

  const selectedUnits = useMemo(
    () => units.filter((unit) => selectedUnitIds.includes(unit.id)),
    [selectedUnitIds, units],
  );

  const selectedTotal = useMemo(
    () => selectedUnits.reduce((sum, unit) => sum + Number(unit.paid_amount || 0), 0),
    [selectedUnits],
  );

  const toggleUnit = (unit) => {
    if (unit.status !== 'SOLD') return;
    setSelectedUnitIds((current) => (
      current.includes(unit.id)
        ? current.filter((id) => id !== unit.id)
        : [...current, unit.id]
    ));
  };

  const confirmAction = async (reason) => {
    try {
      const result = await salesDocumentsService.registerReturn({
        sale_line_unit_ids: selectedUnitIds,
        action_type: actionType,
        reason: reason || null,
      });
      toast.success(`${actionType === 'RETURN' ? 'Devolucion' : 'Cambio'} generado por ${money(result.amount)}.`);
      setShowConfirm(false);
      setSelectedUnitIds([]);
      if (result.action_url) {
        navigate(result.action_url);
        return;
      }
      setSale(await salesDocumentsService.findByTicket(fullTicket()));
    } catch (err) {
      toast.error(getBackendMessage(err, 'No fue posible generar la operacion.'));
      throw err;
    }
  };

  const reloadSale = async () => {
    if (!sale) return;
    try {
      const refreshed = sale.ticket_number
        ? await salesDocumentsService.findByTicket(sale.ticket_number)
        : await salesDocumentsService.get(sale.id);
      setSale(refreshed);
      setRelatedDocuments({});
      setSelectedUnitIds([]);
    } catch (err) {
      toast.error(getBackendMessage(err, 'No fue posible actualizar el documento.'));
    }
  };

  const resumeDraft = (unit) => {
    if (!unit.return_reference) return;
    if (unit.related_document && unit.related_document.status !== 'PENDING_CASHIER') {
      setDetailSale(unit.related_document);
      return;
    }
    navigate(unit.status === 'EXCHANGED'
      ? `/sales/new?edit=${unit.return_reference}`
      : `/cash/pos?saleId=${unit.return_reference}`);
  };

  const cancelDraft = async (unit) => {
    if (!unit.return_reference) return;
    const actionLabel = unit.status === 'EXCHANGED' ? 'cambio' : 'devolucion';
    if (!await ModalManager.confirm({
      title: `Cancelar ${actionLabel} pendiente`,
      message: `Se eliminará el borrador ${unit.return_reference} y la unidad volverá a quedar disponible para cambio o devolución.`,
      buttons: { cancel: 'Mantener', confirm: 'Cancelar borrador' },
    })) return;
    try {
      const draft = await salesDocumentsService.getByCode(unit.return_reference);
      if (draft.status !== 'PENDING_CASHIER') {
        toast.error('El borrador ya no está pendiente de caja y no se puede cancelar desde aquí.');
        await reloadSale();
        return;
      }
      await salesDocumentsService.deletePending(draft.id);
      toast.success('Borrador cancelado. La unidad quedó disponible nuevamente.');
      await reloadSale();
    } catch (err) {
      toast.error(getBackendMessage(err, 'No fue posible cancelar el borrador.'));
    }
  };

  const reset = () => { setFolio(''); setSale(null); setRelatedDocuments({}); setSelectedUnitIds([]); };

  const docStatus = sale ? saleStatus(sale.status) : null;

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Cambio y devoluciones"
        description="Selecciona el tipo de documento, ingresa el folio y registra el cambio o devolucion por unidad."
      />

      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 lg:grid-cols-[minmax(14rem,20rem)_minmax(10rem,16rem)_auto]">
          <div className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Tipo de documento</span>
            <select
              className={fieldClassName}
              value={documentTypeCode}
              onChange={(e) => { setDocumentTypeCode(e.target.value); setFolio(''); setSale(null); }}
            >
              {documentTypes.map((t) => (
                <option key={t.code} value={t.code}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Folio</span>
            <div className="flex h-10 overflow-hidden rounded-md border border-slate-300 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus-within:border-blue-500 dark:focus-within:ring-blue-950">
              {getPrefix(documentTypeCode) && (
                <span className="flex select-none items-center border-r border-slate-200 bg-slate-50 px-3 font-mono text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                  {getPrefix(documentTypeCode)}
                </span>
              )}
              <input
                className="h-full flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-slate-400"
                value={folio}
                onChange={(e) => { setFolio(e.target.value); setSale(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') searchSale(); }}
                placeholder="Folio"
              />
            </div>
          </div>

          <div className="flex items-end">
            <ActionButton label={loading ? 'Buscando...' : 'Buscar'} icon={Search} onClick={searchSale} disabled={loading || !folio.trim()} />
          </div>
        </div>
      </div>

      {sale && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Documento</p>
              <p className="font-semibold">{sale.document_type_name} · {sale.ticket_number}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Cliente</p>
              <p className="font-semibold">{customerName(sale.customer)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total pagado</p>
              <p className="font-semibold tabular-nums">{money(sale.total_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Estado</p>
              <StatusBadge variant={docStatus.variant}>{docStatus.label}</StatusBadge>
            </div>
          </div>

          <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[1fr_auto]">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActionType('RETURN')}
                className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition ${actionType === 'RETURN' ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-200' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'}`}
              >
                <RotateCcw className="h-4 w-4" />
                Devolucion
              </button>
              <button
                type="button"
                onClick={() => setActionType('EXCHANGE')}
                className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition ${actionType === 'EXCHANGE' ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-200' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'}`}
              >
                <Shuffle className="h-4 w-4" />
                Cambio
              </button>
              <div className="text-sm text-slate-500">
                {selectedUnitIds.length} unidad(es) seleccionada(s) · credito {money(selectedTotal)}
              </div>
            </div>
            <ActionButton
              label={actionType === 'RETURN' ? 'Generar ticket de devolucion' : 'Generar cambio'}
              icon={actionType === 'RETURN' ? RotateCcw : Shuffle}
              onClick={() => setShowConfirm(true)}
              disabled={selectedUnitIds.length === 0}
            />
          </div>

          <DataTable
            data={units}
            getRowKey={(row) => row.id}
            emptyMessage="No hay unidades disponibles para este documento."
            columns={[
              {
                id: 'select',
                label: '',
                align: 'center',
                render: (item) => (
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={selectedUnitIds.includes(item.id)}
                    onChange={() => toggleUnit(item)}
                    disabled={item.status !== 'SOLD'}
                  />
                ),
              },
              {
                id: 'product',
                label: 'Producto',
                render: (item) => {
                  const destination = exchangeDestinationSummary(item.related_document);
                  return (
                    <div>
                      <div className="font-medium">{item.product}</div>
                      <div className="font-mono text-xs text-slate-500">{item.code || '—'} · Unidad {item.unit_sequence}</div>
                      {destination && (
                        <div className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-300">
                          Cambiado por: {destination}
                        </div>
                      )}
                      {item.return_reference && !item.related_document && (
                        <div className="mt-1 text-xs text-slate-500">Referencia: {item.return_reference}</div>
                      )}
                    </div>
                  );
                },
              },
              {
                id: 'paid_amount',
                label: 'Pagado exacto',
                align: 'right',
                render: (item) => <span className="font-semibold tabular-nums">{money(item.paid_amount)}</span>,
              },
              {
                id: 'status',
                label: 'Estado',
                align: 'center',
                render: (item) => {
                  const s = unitStatus(item.status);
                  return <StatusBadge variant={s.variant}>{s.label}</StatusBadge>;
                },
              },
              {
                id: 'actions',
                label: 'Acciones',
                align: 'center',
                render: (item) => {
                  const hasReference = Boolean(item.return_reference);
                  const referenceLoaded = Boolean(item.related_document);
                  const isPendingReference = referenceLoaded && item.related_document.status === 'PENDING_CASHIER';
                  const isClosedReference = referenceLoaded && item.related_document.status !== 'PENDING_CASHIER';
                  const isSelected = selectedUnitIds.includes(item.id);
                  return (
                    <div className="flex justify-center gap-2">
                      <RowActionButton
                        label={isSelected ? 'Quitar seleccion' : 'Seleccionar'}
                        icon={isSelected ? RefreshCcw : CheckSquare}
                        variant={isSelected ? 'neutral' : undefined}
                        onClick={() => toggleUnit(item)}
                        disabled={item.status !== 'SOLD'}
                      />
                      <RowActionButton
                        label="Retomar borrador"
                        icon={item.status === 'RETURNED' ? RotateCcw : Shuffle}
                        onClick={() => resumeDraft(item)}
                        disabled={!hasReference || !isPendingReference}
                      />
                      <RowActionButton
                        label="Cancelar borrador"
                        icon={RefreshCcw}
                        variant="danger"
                        onClick={() => cancelDraft(item)}
                        disabled={!hasReference || !isPendingReference}
                      />
                      <RowActionButton
                        label="Ver documento asociado"
                        icon={Eye}
                        onClick={() => setDetailSale(item.related_document)}
                        disabled={!hasReference || !isClosedReference}
                      />
                    </div>
                  );
                },
              },
            ]}
          />

          <ActionButton label="Buscar otro documento" icon={RefreshCcw} variant="neutral" onClick={reset} />
        </div>
      )}

      {showConfirm && (
        <ReturnActionModal
          units={selectedUnits}
          amount={selectedTotal}
          actionType={actionType}
          onConfirm={confirmAction}
          onClose={() => setShowConfirm(false)}
        />
      )}
      {detailSale && (
        <SaleDetailModal
          sale={detailSale}
          title={detailSale.document_type_code === 'EXCHANGE_DRAFT' ? 'Detalle de cambio' : 'Detalle de documento'}
          onClose={() => setDetailSale(null)}
        />
      )}
    </section>
  );
};

export default SalesReturns;
