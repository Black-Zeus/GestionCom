/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  PackagePlus,
  Save,
  Search,
  Send,
  Trash2,
  UserRound,
  XCircle,
} from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import FilterBar from '@/components/common/data/FilterBar';
import DataTable from '@/components/common/data/DataTable';
import StatusBadge from '@/components/common/data/StatusBadge';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import { adminMaintainersService } from '@/services/admin/adminMaintainersService';
import { businessFoundationService } from '@/services/admin/businessFoundationService';
import { getBackendMessage, toast } from '@/services/ui/notify';
import { useAuthStore } from '@/store/useAuthStore';
import { useSessionStore } from '@/store/useSessionStore';
import { tableFooter } from '@/pages/admin/businessFoundationShared';

const DRAFT_KEY = 'gestioncom.sales.new.draft';
const PENDING_KEY = 'gestioncom.sales.pending';

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const compactFieldClassName = 'h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950';

const money = (value) => Number(value || 0).toLocaleString('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const normalize = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/\p{Mn}/gu, '');

const customerName = (customer) => (
  customer?.commercial_name
  || customer?.legal_name
  || customer?.customer_name
  || customer?.name
  || customer?.customer_code
  || 'Cliente'
);

const customerTaxId = (customer) => customer?.tax_id || customer?.document_number || customer?.rut || '';

const productKey = (product) => [
  product.price_item_id || product.id || product.product_id,
  product.product_variant_id || product.variant_id || product.variant_sku || '',
  product.measurement_unit_id || product.unit_id || '',
].join(':');

const productCode = (product) => product.variant_sku || product.product_code || product.sku || '-';
const productName = (product) => product.variant_name || product.product_name || product.name || 'Producto';
const productPrice = (product) => Number(product.sale_price ?? product.base_price ?? product.price ?? 0);
const productStock = (product) => Number(product.total_stock ?? product.stock_quantity ?? product.available_stock ?? 0);

const buildDraft = ({ customer, authorizedBuyer, items, documentDiscount }) => ({
  customer,
  authorizedBuyer,
  items,
  documentDiscount,
  saved_at: new Date().toISOString(),
});

const CustomerSearchPanel = ({ customers, search, setSearch, selectedCustomer, onSelect, loading }) => {
  const filteredCustomers = useMemo(() => {
    const term = normalize(search);
    return customers
      .filter((customer) => !term || [
        customerName(customer),
        customerTaxId(customer),
        customer.customer_code,
        customer.email,
      ].some((value) => normalize(value).includes(term)))
      .slice(0, 8);
  }, [customers, search]);

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Cliente</h2>
          <p className="text-xs text-slate-500">Busca por RUT, nombre o codigo.</p>
        </div>
        {selectedCustomer && <StatusBadge variant="active">Seleccionado</StatusBadge>}
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <input
          className={`${fieldClassName} pl-9`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={loading ? 'Cargando clientes...' : 'Buscar cliente'}
        />
      </div>
      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
        {filteredCustomers.map((customer) => {
          const active = selectedCustomer?.id === customer.id;
          return (
            <button
              key={customer.id || customer.customer_code}
              type="button"
              onClick={() => onSelect(customer)}
              className={`w-full rounded-md border px-3 py-2 text-left transition ${active ? 'border-blue-300 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium text-slate-950 dark:text-white">{customerName(customer)}</span>
                <span className="font-mono text-xs text-slate-500">{customer.customer_code || customerTaxId(customer)}</span>
              </div>
              <div className="mt-0.5 text-xs text-slate-500">{customerTaxId(customer) || 'Sin RUT'}{customer.email ? ` · ${customer.email}` : ''}</div>
            </button>
          );
        })}
        {!loading && filteredCustomers.length === 0 && (
          <div className="rounded-md border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500 dark:border-slate-700">
            Sin clientes para la busqueda actual.
          </div>
        )}
      </div>
    </div>
  );
};

const AuthorizedBuyerSelect = ({ customer, buyers, value, onChange }) => {
  if (!customer) return null;
  const requiresBuyer = Number(customer.is_credit_customer) === 1 || customer.is_credit_customer === true || customer.customer_type === 'COMPANY';
  if (!requiresBuyer) return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
      Cliente sin comprador autorizado requerido.
    </div>
  );

  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-slate-700 dark:text-slate-200">Persona que realiza la compra</span>
      <select className={fieldClassName} value={value?.id || ''} onChange={(event) => onChange(buyers.find((buyer) => String(buyer.id) === event.target.value) || null)}>
        <option value="">Selecciona persona autorizada</option>
        {buyers.map((buyer) => (
          <option key={buyer.id} value={buyer.id}>
            {buyer.authorized_name || buyer.full_name || buyer.name} {buyer.authorized_tax_id ? `(${buyer.authorized_tax_id})` : ''}
          </option>
        ))}
      </select>
    </label>
  );
};

const ProductSelectionModal = ({ products = [], onSelect, onClose }) => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const visibleProducts = products.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div className="flex max-h-[calc(90vh-7.5rem)] min-h-0 flex-col gap-4">
      <div className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Productos encontrados</div>
        <div className="text-xs text-slate-500">Selecciona el producto que se cargara a la venta.</div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <DataTable
          data={visibleProducts}
          getRowKey={(row) => productKey(row)}
          emptyMessage="No hay productos para seleccionar."
          className="shadow-none"
          columns={[
            {
              id: 'product',
              label: 'Producto',
              render: (item) => (
                <div>
                  <div className="font-medium">{productName(item)}</div>
                  <div className="font-mono text-xs text-slate-500">{productCode(item)}</div>
                </div>
              ),
            },
            { id: 'price', label: 'Precio', align: 'right', render: (item) => <span className="font-semibold tabular-nums">{money(productPrice(item))}</span> },
            { id: 'stock', label: 'Stock', align: 'right', render: (item) => <span className={productStock(item) > 0 ? 'font-medium text-green-700 dark:text-green-400' : 'text-slate-400'}>{productStock(item).toLocaleString('es-CL')}</span> },
            { id: 'list', label: 'Lista', render: (item) => item.price_list_name || '-' },
            {
              id: 'actions',
              label: 'Acciones',
              align: 'center',
              render: (item) => (
                <ActionButton
                  label="Cargar"
                  icon={PackagePlus}
                  onClick={() => {
                    onSelect(item);
                    onClose?.();
                  }}
                />
              ),
            },
          ]}
        />
      </div>
      <div className="shrink-0 overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
        {tableFooter({ page, pageSize, total: products.length, loading: false, setPage, setPageSize })}
      </div>
      <div className="flex shrink-0 justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
        <ActionButton label="Cerrar" icon={XCircle} variant="neutral" onClick={onClose} />
      </div>
    </div>
  );
};

const NewSale = () => {
  const user = useAuthStore((state) => state.user);
  const activeLocationRecord = useSessionStore((state) => state.getActiveLocation());
  const activeSalesPointRecord = useSessionStore((state) => state.getActiveSalesPoint());
  const activeCashRegisterRecord = useSessionStore((state) => state.getActiveCashRegister());
  const [customers, setCustomers] = useState([]);
  const [authorizedUsers, setAuthorizedUsers] = useState([]);
  const [priceGroups, setPriceGroups] = useState([]);
  const [priceGroupId, setPriceGroupId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [authorizedBuyer, setAuthorizedBuyer] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [items, setItems] = useState([]);
  const [documentDiscount, setDocumentDiscount] = useState(0);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState('');

  const displayUser = user?.display_name || user?.full_name || user?.username || 'Usuario';

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    try {
      const draft = JSON.parse(saved);
      setSelectedCustomer(draft.customer || null);
      setAuthorizedBuyer(draft.authorizedBuyer || null);
      setItems(Array.isArray(draft.items) ? draft.items : []);
      setDocumentDiscount(Number(draft.documentDiscount || 0));
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoadingMeta(true);
    Promise.all([
      adminMaintainersService.list('customers').catch(() => []),
      adminMaintainersService.list('customer-authorized-users').catch(() => []),
      businessFoundationService.priceGroups.list({ active_only: true }).catch(() => []),
    ])
      .then(([customerData, buyerData, groupData]) => {
        if (ignore) return;
        setCustomers(customerData);
        setAuthorizedUsers(buyerData);
        setPriceGroups(groupData);
        if (!priceGroupId && groupData[0]?.id) setPriceGroupId(String(groupData[0].id));
      })
      .catch((err) => setError(getBackendMessage(err, 'No fue posible cargar los datos iniciales.')))
      .finally(() => {
        if (!ignore) setLoadingMeta(false);
      });
    return () => { ignore = true; };
  }, [priceGroupId]);

  const buyersForCustomer = useMemo(() => {
    if (!selectedCustomer?.id) return [];
    return authorizedUsers.filter((buyer) => String(buyer.customer_id) === String(selectedCustomer.id) && buyer.is_active !== false);
  }, [authorizedUsers, selectedCustomer]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);
    const lineDiscount = items.reduce((sum, item) => {
      const base = Number(item.quantity || 0) * Number(item.unit_price || 0);
      return sum + (base * Number(item.discount_percent || 0) / 100);
    }, 0);
    const afterLineDiscount = Math.max(subtotal - lineDiscount, 0);
    const documentDiscountAmount = afterLineDiscount * Number(documentDiscount || 0) / 100;
    const net = Math.max(afterLineDiscount - documentDiscountAmount, 0);
    const tax = net * 0.19;
    const total = net + tax;
    return { subtotal, lineDiscount, documentDiscountAmount, net, tax, total };
  }, [documentDiscount, items]);

  const canSend = Boolean(items.length > 0 && selectedCustomer && totals.total > 0 && activeSalesPointRecord);

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setAuthorizedBuyer(null);
    setCustomerSearch(customerName(customer));
  };

  const addItem = useCallback((product) => {
    const key = productKey(product);
    const price = productPrice(product);
    if (!price) {
      toast.error('El producto no tiene precio de venta configurado.');
      return;
    }
    setItems((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) {
        return current.map((item) => item.key === key ? { ...item, quantity: Number(item.quantity || 0) + 1 } : item);
      }
      return [
        ...current,
        {
          key,
          product_id: product.product_id || product.id,
          product_variant_id: product.product_variant_id || product.variant_id || null,
          code: productCode(product),
          name: productName(product),
          price_list_name: product.price_list_name,
          unit_name: product.unit_name || product.unit_symbol || '',
          available_stock: productStock(product),
          quantity: 1,
          unit_price: price,
          discount_percent: 0,
        },
      ];
    });
    toast.success('Producto agregado.');
  }, []);

  const openProductPicker = useCallback((products) => {
    ModalManager.show({
      type: 'custom',
      title: 'Seleccionar producto',
      size: 'productPicker',
      showFooter: false,
      contentComponent: ProductSelectionModal,
      contentProps: {
        products,
        onSelect: addItem,
      },
    });
  }, [addItem]);

  const queryProducts = useCallback(async () => {
    if (!priceGroupId) {
      setError('Selecciona una categoria de precio para buscar productos.');
      return;
    }
    setLoadingProducts(true);
    setError('');
    try {
      const params = { category_id: Number(priceGroupId) };
      if (productSearch.trim()) params.search = productSearch.trim();
      const results = await businessFoundationService.priceQuery.list(params);
      if (results.length === 1) {
        addItem(results[0]);
        setProductSearch('');
        return;
      }
      if (results.length > 1) {
        openProductPicker(results);
        return;
      }
      ModalManager.info({
        title: 'Producto no encontrado',
        message: `No existe registro para el producto buscado${productSearch.trim() ? `: ${productSearch.trim()}` : '.'}`,
      });
    } catch (err) {
      setError(getBackendMessage(err, 'No fue posible consultar productos.'));
    } finally {
      setLoadingProducts(false);
    }
  }, [addItem, openProductPicker, priceGroupId, productSearch]);

  const updateItem = (key, patch) => {
    setItems((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
  };

  const removeItem = (key) => setItems((current) => current.filter((item) => item.key !== key));

  const clearAll = () => {
    setSelectedCustomer(null);
    setAuthorizedBuyer(null);
    setCustomerSearch('');
    setProductSearch('');
    setItems([]);
    setDocumentDiscount(0);
    localStorage.removeItem(DRAFT_KEY);
  };

  const saveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(buildDraft({
      customer: selectedCustomer,
      authorizedBuyer,
      items,
      documentDiscount,
    })));
    toast.success('Borrador guardado.');
  };

  const sendToCashier = () => {
    if (!activeSalesPointRecord) {
      toast.error('Selecciona un punto de venta antes de enviar la venta.');
      return;
    }
    if (!canSend) return;
    const pendingSale = {
      id: `PEND-${Date.now()}`,
      status: 'PENDING_CASHIER',
      warehouse_id: activeLocationRecord?.warehouse_id || activeLocationRecord?.id || null,
      location: activeLocationRecord,
      sales_point_id: activeSalesPointRecord.id,
      sales_point: activeSalesPointRecord,
      target_cash_register_id: activeCashRegisterRecord?.id || activeSalesPointRecord.default_cash_register_id || null,
      target_cash_register: activeCashRegisterRecord || null,
      customer: selectedCustomer,
      authorized_buyer: authorizedBuyer,
      items,
      totals,
      document_discount_percent: Number(documentDiscount || 0),
      prepared_by: displayUser,
      created_at: new Date().toISOString(),
    };
    const current = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
    localStorage.setItem(PENDING_KEY, JSON.stringify([pendingSale, ...current].slice(0, 50)));
    localStorage.removeItem(DRAFT_KEY);
    setItems([]);
    setDocumentDiscount(0);
    toast.success('Venta marcada como pendiente para caja.');
  };

  const priceGroupOptions = useMemo(() => priceGroups.map((group) => ({
    value: String(group.id),
    label: group.group_name || group.category_name,
  })), [priceGroups]);

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Preparacion de venta"
        description="Arma una venta y dejala pendiente para procesamiento en caja."
        actions={[
          { id: 'save-draft', label: 'Guardar borrador', icon: Save, variant: 'neutral', onClick: saveDraft },
          { id: 'send-cashier', label: 'Enviar a caja', icon: Send, onClick: sendToCashier, disabled: !canSend },
        ]}
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
            <CustomerSearchPanel
              customers={customers}
              search={customerSearch}
              setSearch={setCustomerSearch}
              selectedCustomer={selectedCustomer}
              onSelect={selectCustomer}
              loading={loadingMeta}
            />

            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Datos de venta</h2>
                  <p className="text-xs text-slate-500">Cliente, comprador y lista de precios aplicada.</p>
                </div>
                <StatusBadge variant={selectedCustomer ? 'active' : 'inactive'}>{selectedCustomer ? 'Cliente listo' : 'Pendiente'}</StatusBadge>
              </div>
              {selectedCustomer ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                    <div className="text-xs text-slate-500">Cliente</div>
                    <div className="font-medium">{customerName(selectedCustomer)}</div>
                    <div className="font-mono text-xs text-slate-500">{customerTaxId(selectedCustomer) || selectedCustomer.customer_code}</div>
                  </div>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">Categoria de precio</span>
                    <select className={fieldClassName} value={priceGroupId} onChange={(event) => setPriceGroupId(event.target.value)}>
                      <option value="">Selecciona categoria</option>
                      {priceGroupOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <div className="md:col-span-2">
                    <AuthorizedBuyerSelect customer={selectedCustomer} buyers={buyersForCustomer} value={authorizedBuyer} onChange={setAuthorizedBuyer} />
                  </div>
                </div>
              ) : (
                <div className="flex min-h-36 items-center justify-center rounded-md border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700">
                  Selecciona un cliente para iniciar la venta.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Agregar productos</h2>
                <p className="text-xs text-slate-500">Busca por codigo, SKU, descripcion o marca.</p>
              </div>
            </div>
            <FilterBar
              searchValue={productSearch}
              searchPlaceholder="Buscar producto y presionar Enter"
              onSearchChange={setProductSearch}
              onSearchSubmit={queryProducts}
              gridClassName="lg:grid-cols-[minmax(280px,1fr)_auto_auto]"
              fields={[]}
              actions={(
                <>
                  <ActionButton label="Buscar" icon={Search} onClick={queryProducts} disabled={!priceGroupId || loadingProducts} className={loadingProducts ? '[&>svg]:animate-spin' : ''} />
                  <ActionButton label="Limpiar" icon={XCircle} variant="neutral" onClick={() => setProductSearch('')} />
                </>
              )}
            />
          </div>

          <div className="rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Items de la venta</h2>
                <p className="text-xs text-slate-500">Ajusta cantidades y descuentos antes de enviar a caja.</p>
              </div>
              <ActionButton label="Limpiar" icon={Trash2} variant="neutral" onClick={() => setItems([])} disabled={items.length === 0} />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Producto</th>
                    <th className="w-28 px-4 py-3 text-right">Precio</th>
                    <th className="w-24 px-4 py-3 text-center">Cantidad</th>
                    <th className="w-24 px-4 py-3 text-center">Desc. %</th>
                    <th className="w-32 px-4 py-3 text-right">Subtotal</th>
                    <th className="w-16 px-4 py-3 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item) => {
                    const base = Number(item.quantity || 0) * Number(item.unit_price || 0);
                    const discount = base * Number(item.discount_percent || 0) / 100;
                    return (
                      <tr key={item.key}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.name}</div>
                          <div className="font-mono text-xs text-slate-500">{item.code}{item.unit_name ? ` · ${item.unit_name}` : ''}</div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{money(item.unit_price)}</td>
                        <td className="px-4 py-3">
                          <input className={`${compactFieldClassName} text-center`} type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateItem(item.key, { quantity: Number(event.target.value || 1) })} />
                        </td>
                        <td className="px-4 py-3">
                          <input className={`${compactFieldClassName} text-center`} type="number" min="0" max="100" step="0.01" value={item.discount_percent} onChange={(event) => updateItem(item.key, { discount_percent: Number(event.target.value || 0) })} />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(base - discount)}</td>
                        <td className="px-4 py-3 text-center"><RowActionButton label="Quitar" icon={Trash2} variant="danger" onClick={() => removeItem(item.key)} /></td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                        No hay productos agregados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-5 xl:self-start">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Resumen</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Items</span><span className="font-medium">{items.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-medium">{money(totals.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Descuento linea</span><span className="font-medium">{money(totals.lineDiscount)}</span></div>
              <label className="block space-y-1">
                <span className="text-slate-500">Descuento documento</span>
                <div className="flex items-center gap-2">
                  <input className={`${compactFieldClassName} text-right`} type="number" min="0" max="100" step="0.01" value={documentDiscount} onChange={(event) => setDocumentDiscount(Number(event.target.value || 0))} />
                  <span className="text-sm text-slate-500">%</span>
                  <span className="ml-auto font-medium">{money(totals.documentDiscountAmount)}</span>
                </div>
              </label>
              <div className="flex justify-between"><span className="text-slate-500">Neto</span><span className="font-medium">{money(totals.net)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">IVA 19%</span><span className="font-medium">{money(totals.tax)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold dark:border-slate-800"><span>Total</span><span>{money(totals.total)}</span></div>
            </div>
            <div className="mt-5 grid gap-2">
              <ActionButton label="Enviar a caja" icon={Send} onClick={sendToCashier} disabled={!canSend} className="w-full" />
              <ActionButton label="Guardar borrador" icon={Save} variant="neutral" onClick={saveDraft} className="w-full" />
              <ActionButton label="Limpiar venta" icon={XCircle} variant="neutral" onClick={clearAll} className="w-full" />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
              <UserRound className="h-4 w-4 text-slate-500" />
              Documento pendiente
            </div>
            <div className="space-y-2 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between gap-3"><span className="text-slate-500">Cliente</span><span className="text-right font-medium">{selectedCustomer ? customerName(selectedCustomer) : 'No seleccionado'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Comprador</span><span className="text-right font-medium">{authorizedBuyer?.authorized_name || authorizedBuyer?.full_name || 'No aplica'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Locacion</span><span className="text-right font-medium">{activeLocationRecord?.label || activeLocationRecord?.warehouse_name || 'No seleccionada'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Punto venta</span><span className="text-right font-medium">{activeSalesPointRecord?.label || activeSalesPointRecord?.sales_point_name || 'No asignado'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Caja destino</span><span className="text-right font-medium">{activeCashRegisterRecord?.label || activeSalesPointRecord?.default_cash_register_name || 'Se define en caja'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Preparado por</span><span className="text-right font-medium">{displayUser}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Estado</span><span className="text-right font-medium">Pendiente de caja</span></div>
            </div>
          </div>

          {canSend && (
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300">
              <div className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4" /> Venta lista para caja</div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};

export default NewSale;
