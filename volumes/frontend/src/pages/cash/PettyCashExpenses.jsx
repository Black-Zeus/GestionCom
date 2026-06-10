/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Eye, FileText, Pencil, Plus, RefreshCw, ReceiptText, Trash2, UploadCloud, XCircle } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import StatusBadge from '@/components/common/data/StatusBadge';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import { pettyCashService } from '@/services/cash/pettyCashService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useAuthStore } from '@/store/useAuthStore';

const CROSS_FUND_PERMISSIONS = ['PETTY_CASH_APPROVE', 'PETTY_CASH_EXPENSES_APPROVE', 'PETTY_CASH_FUNDS_MANAGE', 'PETTY_CASH_MANAGE'];
import { formatDateTime } from '@/utils/dateTime';
import { tableFooter } from '@/pages/admin/businessFoundationShared';

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const selectClassName = `${fieldClassName} bg-white dark:bg-slate-950`;
const textareaClassName = 'min-h-24 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950';
const acceptedReceiptTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const maxReceiptSize = 10 * 1024 * 1024;

const statusMap = {
  PENDING: { label: 'Pendiente', variant: 'warning' },
  APPROVED: { label: 'Aprobado', variant: 'active' },
  REJECTED: { label: 'Rechazado', variant: 'danger' },
};

const emptyForm = {
  petty_cash_fund_id: '',
  category_id: '',
  expense_amount: '',
  expense_description: '',
  vendor_name: '',
  expense_date: new Date().toISOString().slice(0, 10),
  has_receipt: false,
  evidence_file: null,
};

const money = (value) => Number(value || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const formatAmountInput = (value) => {
  if (value === null || value === undefined || value === '') return '';
  return Number(value || 0).toLocaleString('es-CL', { maximumFractionDigits: 0 });
};
const parseLocalizedAmount = (value) => {
  if (typeof value === 'number') return value;
  const text = String(value || '').trim().replace(/\$/g, '').replace(/CLP/gi, '').replace(/\s/g, '');
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
  return Number(normalized);
};
const personName = (item, prefix = 'responsible') => [item?.[`${prefix}_first_name`], item?.[`${prefix}_last_name`]].filter(Boolean).join(' ') || item?.[`${prefix}_username`] || '-';
const fundLabel = (fund) => `${personName(fund)} - ${fund.warehouse_name || 'Sin local'}`;
const hasEvidence = (expense) => Boolean(expense?.has_receipt && expense?.evidence_file_hash);

const expenseToForm = (expense) => ({
  petty_cash_fund_id: expense?.petty_cash_fund_id ? String(expense.petty_cash_fund_id) : '',
  category_id: expense?.category_id ? String(expense.category_id) : '',
  expense_amount: formatAmountInput(expense?.expense_amount),
  expense_description: expense?.expense_description || '',
  vendor_name: expense?.vendor_name || '',
  expense_date: expense?.expense_date || new Date().toISOString().slice(0, 10),
  has_receipt: Boolean(expense?.has_receipt),
  evidence_file: null,
});

const ExpenseForm = ({ funds = [], categories = [], vendorOptions = [], initialValues = emptyForm, existingEvidence = null, submitLabel = 'Registrar gasto', onSubmit, onClose }) => {
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const receiptInputRef = useRef(null);
  const isFirstCategoryRender = useRef(true);
  const singleFund = funds.length === 1 ? funds[0] : null;
  const selectedCategory = categories.find((category) => String(category.id) === String(form.category_id));
  const hasExistingEvidence = Boolean(existingEvidence?.evidence_file_hash);
  const categoryRequiresEvidence = Boolean(selectedCategory?.requires_evidence);
  const missingReferences = [];
  if (!funds.length) missingReferences.push('No tienes fondos vigentes asignados para registrar gastos.');
  if (!categories.length) missingReferences.push('No hay categorias activas de caja chica.');

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    if (isFirstCategoryRender.current) {
      isFirstCategoryRender.current = false;
      if (categoryRequiresEvidence) update('has_receipt', true);
      return;
    }
    update('has_receipt', categoryRequiresEvidence ? true : false);
    update('evidence_file', null);
  }, [form.category_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const setReceiptFile = (file) => {
    setError('');
    if (!file) {
      update('evidence_file', null);
      return;
    }
    if (!acceptedReceiptTypes.includes(file.type)) {
      setError('El comprobante debe ser PDF, JPG, PNG o WebP.');
      return;
    }
    if (file.size > maxReceiptSize) {
      setError('El comprobante no puede superar 10 MB.');
      return;
    }
    update('evidence_file', file);
  };

  const handleReceiptDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (!form.has_receipt) return;
    setReceiptFile(event.dataTransfer.files?.[0] || null);
  };

  useEffect(() => {
    if (singleFund) {
      setForm((current) => ({ ...current, petty_cash_fund_id: String(singleFund.id) }));
    }
  }, [singleFund]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const expenseAmount = parseLocalizedAmount(form.expense_amount);
    if (!form.petty_cash_fund_id || !form.category_id || expenseAmount <= 0 || form.expense_description.trim().length < 3) {
      setError('Selecciona fondo, categoria, monto y descripcion.');
      return;
    }
    if (selectedCategory?.max_amount_per_expense != null && expenseAmount > Number(selectedCategory.max_amount_per_expense)) {
      setError(`La categoria ${selectedCategory.category_name} permite hasta ${money(selectedCategory.max_amount_per_expense)} por gasto.`);
      return;
    }
    if (selectedCategory?.requires_evidence && !form.has_receipt) {
      setError('La categoria seleccionada requiere comprobante.');
      return;
    }
    if (form.has_receipt && !form.evidence_file && !hasExistingEvidence) {
      setError('Adjunta el comprobante en PDF o imagen.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        petty_cash_fund_id: Number(form.petty_cash_fund_id),
        category_id: Number(form.category_id),
        expense_amount: expenseAmount,
        expense_description: form.expense_description.trim(),
        vendor_name: form.vendor_name.trim() || null,
        expense_date: form.expense_date,
        has_receipt: Boolean(form.has_receipt),
        evidence_file: form.evidence_file,
      });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">Fondo</span>
          {singleFund ? (
            <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
              <span className="font-medium text-slate-900 dark:text-slate-100">{fundLabel(singleFund)}</span>
              <span className="text-slate-500">Saldo {money(singleFund.current_balance)}</span>
            </div>
          ) : (
            <select className={selectClassName} value={form.petty_cash_fund_id} onChange={(event) => update('petty_cash_fund_id', event.target.value)} required disabled={!funds.length}>
              <option value="">Selecciona fondo</option>
              {funds.map((fund) => <option key={fund.id} value={fund.id}>{fundLabel(fund)} / saldo {money(fund.current_balance)}</option>)}
            </select>
          )}
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Categoria</span>
          <select className={selectClassName} value={form.category_id} onChange={(event) => update('category_id', event.target.value)} required disabled={!categories.length}>
            <option value="">Selecciona categoria</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.category_name}</option>)}
          </select>
          {selectedCategory?.max_amount_per_expense != null && (
            <span className="block text-xs text-slate-500">Maximo por gasto: {money(selectedCategory.max_amount_per_expense)}</span>
          )}
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Monto</span>
          <input className={fieldClassName} type="text" inputMode="numeric" value={form.expense_amount} onChange={(event) => update('expense_amount', event.target.value)} placeholder="Ej: 50.000" required />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Fecha</span>
          <input className={fieldClassName} type="date" value={form.expense_date} onChange={(event) => update('expense_date', event.target.value)} required />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Proveedor / comercio</span>
          <AutocompleteSelect
            value={form.vendor_name}
            onChange={(value) => update('vendor_name', value)}
            options={vendorOptions}
            placeholder="Escribe o selecciona comercio"
            searchPlaceholder="Buscar o escribir comercio"
            clearable
            allowCustom
            customOptionLabel="Usar comercio"
          />
        </label>
        <label className={`flex min-h-16 items-center gap-2 rounded-md border px-3 text-sm transition-colors ${form.has_receipt ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950'} ${categoryRequiresEvidence ? 'cursor-not-allowed opacity-80' : ''}`}>
          <input
            type="checkbox"
            checked={form.has_receipt}
            disabled={categoryRequiresEvidence}
            onChange={(event) => setForm((current) => ({ ...current, has_receipt: event.target.checked, evidence_file: event.target.checked ? current.evidence_file : null }))}
            className="h-4 w-4 rounded border-slate-300 disabled:cursor-not-allowed"
          />
          <span>
            Tiene comprobante
            {categoryRequiresEvidence && <span className="ml-1 text-xs text-blue-600 dark:text-blue-400">(requerido por categoria)</span>}
          </span>
        </label>
        <div className={`overflow-hidden transition-all duration-200 ${form.has_receipt ? 'max-h-32 opacity-100' : 'max-h-16 opacity-80'}`}>
          <div className="group relative">
            <button
              type="button"
              disabled={!form.has_receipt}
              onClick={() => receiptInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                if (form.has_receipt) setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleReceiptDrop}
              className={`flex min-h-16 w-full items-center gap-3 rounded-md border border-dashed px-3 py-2 pr-10 text-left text-sm transition ${
                form.has_receipt
                  ? `${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40' : 'border-slate-300 bg-white hover:border-blue-400 dark:border-slate-700 dark:bg-slate-950'} cursor-pointer`
                  : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${form.evidence_file ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
                {form.evidence_file ? <FileText className="h-5 w-5" /> : <UploadCloud className="h-5 w-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate font-medium ${form.has_receipt ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
                  {form.evidence_file?.name || (hasExistingEvidence && form.has_receipt ? existingEvidence.evidence_original_filename || 'Comprobante cargado' : form.has_receipt ? 'Arrastra o haz clic para cargar comprobante' : 'Activa comprobante para cargar archivo')}
                </span>
                <span className="block text-xs text-slate-500">PDF, JPG, PNG o WebP. Maximo 10 MB.</span>
              </span>
            </button>
            {(form.evidence_file || (hasExistingEvidence && form.has_receipt)) && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setForm((current) => ({ ...current, evidence_file: null, has_receipt: false }));
                  if (receiptInputRef.current) receiptInputRef.current.value = '';
                }}
                className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 opacity-0 shadow-sm transition hover:bg-red-50 group-hover:opacity-100 dark:border-red-900 dark:bg-slate-950 dark:hover:bg-red-950/40"
                aria-label="Eliminar adjunto seleccionado"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <input
            ref={receiptInputRef}
            className="hidden"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(event) => setReceiptFile(event.target.files?.[0] || null)}
          />
        </div>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">Descripcion</span>
          <textarea className={textareaClassName} value={form.expense_description} onChange={(event) => update('expense_description', event.target.value)} required />
        </label>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 md:flex-row md:items-start md:justify-between">
        <div className="min-h-10 flex-1">
          {missingReferences.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
              {missingReferences.map((message) => <div key={message}>{message}</div>)}
            </div>
          )}
          {!missingReferences.length && error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancelar</button>
          <button type="submit" disabled={saving || missingReferences.length > 0} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">{saving ? 'Guardando...' : submitLabel}</button>
        </div>
      </div>
    </form>
  );
};

const EvidencePreviewModal = ({ evidence, expense, onClose }) => {
  const isPdf = evidence?.mime_type === 'application/pdf' || String(evidence?.extension || '').toLowerCase() === 'pdf';
  const isImage = String(evidence?.mime_type || '').startsWith('image/');
  return (
    <div className="mx-auto my-[5vh] flex max-h-[90vh] w-full flex-col space-y-4 overflow-hidden">
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="font-medium text-slate-900 dark:text-slate-100">{expense?.category_name}</div>
        <div className="text-slate-500">{evidence?.file_name || 'Comprobante'} / {String(evidence?.extension || '').toUpperCase()} / {Number(evidence?.size || 0).toLocaleString('es-CL')} bytes</div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
        {isImage && <img src={evidence.url} alt={evidence.file_name || 'Comprobante'} className="h-full w-full object-contain" />}
        {isPdf && <iframe title={evidence.file_name || 'Comprobante PDF'} src={evidence.url} className="h-full w-full border-0" />}
        {!isImage && !isPdf && (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">
            No hay preview disponible para este tipo de archivo.
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <a href={evidence.url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Abrir en pestaña</a>
        <button type="button" onClick={onClose} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white dark:bg-white dark:text-slate-950">Cerrar</button>
      </div>
    </div>
  );
};

const RejectExpenseModal = ({ expense, onSubmit, onClose }) => {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (reason.trim().length < 3) {
      setError('Indica un motivo de rechazo.');
      return;
    }
    setSaving(true);
    try {
      const result = await onSubmit(reason.trim());
      if (result !== false) onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="font-medium text-slate-900 dark:text-slate-100">{expense.category_name}</div>
        <div className="text-slate-500">Monto: {money(expense.expense_amount)}</div>
      </div>
      <label className="space-y-1 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">Motivo de rechazo</span>
        <textarea className={textareaClassName} value={reason} onChange={(event) => setReason(event.target.value)} required />
      </label>
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancelar</button>
        <button type="submit" disabled={saving} className="h-10 rounded-md bg-red-600 px-4 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Rechazando...' : 'Rechazar gasto'}</button>
      </div>
    </form>
  );
};

const PettyCashExpenses = () => {
  const timezone = usePreferencesStore((state) => state.timezone);
  const hourFormat = usePreferencesStore((state) => state.hourFormat);
  const canSeeOtherFunds = useAuthStore((state) => state.hasAnyPermission(CROSS_FUND_PERMISSIONS));
  const [expenses, setExpenses] = useState([]);
  const [funds, setFunds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [responsableFilter, setResponsableFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextExpenses, nextFunds, nextCategories, nextVendors] = await Promise.all([
        pettyCashService.listExpenses(),
        pettyCashService.listFunds({ limit: 1000 }),
        pettyCashService.listCategories({ limit: 1000 }),
        pettyCashService.listVendors({ limit: 1000 }),
      ]);
      setExpenses(nextExpenses);
      setFunds(nextFunds);
      setCategories(nextCategories);
      setVendors(nextVendors);
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar gastos de caja chica.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [search, statusFilter, warehouseFilter, responsableFilter, pageSize]);

  const canSeeResponsableFilter = canSeeOtherFunds;

  const warehouseOptions = useMemo(() => {
    const seen = new Set();
    return expenses
      .map((e) => e.warehouse_name)
      .filter((name) => name && !seen.has(name) && seen.add(name))
      .sort()
      .map((name) => ({ value: name, label: name }));
  }, [expenses]);

  const responsableOptions = useMemo(() => {
    const seen = new Set();
    return expenses
      .map((e) => personName(e, 'responsible'))
      .filter((name) => name && name !== '-' && !seen.has(name) && seen.add(name))
      .sort()
      .map((name) => ({ value: name, label: name }));
  }, [expenses]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return expenses.filter((expense) => {
      const matchesStatus = statusFilter === 'all' || expense.expense_status === statusFilter;
      const matchesWarehouse = !warehouseFilter || expense.warehouse_name === warehouseFilter;
      const matchesResponsable = !responsableFilter || personName(expense, 'responsible') === responsableFilter;
      const haystack = [
        expense.category_name,
        expense.expense_description,
        expense.vendor_name,
        expense.warehouse_name,
        personName(expense, 'responsible'),
        personName(expense, 'created_by'),
      ].filter(Boolean).join(' ').toLowerCase();
      return matchesStatus && matchesWarehouse && matchesResponsable && (!term || haystack.includes(term));
    });
  }, [expenses, search, statusFilter, warehouseFilter, responsableFilter]);

  const stats = useMemo(() => ({
    total: expenses.length,
    pending: expenses.filter((item) => item.expense_status === 'PENDING').length,
    approved: expenses.filter((item) => item.expense_status === 'APPROVED').length,
    amount: expenses.filter((item) => item.expense_status !== 'REJECTED').reduce((sum, item) => sum + Number(item.expense_amount || 0), 0),
  }), [expenses]);

  const vendorOptions = useMemo(() => vendors.map((vendor) => ({
    value: vendor.vendor_name,
    label: vendor.vendor_name,
  })), [vendors]);

  const openCreate = () => ModalManager.show({
    type: 'custom',
    title: 'Registrar gasto de caja chica',
    size: 'large',
    showFooter: false,
    contentComponent: ExpenseForm,
    contentProps: {
      funds,
      categories,
      vendorOptions,
      onSubmit: async (payload) => {
        await notifyPromise(pettyCashService.createExpense(payload), {
          loading: 'Registrando gasto...',
          success: 'Gasto registrado.',
          error: (requestError) => getBackendMessage(requestError, 'No fue posible registrar el gasto.'),
        });
        await load();
      },
    },
  });

  const openEdit = (expense) => ModalManager.show({
    type: 'custom',
    title: 'Editar gasto de caja chica',
    size: 'large',
    showFooter: false,
    contentComponent: ExpenseForm,
    contentProps: {
      funds,
      categories,
      vendorOptions,
      initialValues: expenseToForm(expense),
      existingEvidence: expense,
      submitLabel: 'Guardar cambios',
      onSubmit: async (payload) => {
        await notifyPromise(pettyCashService.updateExpense(expense.id, payload), {
          loading: 'Actualizando gasto...',
          success: 'Gasto actualizado.',
          error: (requestError) => getBackendMessage(requestError, 'No fue posible actualizar el gasto.'),
        });
        await load();
      },
    },
  });

  const approve = async (expense) => {
    const confirmed = await ModalManager.confirm({ title: 'Aprobar gasto', message: `Confirma aprobar el gasto de ${money(expense.expense_amount)} en ${expense.category_name}.`, buttons: { cancel: 'Cancelar', confirm: 'Aprobar' } });
    if (!confirmed) return;
    setBusyId(expense.id);
    try {
      await notifyPromise(pettyCashService.approveExpense(expense.id), {
        loading: 'Aprobando gasto...',
        success: 'Gasto aprobado.',
        error: (requestError) => getBackendMessage(requestError, 'No fue posible aprobar el gasto.'),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (expense) => {
    ModalManager.show({
      type: 'custom',
      title: 'Rechazar gasto',
      size: 'medium',
      showFooter: false,
      contentComponent: RejectExpenseModal,
      contentProps: {
        expense,
        onSubmit: async (reason) => {
          const confirmed = await ModalManager.confirm({ title: 'Confirmar rechazo', message: `El monto ${money(expense.expense_amount)} volvera al saldo del fondo.`, buttons: { cancel: 'Cancelar', confirm: 'Rechazar' } });
          if (!confirmed) return false;
          setBusyId(expense.id);
          try {
            await notifyPromise(pettyCashService.rejectExpense(expense.id, { rejection_reason: reason }), {
              loading: 'Rechazando gasto...',
              success: 'Gasto rechazado.',
              error: (requestError) => getBackendMessage(requestError, 'No fue posible rechazar el gasto.'),
            });
            await load();
            return true;
          } finally {
            setBusyId(null);
          }
        },
      },
    });
  };

  const viewEvidence = async (expense) => {
    if (!hasEvidence(expense)) return;
    setBusyId(`evidence-${expense.id}`);
    try {
      const evidence = await pettyCashService.getExpenseEvidence(expense.id);
      ModalManager.show({
        type: 'custom',
        title: 'Evidencia de caja chica',
        size: 'fullscreenWide',
        showFooter: false,
        contentComponent: EvidencePreviewModal,
        contentProps: { evidence, expense },
      });
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible abrir la evidencia.'));
    } finally {
      setBusyId(null);
    }
  };

  const visibleData = filtered.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Gastos de caja chica"
        description="Registro y revision operativa de gastos menores contra fondos asignados."
        actions={[{ id: 'new-expense', label: 'Registrar gasto', icon: Plus, onClick: openCreate }]}
      />
      <KpiBar
        className="mb-4"
        items={[
          { label: 'Gastos', value: stats.total, active: statusFilter === 'all', onClick: () => setStatusFilter('all') },
          { label: 'Pendientes', value: stats.pending, active: statusFilter === 'PENDING', onClick: () => setStatusFilter('PENDING') },
          { label: 'Aprobados', value: stats.approved, active: statusFilter === 'APPROVED', onClick: () => setStatusFilter('APPROVED') },
          { label: 'Monto vigente', value: money(stats.amount), disabled: true },
        ]}
      />
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <FilterBar
        className="mb-4"
        searchValue={search}
        searchPlaceholder="Buscar categoria, descripcion o comercio"
        onSearchChange={setSearch}
        gridClassName={canSeeResponsableFilter ? 'lg:grid-cols-[minmax(280px,1fr)_180px_180px_180px_auto_auto]' : 'lg:grid-cols-[minmax(280px,1fr)_180px_180px_auto_auto]'}
        fields={[
          { id: 'warehouse', value: warehouseFilter, onChange: setWarehouseFilter, options: warehouseOptions, placeholder: 'Local / Bodega', clearable: true },
          ...(canSeeResponsableFilter ? [{ id: 'responsable', value: responsableFilter, onChange: setResponsableFilter, options: responsableOptions, placeholder: 'Responsable', clearable: true }] : []),
          { id: 'status', value: statusFilter, onChange: setStatusFilter, options: [{ value: 'all', label: 'Todos los estados' }, ...Object.entries(statusMap).map(([value, item]) => ({ value, label: item.label }))] },
        ]}
        actions={<><ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={load} className={loading ? '[&>svg]:animate-spin' : ''} /><ActionButton label="Limpiar" icon={XCircle} variant="neutral" onClick={() => { setSearch(''); setStatusFilter('all'); setWarehouseFilter(''); setResponsableFilter(''); }} /></>}
      />
      <DataTable
        loading={loading}
        data={visibleData}
        footer={tableFooter({ page, pageSize, total: filtered.length, loading, setPage, setPageSize })}
        columns={[
          { id: 'expense', label: 'Gasto', render: (item) => <><div className="font-medium">{item.category_name}</div><div className="text-xs text-slate-500">{item.expense_description}</div></> },
          { id: 'responsible', label: 'Responsable', render: (item) => personName(item, 'responsible') },
          { id: 'warehouse', label: 'Local / Bodega', render: (item) => item.warehouse_name || '-' },
          { id: 'amount', label: 'Monto', align: 'right', render: (item) => money(item.expense_amount) },
          { id: 'evidence', label: 'Adjunto', render: (item) => <div><StatusBadge variant={hasEvidence(item) ? 'active' : 'inactive'} icon={ReceiptText}>{hasEvidence(item) ? 'Si' : 'No'}</StatusBadge>{item.evidence_file_extension && <div className="mt-1 text-xs text-slate-500">{String(item.evidence_file_extension).toUpperCase()} / {Number(item.evidence_file_size || 0).toLocaleString('es-CL')} bytes</div>}</div> },
          { id: 'status', label: 'Estado', render: (item) => <StatusBadge variant={statusMap[item.expense_status]?.variant || 'neutral'}>{statusMap[item.expense_status]?.label || item.expense_status}</StatusBadge> },
          { id: 'date', label: 'Fecha', render: (item) => formatDateTime(item.created_at, timezone, { hourFormat }) },
          { id: 'actions', label: 'Acciones', align: 'right', render: (item) => (
            <div className="flex justify-end gap-2">
              <RowActionButton label="Ver evidencia" icon={Eye} disabled={!hasEvidence(item) || busyId === `evidence-${item.id}`} onClick={() => viewEvidence(item)} />
              {item.expense_status === 'PENDING' && (
                <>
                  <RowActionButton label="Editar" icon={Pencil} disabled={busyId === item.id} onClick={() => openEdit(item)} />
                  <RowActionButton label="Aprobar" icon={CheckCircle2} disabled={busyId === item.id} onClick={() => approve(item)} />
                  <RowActionButton label="Rechazar" icon={XCircle} disabled={busyId === item.id} variant="danger" onClick={() => reject(item)} />
                </>
              )}
            </div>
          ) },
        ]}
      />
    </section>
  );
};

export default PettyCashExpenses;
