import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRemoteDownload } from "./exports/useExport.js";
import { getFormatLabels } from "./exports/index.js";

/**
 * Componente DownloadButton para descarga remota de archivos
 * Maneja descargas HTTP con reintentos, cancelación y progreso
 */
const DownloadButton = ({
  // === CONFIGURACIÓN REQUERIDA ===
  url, // string (obligatoria)

  // === CONFIGURACIÓN OPCIONAL ===
  filename = null, // string | null - nombre sugerido para guardar
  requestInit = {}, // RequestInit - headers, method, etc.

  // === OPCIONES DE DESCARGA ===
  retries = 3, // number - intentos de reintento
  retryDelay = 1000, // number - delay entre reintentos (ms)
  timeout = 30000, // number - timeout por request (ms)
  autoDownload = true, // boolean - auto-descargar al completar

  // === ESTILO ===
  variant = "solid", // 'solid' | 'outline' | 'ghost'
  size = "md", // 'sm' | 'md' | 'lg'
  className = "",
  disabled = false,

  // === CALLBACKS (CONTRATO DE ESTADOS) ===
  onStart = null,
  onProgress = null, // (loaded, total, percentage) => void
  onSuccess = null,
  onError = null,
  onFinally = null,

  // === CONFIGURACIÓN ===
  language = "es",
  labels = {},
  showProgress = false, // boolean - mostrar barra de progreso

  // === ACCESIBILIDAD ===
  "aria-label": ariaLabel = null,
  id = null,

  // === CONTENIDO PERSONALIZABLE ===
  children = null, // ReactNode - contenido personalizado del botón

  ...props
}) => {
  // === VALIDACIÓN DE PROPS ===
  if (!url) {
    throw new Error("DownloadButton requires a url prop");
  }

  // === ESTADO LOCAL ===
  const [downloadProgress, setDownloadProgress] = useState({
    loaded: 0,
    total: 0,
    percentage: 0,
  });
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [startTime, setStartTime] = useState(null);

  // === REFS ===
  const buttonRef = useRef(null);
  const timeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // === HOOK DE DESCARGA ===
  const downloadHook = useRemoteDownload({
    onStart: () => {
      setStartTime(Date.now());
      setDownloadProgress({ loaded: 0, total: 0, percentage: 0 });
      setDownloadSpeed(0);
      if (onStart) onStart();
    },
    onSuccess: (result) => {
      if (autoDownload && result instanceof Blob) {
        downloadBlob(result);
      }
      if (onSuccess) onSuccess(result);
    },
    onError,
    onFinally: (finalState) => {
      setDownloadProgress({ loaded: 0, total: 0, percentage: 0 });
      setDownloadSpeed(0);
      setStartTime(null);
      if (onFinally) onFinally(finalState);
    },
  });

  // === OBTENER ETIQUETAS ===
  const formatLabels = { ...getFormatLabels(language), ...labels };

  // === FUNCIÓN DE DESCARGA PRINCIPAL ===
  const handleDownload = useCallback(async () => {
    if (disabled || downloadHook.loading) return;

    try {
      // Crear AbortController para cancelación
      abortControllerRef.current = new AbortController();

      // Configurar requestInit con signal y progreso
      const enhancedRequestInit = {
        ...requestInit,
        signal: abortControllerRef.current.signal,
      };

      // Ejecutar descarga con progreso personalizado
      await downloadHook.downloadFile(url, {
        filename,
        requestInit: enhancedRequestInit,
        retries,
        retryDelay,
        timeout,
        onProgress: handleProgress,
      });
    } catch (error) {
      // El error se maneja automáticamente por el hook
      console.error("Download failed:", error);
    } finally {
      abortControllerRef.current = null;
    }
  }, [
    url,
    filename,
    requestInit,
    retries,
    retryDelay,
    timeout,
    disabled,
    downloadHook,
  ]);

  // === MANEJO DE PROGRESO ===
  const handleProgress = useCallback(
    (loaded, total) => {
      const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;

      setDownloadProgress({ loaded, total, percentage });

      // Calcular velocidad de descarga
      if (startTime) {
        const elapsed = (Date.now() - startTime) / 1000; // segundos
        const speed = elapsed > 0 ? loaded / elapsed : 0; // bytes/segundo
        setDownloadSpeed(speed);
      }

      // Callback externo de progreso
      if (onProgress) {
        onProgress(loaded, total, percentage);
      }
    },
    [startTime, onProgress]
  );

  // === FUNCIÓN DE AUTO-DESCARGA ===
  const downloadBlob = useCallback(
    (blob) => {
      try {
        // Importar utilidad de descarga de forma diferida
        import("./utils/download.js").then(({ downloadFile }) => {
          const suggestedFilename =
            filename ||
            blob.suggestedFilename ||
            extractFilenameFromUrl(url) ||
            "download";

          downloadFile(blob, suggestedFilename, {
            fallbackToObjectURL: true,
            sanitize: true,
          });
        });
      } catch (error) {
        console.warn("Failed to auto-download:", error);
      }
    },
    [filename, url]
  );

  // === EXTRAER FILENAME DE URL ===
  const extractFilenameFromUrl = (url) => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split("/").pop();
      return filename && filename.includes(".") ? filename : null;
    } catch {
      return null;
    }
  };

  // === CANCELAR DESCARGA ===
  const cancelDownload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort("User cancelled");
    }

    if (downloadHook.cancel) {
      downloadHook.cancel();
    }
  }, [downloadHook]);

  // === FORMATEAR TAMAÑO DE ARCHIVO ===
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // === FORMATEAR VELOCIDAD ===
  const formatSpeed = (bytesPerSecond) => {
    return formatFileSize(bytesPerSecond) + "/s";
  };

  // === CALCULAR TIEMPO RESTANTE ===
  const getEstimatedTimeRemaining = () => {
    if (!downloadSpeed || downloadSpeed === 0 || downloadProgress.total === 0) {
      return null;
    }

    const remaining = downloadProgress.total - downloadProgress.loaded;
    const secondsRemaining = remaining / downloadSpeed;

    if (secondsRemaining < 60) {
      return `${Math.round(secondsRemaining)}s`;
    } else if (secondsRemaining < 3600) {
      return `${Math.round(secondsRemaining / 60)}m`;
    } else {
      return `${Math.round(secondsRemaining / 3600)}h`;
    }
  };

  // === CLASES CSS ===
  const getButtonClasses = () => {
    const baseClasses = [
      "inline-flex items-center gap-2 font-medium rounded-lg border transition-all duration-200",
      "focus:outline-none focus:ring-2 focus:ring-offset-2",
      "disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden",
    ];

    // Tamaños
    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };

    // Variantes
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
      success: [
        "bg-green-600 text-white border-green-600",
        "hover:bg-green-700 hover:border-green-700",
        "focus:ring-green-500",
      ].join(" "),
      error: [
        "bg-red-600 text-white border-red-600",
        "hover:bg-red-700 hover:border-red-700",
        "focus:ring-red-500",
      ].join(" "),
    };

    // Determinar variante según estado
    let effectiveVariant = variant;
    if (downloadHook.success) effectiveVariant = "success";
    if (downloadHook.hasError) effectiveVariant = "error";

    return [
      ...baseClasses,
      sizeClasses[size] || sizeClasses.md,
      variantClasses[effectiveVariant] || variantClasses.solid,
      className,
    ].join(" ");
  };

  // === RENDER SPINNER ===
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
      "☁⬇": <span className="text-base">☁⬇</span>,
      "⬇": <span className="text-base">⬇</span>,
      "✓": <span className="text-base text-current">✓</span>,
      "✗": <span className="text-base text-current">✗</span>,
      "⏸": <span className="text-base">⏸</span>,
    };

    return iconMap[iconName] || <span className="text-base">{iconName}</span>;
  };

  // === RENDER CONTENIDO DEL BOTÓN ===
  const renderButtonContent = () => {
    // Contenido personalizado
    if (children) {
      return children;
    }

    // Estados automáticos
    if (downloadHook.loading) {
      if (showProgress && downloadProgress.total > 0) {
        return (
          <>
            {renderSpinner()}
            <span className="flex flex-col items-start">
              <span>{downloadProgress.percentage}%</span>
              <span className="text-xs opacity-75">
                {formatFileSize(downloadProgress.loaded)} /{" "}
                {formatFileSize(downloadProgress.total)}
              </span>
            </span>
          </>
        );
      } else {
        return (
          <>
            {renderSpinner()}
            {formatLabels.downloading || "Descargando..."}
          </>
        );
      }
    }

    if (downloadHook.success) {
      return (
        <>
          {renderIcon("✓")}
          {formatLabels.success || "¡Descargado!"}
        </>
      );
    }

    if (downloadHook.hasError) {
      return (
        <>
          {renderIcon("✗")}
          {formatLabels.error || "Error"}
        </>
      );
    }

    return (
      <>
        {renderIcon("☁⬇")}
        {formatLabels.download || "Descargar"}
      </>
    );
  };

  // === RENDER BARRA DE PROGRESO ===
  const renderProgressBar = () => {
    if (
      !showProgress ||
      !downloadHook.loading ||
      downloadProgress.total === 0
    ) {
      return null;
    }

    return (
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 overflow-hidden">
        <div
          className="h-full bg-current transition-all duration-300 ease-out"
          style={{ width: `${downloadProgress.percentage}%` }}
        />
      </div>
    );
  };

  // === RESET AUTOMÁTICO DE ESTADOS ===
  useEffect(() => {
    if (downloadHook.success || downloadHook.hasError) {
      // Reset automático después de 3 segundos
      timeoutRef.current = setTimeout(() => {
        downloadHook.reset();
      }, 3000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [downloadHook.success, downloadHook.hasError]);

  // === CLEANUP ===
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort("Component unmounted");
      }
    };
  }, []);

  // === RENDER PRINCIPAL ===
  return (
    <div className="relative inline-block">
      {/* Botón principal */}
      <button
        ref={buttonRef}
        type="button"
        className={getButtonClasses()}
        disabled={disabled}
        onClick={downloadHook.loading ? cancelDownload : handleDownload}
        aria-label={ariaLabel || `Descargar archivo desde ${url}`}
        title={downloadHook.loading ? "Click para cancelar" : undefined}
        id={id}
        {...props}
      >
        {renderButtonContent()}
        {renderProgressBar()}
      </button>

      {/* Información de progreso externa (opcional) */}
      {showProgress && downloadHook.loading && downloadProgress.total > 0 && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-10">
          <div className="flex items-center gap-2">
            <span>{downloadProgress.percentage}%</span>
            <span>•</span>
            <span>
              {formatFileSize(downloadProgress.loaded)} /{" "}
              {formatFileSize(downloadProgress.total)}
            </span>
            {downloadSpeed > 0 && (
              <>
                <span>•</span>
                <span>{formatSpeed(downloadSpeed)}</span>
              </>
            )}
            {getEstimatedTimeRemaining() && (
              <>
                <span>•</span>
                <span>{getEstimatedTimeRemaining()} restante</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Información de error */}
      {downloadHook.hasError && downloadHook.error && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-red-900 text-white text-xs rounded shadow-lg max-w-xs z-10">
          {downloadHook.error}
        </div>
      )}
    </div>
  );
};

export default DownloadButton;
