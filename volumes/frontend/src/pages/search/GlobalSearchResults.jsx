import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { ActionButton, RowActionButton } from '@/components/common/actions/ActionButton';
import DataTable from '@/components/common/data/DataTable';
import DataTablePagination from '@/components/common/data/DataTablePagination';
import FilterBar from '@/components/common/data/FilterBar';
import KpiBar from '@/components/common/data/KpiBar';
import StatusBadge from '@/components/common/data/StatusBadge';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import { systemPages } from '@/data/modules';
import { useMenuStore } from '@/store/useMenuStore';
import { globalSearchService } from '@/services/search/globalSearchService';
import { getBackendMessage } from '@/services/ui/notify';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const hiddenSearchModulePaths = new Set(['/notifications']);
const isHiddenSearchModule = (page) => hiddenSearchModulePaths.has(page?.path) || page?.id === 'notifications';

const destinationLabel = (path, pageByPath) => {
  const page = pageByPath.get(path);
  if (!page) return path || '-';
  return [page.group, page.label].filter(Boolean).join(' >> ');
};

const fixedTailColumnClass = {
  type: 'w-36 min-w-36',
  destination: 'w-72 min-w-72',
  actions: 'w-28 min-w-28',
};

const compactText = (value) => (
  <span className="block truncate text-sm text-slate-600 dark:text-slate-300">{value || '-'}</span>
);

const metaText = (value) => (
  <span className="block truncate font-mono text-xs text-slate-500 dark:text-slate-400">{value || '-'}</span>
);

const moduleResults = (query, pages, pageByPath) => {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) return [];
  return pages
    .filter((page) => page.path && page.path !== '#')
    .filter((page) => !isHiddenSearchModule(page))
    .filter((page) => [page.label, page.group, page.description].filter(Boolean).some((value) => value.toLowerCase().includes(normalized)))
    .map((page) => ({
      entity: 'Modulo',
      domain: page.group || 'Sistema',
      title: page.label,
      subtitle: page.description || '',
      path: page.path,
      destination_label: destinationLabel(page.path, pageByPath),
      icon: 'Search',
      meta: {},
    }));
};

const GlobalSearchResults = () => {
  const navigate = useNavigate();
  const dbGroups = useMenuStore((state) => state.groups);
  const dbPages = useMenuStore((state) => state.pages);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const [search, setSearch] = useState(queryParam);
  const [results, setResults] = useState([]);
  const [domain, setDomain] = useState('all');
  const [pages, setPages] = useState({});
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigablePages = useMemo(() => [...dbPages, ...systemPages].filter((page) => !isHiddenSearchModule(page)), [dbPages]);
  const pageByPath = useMemo(() => new Map(navigablePages.map((page) => [page.path, page])), [navigablePages]);
  const domainIcons = useMemo(() => new Map([
    ...dbGroups.map((group) => {
      const GroupIcon = group.icon || LucideIcons[group.iconName] || LucideIcons.Folder;
      return [group.label, GroupIcon];
    }),
    ['Sistema', LucideIcons.Search],
    ['Usuario', LucideIcons.UserCircle],
  ]), [dbGroups]);
  const baseDomainOptions = useMemo(() => [...new Set(navigablePages.map((page) => page.group || 'Sistema'))]
    .filter(Boolean)
    .sort()
    .map((value) => ({ value, label: value, icon: domainIcons.get(value) || LucideIcons.Folder })), [domainIcons, navigablePages]);

  useEffect(() => {
    setSearch(queryParam);
  }, [queryParam]);

  useEffect(() => {
    const query = search.trim();
    const timer = window.setTimeout(() => {
      if (query === queryParam) return;
      if (query.length >= 2) setSearchParams({ q: query });
      else setSearchParams({});
    }, 350);
    return () => window.clearTimeout(timer);
  }, [queryParam, search, setSearchParams]);

  useEffect(() => {
    const query = queryParam.trim();
    setPages({});
    if (query.length < 2) {
      setResults([]);
      setError('');
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const dataResults = await globalSearchService.search(query, { limit: 60 });
        if (!cancelled) setResults([...moduleResults(query, navigablePages, pageByPath), ...dataResults]);
      } catch (requestError) {
        if (!cancelled) {
          setError(getBackendMessage(requestError, 'No fue posible ejecutar la busqueda global.'));
          setResults(moduleResults(query, navigablePages, pageByPath));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [navigablePages, pageByPath, queryParam]);

  useEffect(() => { setPages({}); }, [domain, pageSize]);

  const domainOptions = useMemo(() => {
    const optionsByValue = new Map(baseDomainOptions.map((option) => [option.value, option]));
    results.forEach((result) => {
      const value = result.domain || result.entity;
      if (value && !optionsByValue.has(value)) {
        const ResultIcon = LucideIcons[result.icon] || domainIcons.get(value) || LucideIcons.Folder;
        optionsByValue.set(value, { value, label: value, icon: ResultIcon });
      }
    });
    return [
      { value: 'all', label: 'Todos los dominios', icon: LucideIcons.Search },
      ...[...optionsByValue.values()].sort((left, right) => left.label.localeCompare(right.label)),
    ];
  }, [baseDomainOptions, domainIcons, results]);

  useEffect(() => {
    if (domain !== 'all' && !domainOptions.some((option) => option.value === domain)) {
      setDomain('all');
    }
  }, [domain, domainOptions]);

  const filtered = useMemo(() => (
    domain === 'all' ? results : results.filter((result) => (result.domain || result.entity) === domain)
  ), [domain, results]);

  const groupedResults = useMemo(() => {
    const groups = new Map();
    filtered.forEach((result) => {
      const key = result.domain || result.entity || 'Otros';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(result);
    });
    return [...groups.entries()].sort((left, right) => left[0].localeCompare(right[0]));
  }, [filtered]);

  const openResult = (result) => {
    if (result?.path && result.path !== '#') navigate(result.path);
  };

  const setDomainPage = (group, nextPage) => {
    setPages((current) => ({ ...current, [group]: nextPage }));
  };

  const getColumnsForGroup = (group) => {
    const detailFor = (item) => (item.entity === 'Modulo' ? item.subtitle : item.meta?.email || item.subtitle);
    const codeFor = (item) => (item.entity === 'Modulo' ? null : item.subtitle?.split(' / ')?.[0]);
    const secondaryDetailFor = (item) => (item.entity === 'Modulo' ? item.destination_label : item.subtitle?.split(' / ')?.slice(1).join(' / '));
    const contextualColumnsByGroup = {
      Administracion: [
        { id: 'detail', label: 'Detalle', headerClassName: 'min-w-56', cellClassName: 'min-w-56', render: (item) => compactText(detailFor(item)) },
        { id: 'status', label: 'Estado', headerClassName: 'w-28 min-w-28', cellClassName: 'w-28 min-w-28', render: (item) => (item.meta?.is_active === undefined ? '-' : <StatusBadge variant={item.meta.is_active ? 'active' : 'inactive'}>{item.meta.is_active ? 'Activo' : 'Inactivo'}</StatusBadge>) },
      ],
      Inventario: [
        { id: 'code', label: 'Codigo', headerClassName: 'w-40 min-w-40', cellClassName: 'w-40 min-w-40', render: (item) => metaText(codeFor(item)) },
        { id: 'category', label: 'Categoria', headerClassName: 'min-w-44', cellClassName: 'min-w-44', render: (item) => compactText(item.meta?.category) },
      ],
      Finanzas: [
        { id: 'code', label: 'Codigo', headerClassName: 'w-36 min-w-36', cellClassName: 'w-36 min-w-36', render: (item) => metaText(codeFor(item)) },
        { id: 'detail', label: 'Detalle', headerClassName: 'min-w-40', cellClassName: 'min-w-40', render: (item) => compactText(secondaryDetailFor(item)) },
      ],
      Clientes: [
        { id: 'identifier', label: 'Identificador', headerClassName: 'w-44 min-w-44', cellClassName: 'w-44 min-w-44', render: (item) => metaText(item.subtitle) },
        { id: 'contact', label: 'Contacto', headerClassName: 'min-w-56', cellClassName: 'min-w-56', render: (item) => compactText(item.meta?.email) },
      ],
      Proveedores: [
        { id: 'identifier', label: 'Identificador', headerClassName: 'w-44 min-w-44', cellClassName: 'w-44 min-w-44', render: (item) => metaText(item.subtitle) },
        { id: 'contact', label: 'Contacto', headerClassName: 'min-w-56', cellClassName: 'min-w-56', render: (item) => compactText(item.meta?.email) },
      ],
      Sistema: [
        { id: 'description', label: 'Descripcion', headerClassName: 'min-w-64', cellClassName: 'min-w-64', render: (item) => compactText(item.subtitle) },
      ],
    };

    return [
      {
        id: 'result',
        label: 'Resultado',
        sortable: true,
        headerClassName: 'min-w-72',
        cellClassName: 'min-w-72',
        sortValue: (item) => item.title,
        render: (item) => {
          const ResultIcon = LucideIcons[item.icon] || LucideIcons.Search;
          return (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                <ResultIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-medium">{item.title}</div>
              </div>
            </div>
          );
        },
      },
      ...(contextualColumnsByGroup[group] || []),
      { id: 'entity', label: 'Tipo', sortable: true, headerClassName: fixedTailColumnClass.type, cellClassName: fixedTailColumnClass.type, render: (item) => <StatusBadge variant="info">{item.entity}</StatusBadge> },
      { id: 'destination', label: 'Destino', headerClassName: fixedTailColumnClass.destination, cellClassName: fixedTailColumnClass.destination, render: (item) => <span className="block truncate text-sm text-slate-600 dark:text-slate-300">{item.destination_label || destinationLabel(item.path, pageByPath)}</span> },
      { id: 'actions', label: 'Acciones', align: 'right', headerClassName: fixedTailColumnClass.actions, cellClassName: fixedTailColumnClass.actions, render: (item) => <RowActionButton label="Abrir" icon={LucideIcons.ExternalLink} onClick={() => openResult(item)} /> },
    ];
  };

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mb-5">
        <h1 className="text-xl font-semibold">Busqueda global</h1>
        <p className="mt-1 text-sm text-slate-500">Coincidencias parciales en modulos y datos maestros consultables.</p>
      </div>

      <KpiBar items={[{ label: 'Coincidencias', value: results.length }, { label: 'Dominios', value: domainOptions.length - 1 }, { label: 'Filtradas', value: filtered.length }, { label: 'Termino', value: queryParam || '-' }]} className="mb-4" />
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <FilterBar
        className="mb-4"
        gridClassName="lg:grid-cols-[minmax(280px,1fr)_260px_auto]"
        searchValue={search}
        searchPlaceholder="Buscar en todos los dominios"
        onSearchChange={setSearch}
        fields={[]}
        actions={(
          <>
            <AutocompleteSelect
              value={domain}
              onChange={setDomain}
              options={domainOptions}
              placeholder="Todos los dominios"
              searchPlaceholder="Filtrar dominios"
              showIcons
            />
            <ActionButton label="Limpiar" icon={LucideIcons.XCircle} variant="neutral" onClick={() => { setSearch(''); setDomain('all'); setSearchParams({}); }} />
          </>
        )}
      />

      {groupedResults.length === 0 && (
        <DataTable
          loading={loading}
          data={[]}
          emptyMessage={queryParam.trim().length < 2 ? 'Escribe al menos 2 caracteres para buscar.' : 'No hay coincidencias para la busqueda.'}
          columns={[{ id: 'result', label: 'Resultado' }]}
        />
      )}

      <div className="space-y-5">
        {groupedResults.map(([group, items]) => {
          const currentPage = pages[group] || 0;
          const visible = items.slice(currentPage * pageSize, currentPage * pageSize + pageSize);
          return (
            <div key={group}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">{group}</h2>
                <StatusBadge variant="info">{items.length} coincidencia(s)</StatusBadge>
              </div>
              <DataTable
                loading={loading}
                data={visible}
                getRowKey={(row, index) => `${row.entity}-${row.title}-${row.path}-${index}`}
                emptyMessage="No hay coincidencias para este dominio."
                footer={<DataTablePagination page={currentPage} pageSize={pageSize} pageSizeOptions={PAGE_SIZE_OPTIONS} total={items.length} hasMore={(currentPage + 1) * pageSize < items.length} loading={loading} onPageChange={(nextPage) => setDomainPage(group, nextPage)} onPageSizeChange={(size) => { setPageSize(size); setPages({}); }} />}
                columns={getColumnsForGroup(group)}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default GlobalSearchResults;
