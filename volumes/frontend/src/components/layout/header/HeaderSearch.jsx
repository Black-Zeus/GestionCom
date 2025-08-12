// ====================================
// HEADER SEARCH COMPONENT
// ====================================

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useSearch } from '@/store/headerStore';

/**
 * Componente de búsqueda del header
 * Incluye autocompletado, historial y navegación por teclado
 */
function HeaderSearch({ className }) {
  const [isFocused, setIsFocused] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const searchRef = useRef(null);
  const resultsRef = useRef(null);
  const navigate = useNavigate();

  // Store state
  const {
    query,
    results,
    history,
    isSearching,
    setQuery,
    performSearch,
    clear
  } = useSearch();

  // ====================================
  // CONFIGURACIÓN DE BÚSQUEDA
  // ====================================
  
  const searchCategories = [
    { id: 'products', label: 'Productos', icon: '📦', color: 'blue' },
    { id: 'clients', label: 'Clientes', icon: '👥', color: 'green' },
    { id: 'sales', label: 'Ventas', icon: '💰', color: 'yellow' },
    { id: 'reports', label: 'Reportes', icon: '📊', color: 'purple' },
    { id: 'users', label: 'Usuarios', icon: '👤', color: 'indigo' }
  ];

  const quickSearches = [
    { query: 'productos con stock bajo', category: 'products', icon: '⚠️' },
    { query: 'ventas de hoy', category: 'sales', icon: '📈' },
    { query: 'clientes vip', category: 'clients', icon: '⭐' },
    { query: 'reportes mensuales', category: 'reports', icon: '📋' }
  ];

  // ====================================
  // EFECTOS
  // ====================================

  // Cerrar resultados al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Realizar búsqueda con debounce
  useEffect(() => {
    if (query.length >= 2) {
      const timer = setTimeout(() => {
        performSearch(query);
        setShowResults(true);
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setShowResults(false);
    }
  }, [query, performSearch]);

  // ====================================
  // HANDLERS
  // ====================================

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);

    if (value.length === 0) {
      setShowResults(false);
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    if (query.length >= 2 || history.length > 0) {
      setShowResults(true);
    }
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    // Delay para permitir clics en resultados
    setTimeout(() => {
      setShowResults(false);
      setSelectedIndex(-1);
    }, 200);
  };

  const handleKeyDown = (e) => {
    if (!showResults) return;

    const allItems = [
      ...results,
      ...history.slice(0, 3).map(h => ({ id: `history-${h}`, type: 'history', title: h })),
      ...quickSearches.map(q => ({ id: `quick-${q.query}`, type: 'quick', ...q }))
    ];

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < allItems.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : allItems.length - 1
        );
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && allItems[selectedIndex]) {
          handleResultClick(allItems[selectedIndex]);
        } else if (query.trim()) {
          handleSearch(query);
        }
        break;
        
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        searchRef.current?.blur();
        break;
    }
  };

  const handleSearch = (searchQuery) => {
    if (!searchQuery.trim()) return;

    //console.log('🔍 Realizando búsqueda:', searchQuery);
    performSearch(searchQuery);
    setShowResults(false);
    
    // Navegar a página de resultados (opcional)
    // navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const handleResultClick = (result) => {
    //console.log('🎯 Resultado seleccionado:', result);
    
    if (result.type === 'history' || result.type === 'quick') {
      setQuery(result.title || result.query);
      handleSearch(result.title || result.query);
    } else if (result.url) {
      navigate(result.url);
      clear();
      setShowResults(false);
    }
  };

  const handleQuickSearchClick = (quickSearch) => {
    setQuery(quickSearch.query);
    handleSearch(quickSearch.query);
  };

  const handleClearSearch = () => {
    clear();
    setShowResults(false);
    searchRef.current?.focus();
  };

  // ====================================
  // RENDER HELPERS
  // ====================================

  const renderResultItem = (item, index) => {
    const isSelected = index === selectedIndex;
    const categoryConfig = searchCategories.find(c => c.id === item.category);
    
    return (
      <button
        key={item.id}
        onClick={() => handleResultClick(item)}
        className={cn(
          // Layout
          "w-full flex items-center gap-3 px-4 py-3",
          "text-left transition-colors duration-150",
          
          // Estados
          isSelected 
            ? "bg-blue-50 border-l-2 border-l-blue-500 dark:bg-blue-900/20" 
            : "hover:bg-gray-50 dark:hover:bg-gray-800",
          
          // Bordes
          "border-b border-gray-100 dark:border-gray-700 last:border-b-0"
        )}
      >
        {/* Icono */}
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
          categoryConfig ? `bg-${categoryConfig.color}-100 text-${categoryConfig.color}-600` : "bg-gray-100 text-gray-600",
          "dark:bg-gray-700 dark:text-gray-300"
        )}>
          <span className="text-sm">
            {item.type === 'history' ? '🕐' : 
             item.type === 'quick' ? item.icon : 
             categoryConfig?.icon || '📄'}
          </span>
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className={cn(
            "font-medium text-gray-900 dark:text-gray-100",
            "truncate"
          )}>
            {item.title || item.query}
          </div>
          {item.type && (
            <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {item.type === 'history' ? 'Búsqueda reciente' :
               item.type === 'quick' ? 'Búsqueda rápida' :
               categoryConfig?.label || item.type}
            </div>
          )}
        </div>

        {/* Indicador de tipo */}
        <div className="flex-shrink-0">
          {item.type === 'history' && (
            <span className="text-xs text-gray-400">Historial</span>
          )}
          {item.type === 'quick' && (
            <span className="text-xs text-blue-500">Rápida</span>
          )}
        </div>
      </button>
    );
  };

  // ====================================
  // RENDER PRINCIPAL
  // ====================================

  return (
    <div 
      ref={searchRef}
      className={cn(
        "relative flex-shrink-0",
        className
      )}
    >
      {/* Input de Búsqueda */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder="Buscar productos, clientes, ventas..."
          className={cn(
            // Layout
            "w-64 lg:w-80 xl:w-96",
            "pl-10 pr-10 py-2.5",
            "rounded-xl",
            
            // Estilos base
            "bg-gray-50 border border-gray-200",
            "text-gray-900 placeholder-gray-500",
            "transition-all duration-200",
            
            // Focus
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            "focus:bg-white",
            
            // Modo oscuro
            "dark:bg-gray-800 dark:border-gray-600",
            "dark:text-gray-100 dark:placeholder-gray-400",
            "dark:focus:bg-gray-700",
            
            // Estados
            isFocused && "ring-2 ring-blue-500 border-blue-500 bg-white shadow-lg",
            isSearching && "animate-pulse"
          )}
          autoComplete="off"
          spellCheck="false"
        />

        {/* Icono de búsqueda */}
        <div className={cn(
          "absolute left-3 top-1/2 transform -translate-y-1/2",
          "text-gray-400 pointer-events-none",
          isSearching && "animate-spin"
        )}>
          {isSearching ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>

        {/* Botón limpiar */}
        {query && (
          <button
            onClick={handleClearSearch}
            className={cn(
              "absolute right-3 top-1/2 transform -translate-y-1/2",
              "text-gray-400 hover:text-gray-600",
              "transition-colors duration-150",
              "dark:hover:text-gray-300"
            )}
            aria-label="Limpiar búsqueda"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Resultados de Búsqueda */}
      {showResults && (
        <div 
          ref={resultsRef}
          className={cn(
            // Posición
            "absolute top-full left-0 right-0 mt-2",
            "z-dropdown",
            
            // Estilos
            "bg-white rounded-xl shadow-xl border border-gray-200",
            "max-h-96 overflow-y-auto",
            "backdrop-blur-sm",
            
            // Modo oscuro
            "dark:bg-gray-900 dark:border-gray-700",
            
            // Animación
            "animate-slide-in-up"
          )}
        >
          {/* Resultados de búsqueda */}
          {results.length > 0 && (
            <div>
              <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Resultados ({results.length})
                </h4>
              </div>
              {results.map((result, index) => renderResultItem(result, index))}
            </div>
          )}

          {/* Historial de búsqueda */}
          {query.length < 2 && history.length > 0 && (
            <div>
              <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Búsquedas Recientes
                </h4>
              </div>
              {history.slice(0, 3).map((item, index) => 
                renderResultItem({ 
                  id: `history-${item}`, 
                  title: item, 
                  type: 'history' 
                }, results.length + index)
              )}
            </div>
          )}

          {/* Búsquedas rápidas */}
          {query.length < 2 && (
            <div>
              <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Búsquedas Rápidas
                </h4>
              </div>
              {quickSearches.map((quick, index) => 
                renderResultItem({ 
                  id: `quick-${quick.query}`, 
                  query: quick.query,
                  title: quick.query,
                  type: 'quick',
                  icon: quick.icon,
                  category: quick.category
                }, results.length + history.length + index)
              )}
            </div>
          )}

          {/* Sin resultados */}
          {query.length >= 2 && results.length === 0 && !isSearching && (
            <div className="px-4 py-8 text-center">
              <div className="text-gray-400 dark:text-gray-500 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No se encontraron resultados para "{query}"
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Intenta con términos diferentes
              </p>
            </div>
          )}

          {/* Footer con consejos */}
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>↑↓ Navegar • Enter Seleccionar</span>
              <span>Esc Cerrar</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HeaderSearch;