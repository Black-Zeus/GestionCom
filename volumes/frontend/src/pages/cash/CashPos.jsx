/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Banknote, Building2, CheckCircle2, ClipboardList, CreditCard, Eye, Mail, Percent, Receipt, RefreshCcw, Repeat2, ShoppingCart, SplitSquareHorizontal, Trash2, Users, Wallet, XCircle } from 'lucide-react';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import BottomActionBar from '@/components/common/actions/BottomActionBar';
import DataTable from '@/components/common/data/DataTable';
import StatusBadge from '@/components/common/data/StatusBadge';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import ModalManager from '@/components/ui/modal';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import { salesDocumentsService } from '@/services/sales/salesDocumentsService';
import { agreementsService } from '@/services/sales/agreementsService';
import { documentConfigService } from '@/services/admin/documentConfigService';
import { paymentMethodsService } from '@/services/admin/paymentMethodsService';
import { currencyRatesService } from '@/services/admin/currencyRatesService';
import { cashSessionsService } from '@/services/cash/cashSessionsService';
import { getBackendMessage, toast } from '@/services/ui/notify';
import { useSessionStore } from '@/store/useSessionStore';

const fieldClassName = 'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';

const money = (value) => Number(value || 0).toLocaleString('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const currencyDecimals = (currencyCode = 'CLP') => (['CLP', 'PYG', 'JPY'].includes(currencyCode) ? 0 : 2);

const formatMoney = (value, currencyCode = 'CLP') => {
  const decimals = currencyDecimals(currencyCode);
  return Number(value || 0).toLocaleString('es-CL', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const roundCurrencyAmount = (value, currencyCode = 'CLP') => {
  const factor = 10 ** currencyDecimals(currencyCode);
  return Math.round((Number(value) || 0) * factor) / factor;
};

const parseLocalizedAmount = (value) => {
  if (typeof value === 'number') return value;
  const text = String(value || '').trim().replace(/[^\d.,-]/g, '');
  if (!text) return 0;
  let normalized = text;
  if (normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.includes('.')) {
    const parts = normalized.split('.');
    if (parts.length > 1 && parts.slice(1).every((part) => part.length === 3)) {
      normalized = parts.join('');
    }
  }
  return Number(normalized) || 0;
};

const rawAmount = (value) => {
  const number = parseLocalizedAmount(value);
  return number ? String(number) : '';
};

const formatAmountForInput = (value, currencyCode = 'CLP') => {
  const number = parseLocalizedAmount(value);
  if (!number) return '';
  return formatMoney(number, currencyCode);
};

const focusAmountInput = (event, setter) => {
  setter(rawAmount(event.target.value));
  requestAnimationFrame(() => event.target.select());
};

const rateValue = (rate) => Number(rate?.effective_rate || rate?.rate_value || 0);
const marketRateValue = (rate) => Number(rate?.rate_value || 0);
const feeValue = (rate) => Number(rate?.fee_pct || 0);

const convertFromBase = (amount, rate) => {
  const value = rateValue(rate);
  return value > 0 ? Number(amount || 0) / value : 0;
};

const convertToBase = (amount, rate) => Number(amount || 0) * rateValue(rate);

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

const TICKET_CODE = 'TICKET';

const AUTO_DOCUMENT_PREFIX = {
  TICKET: 'TKT',
  BOLETA: 'BOL',
  MANUAL_39: 'BOL',
  MANUAL_33: 'FAC',
  MANUAL_61: 'NC',
  RETURN_TICKET: 'DEV',
  EXCHANGE_DRAFT: 'CMB',
};

const isDteDocument = (documentTypeCode = '') => String(documentTypeCode || '').startsWith('DTE_');

const generateTicketNumber = (documentTypeCode = TICKET_CODE) => {
  if (isDteDocument(documentTypeCode)) return '0';
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const prefix = AUTO_DOCUMENT_PREFIX[documentTypeCode] || String(documentTypeCode || 'DOC').replace(/[^A-Z0-9]+/gi, '_').slice(0, 10) || 'DOC';
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
const METHOD_ICON_NAMES = {
  banknote: Banknote,
  'credit-card': CreditCard,
  receipt: Receipt,
  'repeat-2': Repeat2,
  'split-square-horizontal': SplitSquareHorizontal,
  'clipboard-list': ClipboardList,
  'building-2': Building2,
};
const DIRECT_METHOD_RANK = {
  CASH: 10,
  DEBIT: 20,
  FOREIGN_CURRENCY: 30,
};
const MAX_MIXED_PAYMENTS = 3;
const inputCls = 'h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-blue-500';
const compactInputCls = inputCls.replace('h-11', 'h-10');

const isCheckMethod = (method) => {
  const code = String(method?.method_code || '').toUpperCase();
  const name = String(method?.method_name || '').toLowerCase();
  return code === 'CHECK' || code === 'POSTDATED_CHECK' || name.includes('cheque');
};

const isAgreementMethod = (method) => {
  const code = String(method?.method_code || '').toUpperCase();
  const name = String(method?.method_name || '').toLowerCase();
  return code === 'CONVENIO' || name.includes('convenio');
};

const requiresPaymentReference = (method) => {
  if (!method || ['CASH', 'FOREIGN_CURRENCY', 'MIXED'].includes(method.method_code)) return false;
  if (isCheckMethod(method)) return false;
  if (isAgreementMethod(method)) return false;
  return true;
};

const paymentReferenceCopy = (method) => {
  const code = String(method?.method_code || '').toUpperCase();
  const type = String(method?.method_type || '').toUpperCase();
  if (type === 'CARD') {
    return {
      label: 'Voucher / codigo autorizacion',
      placeholder: 'Numero de voucher o codigo de autorizacion',
      type: 'CARD_RECEIPT',
    };
  }
  if (type === 'TRANSFER' || code === 'WIRE_TRANSFER' || code === 'TRANSFER') {
    return {
      label: 'Folio transferencia',
      placeholder: 'Folio, operacion o comprobante bancario',
      type: 'TRANSFER_RECEIPT',
    };
  }
  if (code === 'VOUCHER') {
    return {
      label: 'Numero vale vista',
      placeholder: 'Numero o folio del vale vista',
      type: 'VOUCHER_RECEIPT',
    };
  }
  if (code === 'GIFT_CARD') {
    return {
      label: 'Codigo tarjeta regalo',
      placeholder: 'Codigo o folio de la tarjeta regalo',
      type: 'GIFT_CARD_RECEIPT',
    };
  }
  if (code === 'STORE_CREDIT' || code === 'CREDIT_TERMS') {
    return {
      label: 'Folio credito',
      placeholder: 'Folio, autorizacion o cuenta asociada',
      type: 'CREDIT_RECEIPT',
    };
  }
  if (code === 'PROMISSORY_NOTE') {
    return {
      label: 'Numero pagare',
      placeholder: 'Numero o folio del pagare',
      type: 'PROMISSORY_NOTE_RECEIPT',
    };
  }
  return {
    label: 'Folio comprobante / transaccion',
    placeholder: 'Voucher, autorizacion o folio',
    type: 'PAYMENT_REFERENCE',
  };
};

const emptyCheckDetails = {
  bank_name: '',
  check_number: '',
  holder_name: '',
  holder_tax_id: '',
  due_date: '',
};

const emptyAgreementDetails = {
  agreement_type: 'CREDIT',
  agreement_id: '',
  agreement_beneficiary_id: '',
  organization_name: '',
  associate_name: '',
  associate_identifier: '',
  reference_number: '',
  agreement_benefit_amount: 0,
  agreement_single_purchase: true,
  beneficiary_benefit_amount: null,
  beneficiary_interactions_count: 0,
  beneficiary_consumed_amount: 0,
};

const emptyAgreementDiscount = {
  enabled: false,
  agreement_id: '',
  agreement_beneficiary_id: '',
  organization_name: '',
  associate_name: '',
  associate_identifier: '',
  reference_number: '',
  discount_percent: '',
};

const AgreementCreditSelector = ({ agreements = [], value = {}, onChange }) => {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loadingBeneficiaries, setLoadingBeneficiaries] = useState(false);

  const creditAgreements = useMemo(
    () => agreements.filter((item) => item.agreement_type === 'CREDIT' && item.is_active !== false),
    [agreements],
  );
  const agreementOptions = useMemo(
    () => creditAgreements.map((item) => ({ value: String(item.id), label: `${item.agreement_name} — ${item.company_name}` })),
    [creditAgreements],
  );

  const agreementId = value.agreement_id || '';
  const beneficiaryId = value.agreement_beneficiary_id || '';

  useEffect(() => {
    if (!agreementId) { setBeneficiaries([]); return; }
    setLoadingBeneficiaries(true);
    agreementsService.listBeneficiaries(agreementId)
      .then(setBeneficiaries)
      .catch(() => setBeneficiaries([]))
      .finally(() => setLoadingBeneficiaries(false));
  }, [agreementId]);

  const beneficiaryOptions = useMemo(
    () => beneficiaries
      .filter((item) => item.is_active !== false)
      .map((item) => ({ value: String(item.id), label: `${item.beneficiary_identifier} — ${item.beneficiary_name}` })),
    [beneficiaries],
  );

  const handleAgreementChange = (newId) => {
    const agreement = creditAgreements.find((item) => String(item.id) === newId);
    onChange({
      ...value,
      agreement_id: newId || '',
      agreement_beneficiary_id: '',
      organization_name: agreement?.company_name || '',
      associate_name: '',
      associate_identifier: '',
      agreement_benefit_amount: Number(agreement?.benefit_amount || 0),
      agreement_single_purchase: agreement?.single_purchase !== false,
      beneficiary_benefit_amount: null,
    });
  };

  const handleBeneficiaryChange = (newId) => {
    const beneficiary = beneficiaries.find((item) => String(item.id) === newId);
    onChange({
      ...value,
      agreement_beneficiary_id: newId || '',
      associate_name: beneficiary?.beneficiary_name || '',
      associate_identifier: beneficiary?.beneficiary_identifier || '',
      beneficiary_benefit_amount: beneficiary?.benefit_amount != null ? Number(beneficiary.benefit_amount) : null,
      beneficiary_interactions_count: Number(beneficiary?.interactions_count || 0),
      beneficiary_consumed_amount: Number(beneficiary?.consumed_amount || 0),
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Convenio</span>
          <AutocompleteSelect value={agreementId} onChange={handleAgreementChange} options={agreementOptions} placeholder="Seleccionar convenio" searchPlaceholder="Buscar convenio..." clearable />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Beneficiario</span>
          <AutocompleteSelect
            value={beneficiaryId}
            onChange={handleBeneficiaryChange}
            options={beneficiaryOptions}
            placeholder={loadingBeneficiaries ? 'Cargando...' : (agreementId ? 'Seleccionar beneficiario' : 'Primero selecciona un convenio')}
            searchPlaceholder="Buscar por RUT o nombre..."
            disabled={!agreementId || loadingBeneficiaries}
            clearable
          />
        </label>
      </div>
    </div>
  );
};

const PaymentModal = ({ total, exchangeRates = [], preferredCurrencyCode = '', initialEmail = '', agreements = [], onConfirm, onClose }) => {
  const [step, setStep] = useState(1);
  const [paymentMode, setPaymentMode] = useState('DIRECT');
  const [methods, setMethods] = useState([]);
  const [selected, setSelected] = useState(null);
  const [importe, setImporte] = useState('');
  const [foreignCurrencyCode, setForeignCurrencyCode] = useState(preferredCurrencyCode || '');
  const [foreignReceived, setForeignReceived] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [checkDetails, setCheckDetails] = useState(emptyCheckDetails);
  const [agreementDetails, setAgreementDetails] = useState(emptyAgreementDetails);
  const [mixedPayments, setMixedPayments] = useState([{ method_code: 'CASH', amount: '' }]);
  const [email, setEmail] = useState(initialEmail || '');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    paymentMethodsService.list({ active_only: true })
      .then((items) => {
        const hasRegularCheck = items.some((item) => String(item.method_code || '').toUpperCase() === 'CHECK');
        const filtered = items.filter((item) => {
          const methodCode = String(item.method_code || '').toUpperCase();
          const methodName = String(item.method_name || '').toLowerCase();
          return !methodCode.startsWith('DEMO_')
            && !methodName.includes('demo')
            && !(hasRegularCheck && methodCode === 'POSTDATED_CHECK');
        });
        const normalized = [...filtered];
        if (!normalized.some((item) => item.method_code === 'FOREIGN_CURRENCY')) {
          normalized.push({ id: 'FOREIGN_CURRENCY', method_code: 'FOREIGN_CURRENCY', method_name: 'Divisa Extranjera', method_type: 'OTHER' });
        }
        if (!normalized.some((item) => item.method_code === 'MIXED')) {
          normalized.push({ id: 'MIXED', method_code: 'MIXED', method_name: 'Mixto', method_type: 'OTHER' });
        }
        setMethods(normalized);
      })
      .catch(() => {});
  }, []);

  const getMethodRank = (method) => DIRECT_METHOD_RANK[method.method_code] ?? 1000;
  const sortPaymentMethods = (items) => [...items].sort((left, right) => {
    const leftRank = getMethodRank(left);
    const rightRank = getMethodRank(right);
    if (leftRank !== rightRank) return leftRank - rightRank;
    return String(left.method_name || '').localeCompare(String(right.method_name || ''), 'es');
  });
  const mixedMethod = methods.find((method) => method.method_code === 'MIXED') || {
    id: 'MIXED',
    method_code: 'MIXED',
    method_name: 'Mixto',
    method_type: 'OTHER',
    icon_name: 'split-square-horizontal',
  };
  const directMethods = sortPaymentMethods(methods.filter((method) => method.method_code !== 'MIXED'));
  const isRefundMode = total < 0;
  const paymentMethodOptions = isRefundMode
    ? directMethods.filter((m) => m.method_type === 'CASH' || m.method_type === 'TRANSFER')
    : directMethods;
  const mixedOptionsForIndex = (index) => {
    const selectedCodes = new Set(mixedPayments.map((item, itemIndex) => (itemIndex === index ? null : item.method_code)).filter(Boolean));
    return paymentMethodOptions.filter((method) => !selectedCodes.has(method.method_code));
  };
  const defaultMixedMethodCode = (items = mixedPayments) => {
    const selectedCodes = new Set(items.map((item) => item.method_code).filter(Boolean));
    return (paymentMethodOptions.find((method) => method.method_code === 'CASH' && !selectedCodes.has(method.method_code)) || paymentMethodOptions.find((method) => !selectedCodes.has(method.method_code)) || paymentMethodOptions[0])?.method_code || 'CASH';
  };
  const newMixedPayment = (items = mixedPayments, amount = '') => ({ method_code: defaultMixedMethodCode(items), amount });

  const isCash = selected?.method_type === 'CASH';
  const isForeign = selected?.method_code === 'FOREIGN_CURRENCY';
  const isMixed = paymentMode === 'MIXED';
  const selectedIsCheck = isCheckMethod(selected);
  const selectedIsAgreement = isAgreementMethod(selected);
  const selectedRequiresReference = requiresPaymentReference(selected);
  const isRefund = total < 0;
  const isZeroAmount = Math.round(total) === 0;
  const absoluteTotal = Math.abs(total);
  const availableRates = exchangeRates.filter((rate) => rate.currency_code && rateValue(rate) > 0 && rate.currency_code !== rate.base_currency_code);
  const selectedForeignRate = availableRates.find((rate) => rate.currency_code === foreignCurrencyCode) || availableRates[0];
  const expectedForeignAmount = selectedForeignRate ? convertFromBase(absoluteTotal, selectedForeignRate) : 0;
  const expectedForeignAmountRounded = selectedForeignRate ? roundCurrencyAmount(expectedForeignAmount, selectedForeignRate.currency_code) : 0;
  const expectedForeignInput = selectedForeignRate ? formatAmountForInput(expectedForeignAmountRounded, selectedForeignRate.currency_code) : '';
  const foreignReceivedNum = parseLocalizedAmount(foreignReceived);
  const importeNum = parseLocalizedAmount(importe);
  const vuelto = isCash && !isRefund ? Math.max(importeNum - total, 0) : 0;
  const foreignReceivedSufficient = !isForeign || (foreignReceivedNum + 0.000001 >= expectedForeignAmountRounded);
  const foreignChange = isForeign && !isRefund && selectedForeignRate ? Math.max((foreignReceivedNum - expectedForeignAmountRounded) * rateValue(selectedForeignRate), 0) : 0;
  const importeInsuficiente = isCash && !isRefund && importe !== '' && importeNum < total;
  const checkAmountInsuficiente = selectedIsCheck && !isRefund && importe !== '' && importeNum < total;
  const mixedForeignRate = (item) => availableRates.find((rate) => rate.currency_code === item.currency_code) || availableRates[0] || null;
  const methodByCode = (code) => methods.find((candidate) => candidate.method_code === code);
  const mixedPaymentAmount = (item) => {
    if (item.method_code === 'FOREIGN_CURRENCY') {
      const rate = mixedForeignRate(item);
      return rate ? convertToBase(parseLocalizedAmount(item.foreign_amount), rate) : 0;
    }
    return parseLocalizedAmount(item.amount);
  };
  const mixedTotal = mixedPayments.reduce((sum, item) => sum + mixedPaymentAmount(item), 0);
  const mixedRemaining = Math.max(absoluteTotal - mixedTotal, 0);
  const referenceValid = !selectedRequiresReference || paymentReference.trim().length > 0;
  const selectedReferenceCopy = paymentReferenceCopy(selected);
  const checkDetailsValid = !selectedIsCheck || (
    checkDetails.bank_name.trim()
    && checkDetails.check_number.trim()
    && checkDetails.holder_name.trim()
    && checkDetails.holder_tax_id.trim()
    && importeNum >= total
  );
  const agreementDetailsValid = !selectedIsAgreement || (
    agreementDetails.organization_name.trim()
    && agreementDetails.associate_identifier.trim()
  );
  const agreementCredit = selectedIsAgreement && agreementDetailsValid
    ? (agreementDetails.beneficiary_benefit_amount != null ? agreementDetails.beneficiary_benefit_amount : agreementDetails.agreement_benefit_amount)
    : null;
  const agreementCreditStatus = (() => {
    if (!selectedIsAgreement || !agreementDetailsValid) return null;
    if (agreementDetails.agreement_single_purchase && agreementDetails.beneficiary_interactions_count > 0) {
      return { type: 'error', msg: 'Este beneficiario ya utilizó este convenio de compra única y no puede volver a usarlo.' };
    }
    if (agreementCredit == null || agreementCredit <= 0) return null;
    const remainingCredit = agreementCredit - (agreementDetails.beneficiary_consumed_amount || 0);
    if (remainingCredit <= 0) {
      return { type: 'error', msg: `Crédito agotado — el beneficiario consumió los ${money(agreementCredit)} disponibles.` };
    }
    const diff = remainingCredit - absoluteTotal;
    if (diff < 0) return { type: 'error', msg: `El crédito disponible (${money(remainingCredit)} de ${money(agreementCredit)}) no cubre el total. Agrega otro medio de pago o usa pago mixto para completar.` };
    if (diff === 0) return { type: 'success', msg: 'Saldado — el crédito disponible cubre exactamente el total.' };
    return agreementDetails.agreement_single_purchase
      ? { type: 'warn', msg: `El convenio cubre más de lo necesario. La diferencia de ${money(diff)} se pierde — compra única, sin crédito a favor.` }
      : { type: 'info', msg: `Quedan ${money(diff)} de crédito disponible tras esta compra.` };
  })();
  const mixedMetadataValid = mixedPayments.every((item) => {
    const method = methodByCode(item.method_code);
    const requiresReference = requiresPaymentReference(method);
    const isCheck = isCheckMethod(method);
    const isAgreement = isAgreementMethod(method);
    const details = item.check_details || {};
    const agreement = item.agreement_details || {};
    return (!requiresReference || String(item.reference_number || '').trim())
      && (!isCheck || (
        String(details.bank_name || '').trim()
        && String(details.check_number || '').trim()
        && String(details.holder_name || '').trim()
        && String(details.holder_tax_id || '').trim()
      ))
      && (!isAgreement || (
        String(agreement.organization_name || '').trim()
        && String(agreement.associate_identifier || '').trim()
      ));
  });
  const mixedValid = isMixed
    && mixedPayments.length > 0
    && mixedPayments.every((item) => item.method_code && mixedPaymentAmount(item) > 0)
    && mixedTotal >= absoluteTotal
    && mixedMetadataValid;
  const canContinue = isZeroAmount || (isMixed
    ? (isRefund || mixedValid)
    : Boolean(selected) && (
      isRefund
      || (
        referenceValid
        && checkDetailsValid
        && agreementDetailsValid
        && agreementCreditStatus?.type !== 'error'
        && (isForeign ? Boolean(selectedForeignRate) && foreignReceivedSufficient : (!isCash && !selectedIsCheck) || importeNum >= total)
      )
    ));

  useEffect(() => {
    if (!isForeign || isRefund || !expectedForeignInput) return;
    setForeignReceived(expectedForeignInput);
  }, [expectedForeignInput, isForeign, isRefund]);

  useEffect(() => {
    if (!isCash || isRefund) return;
    setImporte((current) => current || formatAmountForInput(total));
  }, [isCash, isRefund, total]);

  const updateMixedPayment = (index, field, value) => {
    setMixedPayments((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = { ...item, [field]: value };
      if (field === 'method_code' && value === 'FOREIGN_CURRENCY') {
        const rate = availableRates[0] || null;
        next.currency_code = next.currency_code || rate?.currency_code || '';
        next.foreign_amount = rate ? formatAmountForInput(convertFromBase(mixedRemaining || absoluteTotal, rate), rate.currency_code) : '';
        next.amount = '';
      }
      if (field === 'currency_code' && item.method_code === 'FOREIGN_CURRENCY') {
        const rate = availableRates.find((candidate) => candidate.currency_code === value) || null;
        next.foreign_amount = rate ? formatAmountForInput(convertFromBase(mixedRemaining || absoluteTotal, rate), rate.currency_code) : '';
      }
      if (field === 'method_code' && value !== 'FOREIGN_CURRENCY') {
        next.currency_code = '';
        next.foreign_amount = '';
      }
      if (field === 'method_code') {
        next.reference_number = '';
        next.check_details = isCheckMethod(methodByCode(value)) ? { ...emptyCheckDetails } : undefined;
        next.agreement_details = isAgreementMethod(methodByCode(value)) ? { ...emptyAgreementDetails } : undefined;
        if (isCheckMethod(methodByCode(value))) {
          next.amount = next.amount || formatAmountForInput(mixedRemaining || absoluteTotal);
        }
        if (isAgreementMethod(methodByCode(value))) {
          next.amount = next.amount || formatAmountForInput(mixedRemaining || absoluteTotal);
        }
      }
      return next;
    }));
  };

  const updateCheckDetail = (field, value) => {
    setCheckDetails((current) => ({ ...current, [field]: value }));
  };

  const updateAgreementDetail = (field, value) => {
    setAgreementDetails((current) => ({ ...current, [field]: value }));
  };

  const updateMixedCheckDetail = (index, field, value) => {
    setMixedPayments((current) => current.map((item, itemIndex) => (
      itemIndex === index
        ? { ...item, check_details: { ...emptyCheckDetails, ...(item.check_details || {}), [field]: value } }
        : item
    )));
  };

  const updateMixedAgreementDetail = (index, field, value) => {
    setMixedPayments((current) => current.map((item, itemIndex) => (
      itemIndex === index
        ? { ...item, agreement_details: { ...emptyAgreementDetails, ...(item.agreement_details || {}), [field]: value } }
        : item
    )));
  };

  const removeMixedPayment = async (index) => {
    const item = mixedPayments[index];
    const method = methods.find((candidate) => candidate.method_code === item?.method_code);
    const confirmed = await ModalManager.confirm({
      title: 'Quitar medio de pago',
      message: `Confirma quitar ${method?.method_name || 'este medio de pago'} del pago mixto.`,
      buttons: { cancel: 'Cancelar', confirm: 'Quitar' },
    });
    if (!confirmed) return;
    setMixedPayments((current) => (current.length <= 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)));
  };

  const confirm = async () => {
    if (isZeroAmount) {
      setProcessing(true);
      try {
        await onConfirm({
          payment_method_code: null,
          payment_method_name: null,
          amount_tendered: 0,
          change_amount: 0,
          payment_details: null,
          receipt_email: email.trim() || null,
        });
        onClose?.();
      } finally {
        setProcessing(false);
      }
      return;
    }
    const paymentMethod = isMixed ? mixedMethod : selected;
    const selectedForeignPayload = selectedForeignRate ? {
      currency_code: selectedForeignRate.currency_code,
      currency_name: selectedForeignRate.currency_name,
      rate_value: rateValue(selectedForeignRate),
      expected_amount: expectedForeignAmountRounded,
      received_amount: foreignReceived ? foreignReceivedNum : expectedForeignAmountRounded,
    } : null;
    const directPaymentDetails = selectedIsCheck
      ? {
        type: 'CHECK',
        reference_number: checkDetails.check_number.trim(),
        check: {
          bank_name: checkDetails.bank_name.trim(),
          check_number: checkDetails.check_number.trim(),
          holder_name: checkDetails.holder_name.trim(),
          holder_tax_id: checkDetails.holder_tax_id.trim(),
          due_date: checkDetails.due_date || null,
          amount: importeNum,
        },
      }
      : selectedIsAgreement
        ? {
          type: 'AGREEMENT',
          reference_number: agreementDetails.reference_number.trim() || agreementDetails.associate_identifier.trim(),
          agreement: {
            agreement_type: agreementDetails.agreement_type,
            agreement_id: agreementDetails.agreement_id ? Number(agreementDetails.agreement_id) : null,
            agreement_beneficiary_id: agreementDetails.agreement_beneficiary_id ? Number(agreementDetails.agreement_beneficiary_id) : null,
            organization_name: agreementDetails.organization_name.trim(),
            associate_name: agreementDetails.associate_name.trim(),
            associate_identifier: agreementDetails.associate_identifier.trim(),
            reference_number: agreementDetails.reference_number.trim(),
            discount_percent: null,
            amount: total,
            agreement_benefit_amount: agreementDetails.beneficiary_benefit_amount != null
              ? agreementDetails.beneficiary_benefit_amount
              : agreementDetails.agreement_benefit_amount,
            agreement_single_purchase: agreementDetails.agreement_single_purchase,
            beneficiary_consumed_amount: agreementDetails.beneficiary_consumed_amount || 0,
          },
        }
      : selectedRequiresReference
        ? {
          type: selectedReferenceCopy.type,
          reference_number: paymentReference.trim(),
          reference_label: selectedReferenceCopy.label,
        }
        : null;
    const mixedDetails = mixedPayments
      .filter((item) => item.method_code && mixedPaymentAmount(item) > 0)
      .map((item) => {
        const method = methods.find((candidate) => candidate.method_code === item.method_code);
        const rate = item.method_code === 'FOREIGN_CURRENCY' ? mixedForeignRate(item) : null;
        const isItemCheck = isCheckMethod(method);
        const isItemAgreement = isAgreementMethod(method);
        const itemCheckDetails = item.check_details || {};
        const itemAgreementDetails = item.agreement_details || {};
        const itemReferenceCopy = paymentReferenceCopy(method);
        return {
          payment_method_code: item.method_code,
          payment_method_name: method?.method_name || item.method_code,
          amount: mixedPaymentAmount(item),
          ...(item.reference_number?.trim() ? {
            reference_type: itemReferenceCopy.type,
            reference_label: itemReferenceCopy.label,
            reference_number: item.reference_number.trim(),
          } : {}),
          ...(isItemCheck ? {
            check: {
              bank_name: String(itemCheckDetails.bank_name || '').trim(),
              check_number: String(itemCheckDetails.check_number || '').trim(),
              holder_name: String(itemCheckDetails.holder_name || '').trim(),
              holder_tax_id: String(itemCheckDetails.holder_tax_id || '').trim(),
              due_date: itemCheckDetails.due_date || null,
              amount: mixedPaymentAmount(item),
            },
          } : {}),
          ...(isItemAgreement ? {
            agreement: {
              agreement_type: itemAgreementDetails.agreement_type || 'CREDIT',
              agreement_id: itemAgreementDetails.agreement_id ? Number(itemAgreementDetails.agreement_id) : null,
              agreement_beneficiary_id: itemAgreementDetails.agreement_beneficiary_id ? Number(itemAgreementDetails.agreement_beneficiary_id) : null,
              organization_name: String(itemAgreementDetails.organization_name || '').trim(),
              associate_name: String(itemAgreementDetails.associate_name || '').trim(),
              associate_identifier: String(itemAgreementDetails.associate_identifier || '').trim(),
              reference_number: String(itemAgreementDetails.reference_number || '').trim(),
              discount_percent: null,
              amount: mixedPaymentAmount(item),
              agreement_benefit_amount: itemAgreementDetails.beneficiary_benefit_amount != null
                ? itemAgreementDetails.beneficiary_benefit_amount
                : itemAgreementDetails.agreement_benefit_amount || 0,
              agreement_single_purchase: itemAgreementDetails.agreement_single_purchase !== false,
              beneficiary_consumed_amount: itemAgreementDetails.beneficiary_consumed_amount || 0,
            },
          } : {}),
          ...(rate ? {
            foreign_currency: {
              currency_code: rate.currency_code,
              currency_name: rate.currency_name,
              rate_value: rateValue(rate),
              received_amount: parseLocalizedAmount(item.foreign_amount),
              clp_amount: mixedPaymentAmount(item),
            },
          } : {}),
        };
      });
    setProcessing(true);
    try {
      await onConfirm({
        payment_method_code: paymentMethod.method_code,
        payment_method_name: paymentMethod.method_name,
        amount_tendered: isRefund ? 0 : (isCash || selectedIsCheck) ? importeNum : isMixed ? mixedTotal : total,
        change_amount: isRefund ? absoluteTotal : isCash ? vuelto : isForeign ? foreignChange : isMixed ? Math.max(mixedTotal - absoluteTotal, 0) : 0,
        payment_details: isMixed
          ? { type: 'MIXED', payments: mixedDetails, total_paid: mixedTotal, remaining: mixedRemaining }
          : isForeign
            ? { type: 'FOREIGN_CURRENCY', foreign_currency: selectedForeignPayload }
            : directPaymentDetails,
        receipt_email: email.trim() || null,
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
            {!isRefundMode && (
              <div className="mb-3 grid grid-cols-2 rounded-md border border-slate-200 bg-slate-50 p-1 text-sm dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode('DIRECT');
                    setMixedPayments([newMixedPayment()]);
                  }}
                  className={`flex h-10 items-center justify-center gap-2 rounded-md font-medium transition ${paymentMode === 'DIRECT' ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-950 dark:text-blue-300' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'}`}
                >
                  <CreditCard className="h-4 w-4" />
                  Pago directo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode('MIXED');
                    setSelected(null);
                    setImporte('');
                    setForeignReceived('');
                    setMixedPayments([{ method_code: defaultMixedMethodCode(), amount: formatAmountForInput(absoluteTotal) }]);
                  }}
                  className={`flex h-10 items-center justify-center gap-2 rounded-md font-medium transition ${paymentMode === 'MIXED' ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-950 dark:text-blue-300' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'}`}
                >
                  <SplitSquareHorizontal className="h-4 w-4" />
                  Pago mixto
                </button>
              </div>
            )}

            {(paymentMode === 'DIRECT' || isRefundMode) && (
              <>
                <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">{isRefundMode ? 'Medio de reembolso' : 'Medio de pago'}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {paymentMethodOptions.map((m) => {
                    const Icon = METHOD_ICON_NAMES[m.icon_name] || (isAgreementMethod(m) ? Building2 : m.method_code === 'FOREIGN_CURRENCY' ? Repeat2 : METHOD_ICONS[m.method_type] || CheckCircle2);
                    const active = selected?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelected(m);
                          setImporte((m.method_type === 'CASH' || isCheckMethod(m)) ? formatAmountForInput(total) : '');
                          setPaymentReference('');
                          setCheckDetails(emptyCheckDetails);
                          setAgreementDetails(emptyAgreementDetails);
                          setForeignReceived('');
                          if (m.method_code === 'FOREIGN_CURRENCY' && !foreignCurrencyCode && availableRates[0]) {
                            setForeignCurrencyCode(availableRates[0].currency_code);
                          }
                          if (m.method_code === 'FOREIGN_CURRENCY' && selectedForeignRate) {
                            setForeignReceived(expectedForeignInput);
                          }
                        }}
                        className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-left text-sm transition ${active ? 'border-blue-400 bg-blue-50 font-semibold text-blue-800 dark:border-blue-600 dark:bg-blue-950/40 dark:text-blue-200' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{m.method_name}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {paymentMode === 'DIRECT' && isCash && !isRefund && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Importe recibido</span>
                <input
                  className={inputCls}
                  type="text"
                  inputMode="numeric"
                  placeholder={money(total)}
                  value={importe}
                  onChange={(e) => setImporte(e.target.value)}
                  onFocus={(e) => focusAmountInput(e, setImporte)}
                  onBlur={(e) => setImporte(formatAmountForInput(e.target.value))}
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

          {paymentMode === 'DIRECT' && isForeign && !isRefund && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Divisa</span>
                <select
                  className={inputCls}
                  value={selectedForeignRate?.currency_code || ''}
                  onChange={(e) => setForeignCurrencyCode(e.target.value)}
                  disabled={availableRates.length === 0}
                >
                  {availableRates.length === 0 && <option value="">Sin tasas disponibles</option>}
                  {availableRates.map((rate) => (
                    <option key={rate.currency_code} value={rate.currency_code}>{rate.currency_code} - {rate.currency_name}</option>
                  ))}
                </select>
                {selectedForeignRate && (
                  <p className="text-xs text-slate-400">
                    Esperado: {formatMoney(expectedForeignAmountRounded, selectedForeignRate.currency_code)} · Fee {feeValue(selectedForeignRate).toLocaleString('es-CL')}%
                  </p>
                )}
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Importe recibido</span>
                <input
                  className={inputCls}
                  type="text"
                  inputMode="decimal"
                  placeholder={selectedForeignRate ? formatMoney(expectedForeignAmountRounded, selectedForeignRate.currency_code) : ''}
                  value={foreignReceived}
                  onChange={(e) => setForeignReceived(e.target.value)}
                  onFocus={(e) => focusAmountInput(e, setForeignReceived)}
                  onBlur={(e) => setForeignReceived(formatAmountForInput(e.target.value, selectedForeignRate?.currency_code || 'CLP'))}
                />
                {foreignReceived !== '' && !foreignReceivedSufficient && (
                  <p className="text-xs text-red-600 dark:text-red-400">El importe es menor al esperado.</p>
                )}
              </label>
            </div>
          )}

          {paymentMode === 'DIRECT' && selectedRequiresReference && !selectedIsCheck && !isRefund && (
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">{selectedReferenceCopy.label}</span>
              <input
                className={inputCls}
                type="text"
                placeholder={selectedReferenceCopy.placeholder}
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
              {!referenceValid && (
                <p className="text-xs text-red-600 dark:text-red-400">Ingresa el folio o referencia del comprobante.</p>
              )}
            </label>
          )}

          {paymentMode === 'DIRECT' && selectedIsCheck && !isRefund && (
            <div className="grid gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-700 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Banco</span>
                <input className={inputCls} type="text" value={checkDetails.bank_name} onChange={(e) => updateCheckDetail('bank_name', e.target.value)} />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Numero de cheque</span>
                <input className={inputCls} type="text" value={checkDetails.check_number} onChange={(e) => updateCheckDetail('check_number', e.target.value)} />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Titular</span>
                <input className={inputCls} type="text" value={checkDetails.holder_name} onChange={(e) => updateCheckDetail('holder_name', e.target.value)} />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">RUT titular</span>
                <input className={inputCls} type="text" value={checkDetails.holder_tax_id} onChange={(e) => updateCheckDetail('holder_tax_id', e.target.value)} />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Fecha cheque</span>
                <input className={inputCls} type="date" value={checkDetails.due_date} onChange={(e) => updateCheckDetail('due_date', e.target.value)} />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Monto cheque</span>
                <input
                  className={inputCls}
                  type="text"
                  inputMode="numeric"
                  value={importe}
                  onChange={(e) => setImporte(e.target.value)}
                  onFocus={(e) => focusAmountInput(e, setImporte)}
                  onBlur={(e) => setImporte(formatAmountForInput(e.target.value))}
                />
                {checkAmountInsuficiente && (
                  <p className="text-xs text-red-600 dark:text-red-400">El monto del cheque es menor al total.</p>
                )}
              </label>
            </div>
          )}

          {paymentMode === 'DIRECT' && selectedIsAgreement && !isRefund && (
            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
              <AgreementCreditSelector agreements={agreements} value={agreementDetails} onChange={setAgreementDetails} />
            </div>
          )}

          {paymentMode === 'MIXED' && !isRefund && (
            <div className="space-y-3 rounded-md border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Pagos mixtos</span>
                <span className={`font-semibold tabular-nums ${mixedRemaining > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-green-700 dark:text-green-400'}`}>
                  Restante {money(mixedRemaining)}
                </span>
              </div>
              {mixedPayments.map((item, index) => {
                const method = methodByCode(item.method_code);
                const itemRequiresReference = requiresPaymentReference(method);
                const itemIsCheck = isCheckMethod(method);
                const itemIsAgreement = isAgreementMethod(method);
                const itemCheckDetails = item.check_details || {};
                const itemAgreementDetails = item.agreement_details || {};
                const itemReferenceCopy = paymentReferenceCopy(method);
                return (
                <div key={index} className="py-0.5">
                  {index === 0 && (
                    <div className="mb-1 hidden grid-cols-[minmax(0,1fr)_10rem_2.5rem] gap-2 px-1 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 sm:grid">
                      <span>Medio</span>
                      <span>Importe</span>
                      <span className="text-right">Acciones</span>
                    </div>
                  )}
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_2.5rem]">
                    <select className={compactInputCls} value={item.method_code || defaultMixedMethodCode()} onChange={(e) => updateMixedPayment(index, 'method_code', e.target.value)}>
                      {mixedOptionsForIndex(index).map((method) => (
                        <option key={method.method_code} value={method.method_code}>{method.method_name}</option>
                      ))}
                    </select>
                    {item.method_code === 'FOREIGN_CURRENCY' ? (
                      <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold tabular-nums text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {money(mixedPaymentAmount(item))}
                      </div>
                    ) : (
                      <input
                        className={compactInputCls}
                        type="text"
                        inputMode="numeric"
                        placeholder={money(mixedRemaining || absoluteTotal)}
                        value={item.amount}
                        onChange={(e) => updateMixedPayment(index, 'amount', e.target.value)}
                        onFocus={(e) => focusAmountInput(e, (value) => updateMixedPayment(index, 'amount', value))}
                        onBlur={(e) => updateMixedPayment(index, 'amount', formatAmountForInput(e.target.value))}
                      />
                    )}
                    <button
                      type="button"
                      aria-label="Quitar medio de pago"
                      title="Quitar medio de pago"
                      disabled={mixedPayments.length <= 1}
                      onClick={() => removeMixedPayment(index)}
                      className="inline-flex h-10 w-10 items-center justify-center justify-self-end rounded-md border border-red-300 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {item.method_code === 'FOREIGN_CURRENCY' && (
                    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr]">
                      <label className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>Divisa</span>
                        <select className={inputCls} value={mixedForeignRate(item)?.currency_code || ''} onChange={(e) => updateMixedPayment(index, 'currency_code', e.target.value)} disabled={availableRates.length === 0}>
                          {availableRates.length === 0 && <option value="">Sin tasas disponibles</option>}
                          {availableRates.map((rate) => (
                            <option key={rate.currency_code} value={rate.currency_code}>{rate.currency_code} - {rate.currency_name}</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>Importe en divisa</span>
                        <input
                          className={inputCls}
                          type="text"
                          inputMode="decimal"
                          placeholder={mixedForeignRate(item) ? formatMoney(convertFromBase(mixedRemaining || absoluteTotal, mixedForeignRate(item)), mixedForeignRate(item).currency_code) : ''}
                          value={item.foreign_amount || ''}
                          onChange={(e) => updateMixedPayment(index, 'foreign_amount', e.target.value)}
                          onFocus={(e) => focusAmountInput(e, (value) => updateMixedPayment(index, 'foreign_amount', value))}
                          onBlur={(e) => updateMixedPayment(index, 'foreign_amount', formatAmountForInput(e.target.value, mixedForeignRate(item)?.currency_code || 'CLP'))}
                        />
                      </label>
                      <div className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">
                        {mixedForeignRate(item)
                          ? `Equivalencia: ${formatMoney(parseLocalizedAmount(item.foreign_amount), mixedForeignRate(item).currency_code)} = ${money(mixedPaymentAmount(item))} CLP · Fee ${feeValue(mixedForeignRate(item)).toLocaleString('es-CL')}%`
                          : 'Selecciona una divisa con tasa vigente.'}
                      </div>
                    </div>
                  )}
                  {itemRequiresReference && !itemIsCheck && (
                    <label className="mt-2 block space-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>{itemReferenceCopy.label}</span>
                      <input
                        className={inputCls}
                        type="text"
                        placeholder={itemReferenceCopy.placeholder}
                        value={item.reference_number || ''}
                        onChange={(e) => updateMixedPayment(index, 'reference_number', e.target.value)}
                      />
                    </label>
                  )}
                  {itemIsAgreement && (
                    <div className="mt-2">
                      <AgreementCreditSelector
                        agreements={agreements}
                        value={itemAgreementDetails}
                        onChange={(newDetails) => setMixedPayments((current) => current.map((p, i) => i === index ? { ...p, agreement_details: newDetails } : p))}
                      />
                    </div>
                  )}
                  {itemIsCheck && (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <label className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>Banco</span>
                        <input className={inputCls} type="text" value={itemCheckDetails.bank_name || ''} onChange={(e) => updateMixedCheckDetail(index, 'bank_name', e.target.value)} />
                      </label>
                      <label className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>Numero de cheque</span>
                        <input className={inputCls} type="text" value={itemCheckDetails.check_number || ''} onChange={(e) => updateMixedCheckDetail(index, 'check_number', e.target.value)} />
                      </label>
                      <label className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>Titular</span>
                        <input className={inputCls} type="text" value={itemCheckDetails.holder_name || ''} onChange={(e) => updateMixedCheckDetail(index, 'holder_name', e.target.value)} />
                      </label>
                      <label className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>RUT titular</span>
                        <input className={inputCls} type="text" value={itemCheckDetails.holder_tax_id || ''} onChange={(e) => updateMixedCheckDetail(index, 'holder_tax_id', e.target.value)} />
                      </label>
                      <label className="space-y-1 text-xs text-slate-500 dark:text-slate-400 sm:col-span-2">
                        <span>Fecha cheque</span>
                        <input className={inputCls} type="date" value={itemCheckDetails.due_date || ''} onChange={(e) => updateMixedCheckDetail(index, 'due_date', e.target.value)} />
                      </label>
                    </div>
                  )}
                </div>
                );
              })}
              <button
                type="button"
                className="h-10 rounded-md border border-slate-200 px-3 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                disabled={mixedPayments.length >= MAX_MIXED_PAYMENTS || mixedPayments.length >= paymentMethodOptions.length}
                onClick={() => setMixedPayments((current) => (current.length >= MAX_MIXED_PAYMENTS || current.length >= paymentMethodOptions.length ? current : [...current, newMixedPayment(current, formatAmountForInput(mixedRemaining || absoluteTotal))]))}
              >
                Agregar medio
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="flex-1 min-w-0">
              {agreementCreditStatus && (
                <p className={`text-xs leading-snug ${
                  agreementCreditStatus.type === 'error'   ? 'text-red-600 dark:text-red-400'
                  : agreementCreditStatus.type === 'warn'  ? 'text-amber-600 dark:text-amber-400'
                  : agreementCreditStatus.type === 'success' ? 'text-green-600 dark:text-green-400'
                  : 'text-blue-600 dark:text-blue-400'
                }`}>{agreementCreditStatus.msg}</p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <ActionButton label="Cancelar" icon={XCircle} variant="neutral" onClick={onClose} />
              <ActionButton label="Continuar" icon={CheckCircle2} onClick={() => setStep(2)} disabled={!canContinue} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex justify-between gap-3"><span className="text-slate-500">Medio de pago</span><span className="font-semibold">{isZeroAmount ? 'Sin cobro' : isMixed ? mixedMethod.method_name : selected.method_name}</span></div>
            {isZeroAmount ? null : isRefund ? (
              <div className="flex justify-between gap-3 mt-1"><span className="text-slate-500">Monto a entregar</span><span className="font-semibold tabular-nums text-red-700 dark:text-red-400">{money(absoluteTotal)}</span></div>
            ) : isMixed ? (
              <>
                {mixedPayments.filter((item) => item.method_code && mixedPaymentAmount(item) > 0).map((item, index) => {
                  const method = methods.find((candidate) => candidate.method_code === item.method_code);
                  const rate = item.method_code === 'FOREIGN_CURRENCY' ? mixedForeignRate(item) : null;
                  const reference = item.reference_number || item.check_details?.check_number || item.agreement_details?.reference_number || item.agreement_details?.associate_identifier;
                  return (
                    <div key={`${item.method_code}-${index}`} className="flex justify-between gap-3 mt-1">
                      <span className="text-slate-500">
                        {method?.method_name || item.method_code}
                        {rate && <span className="ml-1 text-xs">({formatMoney(parseLocalizedAmount(item.foreign_amount), rate.currency_code)})</span>}
                        {reference && <span className="ml-1 text-xs">#{reference}</span>}
                      </span>
                      <span className="font-semibold tabular-nums">{money(mixedPaymentAmount(item))}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between gap-3 mt-1"><span className="text-slate-500">Total recibido</span><span className="font-semibold tabular-nums">{money(mixedTotal)}</span></div>
                <div className="flex justify-between gap-3 mt-1"><span className="text-slate-500">Vuelto</span><span className="font-semibold tabular-nums text-green-700 dark:text-green-400">{money(Math.max(mixedTotal - absoluteTotal, 0))}</span></div>
              </>
            ) : isForeign && selectedForeignRate ? (
              <>
                <div className="flex justify-between gap-3 mt-1"><span className="text-slate-500">Divisa</span><span className="font-semibold">{selectedForeignRate.currency_code}</span></div>
                <div className="flex justify-between gap-3 mt-1"><span className="text-slate-500">Importe esperado</span><span className="font-semibold tabular-nums">{formatMoney(expectedForeignAmountRounded, selectedForeignRate.currency_code)}</span></div>
                <div className="flex justify-between gap-3 mt-1"><span className="text-slate-500">Vuelto referencia</span><span className="font-semibold tabular-nums text-green-700 dark:text-green-400">{money(foreignChange)}</span></div>
              </>
            ) : selectedIsCheck ? (
              <>
                <div className="flex justify-between gap-3 mt-1"><span className="text-slate-500">Banco</span><span className="font-semibold">{checkDetails.bank_name}</span></div>
                <div className="flex justify-between gap-3 mt-1"><span className="text-slate-500">Cheque</span><span className="font-semibold">{checkDetails.check_number}</span></div>
                <div className="flex justify-between gap-3 mt-1"><span className="text-slate-500">Monto</span><span className="font-semibold tabular-nums">{money(importeNum)}</span></div>
              </>
            ) : selectedIsAgreement ? (
              <>
                <div className="flex justify-between gap-3 mt-1"><span className="text-slate-500">Tipo convenio</span><span className="font-semibold">Credito convenio</span></div>
                <div className="flex justify-between gap-3 mt-1"><span className="text-slate-500">Organizacion</span><span className="font-semibold">{agreementDetails.organization_name}</span></div>
                <div className="flex justify-between gap-3 mt-1"><span className="text-slate-500">Codigo asociado</span><span className="font-semibold">{agreementDetails.associate_identifier}</span></div>
                {agreementDetails.associate_name && <div className="flex justify-between gap-3 mt-1"><span className="text-slate-500">Asociado</span><span className="font-semibold">{agreementDetails.associate_name}</span></div>}
                {agreementDetails.reference_number && <div className="flex justify-between gap-3 mt-1"><span className="text-slate-500">Autorizacion</span><span className="font-semibold">{agreementDetails.reference_number}</span></div>}
              </>
            ) : selectedRequiresReference ? (
              <div className="flex justify-between gap-3 mt-1"><span className="text-slate-500">Referencia</span><span className="font-semibold">{paymentReference}</span></div>
            ) : isCash && (
              <>
                <div className="flex justify-between gap-3 mt-1"><span className="text-slate-500">Importe</span><span className="font-semibold tabular-nums">{money(importeNum)}</span></div>
                <div className="flex justify-between gap-3 mt-1"><span className="text-slate-500">Vuelto</span><span className="font-semibold tabular-nums text-green-700 dark:text-green-400">{money(vuelto)}</span></div>
              </>
            )}
            <div className="flex justify-between gap-3 mt-2 border-t border-slate-200 pt-2 dark:border-slate-700"><span className="font-medium">{isZeroAmount ? 'Sin cobro' : isRefund ? 'Total devolucion' : 'Total cobrado'}</span><span className="font-bold tabular-nums">{money(absoluteTotal)}</span></div>
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
            <p className="text-xs text-slate-400">Se sugiere el correo del cliente y se guardara en la venta procesada.</p>
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

const AgreementDiscountModal = ({ agreements = [], initialValues = {}, saleBase = 0, onConfirm, onClose }) => {
  const [agreementId, setAgreementId] = useState(initialValues.agreement_id || '');
  const [beneficiaryId, setBeneficiaryId] = useState(initialValues.agreement_beneficiary_id || '');
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loadingBeneficiaries, setLoadingBeneficiaries] = useState(false);

  const discountAgreements = useMemo(
    () => agreements.filter((item) => item.agreement_type === 'DISCOUNT' && item.is_active !== false),
    [agreements],
  );

  const agreementOptions = useMemo(
    () => discountAgreements.map((item) => ({ value: String(item.id), label: `${item.agreement_name} — ${item.company_name}` })),
    [discountAgreements],
  );

  useEffect(() => {
    if (!agreementId) { setBeneficiaries([]); setBeneficiaryId(''); return; }
    setLoadingBeneficiaries(true);
    agreementsService.listBeneficiaries(agreementId)
      .then(setBeneficiaries)
      .catch(() => setBeneficiaries([]))
      .finally(() => setLoadingBeneficiaries(false));
  }, [agreementId]);

  const beneficiaryOptions = useMemo(
    () => beneficiaries
      .filter((item) => item.is_active !== false)
      .map((item) => ({ value: String(item.id), label: `${item.beneficiary_identifier} — ${item.beneficiary_name}` })),
    [beneficiaries],
  );

  const handleAgreementChange = (value) => {
    setAgreementId(value || '');
    setBeneficiaryId('');
  };

  const selectedAgreement = discountAgreements.find((item) => String(item.id) === agreementId);
  const selectedBeneficiary = beneficiaries.find((item) => String(item.id) === beneficiaryId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedAgreement || !selectedBeneficiary) return;
    onConfirm({
      agreement_id: agreementId,
      agreement_beneficiary_id: beneficiaryId,
      organization_name: selectedAgreement.company_name || '',
      associate_name: selectedBeneficiary.beneficiary_name || '',
      associate_identifier: selectedBeneficiary.beneficiary_identifier || '',
      reference_number: '',
      discount_percent: String(selectedAgreement.discount_percent || ''),
    });
    onClose?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Convenio</span>
          <AutocompleteSelect
            value={agreementId}
            onChange={handleAgreementChange}
            options={agreementOptions}
            placeholder="Seleccionar convenio"
            searchPlaceholder="Buscar convenio..."
            clearable
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Beneficiario</span>
          <AutocompleteSelect
            value={beneficiaryId}
            onChange={(value) => setBeneficiaryId(value || '')}
            options={beneficiaryOptions}
            placeholder={loadingBeneficiaries ? 'Cargando...' : (agreementId ? 'Seleccionar beneficiario' : 'Primero selecciona un convenio')}
            searchPlaceholder="Buscar por RUT o nombre..."
            disabled={!agreementId || loadingBeneficiaries}
            clearable
          />
        </label>

        {selectedBeneficiary && selectedAgreement && (() => {
          const pct = Number(selectedAgreement.discount_percent || 0);
          const discountAmount = saleBase > 0 ? Math.round(saleBase * pct / 100) : null;
          return (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-3 dark:border-blue-800 dark:bg-blue-950/40">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                    {selectedAgreement.agreement_name}
                    {pct > 0 && <span className="ml-1.5 font-normal normal-case">({pct}%)</span>}
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">{selectedBeneficiary.beneficiary_name}</div>
                  <div className="font-mono text-xs text-blue-700 dark:text-blue-300">{selectedBeneficiary.beneficiary_identifier}</div>
                  {Number(selectedBeneficiary.interactions_count || 0) > 0 && (
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {selectedBeneficiary.interactions_count} uso{selectedBeneficiary.interactions_count !== 1 ? 's' : ''} · consumido {money(selectedBeneficiary.consumed_amount)}
                    </div>
                  )}
                </div>
                {discountAmount !== null && (
                  <div className="shrink-0 text-right">
                    <div className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white">-{pct}%</div>
                    <div className="mt-1 text-sm font-semibold tabular-nums text-blue-800 dark:text-blue-200">{money(discountAmount)}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
        <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancelar</button>
        <button type="submit" disabled={!selectedAgreement || !selectedBeneficiary} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">Aplicar convenio</button>
      </div>
    </form>
  );
};

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
  const [agreementDiscount, setAgreementDiscount] = useState(emptyAgreementDiscount);
  const [agreements, setAgreements] = useState([]);
  const [exchangeRates, setExchangeRates] = useState([]);
  const [currencyCode, setCurrencyCode] = useState('');
  const [activeCashSession, setActiveCashSession] = useState(undefined);

  const isReturnDocument = selectedSale?.document_type_code === 'RETURN_TICKET' || selectedSale?.is_return_document;
  const isExchangeDocument = selectedSale?.document_type_code === 'EXCHANGE_DRAFT' || selectedSale?.is_exchange_document;
  const agreementDiscountPercent = Number(agreementDiscount.discount_percent || 0);
  const agreementDiscountValid = agreementDiscount.enabled
    && agreementDiscount.organization_name.trim()
    && agreementDiscount.associate_identifier.trim()
    && agreementDiscountPercent > 0;

  useEffect(() => {
    setTicketNumber(generateTicketNumber(documentTypeCode));
  }, [documentTypeCode]);

  useEffect(() => {
    if (!activeCashRegisterRecord?.id) {
      setActiveCashSession(null);
      return;
    }
    setActiveCashSession(undefined);
    cashSessionsService.listActive()
      .then((sessions) => {
        const found = sessions.find((s) => String(s.cash_register_id) === String(activeCashRegisterRecord.id)) || null;
        setActiveCashSession(found);
      })
      .catch(() => setActiveCashSession(null));
  }, [activeCashRegisterRecord]);

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
      const [data, allTypes, rates, activeAgreements] = await Promise.all([
        salesDocumentsService.listPending(),
        documentConfigService.listTypes({ active_only: true }).catch(() => []),
        currencyRatesService.list().catch(() => []),
        agreementsService.list({ active_only: true }).catch(() => []),
      ]);
      setPendingSales(data);
      setExchangeRates(rates);
      setAgreements(activeAgreements);
      const firstForeignRate = rates.find((rate) => rate.currency_code && rateValue(rate) > 0 && rate.currency_code !== rate.base_currency_code);
      if (firstForeignRate) {
        setCurrencyCode((current) => current || firstForeignRate.currency_code);
      }
      const saleTypes = allTypes
        .filter((t) => t.document_category === 'SALE' && t.movement_type === 'OUT')
        .map((t) => ({ code: t.document_type_code, name: t.document_type_name }));
      if (saleTypes.length > 0) {
        const defaultSaleType = saleTypes.find((t) => t.code === TICKET_CODE)?.code || saleTypes[0].code;
        setDocumentTypes(saleTypes);
        setDocumentTypeCode((current) => (saleTypes.some((t) => t.code === current) ? current : defaultSaleType));
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

  const openAgreementDiscountModal = useCallback(() => {
    ModalManager.show({
      type: 'custom',
      title: 'Convenio de descuento',
      size: 'medium',
      showFooter: false,
      contentComponent: AgreementDiscountModal,
      contentProps: {
        agreements,
        initialValues: agreementDiscount,
        saleBase: Number(selectedSale?.total_amount || 0),
        onConfirm: (form) => setAgreementDiscount((current) => ({ ...current, ...form, enabled: true })),
      },
    });
  }, [agreements, agreementDiscount, selectedSale]);


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
    if (base < 0) return { base, manualDiscount: 0, agreementDiscountAmount: 0, discount: 0, total: base };
    const value = Number(discountValue || 0);
    const manual = discountType === 'PERCENT'
      ? base * value / 100
      : discountType === 'AMOUNT'
        ? value
        : 0;
    const boundedManual = Math.min(Math.max(manual, 0), base);
    const agreementPct = agreementDiscountValid ? Number(agreementDiscount.discount_percent || 0) : 0;
    const agreementAmt = Math.round(base * agreementPct / 100);
    const boundedAgreement = Math.min(Math.max(agreementAmt, 0), base - boundedManual);
    const totalDiscount = boundedManual + boundedAgreement;
    return { base, manualDiscount: boundedManual, agreementDiscountAmount: boundedAgreement, discount: totalDiscount, total: Math.max(base - totalDiscount, 0) };
  }, [discountType, discountValue, selectedSale, agreementDiscount, agreementDiscountValid]);

  const exchangeTotals = useMemo(() => {
    const items = selectedSale?.items || [];
    const valuePaidOriginal = items
      .filter(isExchangeCreditItem)
      .reduce((sum, item) => {
        const amount = item.paid_total_amount ?? item.line_subtotal;
        return sum + Math.abs(amount != null ? Number(amount) : Number(item.unit_price || 0) * Number(item.quantity || 1));
      }, 0);
    const destinationPrice = items
      .filter((item) => !isExchangeCreditItem(item))
      .reduce((sum, item) => sum + Number(item.line_subtotal ?? (Number(item.quantity || 0) * Number(item.unit_price || 0))), 0);
    const calculatedDifference = Math.max(destinationPrice - valuePaidOriginal, 0);
    const totalToPay = Math.max(Number(selectedSale?.total_amount || 0), 0);
    const authorizedAdjustment = Math.max(calculatedDifference - totalToPay, 0);
    return {
      valuePaidOriginal,
      destinationPrice,
      calculatedDifference,
      authorizedAdjustment,
      totalToPay,
    };
  }, [selectedSale]);

  const availableExchangeRates = useMemo(
    () => exchangeRates.filter((rate) => rate.currency_code && rateValue(rate) > 0 && rate.currency_code !== rate.base_currency_code),
    [exchangeRates],
  );

  const selectedExchangeRate = useMemo(
    () => availableExchangeRates.find((rate) => rate.currency_code === currencyCode) || availableExchangeRates[0] || null,
    [availableExchangeRates, currencyCode],
  );

  const convertedTotal = useMemo(
    () => (selectedExchangeRate ? convertFromBase(Math.abs(closingTotals.total), selectedExchangeRate) : 0),
    [closingTotals.total, selectedExchangeRate],
  );

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
    setAgreementDiscount(emptyAgreementDiscount);
    if (!currencyCode && availableExchangeRates[0]) setCurrencyCode(availableExchangeRates[0].currency_code);
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
      if (selectedSale?.id === sale.id) {
        setSelectedSale(null);
        setAgreementDiscount(emptyAgreementDiscount);
      }
      await refreshPendingList();
    } catch (err) {
      toast.error(getBackendMessage(err, 'No fue posible eliminar la venta.'));
    }
  };

  const closeSale = () => {
    if (!selectedSale) return;
    const folio = selectedSale.ticket_number || ticketNumber || generateTicketNumber(documentTypeCode);
    const agreementUsage = agreementDiscountValid ? {
      agreement_type: 'DISCOUNT',
      agreement_id: agreementDiscount.agreement_id ? Number(agreementDiscount.agreement_id) : null,
      agreement_beneficiary_id: agreementDiscount.agreement_beneficiary_id ? Number(agreementDiscount.agreement_beneficiary_id) : null,
      organization_name: agreementDiscount.organization_name.trim(),
      associate_name: agreementDiscount.associate_name.trim(),
      associate_identifier: agreementDiscount.associate_identifier.trim(),
      reference_number: agreementDiscount.reference_number.trim() || null,
      discount_percent: agreementDiscountPercent,
    } : null;

    const doClose = async ({ payment_method_code = null, payment_method_name = null, amount_tendered = 0, change_amount = 0, payment_details = null, receipt_email = null } = {}) => {
      setClosing(true);
      try {
        await salesDocumentsService.close(selectedSale.id, {
          ticket_number: String(folio).trim(),
          document_type_code: selectedDocumentType.code,
          document_type_name: selectedDocumentType.name,
          cash_register_id: activeCashRegisterRecord?.id || selectedSale.cash_register_id || null,
          discount_type: isExchangeDocument ? 'NONE' : discountType,
          discount_value: isExchangeDocument ? 0 : Number(discountValue || 0),
          payment_method_code,
          payment_method_name,
          amount_tendered,
          change_amount,
          payment_details,
          agreement_usage: isExchangeDocument ? null : agreementUsage,
          receipt_email,
        });
        const successTitle = isExchangeDocument ? 'Cambio procesado' : isReturnDocument ? 'Devolucion procesada' : 'Venta cerrada';
        const successMsg = isExchangeDocument ? 'El cambio fue cerrado correctamente.' : isReturnDocument ? 'La devolucion fue cerrada correctamente.' : 'La venta fue cerrada y registrada correctamente.';
        setSelectedSale(null);
        setTicketNumber('');
        setDocumentTypeCode(TICKET_CODE);
        setDiscountType('NONE');
        setDiscountValue(0);
        setAgreementDiscount(emptyAgreementDiscount);
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
    if (isExchangeDocument && Math.round(closingTotals.total) <= 0) {
      doClose();
      return;
    }

    if (!isExchangeDocument && !isReturnDocument && closingTotals.total === 0) {
      doClose({
        payment_details: agreementUsage ? { type: 'AGREEMENT_DISCOUNT', agreement: agreementUsage } : null,
      });
      return;
    }

    ModalManager.show({
      type: 'custom',
      title: isReturnDocument ? 'Registrar devolución' : 'Procesar pago',
      size: 'large',
      showFooter: false,
      contentComponent: PaymentModal,
      contentProps: {
        total: closingTotals.total,
        exchangeRates,
        preferredCurrencyCode: selectedExchangeRate?.currency_code || currencyCode,
        initialEmail: selectedSale.customer?.email || '',
        agreements,
        onConfirm: async ({ payment_method_code, payment_method_name, amount_tendered, change_amount, payment_details, receipt_email }) => {
          await doClose({ payment_method_code, payment_method_name, amount_tendered, change_amount, payment_details, receipt_email });
        },
      },
    });
  };

  const isClosed = selectedSale?.status === 'CLOSED';
  const noOpenSession = activeCashSession === null;
  const canClose = Boolean(selectedSale && !isClosed && !closing && activeCashSession && (!agreementDiscount.enabled || agreementDiscountValid));

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
                    <RowActionButton label="Cargar venta" icon={ShoppingCart} onClick={() => selectSale(item)} />
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
              <div className="grid gap-3 lg:grid-cols-3">
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
              </div>
            ) : (
              <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700">
                Selecciona una venta pendiente.
              </div>
            )}
          </div>

          {selectedSale && (
            <div className="grid gap-4 xl:grid-cols-[minmax(18rem,0.85fr)_minmax(18rem,1fr)_22rem]">
              <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-center gap-2">
                  {isExchangeDocument ? <Repeat2 className="h-5 w-5 text-blue-600" /> : <Percent className="h-5 w-5 text-blue-600" />}
                  <h2 className="text-sm font-semibold">{isExchangeDocument ? 'Ajuste de cambio' : 'Descuento final'}</h2>
                </div>
                {isExchangeDocument ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Valor pagado original</span><span className="font-medium tabular-nums">{money(exchangeTotals.valuePaidOriginal)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Precio producto destino</span><span className="font-medium tabular-nums">{money(exchangeTotals.destinationPrice)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Diferencia calculada</span><span className="font-medium tabular-nums">{money(exchangeTotals.calculatedDifference)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Ajuste autorizado</span><span className="font-medium tabular-nums">{money(exchangeTotals.authorizedAdjustment)}</span></div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                      Los cambios no permiten descuento final ni convenio de descuento. Cualquier condonacion debe quedar como ajuste comercial autorizado.
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-200">Tipo descuento</span>
                        <select className={fieldClassName} value={discountType} onChange={(e) => setDiscountType(e.target.value)} disabled={isClosed || isReturnDocument}>
                          <option value="NONE">Sin descuento</option>
                          <option value="PERCENT">Porcentaje</option>
                          <option value="AMOUNT">Monto</option>
                        </select>
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-200">Valor</span>
                        <input className={fieldClassName} type="number" min="0" max={discountType === 'PERCENT' ? 100 : undefined} step="0.01" value={discountValue} onFocus={(event) => event.target.select()} onChange={(e) => setDiscountValue(Number(e.target.value || 0))} disabled={discountType === 'NONE' || isClosed || isReturnDocument} />
                      </label>
                    </div>
                    <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <label className="flex flex-1 items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={agreementDiscount.enabled}
                            onChange={(e) => {
                              const enabled = e.target.checked;
                              setAgreementDiscount((current) => ({ ...current, enabled }));
                              if (!enabled) {
                                setDiscountType('NONE');
                                setDiscountValue(0);
                              }
                            }}
                            disabled={isClosed || isReturnDocument}
                          />
                          Aplicar descuento Convenio
                        </label>
                        {agreementDiscount.enabled && (
                          <button
                            type="button"
                            onClick={openAgreementDiscountModal}
                            disabled={isClosed || isReturnDocument}
                            className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                          >
                            <Users className="h-3.5 w-3.5" />
                            {agreementDiscount.organization_name ? 'Cambiar' : 'Seleccionar'}
                          </button>
                        )}
                      </div>
                      {agreementDiscount.enabled && agreementDiscount.organization_name && (() => {
                        const agreementName = agreements.find((item) => String(item.id) === agreementDiscount.agreement_id)?.agreement_name || agreementDiscount.organization_name;
                        const discountAmount = closingTotals.base > 0 && agreementDiscountPercent > 0
                          ? Math.round(closingTotals.base * agreementDiscountPercent / 100)
                          : null;
                        return (
                          <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/40">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                                  {agreementName}
                                  {agreementDiscountPercent > 0 && <span className="ml-1.5 font-normal normal-case">({agreementDiscountPercent}%)</span>}
                                </div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                  <span className="font-mono text-xs text-blue-700 dark:text-blue-300">{agreementDiscount.associate_identifier}</span>
                                  {agreementDiscount.associate_name && (
                                    <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">— {agreementDiscount.associate_name}</span>
                                  )}
                                </div>
                              </div>
                              {discountAmount !== null && (
                                <div className="shrink-0 text-right">
                                  <div className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white">-{agreementDiscountPercent}%</div>
                                  <div className="mt-1 text-sm font-semibold tabular-nums text-blue-800 dark:text-blue-200">{money(discountAmount)}</div>
                                </div>
                              )}
                            </div>
                            {!agreementDiscountValid && (
                              <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">Completa empresa, RUT/codigo y porcentaje para aplicar el convenio.</p>
                            )}
                          </div>
                        );
                      })()}
                      {agreementDiscount.enabled && !agreementDiscount.organization_name && (
                        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Selecciona un beneficiario para aplicar el descuento de convenio.</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-center gap-2">
                  <Repeat2 className="h-5 w-5 text-blue-600" />
                  <h2 className="text-sm font-semibold">Cambio Divisa</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">Divisa destino</span>
                    <select
                      className={fieldClassName}
                      value={selectedExchangeRate?.currency_code || ''}
                      onChange={(e) => setCurrencyCode(e.target.value)}
                      disabled={availableExchangeRates.length === 0 || isClosed}
                    >
                      {availableExchangeRates.length === 0 && <option value="">Sin tasas disponibles</option>}
                      {availableExchangeRates.map((rate) => (
                        <option key={rate.currency_code} value={rate.currency_code}>{rate.currency_code} - {rate.currency_name}</option>
                      ))}
                    </select>
                  </label>
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="text-xs text-slate-500">Total convertido</div>
                    <div className="mt-1 text-lg font-bold tabular-nums text-slate-950 dark:text-white">
                      {selectedExchangeRate ? formatMoney(convertedTotal, selectedExchangeRate.currency_code) : 'Sin tasa'}
                    </div>
                    {selectedExchangeRate && (
                      <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                        <div>Mercado: 1 {selectedExchangeRate.currency_code} = {money(marketRateValue(selectedExchangeRate))}</div>
                        <div>Fee: {feeValue(selectedExchangeRate).toLocaleString('es-CL')}%</div>
                        <div>Tasa aplicada: 1 {selectedExchangeRate.currency_code} = {money(rateValue(selectedExchangeRate))}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex min-h-48 flex-col rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                  <h2 className="text-sm font-semibold">Resumen caja</h2>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">{isReturnDocument ? 'Credito devolucion' : isExchangeDocument ? 'Total cambio' : 'Total venta'}</span><span className="font-medium tabular-nums">{money(Math.abs(closingTotals.base))}</span></div>
                  {isClosed ? (
                    <>
                      {Number(selectedSale.document_discount_amount || 0) > 0 && (
                        <div className="flex justify-between"><span className="text-slate-500">Descuento manual</span><span className="font-medium tabular-nums text-amber-600 dark:text-amber-400">-{money(selectedSale.document_discount_amount)}</span></div>
                      )}
                      {Number(selectedSale.agreement_discount_amount || 0) > 0 && (
                        <div className="flex justify-between"><span className="text-slate-500">Descuento convenio</span><span className="font-medium tabular-nums text-blue-600 dark:text-blue-400">-{money(selectedSale.agreement_discount_amount)}</span></div>
                      )}
                    </>
                  ) : (
                    <>
                      {closingTotals.manualDiscount > 0 && (
                        <div className="flex justify-between"><span className="text-slate-500">Descuento manual</span><span className="font-medium tabular-nums text-amber-600 dark:text-amber-400">-{money(closingTotals.manualDiscount)}</span></div>
                      )}
                      {closingTotals.agreementDiscountAmount > 0 && (
                        <div className="flex justify-between"><span className="text-slate-500">Descuento convenio</span><span className="font-medium tabular-nums text-blue-600 dark:text-blue-400">-{money(closingTotals.agreementDiscountAmount)}</span></div>
                      )}
                    </>
                  )}
                </div>
                <div className="mt-auto flex justify-between border-t border-slate-200 pt-3 text-base font-bold dark:border-slate-800">
                  <span>{closingTotals.total < 0 ? (isExchangeDocument ? 'Credito no utilizado' : 'Monto a devolver') : 'Total a pagar'}</span>
                  <span>{money(Math.abs(isClosed ? selectedSale.total_amount : closingTotals.total))}</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-auto">
            <BottomActionBar
              leftContent={
                noOpenSession
                  ? 'No hay caja abierta. Abre una sesión de caja para poder cobrar.'
                  : selectedSale && !isClosed
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
