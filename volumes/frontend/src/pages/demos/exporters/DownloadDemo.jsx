import React, { useState, useCallback, useRef, useEffect } from "react";
import DownloadButton from "@/components/common/exporter/DownloadButton";
import { downloadUrls, simulateDelay } from "./mockData";

const DownloadDemo = () => {
  const [downloadStatus, setDownloadStatus] = useState("");
  const [downloadProgress, setDownloadProgress] = useState({
    loaded: 0,
    total: 0,
    percentage: 0,
  });
  const [downloadHistory, setDownloadHistory] = useState([]);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [isNetworkEnabled, setIsNetworkEnabled] = useState(true);

  const startTimeRef = useRef(null);
  const lastProgressRef = useRef({ time: 0, loaded: 0 });

  // Iconos para mejor UX
  const ICONS = {
    download: "⬇️",
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
    progress: "📥",
    speed: "🚀",
    file: "📄",
    image: "🖼️",
    data: "📊",
    network: "🌐",
    local: "💾",
  };

  // Handlers optimizados con useCallback
  const handleDownloadStart = useCallback((filename = "archivo") => {
    const timestamp = new Date().toISOString();
    setDownloadStatus(`${ICONS.download} Iniciando descarga: ${filename}...`);
    setDownloadProgress({ loaded: 0, total: 0, percentage: 0 });
    setDownloadSpeed(0);
    startTimeRef.current = Date.now();
    lastProgressRef.current = { time: Date.now(), loaded: 0 };

    // Agregar al historial
    setDownloadHistory((prev) => [
      { filename, status: "iniciada", timestamp, size: null },
      ...prev.slice(0, 9), // Mantener solo últimas 10
    ]);
  }, []);

  const handleDownloadProgress = useCallback(
    (loaded, total, percentage) => {
      setDownloadProgress({ loaded, total, percentage });

      // Calcular velocidad de descarga
      const now = Date.now();
      const timeDiff = now - lastProgressRef.current.time;
      const loadedDiff = loaded - lastProgressRef.current.loaded;

      if (timeDiff > 500) {
        // Actualizar velocidad cada 500ms
        const speed = loadedDiff / (timeDiff / 1000); // bytes/segundo
        setDownloadSpeed(speed);
        lastProgressRef.current = { time: now, loaded };
      }

      setDownloadStatus(
        `${ICONS.progress} Descargando... ${percentage}% (${formatSpeed(
          downloadSpeed
        )})`
      );
    },
    [downloadSpeed]
  );

  const handleDownloadSuccess = useCallback((result, filename = "archivo") => {
    const size = result.size;
    const timestamp = new Date().toISOString();
    const duration = startTimeRef.current
      ? (Date.now() - startTimeRef.current) / 1000
      : 0;

    setDownloadStatus(
      `${ICONS.success} Descarga completada: ${formatFileSize(
        size
      )} en ${duration.toFixed(1)}s`
    );

    // Actualizar historial
    setDownloadHistory((prev) =>
      prev.map((item) =>
        item.filename === filename && item.status === "iniciada"
          ? { ...item, status: "completada", size, duration }
          : item
      )
    );

    setTimeout(() => setDownloadStatus(""), 4000);
  }, []);

  const handleDownloadError = useCallback((error, filename = "archivo") => {
    const timestamp = new Date().toISOString();
    setDownloadStatus(`${ICONS.error} Error: ${error.message || error}`);

    // Actualizar historial
    setDownloadHistory((prev) =>
      prev.map((item) =>
        item.filename === filename && item.status === "iniciada"
          ? { ...item, status: "error", error: error.message }
          : item
      )
    );

    setTimeout(() => setDownloadStatus(""), 6000);
  }, []);

  const handleDownloadFinally = useCallback((finalState) => {
    setDownloadProgress({ loaded: 0, total: 0, percentage: 0 });
    setDownloadSpeed(0);
    startTimeRef.current = null;
    console.log("[DownloadDemo] Estado final:", finalState);
  }, []);

  // Utilidades
  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }, []);

  const formatSpeed = useCallback(
    (bytesPerSecond) => {
      return formatFileSize(bytesPerSecond) + "/s";
    },
    [formatFileSize]
  );

  // URLs dinámicas
  const createDelayedUrl = useCallback((delay) => {
    return `https://httpbin.org/delay/${delay}`;
  }, []);

  const createFailingUrl = useCallback((status = 404) => {
    return `https://httpbin.org/status/${status}`;
  }, []);

  const createLargeFileUrl = useCallback((sizeMB) => {
    // Simular archivo grande usando httpbin
    return `https://httpbin.org/bytes/${sizeMB * 1024 * 1024}`;
  }, []);

  const generateDynamicDataUrl = useCallback(
    (type = "text") => {
      const timestamp = new Date().toISOString();

      switch (type) {
        case "json":
          const jsonData = {
            timestamp,
            demo: true,
            downloadHistory: downloadHistory.slice(0, 3),
            systemInfo: {
              userAgent: navigator.userAgent,
              language: navigator.language,
              platform: navigator.platform,
            },
            statistics: {
              totalDownloads: downloadHistory.length,
              successfulDownloads: downloadHistory.filter(
                (d) => d.status === "completada"
              ).length,
              errorDownloads: downloadHistory.filter(
                (d) => d.status === "error"
              ).length,
            },
          };
          return `data:application/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(jsonData, null, 2)
          )}`;

        case "csv":
          const csvHeader = "ID,Filename,Status,Size,Duration,Timestamp\n";
          const csvData = downloadHistory
            .map(
              (item, index) =>
                `${index + 1},"${item.filename}","${item.status}","${
                  item.size || "N/A"
                }","${item.duration || "N/A"}","${item.timestamp}"`
            )
            .join("\n");
          return `data:text/csv;charset=utf-8,${encodeURIComponent(
            csvHeader + csvData
          )}`;

        case "xml":
          const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<downloadReport timestamp="${timestamp}">
  <summary>
    <totalDownloads>${downloadHistory.length}</totalDownloads>
    <successfulDownloads>${
      downloadHistory.filter((d) => d.status === "completada").length
    }</successfulDownloads>
  </summary>
  <downloads>
    ${downloadHistory
      .map(
        (item) => `
    <download>
      <filename>${item.filename}</filename>
      <status>${item.status}</status>
      <timestamp>${item.timestamp}</timestamp>
      ${item.size ? `<size>${item.size}</size>` : ""}
      ${item.duration ? `<duration>${item.duration}</duration>` : ""}
    </download>`
      )
      .join("")}
  </downloads>
</downloadReport>`;
          return `data:text/xml;charset=utf-8,${encodeURIComponent(xmlData)}`;

        default:
          const textData = `Reporte de Descargas - ${timestamp}
==================================

Total de descargas: ${downloadHistory.length}
Exitosas: ${downloadHistory.filter((d) => d.status === "completada").length}
Con errores: ${downloadHistory.filter((d) => d.status === "error").length}

Historial:
${downloadHistory
  .map(
    (item, index) =>
      `${index + 1}. ${item.filename} - ${item.status} - ${item.timestamp}`
  )
  .join("\n")}

---
Generado por DownloadDemo Component`;
          return `data:text/plain;charset=utf-8,${encodeURIComponent(
            textData
          )}`;
      }
    },
    [downloadHistory]
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Demo de DownloadButton - Versión Completa
        </h1>
        <p className="text-gray-600">
          Descarga de TODOS los tipos de archivos soportados con configuraciones
          avanzadas
        </p>

        {downloadStatus && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
            {downloadStatus}
          </div>
        )}

        {downloadProgress.total > 0 && (
          <div className="mt-4 max-w-md mx-auto">
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 transition-all duration-300 ease-out"
                style={{ width: `${downloadProgress.percentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-2">
              <span>
                {formatFileSize(downloadProgress.loaded)} /{" "}
                {formatFileSize(downloadProgress.total)}
              </span>
              <span>{downloadSpeed > 0 && formatSpeed(downloadSpeed)}</span>
            </div>
          </div>
        )}

        {/* Control de red simulado */}
        <div className="mt-4">
          <label className="flex items-center justify-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isNetworkEnabled}
              onChange={(e) => setIsNetworkEnabled(e.target.checked)}
              className="rounded"
            />
            <span
              className={isNetworkEnabled ? "text-green-600" : "text-red-600"}
            >
              {isNetworkEnabled
                ? `${ICONS.network} Red habilitada`
                : `${ICONS.warning} Red deshabilitada (simulado)`}
            </span>
          </label>
        </div>
      </div>

      {/* 1. Todos los Tipos de Archivo Soportados */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          {ICONS.file} 1. Todos los Tipos de Archivo Soportados
        </h2>
        <p className="text-gray-600 mb-4">
          Descarga directa de TODOS los formatos soportados por el sistema.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Documentos */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3 text-gray-800">📄 Documentos</h4>
            <div className="space-y-2">
              <DownloadButton
                url={downloadUrls.pdf}
                filename="documento.pdf"
                size="sm"
                disabled={!isNetworkEnabled}
                onStart={() => handleDownloadStart("documento.pdf")}
                onProgress={handleDownloadProgress}
                onSuccess={(result) =>
                  handleDownloadSuccess(result, "documento.pdf")
                }
                onError={(error) => handleDownloadError(error, "documento.pdf")}
                onFinally={handleDownloadFinally}
              />

              <DownloadButton
                url={generateDynamicDataUrl("xml")}
                filename="reporte.xml"
                size="sm"
                variant="outline"
                onStart={() => handleDownloadStart("reporte.xml")}
                onSuccess={(result) =>
                  handleDownloadSuccess(result, "reporte.xml")
                }
                onError={(error) => handleDownloadError(error, "reporte.xml")}
              />
            </div>
          </div>

          {/* Hojas de Cálculo */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3 text-green-800">
              {ICONS.data} Datos
            </h4>
            <div className="space-y-2">
              <DownloadButton
                url={generateDynamicDataUrl("csv")}
                filename="datos.csv"
                size="sm"
                onStart={() => handleDownloadStart("datos.csv")}
                onSuccess={(result) =>
                  handleDownloadSuccess(result, "datos.csv")
                }
                onError={(error) => handleDownloadError(error, "datos.csv")}
              />

              <DownloadButton
                url={downloadUrls.json}
                filename="usuarios_api.json"
                size="sm"
                variant="outline"
                disabled={!isNetworkEnabled}
                onStart={() => handleDownloadStart("usuarios_api.json")}
                onProgress={handleDownloadProgress}
                onSuccess={(result) =>
                  handleDownloadSuccess(result, "usuarios_api.json")
                }
                onError={(error) =>
                  handleDownloadError(error, "usuarios_api.json")
                }
              />
            </div>
          </div>

          {/* Imágenes */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3 text-blue-800">
              {ICONS.image} Imágenes
            </h4>
            <div className="space-y-2">
              <DownloadButton
                url={downloadUrls.image}
                filename="imagen_random.jpg"
                size="sm"
                showProgress={true}
                disabled={!isNetworkEnabled}
                onStart={() => handleDownloadStart("imagen_random.jpg")}
                onProgress={handleDownloadProgress}
                onSuccess={(result) =>
                  handleDownloadSuccess(result, "imagen_random.jpg")
                }
                onError={(error) =>
                  handleDownloadError(error, "imagen_random.jpg")
                }
              />

              <DownloadButton
                url={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(
                  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#3b82f6"/><text x="100" y="55" text-anchor="middle" fill="white" font-family="Arial" font-size="14">Demo SVG</text></svg>`
                )}`}
                filename="demo.svg"
                size="sm"
                variant="outline"
                onStart={() => handleDownloadStart("demo.svg")}
                onSuccess={(result) =>
                  handleDownloadSuccess(result, "demo.svg")
                }
                onError={(error) => handleDownloadError(error, "demo.svg")}
              />
            </div>
          </div>

          {/* Texto */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3 text-purple-800">📝 Texto</h4>
            <div className="space-y-2">
              <DownloadButton
                url={generateDynamicDataUrl("text")}
                filename="reporte.txt"
                size="sm"
                onStart={() => handleDownloadStart("reporte.txt")}
                onSuccess={(result) =>
                  handleDownloadSuccess(result, "reporte.txt")
                }
                onError={(error) => handleDownloadError(error, "reporte.txt")}
              />

              <DownloadButton
                url="data:text/markdown;charset=utf-8,# Demo Markdown%0A%0AEste es un archivo **Markdown** generado dinámicamente.%0A%0A- Item 1%0A- Item 2%0A- Item 3"
                filename="demo.md"
                size="sm"
                variant="outline"
                onStart={() => handleDownloadStart("demo.md")}
                onSuccess={(result) => handleDownloadSuccess(result, "demo.md")}
                onError={(error) => handleDownloadError(error, "demo.md")}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Configuraciones Avanzadas con Headers */}
      <section className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          {ICONS.network} 2. Headers Personalizados del Config.js
        </h2>
        <p className="text-gray-600 mb-4">
          Descarga con headers automáticos del sistema y configuraciones
          personalizadas.
        </p>

        <div className="bg-white rounded-lg p-4 mb-4">
          <h4 className="font-medium mb-2">Headers del sistema:</h4>
          <pre className="text-xs text-gray-600 bg-gray-100 p-3 rounded overflow-x-auto">
            {`{
  "User-Agent": "Sistema-Inventario/1.0",
  "X-App-Version": "2024.12.20",
  "X-Request-ID": "${Date.now()}",
  "Accept": "application/json",
  "Authorization": "Bearer [token]"
}`}
          </pre>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Con autenticación simulada:</h4>
            <DownloadButton
              url={downloadUrls.json}
              filename="datos_autenticados.json"
              requestInit={{
                headers: {
                  "User-Agent": "Sistema-Inventario/1.0",
                  "X-App-Version": "2024.12.20",
                  "X-Request-ID": `req-${Date.now()}`,
                  Accept: "application/json",
                  Authorization: "Bearer demo-token-123",
                  "X-Client-ID": "download-demo",
                },
              }}
              disabled={!isNetworkEnabled}
              onStart={() => handleDownloadStart("datos_autenticados.json")}
              onProgress={handleDownloadProgress}
              onSuccess={(result) =>
                handleDownloadSuccess(result, "datos_autenticados.json")
              }
              onError={(error) =>
                handleDownloadError(error, "datos_autenticados.json")
              }
            />
          </div>

          <div>
            <h4 className="font-medium mb-2">Request POST con datos:</h4>
            <DownloadButton
              url="https://httpbin.org/post"
              filename="post_response.json"
              requestInit={{
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Demo": "true",
                },
                body: JSON.stringify({
                  demo: true,
                  timestamp: new Date().toISOString(),
                  downloadHistory: downloadHistory.slice(0, 3),
                }),
              }}
              disabled={!isNetworkEnabled}
              onStart={() => handleDownloadStart("post_response.json")}
              onSuccess={(result) =>
                handleDownloadSuccess(result, "post_response.json")
              }
              onError={(error) =>
                handleDownloadError(error, "post_response.json")
              }
            />
          </div>
        </div>
      </section>

      {/* 3. Estados Deshabilitados Dinámicamente */}
      <section className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          {ICONS.warning} 3. Estados Deshabilitados Dinámicos
        </h2>
        <p className="text-gray-600 mb-4">
          Botones que se deshabilitan según diferentes contextos y condiciones.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-2 text-gray-800">
              Red deshabilitada
            </h4>
            <DownloadButton
              url={downloadUrls.image}
              filename="imagen_red_off.jpg"
              disabled={!isNetworkEnabled}
              size="sm"
              onStart={() => handleDownloadStart("imagen_red_off.jpg")}
              onSuccess={(result) =>
                handleDownloadSuccess(result, "imagen_red_off.jpg")
              }
              onError={(error) =>
                handleDownloadError(error, "imagen_red_off.jpg")
              }
            />
            <p className="text-xs text-gray-500 mt-2">
              {isNetworkEnabled
                ? "Red habilitada - funcional"
                : "Red deshabilitada - botón inactivo"}
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-2 text-gray-800">URL inválida</h4>
            <DownloadButton
              url=""
              filename="url_vacia.txt"
              size="sm"
              variant="outline"
              onStart={() => handleDownloadStart("url_vacia.txt")}
              onSuccess={(result) =>
                handleDownloadSuccess(result, "url_vacia.txt")
              }
              onError={(error) => handleDownloadError(error, "url_vacia.txt")}
            />
            <p className="text-xs text-gray-500 mt-2">
              URL vacía - el componente maneja la validación
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-2 text-gray-800">
              Timeout muy corto
            </h4>
            <DownloadButton
              url={downloadUrls.image}
              filename="timeout_corto.jpg"
              timeout={100} // 100ms - muy corto intencionalmente
              size="sm"
              variant="ghost"
              disabled={!isNetworkEnabled}
              onStart={() => handleDownloadStart("timeout_corto.jpg")}
              onSuccess={(result) =>
                handleDownloadSuccess(result, "timeout_corto.jpg")
              }
              onError={(error) =>
                handleDownloadError(error, "timeout_corto.jpg")
              }
            />
            <p className="text-xs text-gray-500 mt-2">
              Timeout de 100ms - debería fallar por timeout
            </p>
          </div>
        </div>
      </section>

      {/* 4. Diferentes Variantes y Tamaños */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          4. Variantes Visuales y Tamaños
        </h2>
        <p className="text-gray-600 mb-4">
          Todos los estilos y tamaños disponibles del componente.
        </p>

        <div className="space-y-6">
          {/* Tamaños */}
          <div>
            <h3 className="font-medium mb-3 text-gray-700">Tamaños:</h3>
            <div className="flex flex-wrap items-center gap-4">
              <DownloadButton
                url={downloadUrls.smallFile}
                filename="pequeno.txt"
                size="sm"
                onStart={() => handleDownloadStart("pequeno.txt")}
                onSuccess={(result) =>
                  handleDownloadSuccess(result, "pequeno.txt")
                }
                onError={(error) => handleDownloadError(error, "pequeno.txt")}
              />
              <DownloadButton
                url={downloadUrls.smallFile}
                filename="mediano.txt"
                size="md"
                onStart={() => handleDownloadStart("mediano.txt")}
                onSuccess={(result) =>
                  handleDownloadSuccess(result, "mediano.txt")
                }
                onError={(error) => handleDownloadError(error, "mediano.txt")}
              />
              <DownloadButton
                url={downloadUrls.smallFile}
                filename="grande.txt"
                size="lg"
                onStart={() => handleDownloadStart("grande.txt")}
                onSuccess={(result) =>
                  handleDownloadSuccess(result, "grande.txt")
                }
                onError={(error) => handleDownloadError(error, "grande.txt")}
              />
            </div>
          </div>

          {/* Variantes */}
          <div>
            <h3 className="font-medium mb-3 text-gray-700">Variantes:</h3>
            <div className="flex flex-wrap gap-4">
              <DownloadButton
                url={downloadUrls.smallFile}
                filename="solid.txt"
                variant="solid"
                onStart={() => handleDownloadStart("solid.txt")}
                onSuccess={(result) =>
                  handleDownloadSuccess(result, "solid.txt")
                }
                onError={(error) => handleDownloadError(error, "solid.txt")}
              />
              <DownloadButton
                url={downloadUrls.smallFile}
                filename="outline.txt"
                variant="outline"
                onStart={() => handleDownloadStart("outline.txt")}
                onSuccess={(result) =>
                  handleDownloadSuccess(result, "outline.txt")
                }
                onError={(error) => handleDownloadError(error, "outline.txt")}
              />
              <DownloadButton
                url={downloadUrls.smallFile}
                filename="ghost.txt"
                variant="ghost"
                onStart={() => handleDownloadStart("ghost.txt")}
                onSuccess={(result) =>
                  handleDownloadSuccess(result, "ghost.txt")
                }
                onError={(error) => handleDownloadError(error, "ghost.txt")}
              />
            </div>
          </div>

          {/* Contenido personalizado */}
          <div>
            <h3 className="font-medium mb-3 text-gray-700">
              Contenido personalizado:
            </h3>
            <div className="flex flex-wrap gap-4">
              <DownloadButton
                url={downloadUrls.image}
                filename="con_icono.jpg"
                disabled={!isNetworkEnabled}
                onStart={() => handleDownloadStart("con_icono.jpg")}
                onSuccess={(result) =>
                  handleDownloadSuccess(result, "con_icono.jpg")
                }
                onError={(error) => handleDownloadError(error, "con_icono.jpg")}
              >
                <span className="flex items-center gap-2">
                  {ICONS.image} Descargar Imagen
                </span>
              </DownloadButton>

              <DownloadButton
                url={generateDynamicDataUrl("json")}
                filename="reporte_completo.json"
                variant="outline"
                onStart={() => handleDownloadStart("reporte_completo.json")}
                onSuccess={(result) =>
                  handleDownloadSuccess(result, "reporte_completo.json")
                }
                onError={(error) =>
                  handleDownloadError(error, "reporte_completo.json")
                }
              >
                <span className="flex items-center gap-2">
                  {ICONS.data} Generar Reporte JSON
                </span>
              </DownloadButton>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Testing de Errores y Edge Cases */}
      <section className="bg-red-50 rounded-lg border border-red-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          {ICONS.error} 5. Testing de Errores y Edge Cases
        </h2>
        <p className="text-gray-600 mb-4">
          Casos que fallan intencionalmente para probar manejo de errores.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-red-200">
            <h4 className="font-medium mb-2 text-red-800">Error 404</h4>
            <DownloadButton
              url={createFailingUrl(404)}
              filename="error_404.txt"
              retries={1}
              size="sm"
              disabled={!isNetworkEnabled}
              onStart={() => handleDownloadStart("error_404.txt")}
              onSuccess={(result) =>
                handleDownloadSuccess(result, "error_404.txt")
              }
              onError={(error) => handleDownloadError(error, "error_404.txt")}
            />
            <p className="text-xs text-red-600 mt-2">Debería fallar con 404</p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-red-200">
            <h4 className="font-medium mb-2 text-red-800">Error 500</h4>
            <DownloadButton
              url={createFailingUrl(500)}
              filename="error_500.txt"
              retries={2}
              size="sm"
              disabled={!isNetworkEnabled}
              onStart={() => handleDownloadStart("error_500.txt")}
              onSuccess={(result) =>
                handleDownloadSuccess(result, "error_500.txt")
              }
              onError={(error) => handleDownloadError(error, "error_500.txt")}
            />
            <p className="text-xs text-red-600 mt-2">
              Server error con 2 reintentos
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-red-200">
            <h4 className="font-medium mb-2 text-red-800">Delay extremo</h4>
            <DownloadButton
              url={createDelayedUrl(10)}
              filename="delay_extremo.json"
              timeout={5000} // 5 segundos, pero el servidor demora 10
              size="sm"
              disabled={!isNetworkEnabled}
              onStart={() => handleDownloadStart("delay_extremo.json")}
              onSuccess={(result) =>
                handleDownloadSuccess(result, "delay_extremo.json")
              }
              onError={(error) =>
                handleDownloadError(error, "delay_extremo.json")
              }
            />
            <p className="text-xs text-red-600 mt-2">10s delay vs 5s timeout</p>
          </div>
        </div>
      </section>

      {/* 6. Progreso Avanzado y Métricas */}
      <section className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          {ICONS.progress} 6. Indicadores de Progreso Avanzados
        </h2>
        <p className="text-gray-600 mb-4">
          Descarga con indicadores visuales detallados y métricas en tiempo
          real.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Archivo mediano con progreso:</h4>
            <DownloadButton
              url={downloadUrls.image}
              filename="imagen_con_progreso.jpg"
              showProgress={true}
              retries={3}
              disabled={!isNetworkEnabled}
              onStart={() => handleDownloadStart("imagen_con_progreso.jpg")}
              onProgress={handleDownloadProgress}
              onSuccess={(result) =>
                handleDownloadSuccess(result, "imagen_con_progreso.jpg")
              }
              onError={(error) =>
                handleDownloadError(error, "imagen_con_progreso.jpg")
              }
              onFinally={handleDownloadFinally}
            />

            {downloadProgress.total > 0 && (
              <div className="mt-3 p-3 bg-white rounded border text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <strong>Progreso:</strong>{" "}
                    {downloadProgress.percentage.toFixed(1)}%
                  </div>
                  <div>
                    <strong>Velocidad:</strong> {formatSpeed(downloadSpeed)}
                  </div>
                  <div>
                    <strong>Descargado:</strong>{" "}
                    {formatFileSize(downloadProgress.loaded)}
                  </div>
                  <div>
                    <strong>Total:</strong>{" "}
                    {formatFileSize(downloadProgress.total)}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <h4 className="font-medium mb-2">Archivo grande simulado:</h4>
            <DownloadButton
              url={createLargeFileUrl(2)} // 2MB
              filename="archivo_grande.bin"
              showProgress={true}
              timeout={60000} // 1 minuto
              disabled={!isNetworkEnabled}
              onStart={() => handleDownloadStart("archivo_grande.bin")}
              onProgress={handleDownloadProgress}
              onSuccess={(result) =>
                handleDownloadSuccess(result, "archivo_grande.bin")
              }
              onError={(error) =>
                handleDownloadError(error, "archivo_grande.bin")
              }
            />
            <p className="text-xs text-gray-500 mt-2">
              Archivo de 2MB para probar velocidad y progreso
            </p>
          </div>
        </div>
      </section>

      {/* 7. Data URLs Dinámicos */}
      <section className="bg-purple-50 rounded-lg border border-purple-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          {ICONS.data} 7. Data URLs Dinámicos con Config del Sistema
        </h2>
        <p className="text-gray-600 mb-4">
          Generación dinámica de archivos usando datos del sistema y
          configuración.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-2">Reporte TXT</h4>
            <DownloadButton
              url={generateDynamicDataUrl("text")}
              filename="reporte_sistema.txt"
              size="sm"
              onStart={() => handleDownloadStart("reporte_sistema.txt")}
              onSuccess={(result) =>
                handleDownloadSuccess(result, "reporte_sistema.txt")
              }
              onError={(error) =>
                handleDownloadError(error, "reporte_sistema.txt")
              }
            />
            <p className="text-xs text-gray-500 mt-2">Historial de descargas</p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-2">Datos JSON</h4>
            <DownloadButton
              url={generateDynamicDataUrl("json")}
              filename="datos_sistema.json"
              size="sm"
              variant="outline"
              onStart={() => handleDownloadStart("datos_sistema.json")}
              onSuccess={(result) =>
                handleDownloadSuccess(result, "datos_sistema.json")
              }
              onError={(error) =>
                handleDownloadError(error, "datos_sistema.json")
              }
            />
            <p className="text-xs text-gray-500 mt-2">
              Estadísticas del sistema
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-2">Tabla CSV</h4>
            <DownloadButton
              url={generateDynamicDataUrl("csv")}
              filename="historial.csv"
              size="sm"
              variant="ghost"
              onStart={() => handleDownloadStart("historial.csv")}
              onSuccess={(result) =>
                handleDownloadSuccess(result, "historial.csv")
              }
              onError={(error) => handleDownloadError(error, "historial.csv")}
            />
            <p className="text-xs text-gray-500 mt-2">
              Historial en formato tabla
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-2">Reporte XML</h4>
            <DownloadButton
              url={generateDynamicDataUrl("xml")}
              filename="reporte.xml"
              size="sm"
              onStart={() => handleDownloadStart("reporte.xml")}
              onSuccess={(result) =>
                handleDownloadSuccess(result, "reporte.xml")
              }
              onError={(error) => handleDownloadError(error, "reporte.xml")}
            />
            <p className="text-xs text-gray-500 mt-2">Estructura XML</p>
          </div>
        </div>
      </section>

      {/* 8. Configuraciones Especiales */}
      <section className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          {ICONS.gear} 8. Configuraciones Especiales
        </h2>
        <p className="text-gray-600 mb-4">
          Comportamientos especiales y configuraciones avanzadas del componente.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-2">Sin auto-descarga</h4>
            <DownloadButton
              url={downloadUrls.smallFile}
              filename="solo_obtener.txt"
              autoDownload={false}
              size="sm"
              onStart={() => handleDownloadStart("solo_obtener.txt")}
              onSuccess={(result) => {
                setDownloadStatus(
                  `${ICONS.info} Datos obtenidos: ${formatFileSize(
                    result.size
                  )} (no descargado)`
                );
                setTimeout(() => setDownloadStatus(""), 3000);
              }}
              onError={(error) =>
                handleDownloadError(error, "solo_obtener.txt")
              }
            />
            <p className="text-xs text-gray-500 mt-2">Solo obtiene los datos</p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-2">Múltiples reintentos</h4>
            <DownloadButton
              url={createFailingUrl(503)} // Service Unavailable
              filename="con_reintentos.txt"
              retries={5}
              retryDelay={2000}
              size="sm"
              variant="outline"
              disabled={!isNetworkEnabled}
              onStart={() => handleDownloadStart("con_reintentos.txt")}
              onSuccess={(result) =>
                handleDownloadSuccess(result, "con_reintentos.txt")
              }
              onError={(error) =>
                handleDownloadError(error, "con_reintentos.txt")
              }
            />
            <p className="text-xs text-gray-500 mt-2">5 reintentos con delay</p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-2">Labels personalizados</h4>
            <DownloadButton
              url={downloadUrls.smallFile}
              filename="labels_custom.txt"
              labels={{
                download: "Obtener",
                downloading: "Obteniendo...",
                success: "¡Completado!",
                error: "Falló",
                retry: "Reintentando...",
                cancelled: "Cancelado",
              }}
              size="sm"
              onStart={() => handleDownloadStart("labels_custom.txt")}
              onSuccess={(result) =>
                handleDownloadSuccess(result, "labels_custom.txt")
              }
              onError={(error) =>
                handleDownloadError(error, "labels_custom.txt")
              }
            />
            <p className="text-xs text-gray-500 mt-2">Textos personalizados</p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-2">Idioma inglés</h4>
            <DownloadButton
              url={downloadUrls.smallFile}
              filename="english_file.txt"
              language="en"
              size="sm"
              variant="ghost"
              onStart={() => handleDownloadStart("english_file.txt")}
              onSuccess={(result) =>
                handleDownloadSuccess(result, "english_file.txt")
              }
              onError={(error) =>
                handleDownloadError(error, "english_file.txt")
              }
            />
            <p className="text-xs text-gray-500 mt-2">Interfaz en inglés</p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-2">Timeout personalizado</h4>
            <DownloadButton
              url={createDelayedUrl(2)}
              filename="timeout_custom.json"
              timeout={15000} // 15 segundos
              size="sm"
              disabled={!isNetworkEnabled}
              onStart={() => handleDownloadStart("timeout_custom.json")}
              onSuccess={(result) =>
                handleDownloadSuccess(result, "timeout_custom.json")
              }
              onError={(error) =>
                handleDownloadError(error, "timeout_custom.json")
              }
            />
            <p className="text-xs text-gray-500 mt-2">Timeout de 15 segundos</p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-2">CORS configurado</h4>
            <DownloadButton
              url={downloadUrls.json}
              filename="cors_config.json"
              requestInit={{
                mode: "cors",
                credentials: "omit",
                cache: "no-cache",
              }}
              size="sm"
              variant="outline"
              disabled={!isNetworkEnabled}
              onStart={() => handleDownloadStart("cors_config.json")}
              onSuccess={(result) =>
                handleDownloadSuccess(result, "cors_config.json")
              }
              onError={(error) =>
                handleDownloadError(error, "cors_config.json")
              }
            />
            <p className="text-xs text-gray-500 mt-2">Configuración CORS</p>
          </div>
        </div>
      </section>

      {/* 9. Historial de Descargas */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          {ICONS.local} 9. Historial de Descargas
        </h2>
        <p className="text-gray-600 mb-4">
          Registro en tiempo real de todas las descargas realizadas en esta
          sesión.
        </p>

        <div className="bg-gray-50 rounded-lg p-4">
          {downloadHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No hay descargas registradas. Usa cualquier botón de arriba para
              comenzar.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {downloadHistory.map((item, index) => (
                <div
                  key={index}
                  className={`p-3 rounded border-l-4 text-sm ${
                    item.status === "completada"
                      ? "bg-green-50 border-green-400"
                      : item.status === "error"
                      ? "bg-red-50 border-red-400"
                      : "bg-blue-50 border-blue-400"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{item.filename}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {new Date(item.timestamp).toLocaleString()}
                        {item.size && ` • ${formatFileSize(item.size)}`}
                        {item.duration && ` • ${item.duration.toFixed(1)}s`}
                      </div>
                      {item.error && (
                        <div className="text-xs text-red-600 mt-1">
                          Error: {item.error}
                        </div>
                      )}
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        item.status === "completada"
                          ? "bg-green-100 text-green-800"
                          : item.status === "error"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {item.status === "completada"
                        ? ICONS.success
                        : item.status === "error"
                        ? ICONS.error
                        : ICONS.download}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {downloadHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600 grid grid-cols-3 gap-4">
                <div>
                  <strong>Total:</strong> {downloadHistory.length}
                </div>
                <div>
                  <strong>Exitosas:</strong>{" "}
                  {
                    downloadHistory.filter((d) => d.status === "completada")
                      .length
                  }
                </div>
                <div>
                  <strong>Errores:</strong>{" "}
                  {downloadHistory.filter((d) => d.status === "error").length}
                </div>
              </div>

              <button
                onClick={() => setDownloadHistory([])}
                className="mt-3 px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Limpiar Historial
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Información Técnica */}
      <section className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3">
          {ICONS.info} Funcionalidades de DownloadButton Implementadas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-blue-300 mb-2">
              ✅ Tipos de Archivo:
            </h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• PDF, DOC, DOCX</li>
              <li>• JPG, PNG, SVG, GIF</li>
              <li>• JSON, CSV, XML, TXT</li>
              <li>• Excel (XLS, XLSX)</li>
              <li>• Markdown, HTML</li>
              <li>• Data URLs dinámicos</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-green-300 mb-2">
              ✅ Características Avanzadas:
            </h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Headers del config.js automáticos</li>
              <li>• Progreso en tiempo real con velocidad</li>
              <li>• Reintentos automáticos configurables</li>
              <li>• Manejo robusto de errores</li>
              <li>• Estados deshabilitados dinámicos</li>
              <li>• Historial de descargas con métricas</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-purple-300 mb-2">
              ✅ Configuraciones:
            </h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Request personalizado (POST, headers)</li>
              <li>• Timeouts configurables</li>
              <li>• CORS y autenticación</li>
              <li>• Labels e idiomas personalizados</li>
              <li>• Variantes visuales (solid, outline, ghost)</li>
              <li>• Tamaños (sm, md, lg)</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 p-4 bg-slate-700 rounded border-l-4 border-green-500">
          <h4 className="font-medium text-green-400 mb-2">
            {ICONS.speed} Optimizaciones Técnicas:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300">
            <div>
              <strong>Performance:</strong>
              <ul className="mt-1 space-y-1">
                <li>• useCallback para prevenir re-renders</li>
                <li>• Cleanup automático de AbortController</li>
                <li>• Cálculo eficiente de velocidad de descarga</li>
                <li>• Gestión optimizada del estado de progreso</li>
              </ul>
            </div>
            <div>
              <strong>UX/UI:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Feedback visual inmediato</li>
                <li>• Indicadores de progreso fluidos</li>
                <li>• Historial persistente durante la sesión</li>
                <li>• Estados claros (éxito, error, progreso)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DownloadDemo;
