/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, ImageIcon, Package, RefreshCw, Tag, XCircle } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import FilterBar from '@/components/common/data/FilterBar';
import DataTable from '@/components/common/data/DataTable';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import { businessFoundationService } from '@/services/admin/businessFoundationService';
import { adminMaintainersService } from '@/services/admin/adminMaintainersService';
import { getBackendMessage } from '@/services/ui/notify';
import { useSessionStore } from '@/store/useSessionStore';
import { tableFooter } from '@/pages/admin/businessFoundationShared';

const ProductImageCell = ({ src, alt }) => {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Package className="h-5 w-5" />
      </div>
    );
  }
  return <img src={src} alt={alt} onError={() => setError(true)} className="h-10 w-10 shrink-0 rounded-md object-cover" />;
};

const ImagePreviewModal = ({ item, onClose }) => {
  const [error, setError] = useState(false);
  const src = item.primary_image?.full_url || item.primary_image?.thumb_url;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
        {src && !error ? (
          <img
            src={src}
            alt={item.product_name}
            onError={() => setError(true)}
            className="max-h-[480px] w-full object-contain p-4"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 py-10 text-slate-400">
            <Package className="h-14 w-14" />
            <span className="text-sm">Sin imagen disponible</span>
          </div>
        )}
      </div>
      <div className="text-sm text-slate-600 dark:text-slate-300">
        <div className="font-semibold text-slate-900 dark:text-slate-100">{item.product_name}</div>
        {item.has_variants && item.variant_name !== item.product_name && (
          <div className="mt-0.5 text-slate-500">{item.variant_sku} · {item.variant_name}</div>
        )}
      </div>
      <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
        <button type="button" onClick={onClose} className="h-10 rounded-md bg-slate-950 px-5 text-sm font-medium text-white dark:bg-white dark:text-slate-950">
          Cerrar
        </button>
      </div>
    </div>
  );
};

const money = (value) =>
  value == null ? '—' : Number(value).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const InfoCard = ({ label, value, highlight = false }) => (
  <div className={`rounded-md border px-4 py-3 ${highlight ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30' : 'border-slate-200 bg-slate-800/20 dark:border-slate-700'}`}>
    <div className={`mb-0.5 text-xs ${highlight ? 'text-blue-500 dark:text-blue-400' : 'text-slate-500'}`}>{label}</div>
    <div className={`font-semibold ${highlight ? 'text-blue-900 dark:text-blue-100' : 'text-slate-900 dark:text-slate-100'}`}>{value}</div>
  </div>
);

const SectionHeader = ({ children }) => (
  <div className="flex items-center gap-2 pb-1">
    <div className="h-4 w-1 rounded-full bg-blue-500" />
    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{children}</span>
  </div>
);

const ProductDetailModal = ({ item, onClose }) => {
  const totalStock = Number(item.total_stock || 0);
  const locationCount = item.stock_by_warehouse?.length ?? 0;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Columna izquierda */}
        <div className="flex flex-col gap-5">
          <div>
            <SectionHeader>Datos del producto</SectionHeader>
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-800/10 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/30">
              <div className="mb-2 flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-slate-400">CÓDIGO: {item.product_code}</span>
                {item.has_variants && (
                  <span className="shrink-0 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {item.variant_sku}
                  </span>
                )}
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{item.product_name}</div>
              {item.has_variants && item.variant_name !== item.product_name && (
                <div className="mt-0.5 text-sm text-slate-500">{item.variant_name}</div>
              )}
              {item.is_promotion && (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 dark:border-orange-900 dark:bg-orange-950/30">
                  <Tag className="h-3.5 w-3.5 shrink-0 text-orange-600 dark:text-orange-400" />
                  <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                    {item.promotion_name}
                    {item.promotion_discount_label && ` · ${item.promotion_discount_label}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <SectionHeader>Información comercial</SectionHeader>
            <div className="mt-3 flex flex-col gap-3">
              <div className="rounded-md border border-slate-200 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/20">
                <div className="mb-0.5 text-xs text-slate-500">Lista de precios aplicada</div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">{item.price_list_name || '—'}</div>
              </div>
              {item.price_item_id ? (
                <div className="grid grid-cols-2 gap-3">
                  <InfoCard label="Precio base" value={money(item.base_price)} />
                  {item.is_promotion ? (
                    <>
                      <InfoCard label="Precio de oferta" value={money(item.sale_price)} highlight />
                      <div className="rounded-md border border-slate-200 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/20">
                        <div className="mb-0.5 text-xs text-slate-500">Precio de lista</div>
                        <div className="font-semibold text-slate-400 line-through">{money(item.original_price)}</div>
                      </div>
                    </>
                  ) : (
                    <InfoCard label="Precio de venta" value={money(item.sale_price)} highlight />
                  )}
                  {item.unit_name && (
                    <InfoCard label="Unidad de venta" value={`${item.unit_name}${item.unit_symbol ? ` (${item.unit_symbol})` : ''}`} />
                  )}
                  {item.category_name && (
                    <InfoCard label="Categoría" value={item.category_name} />
                  )}
                </div>
              ) : (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                  Sin precio en esta lista de precios.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Columna derecha: stock */}
        <div className="flex h-full flex-col gap-3">
          <SectionHeader>Stock por local o bodega</SectionHeader>
          <div className="grid shrink-0 grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/20">
              <div className="text-xs text-slate-500">Ubicaciones con stock</div>
              <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{locationCount}</div>
            </div>
            <div className="rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/20">
              <div className="text-xs text-slate-500">Stock total disponible</div>
              <div className={`mt-1 text-2xl font-bold ${totalStock > 0 ? 'text-green-600 dark:text-green-400' : totalStock < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                {totalStock.toLocaleString('es-CL')} <span className="text-sm font-medium">unidades</span>
              </div>
            </div>
          </div>

          {item.stock_by_warehouse?.length > 0 ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="grid shrink-0 grid-cols-2 border-b border-slate-200 bg-slate-100 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Local / Bodega</span>
                <span className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Stock disponible</span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {item.stock_by_warehouse.map((w) => {
                  const qty = Number(w.stock_quantity);
                  return (
                    <div key={w.warehouse_id} className="grid grid-cols-2 items-center px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                          <svg className="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{w.warehouse_name}</span>
                      </div>
                      <div className="flex justify-end">
                        <span className={`inline-flex min-w-[2.5rem] items-center justify-center rounded-full px-3 py-1 text-sm font-bold tabular-nums ${qty > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : qty < 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                          {qty.toLocaleString('es-CL')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid shrink-0 grid-cols-2 border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Total disponible</span>
                <span className="text-right text-base font-bold tabular-nums text-slate-900 dark:text-slate-100">{totalStock.toLocaleString('es-CL')}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-10 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900">
              Sin stock disponible en ningún local / bodega.
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
        <span className="text-xs text-slate-400">
          Stock según última actualización. Si el stock es inferior a 10 unidades, contactar al local para validar disponibilidad.
        </span>
        <button type="button" onClick={onClose} className="h-10 rounded-md bg-slate-950 px-5 text-sm font-medium text-white dark:bg-white dark:text-slate-950">
          Cerrar
        </button>
      </div>
    </div>
  );
};

const SalesPriceQuery = () => {
  const activeLocationRecord = useSessionStore((state) => state.getActiveLocation());
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setLoadingMeta(true);
    Promise.all([
      businessFoundationService.priceGroups.list({ active_only: true }),
      adminMaintainersService.list('warehouses-options', { active_only: true }).catch(() => []),
    ]).then(([cats, whs]) => {
      setCategories(cats);
      setWarehouses(whs);
      const PREFERRED = ['retail', 'promocion', 'mayorista', 'convenio', 'interna'];
      const normalize = (s) => (s || '').toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '');
      for (const name of PREFERRED) {
        const match = cats.find((c) => normalize(c.group_name || c.category_name) === name);
        if (match) { setCategoryId(String(match.id)); break; }
      }
      const activeWh = Number(activeLocationRecord?.warehouse_id || activeLocationRecord?.id);
      if (Number.isFinite(activeWh) && activeWh > 0) setWarehouseId(String(activeWh));
    }).catch(() => {}).finally(() => setLoadingMeta(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const query = useCallback(async (catId, term, whId) => {
    const resolvedId = catId !== undefined ? catId : categoryId;
    const resolvedTerm = term !== undefined ? term : search;
    const resolvedWh = whId !== undefined ? whId : warehouseId;
    if (!resolvedId) { setResults([]); return; }
    setLoading(true);
    setError('');
    setPage(0);
    try {
      const params = { category_id: Number(resolvedId) };
      if (resolvedTerm.trim()) params.search = resolvedTerm.trim();
      const whNum = Number(resolvedWh);
      if (resolvedWh && Number.isFinite(whNum)) params.warehouse_id = whNum;
      const data = await businessFoundationService.priceQuery.list(params);
      setResults(data);
    } catch (err) {
      setError(getBackendMessage(err, 'No fue posible consultar precios.'));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId, search, warehouseId]);

  const handleCategoryChange = (value) => {
    setCategoryId(value || '');
    setResults([]);
    setError('');
  };

  const handleWarehouseChange = (value) => {
    setWarehouseId(value || '');
    setResults([]);
    setError('');
  };

  const handleSearchSubmit = () => query(categoryId, search, warehouseId);

  const handleClear = () => {
    setSearch('');
    setCategoryId('');
    setWarehouseId('');
    setResults([]);
    setError('');
  };

  const openDetail = (item) => ModalManager.show({
    type: 'custom',
    title: 'Detalle del producto',
    size: 'xlarge',
    showFooter: false,
    contentComponent: ProductDetailModal,
    contentProps: { item },
  });

  const openImagePreview = (item) => ModalManager.show({
    type: 'custom',
    title: 'Imagen del producto',
    size: 'medium',
    showFooter: false,
    contentComponent: ImagePreviewModal,
    contentProps: { item },
  });

  const categoryOptions = useMemo(() => categories.map((cat) => ({
    value: String(cat.id),
    label: cat.group_name || cat.category_name,
  })), [categories]);

  const warehouseOptions = useMemo(() => warehouses.map((wh) => ({
    value: String(wh.id),
    label: wh.warehouse_name || wh.name,
  })), [warehouses]);

  const visibleData = results.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <ModuleHeader
        title="Consulta de precio"
        description="Consulta el precio de venta de productos por categoría de lista de precios y revisa el stock disponible por local."
      />
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}
      <FilterBar
        className="mb-4"
        searchValue={search}
        searchPlaceholder="Buscar por código, nombre o SKU — presiona Enter"
        onSearchChange={setSearch}
        onSearchSubmit={handleSearchSubmit}
        gridClassName="lg:grid-cols-[minmax(240px,1fr)_220px_220px_auto_auto]"
        fields={[
          {
            id: 'category',
            value: categoryId,
            onChange: handleCategoryChange,
            options: categoryOptions,
            placeholder: loadingMeta ? 'Cargando...' : 'Categoría de precio',
            clearable: true,
            disabled: loadingMeta,
            searchPlaceholder: 'Buscar categoría',
          },
          {
            id: 'warehouse',
            value: warehouseId,
            onChange: handleWarehouseChange,
            options: warehouseOptions,
            placeholder: 'Todas las sucursales',
            clearable: true,
            disabled: loadingMeta,
            searchPlaceholder: 'Buscar sucursal',
          },
        ]}
        actions={(
          <>
            <ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={() => query(categoryId, search, warehouseId)} className={loading ? '[&>svg]:animate-spin' : ''} disabled={!categoryId} />
            <ActionButton label="Limpiar" icon={XCircle} variant="neutral" onClick={handleClear} />
          </>
        )}
      />
      {!categoryId && !loading && (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
          Selecciona una categoría de lista de precios para consultar precios de productos.
        </div>
      )}
      <DataTable
        loading={loading}
        data={visibleData}
        getRowKey={(row) => row.variant_id != null ? `v-${row.variant_id}` : `p-${row.product_id}`}
        emptyMessage={categoryId ? 'Sin resultados para la búsqueda actual.' : 'Selecciona una categoría de lista de precios para comenzar.'}
        footer={tableFooter({ page, pageSize, total: results.length, loading, setPage, setPageSize })}
        columns={[
          {
            id: 'code',
            label: 'Código',
            render: (item) => <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300">{item.product_code}</span>,
          },
          {
            id: 'product',
            label: 'Producto',
            render: (item) => (
              <div className="flex items-center gap-3">
                <ProductImageCell src={item.primary_image?.thumb_url} alt={item.product_name} />
                <div>
                  <div className="font-medium">{item.product_name}</div>
                  {item.has_variants && (
                    <div className="text-xs text-slate-500">{item.variant_sku} · {item.variant_name}</div>
                  )}
                </div>
              </div>
            ),
          },
          {
            id: 'price',
            label: 'Precio',
            align: 'right',
            render: (item) => {
              if (item.sale_price == null) return <span className="text-xs text-slate-400">Sin precio</span>;
              if (item.is_promotion) return (
                <div className="flex flex-col items-end gap-0.5">
                  <div className="flex items-center gap-1">
                    <Tag className="h-3 w-3 text-orange-500" />
                    <span className="font-bold tabular-nums text-orange-600 dark:text-orange-400">{money(item.sale_price)}</span>
                  </div>
                  <span className="text-xs tabular-nums text-slate-400 line-through">{money(item.original_price)}</span>
                </div>
              );
              return <span className="font-semibold tabular-nums">{money(item.sale_price)}</span>;
            },
          },
          {
            id: 'price_list',
            label: 'Lista de precios',
            render: (item) => item.price_list_name
              ? <span className="text-sm">{item.price_list_name}</span>
              : <span className="text-xs text-slate-400">—</span>,
          },
          {
            id: 'unit',
            label: 'Unidad',
            render: (item) => item.unit_name
              ? <span className="text-sm">{item.unit_name}</span>
              : <span className="text-xs text-slate-400">—</span>,
          },
          {
            id: 'warehouses',
            label: 'Local / Bodega',
            render: (item) => {
              if (item.stock_by_warehouse?.length > 0) {
                return (
                  <div className="space-y-0.5">
                    {item.stock_by_warehouse.map((w) => (
                      <div key={w.warehouse_id} className="text-xs font-medium text-slate-700 dark:text-slate-300">{w.warehouse_name}</div>
                    ))}
                  </div>
                );
              }
              if (warehouseId) {
                const whName = warehouseOptions.find((o) => o.value === warehouseId)?.label;
                return <span className="text-xs text-slate-500">{whName || '—'}</span>;
              }
              return <span className="text-xs text-slate-400">—</span>;
            },
          },
          {
            id: 'stock',
            label: 'Stock disponible',
            align: 'right',
            render: (item) => {
              const qty = Number(item.total_stock);
              if (qty > 0) return <span className="font-semibold tabular-nums text-green-700 dark:text-green-400">{qty.toLocaleString('es-CL')}</span>;
              if (qty < 0) return <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">{qty.toLocaleString('es-CL')}</span>;
              return <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">Sin stock</span>;
            },
          },
          {
            id: 'actions',
            label: 'Acciones',
            align: 'right',
            render: (item) => (
              <div className="flex items-center justify-end gap-1">
                <RowActionButton
                  label="Ver imagen"
                  icon={ImageIcon}
                  onClick={() => openImagePreview(item)}
                  disabled={!item.primary_image}
                />
                <RowActionButton label="Ver detalle" icon={Eye} onClick={() => openDetail(item)} />
              </div>
            ),
          },
        ]}
      />
    </section>
  );
};

export default SalesPriceQuery;
