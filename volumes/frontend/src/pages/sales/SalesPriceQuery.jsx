/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, RefreshCw, XCircle } from 'lucide-react';
import ModalManager from '@/components/ui/modal';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import FilterBar from '@/components/common/data/FilterBar';
import DataTable from '@/components/common/data/DataTable';
import StatusBadge from '@/components/common/data/StatusBadge';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import { businessFoundationService } from '@/services/admin/businessFoundationService';
import { getBackendMessage } from '@/services/ui/notify';
import { tableFooter } from '@/pages/admin/businessFoundationShared';

const money = (value) =>
  value == null ? '—' : Number(value).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const ProductDetailModal = ({ item, onClose }) => (
  <div className="space-y-5">
    <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-slate-500">{item.product_code}</span>
        {item.has_variants && <span className="font-mono text-xs text-slate-500">{item.variant_sku}</span>}
      </div>
      <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{item.product_name}</div>
      {item.has_variants && item.variant_name !== item.product_name && (
        <div className="text-sm text-slate-500">{item.variant_name}</div>
      )}
    </div>

    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Lista de precios aplicada</h3>
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        {item.price_list_name || '—'}
      </div>
    </div>

    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Precio</h3>
      {item.price_item_id ? (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700">
            <div className="text-xs text-slate-500">Precio base</div>
            <div className="font-semibold">{money(item.base_price)}</div>
          </div>
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-900 dark:bg-blue-950/30">
            <div className="text-xs text-blue-600 dark:text-blue-400">Precio venta</div>
            <div className="font-bold text-blue-900 dark:text-blue-100">{money(item.sale_price)}</div>
          </div>
          {item.margin_percentage != null && (
            <div className="rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700">
              <div className="text-xs text-slate-500">Margen</div>
              <div className="font-semibold">{Number(item.margin_percentage).toFixed(1)}%</div>
            </div>
          )}
          {item.unit_name && (
            <div className="rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700">
              <div className="text-xs text-slate-500">Unidad de venta</div>
              <div className="font-semibold">{item.unit_name}{item.unit_symbol ? ` (${item.unit_symbol})` : ''}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          Este producto no tiene precio configurado en la lista seleccionada.
        </div>
      )}
    </div>

    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Stock por local / bodega</h3>
      {item.stock_by_warehouse?.length > 0 ? (
        <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Local / Bodega</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Stock disponible</th>
              </tr>
            </thead>
            <tbody>
              {item.stock_by_warehouse.map((w) => (
                <tr key={w.warehouse_id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{w.warehouse_name}</td>
                  <td className="px-3 py-2 text-right font-medium text-slate-900 dark:text-slate-100">
                    {Number(w.stock_quantity).toLocaleString('es-CL')}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                <td className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400">Total</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-slate-900 dark:text-slate-100">
                  {Number(item.total_stock || 0).toLocaleString('es-CL')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
          Sin stock disponible en ningún local / bodega.
        </div>
      )}
    </div>

    <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
      <button type="button" onClick={onClose} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white dark:bg-white dark:text-slate-950">
        Cerrar
      </button>
    </div>
  </div>
);

const SalesPriceQuery = () => {
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setLoadingMeta(true);
    businessFoundationService.priceGroups.list({ active_only: true })
      .then((data) => {
        setCategories(data);
        const PREFERRED = ['retail', 'promocion', 'mayorista', 'convenio', 'interna'];
        const normalize = (s) => (s || '').toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '');
        for (const name of PREFERRED) {
          const match = data.find((c) => normalize(c.group_name || c.category_name) === name);
          if (match) { setCategoryId(String(match.id)); break; }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMeta(false));
  }, []);

  const query = useCallback(async (catId, term) => {
    const resolvedId = catId !== undefined ? catId : categoryId;
    const resolvedTerm = term !== undefined ? term : search;
    if (!resolvedId) { setResults([]); return; }
    setLoading(true);
    setError('');
    setPage(0);
    try {
      const params = { category_id: Number(resolvedId) };
      if (resolvedTerm.trim()) params.search = resolvedTerm.trim();
      const data = await businessFoundationService.priceQuery.list(params);
      setResults(data);
    } catch (err) {
      setError(getBackendMessage(err, 'No fue posible consultar precios.'));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId, search]);

  const handleCategoryChange = (value) => {
    setCategoryId(value || '');
    setResults([]);
    setError('');
  };

  const handleSearchSubmit = () => query(categoryId, search);

  const handleClear = () => {
    setSearch('');
    setCategoryId('');
    setResults([]);
    setError('');
  };

  const openDetail = (item) => ModalManager.show({
    type: 'custom',
    title: 'Detalle del producto',
    size: 'medium',
    showFooter: false,
    contentComponent: ProductDetailModal,
    contentProps: { item },
  });

  const categoryOptions = useMemo(() => categories.map((cat) => ({
    value: String(cat.id),
    label: cat.group_name || cat.category_name,
  })), [categories]);

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
        gridClassName="lg:grid-cols-[minmax(280px,1fr)_280px_auto_auto]"
        fields={[
          {
            id: 'category',
            value: categoryId,
            onChange: handleCategoryChange,
            options: categoryOptions,
            placeholder: loadingMeta ? 'Cargando categorías...' : 'Selecciona categoría de precio',
            clearable: true,
            disabled: loadingMeta,
            searchPlaceholder: 'Buscar categoría',
          },
        ]}
        actions={(
          <>
            <ActionButton label="Refrescar" icon={RefreshCw} variant="neutral" onClick={() => query()} className={loading ? '[&>svg]:animate-spin' : ''} disabled={!categoryId} />
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
              <>
                <div className="font-medium">{item.product_name}</div>
                {item.has_variants && (
                  <div className="text-xs text-slate-500">{item.variant_sku} · {item.variant_name}</div>
                )}
              </>
            ),
          },
          {
            id: 'price',
            label: 'Precio',
            align: 'right',
            render: (item) => item.sale_price != null
              ? <span className="font-semibold tabular-nums">{money(item.sale_price)}</span>
              : <span className="text-xs text-slate-400">Sin precio</span>,
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
            render: (item) => item.stock_by_warehouse?.length > 0
              ? (
                <div className="space-y-0.5">
                  {item.stock_by_warehouse.map((w) => (
                    <div key={w.warehouse_id} className="text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{w.warehouse_name}</span>
                    </div>
                  ))}
                </div>
              )
              : <StatusBadge variant="inactive">Sin stock</StatusBadge>,
          },
          {
            id: 'stock',
            label: 'Stock disponible',
            align: 'right',
            render: (item) => (
              <span className={item.total_stock > 0 ? 'font-semibold tabular-nums text-green-700 dark:text-green-400' : 'text-xs text-slate-400'}>
                {item.total_stock > 0 ? Number(item.total_stock).toLocaleString('es-CL') : '0'}
              </span>
            ),
          },
          {
            id: 'actions',
            label: 'Acciones',
            align: 'right',
            render: (item) => (
              <RowActionButton label="Ver detalle" icon={Eye} onClick={() => openDetail(item)} />
            ),
          },
        ]}
      />
    </section>
  );
};

export default SalesPriceQuery;
