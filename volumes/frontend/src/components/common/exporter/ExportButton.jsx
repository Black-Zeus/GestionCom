import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useLocalExport } from "./exports/useExport.js";
import {
  getAvailableExporters,
  getFormatLabels,
  getFormatIcons,
} from "./exports/index.js";
import config from "./exports/config.export.json";

/**
 * Componente ExportButton para exportación local de datos
 * Soporta múltiples formatos con carga diferida de dependencias
 */
const ExportButton = ({
  // === DATOS ===
  data = [],
  columns = [],
  datasets = null, // Para múltiples hojas/secciones

  // === CONFIGURACIÓN DEL MENÚ ===
  formats = config.defaultFormats, // ['xlsx', 'csv', 'json']
  hiddenFormats = [],
  labels = {},
  icons = {},
  items = null, // Lista explícita de opciones (override formats)

  // === BRANDING ===
  branding = {},

  // === OPCIONES GLOBALES ===
  filename = "export",
  language = "es",

  // === ESTILO ===
  variant = "solid", // 'solid' | 'outline' | 'ghost'
  size = "md", // 'sm' | 'md' | 'lg'
  className = "",
  disabled = false,

  // === CALLBACKS (CONTRATO DE ESTADOS) ===
  onStart = null,
  onSuccess = null,
  onError = null,
  onFinally = null,

  // === OPCIONES AVANZADAS ===
  validateInput = true,
  autoDownload = true,
  dropdownPosition = "bottom-left", // 'bottom-left' | 'bottom-right'
  closeOnSelect = true,

  // === ACCESIBILIDAD ===
  "aria-label": ariaLabel = "Exportar datos",
  id = null,

  ...props
}) => {
  // === ESTADO LOCAL ===
  const [isOpen, setIsOpen] = useState(false);

  // === REFS ===
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const timeoutRef = useRef(null);

  // === HOOK DE EXPORTACIÓN ===
  const exportHook = useLocalExport({
    onStart,
    onSuccess: (result) => {
      if (autoDownload && result instanceof Blob) {
        downloadBlob(result);
      }
      if (onSuccess) onSuccess(result);
    },
    onError,
    onFinally,
  });

  // === OBTENER CONFIGURACIÓN ===
  const formatLabels = useMemo(
    () => ({ ...getFormatLabels(language), ...labels }),
    [language, labels]
  );
  const formatIcons = useMemo(
    () => ({ ...getFormatIcons(), ...icons }),
    [icons]
  );

  // === DERIVAR EXPORTADORES DISPONIBLES ===
  const availableExporters = useMemo(() => {
    return getAvailableExporters({
      formats: formats.length > 0 ? formats : null,
      excludeFormats: hiddenFormats,
    });
  }, [formats, hiddenFormats]);

  // === DERIVAR ITEMS DEL MENÚ ===
  const menuItems = useMemo(() => {
    if (items && Array.isArray(items)) return items;

    return availableExporters.map((exporter) => ({
      type: "builtin",
      format: exporter.key,
      label: formatLabels[exporter.key] || exporter.name,
      icon: formatIcons[exporter.key] || exporter.icon,
      description: exporter.description,
      dependencies: exporter.dependencies,
      onClick: null,
    }));
  }, [items, availableExporters, formatLabels, formatIcons]);

  // === MANEJO DE CLICKS EXTERNOS ===
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        buttonRef.current &&
        menuRef.current &&
        !buttonRef.current.contains(event.target) &&
        !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // === MANEJO DE TECLADO ===
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return;

      switch (event.key) {
        case "Escape":
          setIsOpen(false);
          buttonRef.current?.focus();
          break;
        case "ArrowDown":
          event.preventDefault();
          focusNextMenuItem();
          break;
        case "ArrowUp":
          event.preventDefault();
          focusPreviousMenuItem();
          break;
        case "Enter":
        case " ":
          if (event.target.getAttribute("role") === "menuitem") {
            event.preventDefault();
            event.target.click();
          }
          break;
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // === FUNCIONES DE NAVEGACIÓN POR TECLADO ===
  const focusNextMenuItem = () => {
    const menuEls = menuRef.current?.querySelectorAll('[role="menuitem"]');
    if (!menuEls?.length) return;

    const currentIndex = Array.from(menuEls).findIndex(
      (item) => item === document.activeElement
    );
    const nextIndex = currentIndex < menuEls.length - 1 ? currentIndex + 1 : 0;
    menuEls[nextIndex]?.focus();
  };

  const focusPreviousMenuItem = () => {
    const menuEls = menuRef.current?.querySelectorAll('[role="menuitem"]');
    if (!menuEls?.length) return;

    const currentIndex = Array.from(menuEls).findIndex(
      (item) => item === document.activeElement
    );
    const previousIndex =
      currentIndex > 0 ? currentIndex - 1 : menuEls.length - 1;
    menuEls[previousIndex]?.focus();
  };

  // === FUNCIONES DE EXPORTACIÓN ===
  const handleExport = useCallback(
    async (format, customOptions = {}) => {
      try {
        const exportData = datasets ? { datasets } : data;

        const exportOptions = {
          filename,
          columns,
          branding,
          validateInput,
          ...customOptions,
        };

        await exportHook.exportData(format, exportData, exportOptions);

        if (closeOnSelect) {
          setIsOpen(false);
        }
      } catch (error) {
        console.error(`Export failed for format ${format}:`, error);
      }
    },
    [
      data,
      datasets,
      columns,
      filename,
      branding,
      validateInput,
      closeOnSelect,
      exportHook,
    ]
  );

  // === FUNCIÓN DE DESCARGA ===
  const downloadBlob = (blob) => {
    try {
      import("./utils/download.js").then(({ downloadFile }) => {
        const suggestedFilename =
          blob.suggestedFilename ||
          `${filename}.${blob.exportFormat || "file"}`;
        downloadFile(blob, suggestedFilename, {
          fallbackToObjectURL: true,
        });
      });
    } catch (error) {
      console.warn("Failed to auto-download:", error);
    }
  };

  // === MANEJO DE CLICKS EN ITEMS ===
  const handleItemClick = useCallback(
    async (item, event) => {
      event.preventDefault();

      if (item.type === "custom" && item.onClick) {
        try {
          await item.onClick(item, { data, columns, datasets, branding });
        } catch (error) {
          console.error("Custom item onClick failed:", error);
          if (onError) onError(error.message || "Custom export failed");
        }
      } else if (item.type === "builtin" || item.format) {
        await handleExport(item.format, item.options);
      }
    },
    [data, columns, datasets, branding, handleExport, onError]
  );

  // === TOGGLE DROPDOWN ===
  const toggleDropdown = useCallback(() => {
    if (disabled || exportHook.loading) return;
    setIsOpen((prev) => !prev);
  }, [disabled, exportHook.loading]);

  // === CLASES CSS ===
  const getButtonClasses = () => {
    const baseClasses = [
      "inline-flex items-center gap-2 font-medium rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2",
      "disabled:opacity-60 disabled:cursor-not-allowed",
    ];

    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };

    const variantClasses = {
      solid: [
        "bg-blue-600 text-white border-blue-600",
        "hover:bg-blue-700 hover:border-blue-700",
        "focus:ring-blue-500",
        "active:bg-blue-800",
      ].join(" "),
      outline: [
        "bg-transparent text-blue-600 border-blue-600",
        "hover:bg-blue-50 dark:hover:bg-blue-900/20",
        "focus:ring-blue-500",
        "active:bg-blue-100 dark:active:bg-blue-900/30",
      ].join(" "),
      ghost: [
        "bg-transparent text-gray-700 dark:text-gray-300 border-transparent",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        "focus:ring-gray-500",
        "active:bg-gray-200 dark:active:bg-gray-700",
      ].join(" "),
    };

    return [
      ...baseClasses,
      sizeClasses[size] || sizeClasses.md,
      variantClasses[variant] || variantClasses.solid,
      className,
    ].join(" ");
  };

  const getMenuClasses = () => {
    const baseClasses = [
      "absolute z-50 min-w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
      "rounded-lg shadow-lg mt-1 py-1 max-h-96 overflow-y-auto",
    ];

    const positionClasses = {
      "bottom-left": "left-0 top-full",
      "bottom-right": "right-0 top-full",
    };

    return [
      ...baseClasses,
      positionClasses[dropdownPosition] || positionClasses["bottom-left"],
    ].join(" ");
  };

  // === RENDER LOADING SPINNER ===
  const renderSpinner = () => (
    <svg
      className="animate-spin -ml-1 mr-2 h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );

  // === RENDER ICON ===
  const renderIcon = (iconName) => {
    const iconMap = {
      "📊": <span className="text-base">📊</span>,
      "📄": <span className="text-base">📄</span>,
      "{ }": <span className="text-xs font-mono">{}</span>,
      "🏢📊": <span className="text-base">🏢📊</span>,
      "🏢📄": <span className="text-base">🏢📄</span>,
      "⬇": <span className="text-base">⬇</span>,
      "▼": <span className="text-xs">▼</span>,
      "✓": <span className="text-green-600">✓</span>,
      "✗": <span className="text-red-600">✗</span>,
    };

    return iconMap[iconName] || <span className="text-base">{iconName}</span>;
  };

  // === RENDER ESTADO DEL BOTÓN ===
  const renderButtonContent = () => {
    if (exportHook.loading) {
      return (
        <>
          {renderSpinner()}
          {formatLabels.exporting || "Exportando..."}
        </>
      );
    }

    if (exportHook.success) {
      return (
        <>
          {renderIcon("✓")}
          {formatLabels.success || "Exportado"}
        </>
      );
    }

    if (exportHook.hasError) {
      return (
        <>
          {renderIcon("✗")}
          {formatLabels.error || "Error"}
        </>
      );
    }

    return (
      <>
        {renderIcon("⬇")}
        {formatLabels.export || "Exportar"}
        {!exportHook.loading && renderIcon("▼")}
      </>
    );
  };

  // === RENDER MENU ITEMS ===
  const renderMenuItem = (item, index) => {
    const isBuiltin = item.type === "builtin" || item.format;
    const isDisabled =
      item.disabled || (isBuiltin && item.dependencies?.length > 0);

    return (
      <button
        key={item.key || item.format || index}
        role="menuitem"
        tabIndex={-1}
        className={[
          "w-full px-3 py-2 text-left text-sm flex items-center gap-3 transition-colors duration-150",
          "hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700",
          "focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
          isDisabled
            ? "text-gray-400 dark:text-gray-500"
            : "text-gray-700 dark:text-gray-300",
        ].join(" ")}
        disabled={isDisabled}
        onClick={(e) => !isDisabled && handleItemClick(item, e)}
      >
        {item.icon && renderIcon(item.icon)}
        <div className="flex-1">
          <div className="font-medium">{item.label}</div>
          {item.description && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {item.description}
            </div>
          )}
        </div>
        {item.dependencies?.length > 0 && (
          <div
            className="text-xs text-gray-400"
            title={`Requires: ${item.dependencies.join(", ")}`}
          >
            *
          </div>
        )}
      </button>
    );
  };

  // === RENDER MENU HEADER ===
  const renderMenuHeader = () => {
    if (menuItems.length === 0) return null;

    const hasBuiltin = menuItems.some(
      (item) => item.type === "builtin" || item.format
    );
    const hasCustom = menuItems.some((item) => item.type === "custom");

    if (hasBuiltin && hasCustom) {
      return (
        <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
          Formatos de Exportación
        </div>
      );
    }

    return null;
  };

  // === RESET ESTADOS EN SUCCESS/ERROR ===
  useEffect(() => {
    if (exportHook.success || exportHook.hasError) {
      timeoutRef.current = setTimeout(() => {
        exportHook.reset();
      }, 3000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [exportHook.success, exportHook.hasError]);

  // === CLEANUP ===
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // === RENDER PRINCIPAL ===
  return (
    <div className="relative inline-block" {...props}>
      {/* Botón principal */}
      <button
        ref={buttonRef}
        type="button"
        className={getButtonClasses()}
        disabled={disabled || exportHook.loading}
        onClick={toggleDropdown}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        id={id}
      >
        {renderButtonContent()}
      </button>

      {/* Menú dropdown */}
      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          className={getMenuClasses()}
          aria-labelledby={id}
        >
          {renderMenuHeader()}

          {menuItems.length > 0 ? (
            menuItems.map((item, index) => renderMenuItem(item, index))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              No hay formatos disponibles
            </div>
          )}

          {menuItems.some((item) => item.type === "custom") &&
            menuItems.some(
              (item) => item.type === "builtin" || item.format
            ) && (
              <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
            )}
        </div>
      )}
    </div>
  );
};

export default ExportButton;
