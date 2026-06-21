/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ClipboardList,
  PackagePlus,
  Save,
  Search,
  Send,
  Store,
  Tag,
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
import { salesDocumentsService } from '@/services/sales/salesDocumentsService';
import { getBackendMessage, toast } from '@/services/ui/notify';
import { useAuthStore } from '@/store/useAuthStore';
import { useSessionStore } from '@/store/useSessionStore';
import { tableFooter } from '@/pages/admin/businessFoundationShared';

const DRAFT_KEY = 'gestioncom.sales.new.draft';
const DEFAULT_CUSTOMER_CODE = 'DEFAULT_CUSTOMER';

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
const isDefaultCustomer = (customer) => customer?.customer_code === DEFAULT_CUSTOMER_CODE;
const customerPriceGroupId = (customer) => customer?.price_list_group_id || customer?.price_group_id || customer?.price_list_category_id || '';

const productKey = (product) => [
  product.price_item_id || product.id || product.product_id,
  product.product_variant_id || product.variant_id || product.variant_sku || '',
  product.measurement_unit_id || product.unit_id || '',
].join(':');

const productCode = (product) => product.variant_sku || product.product_code || product.sku || '-';
const productName = (product) => product.variant_name || product.product_name || product.name || 'Producto';
const productPrice = (product) => Number(product.sale_price ?? product.base_price ?? product.price ?? 0);
const productStock = (product) => Number(product.total_stock ?? product.stock_quantity ?? product.available_stock ?? 0);

const mapLineToItem = (line) => {
  const key = [
    line.product_id,
    line.product_variant_id || '',
    line.measurement_unit_id || '',
  ].join(':');
  return {
    key,
    product_id: line.product_id,
    product_variant_id: line.product_variant_id || null,
    code: line.product_code || line.code || '-',
    name: line.product_name || line.name || 'Producto',
    unit_name: line.unit_name || '',
    available_stock: 0,
    quantity: Number(line.quantity || 1),
    unit_price: Number(line.unit_price || 0),
    discount_percent: Number(line.discount_percent || 0),
    is_exchange_credit: Number(line.unit_price || 0) < 0 || normalize(line.product_name || line.name).includes('credito por cambio'),
  };
};

const CustomerSearchPanel = ({ customers, search, setSearch, selectedCustomer, onSelect, loading }) => {
  const filteredCustomers = useMemo(() => {
    const term = normalize(search);
    if (!term) return customers.filter(isDefaultCustomer).slice(0, 1);

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

const NoSalesPointAccess = ({ displayUser }) => (
  <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
    <ModuleHeader
      title="Nueva venta"
      description="Validacion de acceso al modulo de ventas."
    />

    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center">
      <div className="w-full max-w-2xl rounded-md border border-amber-200 bg-white p-8 text-center shadow-sm dark:border-amber-900/40 dark:bg-slate-900">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-500 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">Punto de venta no configurado</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          <strong>{displayUser}</strong> no tiene un punto de venta activo en esta locación.
          Selecciona un punto de venta en la barra inferior antes de continuar.
        </p>
        <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          <div className="font-semibold text-slate-800 dark:text-slate-100">¿Cómo solucionarlo?</div>
          <div className="mt-1">Usa el menú de <strong>Punto de venta</strong> en la barra inferior de la pantalla para asignar uno. Si no aparecen opciones, contacta al administrador.</div>
        </div>
      </div>
    </div>
  </section>
);

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
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{productName(item)}</span>
                    {item.is_promotion && item.promotion_discount_label && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                        <Tag className="h-2.5 w-2.5" />
                        {item.promotion_discount_label}
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-xs text-slate-500">{productCode(item)}</div>
                </div>
              ),
            },
            {
              id: 'price',
              label: 'Precio',
              align: 'right',
              render: (item) => item.is_promotion ? (
                <div className="flex flex-col items-end gap-0.5">
                  <span className="font-bold tabular-nums text-orange-600 dark:text-orange-400">{money(productPrice(item))}</span>
                  <span className="text-xs tabular-nums text-slate-400 line-through">{money(item.original_price)}</span>
                </div>
              ) : <span className="font-semibold tabular-nums">{money(productPrice(item))}</span>,
            },
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
                  disabled={productStock(item) <= 0}
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editSaleCode = searchParams.get('edit');
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const salesPoints = useSessionStore((state) => state.salesPoints);
  const activeLocationRecord = useSessionStore((state) => state.getActiveLocation());
  const activeSalesPointRecord = useSessionStore((state) => state.getActiveSalesPoint());
  const activeCashRegisterRecord = useSessionStore((state) => state.getActiveCashRegister());
  const sessionContextReady = useSessionStore((state) => state._sessionContextReady);
  const [customers, setCustomers] = useState([]);
  const [authorizedUsers, setAuthorizedUsers] = useState([]);
  const [priceGroups, setPriceGroups] = useState([]);
  const [priceGroupId, setPriceGroupId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [authorizedBuyer, setAuthorizedBuyer] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [items, setItems] = useState([]);
  const [editSaleId, setEditSaleId] = useState(null);
  const [editSale, setEditSale] = useState(null);
  const [customerCreditConfig, setCustomerCreditConfig] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [sendingToCashier, setSendingToCashier] = useState(false);
  const [error, setError] = useState('');

  const displayUser = user?.display_name || user?.full_name || user?.username || 'Usuario';
  const defaultCustomer = useMemo(() => customers.find(isDefaultCustomer) || null, [customers]);
  const hasAuthorizedSalesPoint = salesPoints.length > 0;

  useEffect(() => {
    if (editSaleCode) return;
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    try {
      const draft = JSON.parse(saved);
      setSelectedCustomer(draft.customer || null);
      if (draft.customer) setCustomerSearch(customerName(draft.customer));
      setAuthorizedBuyer(draft.authorizedBuyer || null);
      setItems(Array.isArray(draft.items) ? draft.items : []);
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, [editSaleCode]);

  useEffect(() => {
    if (!editSaleCode) return;
    salesDocumentsService.getByCode(editSaleCode)
      .then((sale) => {
        setEditSaleId(sale.id);
        setEditSale(sale);
        if (sale.customer) {
          setSelectedCustomer(sale.customer);
          setCustomerSearch(customerName(sale.customer));
        }
        if (Array.isArray(sale.items) && sale.items.length > 0) {
          setItems(sale.items.map(mapLineToItem));
        }
      })
      .catch((err) => {
        toast.error(getBackendMessage(err, 'No fue posible cargar la venta para editar.'));
      });
  }, [editSaleCode]);

  useEffect(() => {
    if (!hasAuthorizedSalesPoint) return undefined;
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
        const defaultCustomer = customerData.find(isDefaultCustomer);
        if (defaultCustomer) {
          setSelectedCustomer((current) => {
            if (current) return current;
            setCustomerSearch(customerName(defaultCustomer));
            return defaultCustomer;
          });
        }
        if (!priceGroupId && groupData[0]?.id) setPriceGroupId(String(groupData[0].id));
      })
      .catch((err) => setError(getBackendMessage(err, 'No fue posible cargar los datos iniciales.')))
      .finally(() => {
        if (!ignore) setLoadingMeta(false);
      });
    return () => { ignore = true; };
  }, [hasAuthorizedSalesPoint, priceGroupId]);

  useEffect(() => {
    const nextGroupId = customerPriceGroupId(selectedCustomer);
    if (!nextGroupId) return;
    if (!priceGroups.some((group) => String(group.id) === String(nextGroupId))) return;
    setPriceGroupId(String(nextGroupId));
  }, [priceGroups, selectedCustomer]);

  const buyersForCustomer = useMemo(() => {
    if (!selectedCustomer?.id) return [];
    return authorizedUsers.filter((buyer) => String(buyer.customer_id) === String(selectedCustomer.id) && buyer.is_active !== false);
  }, [authorizedUsers, selectedCustomer]);

  useEffect(() => {
    if (!selectedCustomer?.id) {
      setCustomerCreditConfig(null);
      return undefined;
    }
    let ignore = false;
    adminMaintainersService.list('customer-credit-config')
      .then((rows) => {
        if (ignore) return;
        const config = (rows || []).find((item) => String(item.customer_id) === String(selectedCustomer.id));
        setCustomerCreditConfig(config || null);
      })
      .catch(() => {
        if (!ignore) setCustomerCreditConfig(null);
      });
    return () => { ignore = true; };
  }, [selectedCustomer?.id]);

  const isExchangeEdit = editSale?.document_type_code === 'EXCHANGE_DRAFT' || editSale?.is_exchange_document;
  const isReturnEdit = editSale?.document_type_code === 'RETURN_TICKET' || editSale?.is_return_document;
  const isAdjustmentEdit = isExchangeEdit || isReturnEdit;
  const customerHasCreditEnabled = Number(selectedCustomer?.is_credit_customer) === 1 || selectedCustomer?.is_credit_customer === true;
  const customerHasActiveCredit = customerHasCreditEnabled && customerCreditConfig?.is_active !== false && Boolean(customerCreditConfig);
  const sourceItemCount = useMemo(
    () => items
      .filter((item) => item.is_exchange_credit)
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [items],
  );
  const newItemCount = useMemo(
    () => items
      .filter((item) => !item.is_exchange_credit)
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [items],
  );

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);
    const lineDiscount = items.reduce((sum, item) => {
      if (isExchangeEdit) return sum;
      const base = Number(item.quantity || 0) * Number(item.unit_price || 0);
      return sum + (base * Number(item.discount_percent || 0) / 100);
    }, 0);
    const rawTotal = subtotal - lineDiscount;
    const total = Math.max(rawTotal, 0);
    const net = total / 1.19;
    const tax = total - net;
    return { subtotal, lineDiscount, net, tax, rawTotal, total };
  }, [isExchangeEdit, items]);

  const exchangeCredit = useMemo(
    () => items.filter((item) => item.is_exchange_credit).reduce((sum, item) => sum + Math.abs(Number(item.quantity || 0) * Number(item.unit_price || 0)), 0),
    [items],
  );
  const exchangeCreditByProduct = useMemo(() => {
    const map = new Map();
    items.filter((item) => item.is_exchange_credit && item.product_id).forEach((item) => {
      const quantity = Math.max(Number(item.quantity || 1), 1);
      map.set(String(item.product_id), Math.abs(Number(item.unit_price || 0)) / quantity);
    });
    return map;
  }, [items]);
  const hasNewExchangeItems = useMemo(
    () => items.some((item) => !item.is_exchange_credit && Number(item.quantity || 0) > 0),
    [items],
  );
  const canSend = Boolean(
    items.length > 0
    && selectedCustomer
    && activeSalesPointRecord
    && (isExchangeEdit ? hasNewExchangeItems : totals.total > 0)
  );
  const hasCashAccess = hasPermission('CASH_POS_ACCESS') && Boolean(activeCashRegisterRecord);

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setAuthorizedBuyer(null);
    setCustomerSearch(customerName(customer));
    const nextGroupId = customerPriceGroupId(customer);
    if (nextGroupId) setPriceGroupId(String(nextGroupId));
  };

  const addItem = useCallback((product) => {
    const key = productKey(product);
    const price = productPrice(product);
    if (!price) {
      toast.error('El producto no tiene precio de venta configurado.');
      return;
    }
    const stock = productStock(product);
    const hasWarehouse = Boolean(activeLocationRecord?.warehouse_id || activeLocationRecord?.id);
    if (hasWarehouse && stock <= 0) {
      toast.error('Sin stock disponible en la bodega actual para este producto.');
      return;
    }
    let blocked = false;
    const productId = product.product_id || product.id;
    const recognizedExchangePrice = isExchangeEdit ? exchangeCreditByProduct.get(String(productId)) : null;
    const effectivePrice = recognizedExchangePrice || price;
    setItems((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) {
        const next = Number(existing.quantity || 0) + 1;
        if (hasWarehouse && next > existing.available_stock) {
          blocked = true;
          return current;
        }
        return current.map((item) => item.key === key ? { ...item, quantity: next } : item);
      }
      return [
        ...current,
        {
          key,
          product_id: productId,
          product_variant_id: product.product_variant_id || product.variant_id || null,
          code: productCode(product),
          name: productName(product),
          price_list_name: product.price_list_name,
          unit_name: product.unit_name || product.unit_symbol || '',
          available_stock: stock,
          quantity: 1,
          unit_price: effectivePrice,
          list_price: price,
          is_equivalent_exchange: Boolean(recognizedExchangePrice),
          discount_percent: 0,
        },
      ];
    });
    if (blocked) {
      toast.error('Stock insuficiente. No hay mas unidades disponibles en bodega.');
      return;
    }
    toast.success('Producto agregado.');
  }, [activeLocationRecord, exchangeCreditByProduct, isExchangeEdit]);

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
      const warehouseId = activeLocationRecord?.warehouse_id || activeLocationRecord?.id;
      if (warehouseId) params.warehouse_id = warehouseId;
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
  }, [addItem, activeLocationRecord, openProductPicker, priceGroupId, productSearch]);

  const updateItem = (key, patch) => {
    const nextPatch = isExchangeEdit && patch.discount_percent !== undefined
      ? { ...patch, discount_percent: 0 }
      : patch;
    if (isExchangeEdit && patch.discount_percent > 0) {
      toast.error('Los cambios no permiten descuentos libres. La diferencia se calcula automaticamente.');
    }
    const hasWarehouse = Boolean(activeLocationRecord?.warehouse_id || activeLocationRecord?.id);
    if (hasWarehouse && nextPatch.quantity !== undefined) {
      const item = items.find((i) => i.key === key);
      if (item && !item.is_exchange_credit && nextPatch.quantity > item.available_stock) {
        toast.error(`Stock insuficiente. Disponible en bodega: ${item.available_stock}`);
        return;
      }
    }
    setItems((current) => current.map((item) => item.key === key ? { ...item, ...nextPatch } : item));
  };

  const removeItem = (key) => setItems((current) => current.filter((item) => item.key !== key));

  const clearAll = () => {
    setSelectedCustomer(defaultCustomer);
    setAuthorizedBuyer(null);
    setCustomerSearch(defaultCustomer ? customerName(defaultCustomer) : '');
    setProductSearch('');
    setItems((current) => (isExchangeEdit ? current.filter((item) => item.is_exchange_credit) : []));
    localStorage.removeItem(DRAFT_KEY);
  };

  const sendToCashier = async () => {
    if (!activeSalesPointRecord) {
      toast.error('Selecciona un punto de venta antes de enviar la venta.');
      return;
    }
    if (!canSend) return;
    setSendingToCashier(true);
    try {
      const payload = {
        warehouse_id: activeLocationRecord?.warehouse_id || activeLocationRecord?.id || null,
        sales_point_id: activeSalesPointRecord.id,
        target_cash_register_id: activeCashRegisterRecord?.id || activeSalesPointRecord.default_cash_register_id || null,
        customer: selectedCustomer,
        authorized_buyer: authorizedBuyer,
        items: items.map((item) => ({ ...item, discount_percent: isExchangeEdit ? 0 : Number(item.discount_percent || 0) })),
        prepared_by: displayUser,
        notes: editSale?.notes || null,
      };
      const sale = editSaleId
        ? await salesDocumentsService.updatePending(editSaleId, payload)
        : await salesDocumentsService.createPending(payload);
      localStorage.removeItem(DRAFT_KEY);
      navigate(`/cash/pos?saleId=${sale.sale_code}`);
    } catch (err) {
      toast.error(getBackendMessage(err, 'No fue posible enviar la venta a caja.'));
    } finally {
      setSendingToCashier(false);
    }
  };

  const saveVenta = async () => {
    if (!activeSalesPointRecord) {
      toast.error('Selecciona un punto de venta antes de guardar la venta.');
      return;
    }
    if (!canSend) return;
    setSendingToCashier(true);
    try {
      const payload = {
        warehouse_id: activeLocationRecord?.warehouse_id || activeLocationRecord?.id || null,
        sales_point_id: activeSalesPointRecord.id,
        target_cash_register_id: activeCashRegisterRecord?.id || activeSalesPointRecord.default_cash_register_id || null,
        customer: selectedCustomer,
        authorized_buyer: authorizedBuyer,
        items: items.map((item) => ({ ...item, discount_percent: isExchangeEdit ? 0 : Number(item.discount_percent || 0) })),
        prepared_by: displayUser,
        notes: editSale?.notes || null,
      };
      if (editSaleId) {
        await salesDocumentsService.updatePending(editSaleId, payload);
      } else {
        await salesDocumentsService.createPending(payload);
      }
      localStorage.removeItem(DRAFT_KEY);
      toast.success('Venta guardada como pendiente.');
      navigate('/sales/history');
    } catch (err) {
      toast.error(getBackendMessage(err, 'No fue posible guardar la venta.'));
    } finally {
      setSendingToCashier(false);
    }
  };

  const priceGroupOptions = useMemo(() => priceGroups.map((group) => ({
    value: String(group.id),
    label: group.group_name || group.category_name,
  })), [priceGroups]);

  if (!sessionContextReady) return null;
  if (!activeSalesPointRecord) {
    return <NoSalesPointAccess displayUser={displayUser} />;
  }

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title={editSaleCode ? 'Editar venta' : 'Preparacion de venta'}
        description={isExchangeEdit ? 'Carga los productos nuevos y aplica el credito del cambio antes de enviar a caja.' : editSaleCode ? 'Modifica la venta pendiente y reenvíala a caja.' : 'Arma una venta y dejala pendiente para procesamiento en caja.'}
        actions={[]}
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
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
                <p className="text-xs text-slate-500">{isExchangeEdit ? 'El valor reconocido viene de la venta original; no se aplican descuentos libres.' : 'Ajusta cantidades y descuentos antes de enviar a caja.'}</p>
              </div>
              <ActionButton label="Limpiar" icon={Trash2} variant="neutral" onClick={() => setItems((current) => current.filter((item) => item.is_exchange_credit))} disabled={items.every((item) => item.is_exchange_credit)} />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Producto</th>
                    <th className="w-28 px-4 py-3 text-right">Precio</th>
                    <th className="w-24 px-4 py-3 text-center">Cantidad</th>
                    <th className="w-24 px-4 py-3 text-center">{isExchangeEdit ? 'Ajuste' : 'Desc. %'}</th>
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
                          {item.is_exchange_credit && <div className="mt-1 text-xs font-semibold text-blue-600 dark:text-blue-300">Credito a favor</div>}
                          {item.is_equivalent_exchange && <div className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">Variante equivalente: sin diferencia</div>}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <div>{money(item.unit_price)}</div>
                          {item.is_equivalent_exchange && Number(item.list_price || 0) !== Number(item.unit_price || 0) && (
                            <div className="text-xs text-slate-500">Lista {money(item.list_price)}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input className={`${compactFieldClassName} text-center`} type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateItem(item.key, { quantity: Number(event.target.value || 1) })} disabled={item.is_exchange_credit} />
                        </td>
                        <td className="px-4 py-3">
                          {isExchangeEdit ? (
                            <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                              No aplica
                            </div>
                          ) : (
                            <input className={`${compactFieldClassName} text-center`} type="number" min="0" max="100" step="0.01" value={item.discount_percent} onChange={(event) => updateItem(item.key, { discount_percent: Number(event.target.value || 0) })} disabled={item.is_exchange_credit} />
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(base - discount)}</td>
                        <td className="px-4 py-3 text-center"><RowActionButton label="Quitar" icon={Trash2} variant="danger" onClick={() => removeItem(item.key)} disabled={item.is_exchange_credit} /></td>
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

        <aside>
          <div className="xl:sticky xl:top-0 xl:z-20">
            <div className="space-y-4 xl:mt-4">
              <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-600" />
                <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Resumen</h2>
              </div>
              <div className="space-y-3 text-sm">
                {isAdjustmentEdit ? (
                  <>
                    <div className="flex justify-between"><span className="text-slate-500">{isReturnEdit ? 'Artículos devolución' : 'Artículos cambio'}</span><span className="font-medium">{sourceItemCount}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Artículos nuevos</span><span className="font-medium">{newItemCount}</span></div>
                  </>
                ) : (
                  <div className="flex justify-between"><span className="text-slate-500">Artículos</span><span className="font-medium">{newItemCount}</span></div>
                )}
                {isExchangeEdit && <div className="flex justify-between"><span className="text-slate-500">Valor pagado original</span><span className="font-medium text-blue-700 dark:text-blue-300">{money(exchangeCredit)}</span></div>}
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-medium">{money(totals.subtotal)}</span></div>
                {!isExchangeEdit && <div className="flex justify-between"><span className="text-slate-500">Descuento linea</span><span className="font-medium">{money(totals.lineDiscount)}</span></div>}
                <div className="flex justify-between"><span className="text-slate-500">Neto</span><span className="font-medium">{money(totals.net)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">IVA 19%</span><span className="font-medium">{money(totals.tax)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold dark:border-slate-800"><span>Total a pagar</span><span>{money(totals.total)}</span></div>
                {isExchangeEdit && totals.rawTotal < 0 && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                    {customerHasActiveCredit
                      ? `El crédito supera los productos seleccionados. La diferencia de ${money(Math.abs(totals.rawTotal))} quedará como crédito no utilizado.`
                      : `El cliente no tiene crédito activo. La diferencia de ${money(Math.abs(totals.rawTotal))} se perderá al cerrar el cambio.`}
                  </div>
                )}
              </div>
              <div className="mt-5 grid gap-2">
                {hasCashAccess && (
                  <ActionButton label={sendingToCashier ? 'Enviando...' : 'Enviar a caja'} icon={Send} onClick={sendToCashier} disabled={!canSend || sendingToCashier} className="w-full" />
                )}
                <ActionButton label={sendingToCashier ? 'Guardando...' : 'Guardar venta'} icon={Save} onClick={saveVenta} disabled={!canSend || sendingToCashier} className="w-full" />
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
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default NewSale;
