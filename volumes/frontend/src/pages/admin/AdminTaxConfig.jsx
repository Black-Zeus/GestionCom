import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import { RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import SimpleFormContent from '@/components/common/forms/SimpleFormContent';
import { businessFoundationService } from '@/services/admin/businessFoundationService';
import { getBackendMessage, notifyPromise } from '@/services/ui/notify';
import { activeFilter, fieldOptions, filterActions, includesTerm, statusCell, tableFooter } from './businessFoundationShared';

const taxTypeLabels = { VAT: 'IVA', EXEMPT: 'Exento', ADDITIONAL: 'Adicional', WITHHOLDING: 'Retencion', OTHER: 'Otro' };

const today = () => new Date().toISOString().slice(0, 10);

const AdminTaxConfig = () => {
  const [taxes, setTaxes] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setTaxes(await businessFoundationService.taxes.list({ active_only: false }));
    } catch (requestError) {
      setError(getBackendMessage(requestError, 'No fue posible cargar impuestos.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(0); }, [search, status, pageSize]);

  const filteredTaxes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return taxes.filter((tax) => activeFilter(status)(tax) && includesTerm(tax, ['tax_code', 'tax_name', 'tax_type'], term));
  }, [search, status, taxes]);
  const visibleTaxes = filteredTaxes.slice(page * pageSize, page * pageSize + pageSize);

  const openForm = (tax = null) => ModalManager.show({
    type: 'custom',
    title: tax ? 'Editar impuesto' : 'Nuevo impuesto',
    size: 'medium',
    showFooter: false,
    contentComponent: SimpleFormContent,
    contentProps: {
      initialValues: tax ? { tax_code: tax.tax_code, tax_name: tax.tax_name, tax_type: tax.tax_type, rate_percentage: tax.rate_percentage, valid_from: tax.valid_from, valid_to: tax.valid_to || '', is_default: tax.is_default, is_active: tax.is_active } : { tax_name: '', tax_type: 'VAT', rate_percentage: 0, valid_from: today(), valid_to: '', is_default: false, is_active: true },
      fields: [
        ...(tax ? [{ id: 'tax_code', label: 'Codigo', readOnly: true, disabled: true }] : []),
        { id: 'tax_name', label: 'Nombre', required: true },
        { id: 'tax_type', label: 'Tipo', type: 'select', options: Object.entries(taxTypeLabels).map(([value, label]) => ({ value, label })) },
        { id: 'rate_percentage', label: 'Tasa %', type: 'number', min: 0, required: true },
        { id: 'valid_from', label: 'Vigente desde', type: 'date', required: true },
        { id: 'valid_to', label: 'Vigente hasta', type: 'date' },
        { id: 'is_default', label: 'Defecto', type: 'checkbox', checkLabel: 'Impuesto por defecto' },
        { id: 'is_active', label: 'Estado', type: 'checkbox', checkLabel: 'Activo' },
      ],
      onSubmit: async (form) => {
        const payload = { ...form, rate_percentage: Number(form.rate_percentage || 0), valid_to: form.valid_to || null };
        delete payload.tax_code;
        await notifyPromise(tax ? businessFoundationService.taxes.update(tax.id, payload) : businessFoundationService.taxes.create(payload), {
          loading: 'Guardando impuesto...',
          success: 'Impuesto guardado.',
          error: (requestError) => getBackendMessage(requestError, 'No fue posible guardar.'),
        });
        await load();
      },
    },
  });

  const remove = async (tax) => {
    if (!await ModalManager.confirm({ title: 'Eliminar impuesto', message: `Confirma eliminar ${tax.tax_name}.`, buttons: { cancel: 'Cancelar', confirm: 'Eliminar' } })) return;
    await notifyPromise(businessFoundationService.taxes.remove(tax.id), { loading: 'Eliminando...', success: 'Impuesto eliminado.', error: (requestError) => getBackendMessage(requestError, 'No fue posible eliminar.') });
    await load();
  };

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Configuracion de impuestos"
        description="Tasas y vigencias para ventas y documentos."
        actions={[{ id: 'new-tax', label: 'Nuevo impuesto', icon: Plus, onClick: () => openForm() }]}
      />
      <KpiBar items={[{ label: 'Total', value: taxes.length }, { label: 'Activos', value: taxes.filter((item) => item.is_active).length }, { label: 'Defecto', value: taxes.filter((item) => item.is_default).length }, { label: 'IVA', value: taxes.filter((item) => item.tax_type === 'VAT').length }]} className="mb-4" />
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <FilterBar className="mb-4" searchValue={search} searchPlaceholder="Buscar impuesto o codigo" onSearchChange={setSearch} fields={[{ id: 'status', value: status, onChange: setStatus, options: fieldOptions.status }]} actions={filterActions({ loading, onRefresh: load, onClear: () => { setSearch(''); setStatus('all'); } })} />
      <DataTable
        loading={loading}
        data={visibleTaxes}
        footer={tableFooter({ page, pageSize, total: filteredTaxes.length, loading, setPage, setPageSize })}
        columns={[
          { id: 'tax', label: 'Impuesto', render: (item) => <><div className="font-medium">{item.tax_name}</div><div className="font-mono text-xs text-slate-500">{item.tax_code}</div></> },
          { id: 'type', label: 'Tipo', render: (item) => taxTypeLabels[item.tax_type] || item.tax_type },
          { id: 'rate', label: 'Tasa', render: (item) => `${Number(item.rate_percentage || 0).toFixed(2)}%` },
          { id: 'validity', label: 'Vigencia', render: (item) => `${item.valid_from || '-'} / ${item.valid_to || 'sin termino'}` },
          { id: 'default', label: 'Defecto', render: (item) => item.is_default ? <span className="inline-flex items-center gap-1 text-sm text-blue-700"><Receipt className="h-4 w-4" /> Si</span> : 'No' },
          { id: 'status', label: 'Estado', render: (item) => statusCell(item.is_active) },
          { id: 'actions', label: 'Acciones', align: 'right', render: (item) => <div className="flex justify-end gap-2"><RowActionButton label="Editar" icon={Pencil} onClick={() => openForm(item)} /><RowActionButton label="Eliminar" icon={Trash2} variant="danger" onClick={() => remove(item)} /></div> },
        ]}
      />
    </section>
  );
};

export default AdminTaxConfig;
