import React, { useState, useRef, useCallback } from "react";
import ExportButton from "@/components/common/exporter/ExportButton";
import DownloadButton from "@/components/common/exporter/DownloadButton";
import {
  generateLargeDataset,
  userColumns,
  simulateDelay,
  corporateBranding,
} from "./mockData";

const PerformanceDemo = () => {
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState("");
  const abortController = useRef(null);

  // Métricas de rendimiento
  const measurePerformance = useCallback((testName, operation) => {
    return async (...args) => {
      const startTime = performance.now();
      const startMemory = performance.memory
        ? performance.memory.usedJSHeapSize
        : 0;

      setCurrentTest(testName);
      setIsRunning(true);

      try {
        const result = await operation(...args);
        const endTime = performance.now();
        const endMemory = performance.memory
          ? performance.memory.usedJSHeapSize
          : 0;

        const metrics = {
          duration: endTime - startTime,
          memoryDelta: endMemory - startMemory,
          timestamp: new Date().toISOString(),
          success: true,
          resultSize: result?.size || 0,
        };

        setPerformanceMetrics((prev) => ({
          ...prev,
          [testName]: metrics,
        }));

        return result;
      } catch (error) {
        const endTime = performance.now();
        setPerformanceMetrics((prev) => ({
          ...prev,
          [testName]: {
            duration: endTime - startTime,
            error: error.message,
            timestamp: new Date().toISOString(),
            success: false,
          },
        }));
        throw error;
      } finally {
        setIsRunning(false);
        setCurrentTest("");
      }
    };
  }, []);

  // Tests de rendimiento
  const performanceTests = {
    small: () => generateLargeDataset(100),
    medium: () => generateLargeDataset(1000),
    large: () => generateLargeDataset(5000),
    xlarge: () => generateLargeDataset(10000),
    extreme: () => generateLargeDataset(25000),
  };

  // Formatear métricas
  const formatDuration = (ms) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatMemory = (bytes) => {
    if (!bytes) return "N/A";
    const mb = bytes / (1024 * 1024);
    return `${mb > 0 ? "+" : ""}${mb.toFixed(2)}MB`;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Cancelar operación
  const cancelCurrentOperation = () => {
    if (abortController.current) {
      abortController.current.abort();
    }
  };

  // Limpiar métricas
  const clearMetrics = () => {
    setPerformanceMetrics({});
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Demo de Rendimiento
        </h1>
        <p className="text-gray-600">
          Pruebas de rendimiento, optimización y manejo de datasets grandes
        </p>
        {isRunning && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-800">
            🔄 Ejecutando: {currentTest}...
            <button
              onClick={cancelCurrentOperation}
              className="ml-2 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Controles */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Controles de Testing</h2>
          <button
            onClick={clearMetrics}
            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
          >
            🗑️ Limpiar Métricas
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-3 rounded">
            <h4 className="font-medium text-sm mb-2">
              Información del navegador:
            </h4>
            <ul className="text-xs space-y-1">
              <li>User Agent: {navigator.userAgent.split(" ")[0]}</li>
              <li>
                Memory API:{" "}
                {performance.memory ? "✅ Disponible" : "❌ No disponible"}
              </li>
              <li>
                Workers:{" "}
                {typeof Worker !== "undefined"
                  ? "✅ Soportado"
                  : "❌ No soportado"}
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 p-3 rounded">
            <h4 className="font-medium text-sm mb-2">Estado actual:</h4>
            <ul className="text-xs space-y-1">
              <li>
                Tests ejecutados: {Object.keys(performanceMetrics).length}
              </li>
              <li>Ejecutando: {isRunning ? "Sí" : "No"}</li>
              <li>Test actual: {currentTest || "Ninguno"}</li>
            </ul>
          </div>

          <div className="bg-gray-50 p-3 rounded">
            <h4 className="font-medium text-sm mb-2">Memoria (aproximada):</h4>
            <ul className="text-xs space-y-1">
              {performance.memory ? (
                <>
                  <li>
                    Usada: {formatFileSize(performance.memory.usedJSHeapSize)}
                  </li>
                  <li>
                    Total: {formatFileSize(performance.memory.totalJSHeapSize)}
                  </li>
                  <li>
                    Límite: {formatFileSize(performance.memory.jsHeapSizeLimit)}
                  </li>
                </>
              ) : (
                <li>API de memoria no disponible</li>
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* Tests de Escalabilidad */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          1. Tests de Escalabilidad
        </h2>
        <p className="text-gray-600 mb-4">
          Prueba el rendimiento con diferentes tamaños de datasets.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(performanceTests).map(([size, generator]) => {
            const metrics = performanceMetrics[`export_${size}`];
            const dataCount =
              size === "small"
                ? 100
                : size === "medium"
                ? 1000
                : size === "large"
                ? 5000
                : size === "xlarge"
                ? 10000
                : 25000;

            return (
              <div key={size} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium capitalize">{size}</h4>
                  <span className="text-xs text-gray-500">
                    {dataCount.toLocaleString()} registros
                  </span>
                </div>

                {metrics && (
                  <div className="bg-gray-50 rounded p-2 mb-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-medium">Tiempo:</span>
                        <br />
                        <span
                          className={
                            metrics.success ? "text-green-600" : "text-red-600"
                          }
                        >
                          {formatDuration(metrics.duration)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Memoria:</span>
                        <br />
                        <span>{formatMemory(metrics.memoryDelta)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Tamaño:</span>
                        <br />
                        <span>{formatFileSize(metrics.resultSize)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Estado:</span>
                        <br />
                        <span
                          className={
                            metrics.success ? "text-green-600" : "text-red-600"
                          }
                        >
                          {metrics.success ? "✅ OK" : "❌ Error"}
                        </span>
                      </div>
                    </div>
                    {metrics.error && (
                      <div className="mt-2 text-red-600 text-xs">
                        Error: {metrics.error}
                      </div>
                    )}
                  </div>
                )}

                <ExportButton
                  data={generator()}
                  columns={userColumns}
                  filename={`performance_test_${size}`}
                  formats={["xlsx"]}
                  disabled={isRunning}
                  onStart={measurePerformance(`export_${size}`, async () => {
                    abortController.current = new AbortController();
                    await simulateDelay(100); // Simular procesamiento
                  })}
                  onSuccess={() => {}}
                  onError={() => {}}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparación de Formatos */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          2. Comparación de Formatos
        </h2>
        <p className="text-gray-600 mb-4">
          Compara el rendimiento entre diferentes formatos de exportación.
        </p>

        <div className="space-y-4">
          {["csv", "xlsx", "json"].map((format) => {
            const metrics = performanceMetrics[`format_${format}`];

            return (
              <div key={format} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium uppercase">{format}</h4>
                    <p className="text-sm text-gray-600">1000 registros</p>
                  </div>

                  {metrics && (
                    <div className="text-right text-xs">
                      <div
                        className={
                          metrics.success ? "text-green-600" : "text-red-600"
                        }
                      >
                        {formatDuration(metrics.duration)}
                      </div>
                      <div className="text-gray-500">
                        {formatFileSize(metrics.resultSize)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <ExportButton
                    data={generateLargeDataset(1000)}
                    columns={userColumns}
                    filename={`format_comparison_${format}`}
                    formats={[format]}
                    disabled={isRunning}
                    size="sm"
                    onStart={measurePerformance(
                      `format_${format}`,
                      async () => {
                        await simulateDelay(50);
                      }
                    )}
                    onSuccess={() => {}}
                    onError={() => {}}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Test de Concurrencia */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">3. Test de Concurrencia</h2>
        <p className="text-gray-600 mb-4">
          Múltiples exportaciones simultáneas para probar el manejo de
          concurrencia.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((id) => {
            const metrics = performanceMetrics[`concurrent_${id}`];

            return (
              <div key={id} className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Proceso #{id}</h4>

                {metrics && (
                  <div className="bg-gray-50 rounded p-2 mb-3 text-xs">
                    <div>Tiempo: {formatDuration(metrics.duration)}</div>
                    <div>Estado: {metrics.success ? "✅" : "❌"}</div>
                  </div>
                )}

                <ExportButton
                  data={generateLargeDataset(500)}
                  columns={userColumns.slice(0, 4)} // Menos columnas para ser más rápido
                  filename={`concurrent_${id}`}
                  formats={["csv"]}
                  disabled={isRunning}
                  size="sm"
                  onStart={measurePerformance(`concurrent_${id}`, async () => {
                    // Delay aleatorio para simular diferentes tiempos de procesamiento
                    await simulateDelay(Math.random() * 1000 + 500);
                  })}
                  onSuccess={() => {}}
                  onError={() => {}}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={async () => {
              // Ejecutar todos los tests concurrentes
              const buttons = document.querySelectorAll(
                '[data-testid="concurrent-export"]'
              );
              buttons.forEach((button) => button.click());
            }}
            disabled={isRunning}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            🚀 Ejecutar Todos Simultáneamente
          </button>
        </div>
      </section>

      {/* Test de Descarga de Archivos Grandes */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          4. Descarga de Archivos Grandes
        </h2>
        <p className="text-gray-600 mb-4">
          Prueba la descarga de archivos de diferentes tamaños con seguimiento
          de progreso.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { size: "1MB", url: "https://httpbin.org/bytes/1048576" },
            { size: "5MB", url: "https://httpbin.org/bytes/5242880" },
            { size: "10MB", url: "https://httpbin.org/bytes/10485760" },
          ].map(({ size, url }) => {
            const metrics = performanceMetrics[`download_${size}`];

            return (
              <div key={size} className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Archivo {size}</h4>

                {metrics && (
                  <div className="bg-gray-50 rounded p-2 mb-3 text-xs">
                    <div>Tiempo: {formatDuration(metrics.duration)}</div>
                    <div>
                      Velocidad:{" "}
                      {metrics.resultSize && metrics.duration
                        ? formatFileSize(
                            (metrics.resultSize / metrics.duration) * 1000
                          ) + "/s"
                        : "N/A"}
                    </div>
                    <div>Estado: {metrics.success ? "✅" : "❌"}</div>
                  </div>
                )}

                <DownloadButton
                  url={url}
                  filename={`test_file_${size.toLowerCase()}.bin`}
                  showProgress={true}
                  disabled={isRunning}
                  onStart={measurePerformance(`download_${size}`, async () => {
                    // El tiempo se mide automáticamente
                  })}
                  onSuccess={() => {}}
                  onError={() => {}}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Optimizaciones y Técnicas */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          5. Técnicas de Optimización
        </h2>
        <p className="text-gray-600 mb-4">
          Ejemplos de diferentes técnicas para optimizar el rendimiento.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">Carga Diferida vs Inmediata</h4>
            <div className="space-y-3">
              <div>
                <p className="text-sm mb-2">
                  Con carga diferida (lazy loading):
                </p>
                <ExportButton
                  data={generateLargeDataset(2000)}
                  columns={userColumns}
                  filename="lazy_loading"
                  formats={["xlsx"]}
                  disabled={isRunning}
                  onStart={measurePerformance("lazy_load", async () => {
                    // Simular carga diferida
                    await new Promise((resolve) => setTimeout(resolve, 100));
                  })}
                  onSuccess={() => {}}
                  onError={() => {}}
                />
              </div>

              <div>
                <p className="text-sm mb-2">Sin optimización:</p>
                <ExportButton
                  data={generateLargeDataset(2000)}
                  columns={userColumns}
                  filename="no_optimization"
                  formats={["xlsx"]}
                  disabled={isRunning}
                  onStart={measurePerformance("no_optimization", async () => {
                    // Simular procesamiento sin optimizar
                    const data = generateLargeDataset(2000);
                    // Operación costosa innecesaria
                    data.forEach((item) => JSON.stringify(item));
                    await new Promise((resolve) => setTimeout(resolve, 200));
                  })}
                  onSuccess={() => {}}
                  onError={() => {}}
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Streaming vs Batch</h4>
            <div className="space-y-3">
              <div>
                <p className="text-sm mb-2">Procesamiento por lotes (batch):</p>
                <ExportButton
                  data={generateLargeDataset(3000)}
                  columns={userColumns.slice(0, 5)}
                  filename="batch_processing"
                  formats={["csv"]}
                  disabled={isRunning}
                  onStart={measurePerformance("batch_processing", async () => {
                    // Simular procesamiento por lotes
                    await simulateDelay(150);
                  })}
                  onSuccess={() => {}}
                  onError={() => {}}
                />
              </div>

              <div>
                <p className="text-sm mb-2">
                  Procesamiento completo en memoria:
                </p>
                <ExportButton
                  data={generateLargeDataset(3000)}
                  columns={userColumns.slice(0, 5)}
                  filename="memory_processing"
                  formats={["csv"]}
                  disabled={isRunning}
                  onStart={measurePerformance("memory_processing", async () => {
                    // Simular carga completa en memoria
                    await simulateDelay(300);
                  })}
                  onSuccess={() => {}}
                  onError={() => {}}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Resumen de Métricas */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">6. Resumen de Métricas</h2>

        {Object.keys(performanceMetrics).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Test</th>
                  <th className="text-left py-2 px-3">Duración</th>
                  <th className="text-left py-2 px-3">Memoria</th>
                  <th className="text-left py-2 px-3">Tamaño</th>
                  <th className="text-left py-2 px-3">Estado</th>
                  <th className="text-left py-2 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(performanceMetrics).map(
                  ([testName, metrics]) => (
                    <tr key={testName} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">{testName}</td>
                      <td className="py-2 px-3">
                        {formatDuration(metrics.duration)}
                      </td>
                      <td className="py-2 px-3">
                        {formatMemory(metrics.memoryDelta)}
                      </td>
                      <td className="py-2 px-3">
                        {formatFileSize(metrics.resultSize || 0)}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={
                            metrics.success ? "text-green-600" : "text-red-600"
                          }
                        >
                          {metrics.success ? "✅ Success" : "❌ Error"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-500">
                        {new Date(metrics.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No hay métricas disponibles.</p>
            <p className="text-sm">
              Ejecuta algunos tests para ver los resultados de rendimiento.
            </p>
          </div>
        )}
      </section>

      {/* Recomendaciones */}
      <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">
          🚀 Recomendaciones de Rendimiento
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-2">
              Para datasets grandes (&gt;5000 registros):
            </h4>
            <ul className="space-y-1">
              <li>• Usa formato CSV para mejor rendimiento</li>
              <li>• Considera paginación o filtrado de datos</li>
              <li>• Implementa indicadores de progreso</li>
              <li>• Permite cancelación de operaciones largas</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Optimizaciones generales:</h4>
            <ul className="space-y-1">
              <li>• Carga diferida de dependencias pesadas</li>
              <li>• Usa Web Workers para procesamiento intensivo</li>
              <li>• Implementa debounce en operaciones frecuentes</li>
              <li>• Monitorea el uso de memoria en producción</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PerformanceDemo;
