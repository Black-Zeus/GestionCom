import React, { useState } from "react";
import DownloadButton from "@/components/common/exporter/DownloadButton";
import { downloadUrls, simulateDelay } from "./mockData";

const DownloadDemo = () => {
  const [downloadStatus, setDownloadStatus] = useState("");
  const [downloadProgress, setDownloadProgress] = useState({
    loaded: 0,
    total: 0,
    percentage: 0,
  });

  // Handlers para eventos de descarga
  const handleDownloadStart = () => {
    setDownloadStatus("🚀 Iniciando descarga...");
    setDownloadProgress({ loaded: 0, total: 0, percentage: 0 });
  };

  const handleDownloadProgress = (loaded, total, percentage) => {
    setDownloadProgress({ loaded, total, percentage });
    setDownloadStatus(`📥 Descargando... ${percentage}%`);
  };

  const handleDownloadSuccess = (result) => {
    setDownloadStatus(`✅ Descarga completada: ${formatFileSize(result.size)}`);
    setTimeout(() => setDownloadStatus(""), 3000);
  };

  const handleDownloadError = (error) => {
    setDownloadStatus(`❌ Error: ${error}`);
    setTimeout(() => setDownloadStatus(""), 5000);
  };

  const handleDownloadFinally = (finalState) => {
    console.log("Estado final de descarga:", finalState);
  };

  // Utilidad para formatear tamaño de archivo
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Simular URL con delay personalizado
  const createDelayedUrl = (delay) => {
    return `https://httpbin.org/delay/${delay}`;
  };

  // Simular URL que falla
  const createFailingUrl = () => {
    return "https://httpbin.org/status/404";
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Demo de DownloadButton
        </h1>
        <p className="text-gray-600">
          Ejemplos de descarga de archivos remotos con diferentes
          configuraciones
        </p>
        {downloadStatus && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
            {downloadStatus}
          </div>
        )}
        {downloadProgress.total > 0 && (
          <div className="mt-2 max-w-md mx-auto">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress.percentage}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {formatFileSize(downloadProgress.loaded)} /{" "}
              {formatFileSize(downloadProgress.total)}
            </div>
          </div>
        )}
      </div>

      {/* Descargas Básicas */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">1. Descargas Básicas</h2>
        <p className="text-gray-600 mb-4">
          Descarga directa de diferentes tipos de archivos con configuración
          mínima.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Archivo PDF local</h4>
            <DownloadButton
              url={downloadUrls.pdf}
              filename="documento.pdf"
              onStart={handleDownloadStart}
              onProgress={handleDownloadProgress}
              onSuccess={handleDownloadSuccess}
              onError={handleDownloadError}
              onFinally={handleDownloadFinally}
            />
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Imagen remota</h4>
            <DownloadButton
              url={downloadUrls.image}
              filename="imagen_random.jpg"
              onStart={handleDownloadStart}
              onProgress={handleDownloadProgress}
              onSuccess={handleDownloadSuccess}
              onError={handleDownloadError}
            />
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">JSON desde API</h4>
            <DownloadButton
              url={downloadUrls.json}
              filename="usuarios_api.json"
              onStart={handleDownloadStart}
              onProgress={handleDownloadProgress}
              onSuccess={handleDownloadSuccess}
              onError={handleDownloadError}
            />
          </div>
        </div>
      </section>

      {/* Configuraciones de Tamaño y Variante */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">2. Variantes y Tamaños</h2>
        <p className="text-gray-600 mb-4">
          Diferentes estilos visuales y tamaños del botón de descarga.
        </p>

        <div className="space-y-6">
          {/* Tamaños */}
          <div>
            <h3 className="font-medium mb-3">Tamaños</h3>
            <div className="flex flex-wrap items-center gap-4">
              <DownloadButton
                url={downloadUrls.smallFile}
                filename="pequeno.txt"
                size="sm"
                onStart={handleDownloadStart}
                onSuccess={handleDownloadSuccess}
                onError={handleDownloadError}
              />
              <DownloadButton
                url={downloadUrls.smallFile}
                filename="mediano.txt"
                size="md"
                onStart={handleDownloadStart}
                onSuccess={handleDownloadSuccess}
                onError={handleDownloadError}
              />
              <DownloadButton
                url={downloadUrls.smallFile}
                filename="grande.txt"
                size="lg"
                onStart={handleDownloadStart}
                onSuccess={handleDownloadSuccess}
                onError={handleDownloadError}
              />
            </div>
          </div>

          {/* Variantes */}
          <div>
            <h3 className="font-medium mb-3">Variantes</h3>
            <div className="flex flex-wrap gap-4">
              <DownloadButton
                url={downloadUrls.smallFile}
                filename="solid.txt"
                variant="solid"
                onStart={handleDownloadStart}
                onSuccess={handleDownloadSuccess}
                onError={handleDownloadError}
              />
              <DownloadButton
                url={downloadUrls.smallFile}
                filename="outline.txt"
                variant="outline"
                onStart={handleDownloadStart}
                onSuccess={handleDownloadSuccess}
                onError={handleDownloadError}
              />
              <DownloadButton
                url={downloadUrls.smallFile}
                filename="ghost.txt"
                variant="ghost"
                onStart={handleDownloadStart}
                onSuccess={handleDownloadSuccess}
                onError={handleDownloadError}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Con Progreso */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">3. Indicador de Progreso</h2>
        <p className="text-gray-600 mb-4">
          Descarga con barra de progreso visible y información detallada.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Progreso en botón</h4>
            <DownloadButton
              url={downloadUrls.mediumFile}
              filename="con_progreso.bin"
              showProgress={true}
              onStart={handleDownloadStart}
              onProgress={handleDownloadProgress}
              onSuccess={handleDownloadSuccess}
              onError={handleDownloadError}
            />
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Archivo más grande</h4>
            <DownloadButton
              url={downloadUrls.largeFile}
              filename="archivo_grande.bin"
              showProgress={true}
              onStart={handleDownloadStart}
              onProgress={handleDownloadProgress}
              onSuccess={handleDownloadSuccess}
              onError={handleDownloadError}
            />
          </div>
        </div>
      </section>

      {/* Configuración de Reintentos */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          4. Manejo de Errores y Reintentos
        </h2>
        <p className="text-gray-600 mb-4">
          Configuración de reintentos automáticos y manejo de errores.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Con reintentos (3x)</h4>
            <DownloadButton
              url={createFailingUrl()}
              filename="con_reintentos.txt"
              retries={3}
              retryDelay={1000}
              onStart={handleDownloadStart}
              onSuccess={handleDownloadSuccess}
              onError={handleDownloadError}
            />
            <p className="text-xs text-gray-500">
              URL que falla para probar reintentos
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Timeout corto (5s)</h4>
            <DownloadButton
              url={createDelayedUrl(3)}
              filename="timeout_corto.json"
              timeout={5000}
              onStart={handleDownloadStart}
              onSuccess={handleDownloadSuccess}
              onError={handleDownloadError}
            />
            <p className="text-xs text-gray-500">Descarga con delay de 3s</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Sin reintentos</h4>
            <DownloadButton
              url={createFailingUrl()}
              filename="sin_reintentos.txt"
              retries={0}
              onStart={handleDownloadStart}
              onSuccess={handleDownloadSuccess}
              onError={handleDownloadError}
            />
            <p className="text-xs text-gray-500">Falla inmediatamente</p>
          </div>
        </div>
      </section>

      {/* Headers Personalizados */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          5. Headers y Configuración HTTP
        </h2>
        <p className="text-gray-600 mb-4">
          Descargas con headers personalizados y configuración de request.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Con headers custom</h4>
            <DownloadButton
              url={downloadUrls.json}
              filename="con_headers.json"
              requestInit={{
                headers: {
                  "User-Agent": "DownloadDemo/1.0",
                  Accept: "application/json",
                },
              }}
              onStart={handleDownloadStart}
              onSuccess={handleDownloadSuccess}
              onError={handleDownloadError}
            />
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Método POST</h4>
            <DownloadButton
              url="https://httpbin.org/post"
              filename="post_response.json"
              requestInit={{
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ demo: true, timestamp: Date.now() }),
              }}
              onStart={handleDownloadStart}
              onSuccess={handleDownloadSuccess}
              onError={handleDownloadError}
            />
          </div>
        </div>
      </section>

      {/* Estados Especiales */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          6. Estados y Comportamientos
        </h2>
        <p className="text-gray-600 mb-4">
          Diferentes estados del botón y comportamientos especiales.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Deshabilitado</h4>
            <DownloadButton
              url={downloadUrls.pdf}
              filename="deshabilitado.pdf"
              disabled={true}
              onStart={handleDownloadStart}
              onSuccess={handleDownloadSuccess}
              onError={handleDownloadError}
            />
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Sin auto-descarga</h4>
            <DownloadButton
              url={downloadUrls.smallFile}
              filename="sin_auto_descarga.txt"
              autoDownload={false}
              onStart={handleDownloadStart}
              onSuccess={(result) => {
                setDownloadStatus(
                  `✅ Datos obtenidos: ${formatFileSize(
                    result.size
                  )} (no descargado)`
                );
                setTimeout(() => setDownloadStatus(""), 3000);
              }}
              onError={handleDownloadError}
            />
            <p className="text-xs text-gray-500">
              Solo obtiene los datos, no descarga
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Contenido personalizado</h4>
            <DownloadButton
              url={downloadUrls.image}
              filename="personalizado.jpg"
              onStart={handleDownloadStart}
              onSuccess={handleDownloadSuccess}
              onError={handleDownloadError}
            >
              <span className="flex items-center gap-2">
                🖼️ Descargar Imagen
              </span>
            </DownloadButton>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Con delay simulado</h4>
            <DownloadButton
              url={createDelayedUrl(2)}
              filename="con_delay.json"
              showProgress={true}
              onStart={handleDownloadStart}
              onProgress={handleDownloadProgress}
              onSuccess={handleDownloadSuccess}
              onError={handleDownloadError}
            />
            <p className="text-xs text-gray-500">Delay de 2 segundos</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Idioma inglés</h4>
            <DownloadButton
              url={downloadUrls.smallFile}
              filename="english.txt"
              language="en"
              onStart={handleDownloadStart}
              onSuccess={handleDownloadSuccess}
              onError={handleDownloadError}
            />
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Labels personalizados</h4>
            <DownloadButton
              url={downloadUrls.smallFile}
              filename="labels_custom.txt"
              labels={{
                download: "Obtener",
                downloading: "Obteniendo...",
                success: "¡Listo!",
                error: "Falló",
              }}
              onStart={handleDownloadStart}
              onSuccess={handleDownloadSuccess}
              onError={handleDownloadError}
            />
          </div>
        </div>
      </section>

      {/* Data URLs */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          7. Data URLs y Contenido Inline
        </h2>
        <p className="text-gray-600 mb-4">
          Descarga de contenido embebido usando Data URLs.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Texto plano</h4>
            <DownloadButton
              url="data:text/plain;charset=utf-8,¡Hola Mundo!\nEste es un archivo de texto generado dinámicamente."
              filename="texto_generado.txt"
              onStart={handleDownloadStart}
              onSuccess={handleDownloadSuccess}
              onError={handleDownloadError}
            />
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">JSON embebido</h4>
            <DownloadButton
              url={`data:application/json;charset=utf-8,${encodeURIComponent(
                JSON.stringify(
                  {
                    demo: true,
                    timestamp: new Date().toISOString(),
                    data: [1, 2, 3, 4, 5],
                    message: "Archivo JSON generado dinámicamente",
                  },
                  null,
                  2
                )
              )}`}
              filename="json_generado.json"
              onStart={handleDownloadStart}
              onSuccess={handleDownloadSuccess}
              onError={handleDownloadError}
            />
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">CSV embebido</h4>
            <DownloadButton
              url={`data:text/csv;charset=utf-8,${encodeURIComponent(`ID,Nombre,Email
1,Juan Pérez,juan@ejemplo.com
2,María García,maria@ejemplo.com
3,Carlos López,carlos@ejemplo.com`)}`}
              filename="csv_generado.csv"
              onStart={handleDownloadStart}
              onSuccess={handleDownloadSuccess}
              onError={handleDownloadError}
            />
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">SVG embebido</h4>
            <DownloadButton
              url={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
  <rect width="200" height="100" fill="#2563eb"/>
  <text x="100" y="55" text-anchor="middle" fill="white" font-family="Arial" font-size="16">Demo SVG</text>
</svg>`)}`}
              filename="demo.svg"
              onStart={handleDownloadStart}
              onSuccess={handleDownloadSuccess}
              onError={handleDownloadError}
            />
          </div>
        </div>
      </section>

      {/* Información adicional */}
      <section className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-green-900 mb-3">
          💡 Notas de Implementación
        </h2>
        <ul className="text-green-800 space-y-2 text-sm">
          <li>
            • El componente utiliza <code>fetch()</code> con soporte para{" "}
            <code>AbortController</code>
          </li>
          <li>
            • Los reintentos son automáticos con delay exponencial configurable
          </li>
          <li>
            • El progreso se calcula usando <code>ReadableStream</code> cuando
            está disponible
          </li>
          <li>• Soporta Data URLs para contenido generado dinámicamente</li>
          <li>
            • Los headers personalizados permiten integración con APIs que
            requieren autenticación
          </li>
          <li>• El timeout se aplica por intento individual, no al total</li>
          <li>
            • La cancelación funciona durante la descarga y se puede activar
            haciendo click en el botón
          </li>
        </ul>
      </section>
    </div>
  );
};

export default DownloadDemo;
