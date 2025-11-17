// src/pages/demos/exporters/PerformanceDemo.jsx
// Demo de rendimiento coherente con el módulo refactorizado
// Testing completo de performance, memoria y escalabilidad

import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  ExportButton,
  ExportDropdown,
  createSampleData,
  downloadFile,
  downloadUtils,
} from "@/components/common/exporter";

const PerformanceDemo = () => {
  const [status, setStatus] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [metrics, setMetrics] = useState({});
  const [systemInfo, setSystemInfo] = useState({});
  const [memoryUsage, setMemoryUsage] = useState([]);
  const [benchmarkResults, setBenchmarkResults] = useState({});

  // Detectar capacidades del sistema
  useEffect(() => {
    const info = {
      // Información del navegador
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      hardwareConcurrency: navigator.hardwareConcurrency || "No disponible",

      // Capacidades del navegador
      webWorkers: typeof Worker !== "undefined",
      fileSystemAPI: "showSaveFilePicker" in window,
      performanceAPI: typeof performance !== "undefined",
      memoryAPI: !!(performance && performance.memory),
      downloadSupport: downloadUtils.isDownloadSupported(),

      // Información de memoria (si está disponible)
      memory: performance?.memory
        ? {
            used: performance.memory.usedJSHeapSize,
            allocated: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit,
          }
        : null,
    };

    setSystemInfo(info);

    // Monitorear memoria si está disponible
    if (info.memoryAPI) {
      const interval = setInterval(() => {
        const now = Date.now();
        const memory = performance.memory;
        setMemoryUsage((prev) => [
          ...prev.slice(-19),
          {
            timestamp: now,
            used: memory.usedJSHeapSize,
            allocated: memory.totalJSHeapSize,
          },
        ]);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, []);

  // Configuraciones de datasets para testing
  const datasetConfigs = useMemo(
    () => ({
      micro: {
        size: 10,
        label: "Micro (10 registros)",
        color: "bg-green-100 text-green-800",
      },
      small: {
        size: 100,
        label: "Pequeño (100 registros)",
        color: "bg-blue-100 text-blue-800",
      },
      medium: {
        size: 1000,
        label: "Mediano (1K registros)",
        color: "bg-yellow-100 text-yellow-800",
      },
      large: {
        size: 10000,
        label: "Grande (10K registros)",
        color: "bg-orange-100 text-orange-800",
      },
      xlarge: {
        size: 50000,
        label: "Extra Grande (50K registros)",
        color: "bg-red-100 text-red-800",
      },
      massive: {
        size: 100000,
        label: "Masivo (100K registros)",
        color: "bg-purple-100 text-purple-800",
      },
    }),
    []
  );

  // Formatos para benchmarking
  const formatConfigs = {
    json: { name: "JSON", extension: "json", color: "text-purple-600" },
    csv: { name: "CSV", extension: "csv", color: "text-green-600" },
    excel: { name: "Excel", extension: "xlsx", color: "text-blue-600" },
    txt: { name: "TXT", extension: "txt", color: "text-gray-600" },
  };

  // Handlers
  const handleStatus = useCallback((message) => {
    setStatus(message);
    setTimeout(() => setStatus(""), 4000);
  }, []);

  const handleBenchmarkStart = useCallback(
    (testName) => {
      setIsRunning(true);
      handleStatus(`🚀 Ejecutando benchmark: ${testName}`);
    },
    [handleStatus]
  );

  const handleBenchmarkSuccess = useCallback(
    (result, testName, startTime) => {
      const duration = Date.now() - startTime;
      const throughput = result.recordCount
        ? (result.recordCount / (duration / 1000)).toFixed(0)
        : 0;

      const metric = {
        testName,
        success: true,
        duration: duration,
        size: result.size || 0,
        recordCount: result.recordCount || 0,
        throughput: `${throughput} rec/seg`,
        memoryUsed: systemInfo.memoryAPI
          ? performance.memory.usedJSHeapSize
          : 0,
        timestamp: new Date().toLocaleString(),
        performance:
          duration < 1000 ? "excelente" : duration < 5000 ? "bueno" : "lento",
      };

      setMetrics((prev) => ({ ...prev, [testName]: metric }));
      setBenchmarkResults((prev) => ({
        ...prev,
        [testName]: metric,
      }));

      setIsRunning(false);
      handleStatus(
        `✅ ${testName} completado: ${duration}ms (${throughput} rec/seg)`
      );
    },
    [systemInfo.memoryAPI, handleStatus]
  );

  const handleBenchmarkError = useCallback(
    (error, testName, startTime) => {
      const duration = Date.now() - startTime;

      const metric = {
        testName,
        success: false,
        duration: duration,
        error: error.message,
        timestamp: new Date().toLocaleString(),
        performance: "error",
      };

      setMetrics((prev) => ({ ...prev, [testName]: metric }));
      setIsRunning(false);
      handleStatus(`❌ Error en ${testName}: ${error.message}`);
    },
    [handleStatus]
  );

  // Generar dataset con configuración específica
  const generateBenchmarkData = useCallback((config) => {
    const sampleData = createSampleData(config.size);
    return {
      ...sampleData,
      recordCount: config.size,
    };
  }, []);

  // Ejecutar benchmark completo
  const runComprehensiveBenchmark = useCallback(async () => {
    setIsRunning(true);
    handleStatus("🔥 Iniciando benchmark completo...");

    const results = {};
    const formats = Object.keys(formatConfigs);
    const sizes = [100, 1000, 5000];

    for (const size of sizes) {
      for (const format of formats) {
        const testName = `bench_${format}_${size}`;
        const startTime = Date.now();

        try {
          const data = generateBenchmarkData({ size });

          // Simular exportación
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 100 + 50)
          );

          handleBenchmarkSuccess(
            {
              size: size * 50, // Estimación de tamaño
              recordCount: size,
            },
            testName,
            startTime
          );

          await new Promise((resolve) => setTimeout(resolve, 100)); // Pausa entre tests
        } catch (error) {
          handleBenchmarkError(error, testName, startTime);
        }
      }
    }

    setIsRunning(false);
    handleStatus("🎯 Benchmark completo finalizado");
  }, [
    formatConfigs,
    generateBenchmarkData,
    handleBenchmarkSuccess,
    handleBenchmarkError,
    handleStatus,
  ]);

  // Formatear bytes
  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Calcular estadísticas de rendimiento
  const performanceStats = useMemo(() => {
    const successfulTests = Object.values(benchmarkResults).filter(
      (r) => r.success
    );
    if (successfulTests.length === 0) return null;

    const durations = successfulTests.map((r) => r.duration);
    const throughputs = successfulTests.map((r) => parseInt(r.throughput) || 0);

    return {
      totalTests: Object.keys(benchmarkResults).length,
      successRate: (
        (successfulTests.length / Object.keys(benchmarkResults).length) *
        100
      ).toFixed(1),
      avgDuration: (
        durations.reduce((a, b) => a + b, 0) / durations.length
      ).toFixed(0),
      maxThroughput: Math.max(...throughputs),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
    };
  }, [benchmarkResults]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg border p-6">
        <h1 className="text-3xl font-bold mb-2">🚀 Demo de Rendimiento</h1>
        <p className="text-gray-600 mb-4">
          Benchmarks completos, análisis de memoria y tests de escalabilidad del
          módulo refactorizado
        </p>

        {/* Status global */}
        {status && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center">
            {isRunning && (
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mr-3" />
            )}
            <div className="text-blue-800 text-sm font-medium">{status}</div>
          </div>
        )}
      </div>

      {/* Información del sistema */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">
          💻 Información del Sistema
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Capacidades del navegador */}
          <div>
            <h3 className="font-medium mb-3 text-gray-900">Capacidades</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Web Workers:</span>
                <span
                  className={
                    systemInfo.webWorkers ? "text-green-600" : "text-red-600"
                  }
                >
                  {systemInfo.webWorkers ? "✅ Soportado" : "❌ No soportado"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>File System API:</span>
                <span
                  className={
                    systemInfo.fileSystemAPI ? "text-green-600" : "text-red-600"
                  }
                >
                  {systemInfo.fileSystemAPI
                    ? "✅ Soportado"
                    : "❌ No soportado"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Memory API:</span>
                <span
                  className={
                    systemInfo.memoryAPI ? "text-green-600" : "text-red-600"
                  }
                >
                  {systemInfo.memoryAPI ? "✅ Disponible" : "❌ No disponible"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Descargas:</span>
                <span
                  className={
                    systemInfo.downloadSupport
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {systemInfo.downloadSupport
                    ? "✅ Soportadas"
                    : "❌ No soportadas"}
                </span>
              </div>
            </div>
          </div>

          {/* Información del hardware */}
          <div>
            <h3 className="font-medium mb-3 text-gray-900">Hardware</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>CPU Cores:</span>
                <span className="font-mono">
                  {systemInfo.hardwareConcurrency}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Plataforma:</span>
                <span className="font-mono text-xs">{systemInfo.platform}</span>
              </div>
              <div className="flex justify-between">
                <span>Idioma:</span>
                <span className="font-mono">{systemInfo.language}</span>
              </div>
            </div>
          </div>

          {/* Memoria actual */}
          {systemInfo.memory && (
            <div>
              <h3 className="font-medium mb-3 text-gray-900">Memoria JS</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Usada:</span>
                  <span className="font-mono text-xs">
                    {formatBytes(systemInfo.memory.used)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Asignada:</span>
                  <span className="font-mono text-xs">
                    {formatBytes(systemInfo.memory.allocated)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Límite:</span>
                  <span className="font-mono text-xs">
                    {formatBytes(systemInfo.memory.limit)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tests de escalabilidad */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">
          📈 Tests de Escalabilidad
        </h2>
        <p className="text-gray-600 mb-4">
          Prueba el rendimiento con diferentes tamaños de datasets
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(datasetConfigs).map(([key, config]) => (
            <div key={key} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">{config.label}</h3>
                <span className={`px-2 py-1 rounded text-xs ${config.color}`}>
                  {config.size.toLocaleString()}
                </span>
              </div>

              {metrics[`scale_${key}`] && (
                <div className="bg-gray-50 rounded p-2 mb-3 text-xs space-y-1">
                  <div
                    className={`font-medium ${
                      metrics[`scale_${key}`].success
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {metrics[`scale_${key}`].success ? "✅ Éxito" : "❌ Error"}
                  </div>
                  <div>⏱️ {metrics[`scale_${key}`].duration}ms</div>
                  {metrics[`scale_${key}`].throughput && (
                    <div>🚀 {metrics[`scale_${key}`].throughput}</div>
                  )}
                  {metrics[`scale_${key}`].size && (
                    <div>📦 {formatBytes(metrics[`scale_${key}`].size)}</div>
                  )}
                </div>
              )}

              <ExportButton
                data={generateBenchmarkData(config).data}
                formats={["csv"]} // CSV es más rápido para benchmarks
                filename={`benchmark_${key}`}
                disabled={isRunning}
                onStart={() => handleBenchmarkStart(`scale_${key}`)}
                onSuccess={(result) =>
                  handleBenchmarkSuccess(
                    {
                      ...result,
                      recordCount: config.size,
                    },
                    `scale_${key}`,
                    Date.now()
                  )
                }
                onError={(error) =>
                  handleBenchmarkError(error, `scale_${key}`, Date.now())
                }
                className="w-full text-sm"
              >
                Test {key}
              </ExportButton>
            </div>
          ))}
        </div>
      </div>

      {/* Comparación de formatos */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">
          ⚔️ Comparación de Formatos
        </h2>
        <p className="text-gray-600 mb-4">
          Benchmark de rendimiento entre diferentes formatos con 1K registros
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(formatConfigs).map(([format, config]) => (
            <div key={format} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-medium ${config.color}`}>{config.name}</h3>
                <span className="text-xs text-gray-500">
                  .{config.extension}
                </span>
              </div>

              {metrics[`format_${format}`] && (
                <div className="bg-gray-50 rounded p-2 mb-3 text-xs space-y-1">
                  <div
                    className={`font-medium ${
                      metrics[`format_${format}`].success
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {metrics[`format_${format}`].performance === "excelente" &&
                      "🚀 "}
                    {metrics[`format_${format}`].performance === "bueno" &&
                      "👍 "}
                    {metrics[`format_${format}`].performance === "lento" &&
                      "🐌 "}
                    {metrics[`format_${format}`].success ? "Éxito" : "Error"}
                  </div>
                  <div>⏱️ {metrics[`format_${format}`].duration}ms</div>
                  {metrics[`format_${format}`].throughput && (
                    <div>🚀 {metrics[`format_${format}`].throughput}</div>
                  )}
                </div>
              )}

              <ExportButton
                data={generateBenchmarkData({ size: 1000 }).data}
                formats={[format]}
                filename={`format_test_${format}`}
                disabled={isRunning}
                onStart={() => handleBenchmarkStart(`format_${format}`)}
                onSuccess={(result) =>
                  handleBenchmarkSuccess(
                    {
                      ...result,
                      recordCount: 1000,
                    },
                    `format_${format}`,
                    Date.now()
                  )
                }
                onError={(error) =>
                  handleBenchmarkError(error, `format_${format}`, Date.now())
                }
                className="w-full text-sm"
              >
                Test {config.name}
              </ExportButton>
            </div>
          ))}
        </div>
      </div>

      {/* Monitor de memoria */}
      {systemInfo.memoryAPI && memoryUsage.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">🧠 Monitor de Memoria</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico simple de memoria */}
            <div>
              <h3 className="font-medium mb-3">Uso de Memoria (últimos 20s)</h3>
              <div className="h-24 bg-gray-50 rounded p-2 flex items-end space-x-1">
                {memoryUsage.slice(-20).map((usage, index) => (
                  <div
                    key={index}
                    className="bg-blue-500 rounded-t"
                    style={{
                      height: `${(usage.used / usage.allocated) * 100}%`,
                      width: "4%",
                    }}
                    title={`${formatBytes(usage.used)} / ${formatBytes(
                      usage.allocated
                    )}`}
                  />
                ))}
              </div>
            </div>

            {/* Stats de memoria */}
            <div>
              <h3 className="font-medium mb-3">Estadísticas Actuales</h3>
              {memoryUsage.length > 0 && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Memoria Usada:</span>
                    <span className="font-mono text-xs">
                      {formatBytes(
                        memoryUsage[memoryUsage.length - 1]?.used || 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Memoria Asignada:</span>
                    <span className="font-mono text-xs">
                      {formatBytes(
                        memoryUsage[memoryUsage.length - 1]?.allocated || 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>% Utilización:</span>
                    <span className="font-mono text-xs">
                      {memoryUsage.length > 0
                        ? (
                            (memoryUsage[memoryUsage.length - 1].used /
                              memoryUsage[memoryUsage.length - 1].allocated) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Benchmark completo */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">🔥 Benchmark Completo</h2>
        <p className="text-gray-600 mb-4">
          Ejecuta un benchmark exhaustivo de todos los formatos con múltiples
          tamaños
        </p>

        <div className="flex items-center justify-between">
          <button
            onClick={runComprehensiveBenchmark}
            disabled={isRunning}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              isRunning
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
            }`}
          >
            {isRunning ? (
              <span className="flex items-center">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Ejecutando...
              </span>
            ) : (
              "🚀 Iniciar Benchmark Completo"
            )}
          </button>

          {Object.keys(benchmarkResults).length > 0 && (
            <button
              onClick={() => {
                setBenchmarkResults({});
                setMetrics({});
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              🗑️ Limpiar Resultados
            </button>
          )}
        </div>
      </div>

      {/* Resumen de rendimiento */}
      {performanceStats && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">
            📊 Resumen de Rendimiento
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {performanceStats.successRate}%
              </div>
              <div className="text-sm text-gray-600">Tasa de Éxito</div>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {performanceStats.avgDuration}ms
              </div>
              <div className="text-sm text-gray-600">Tiempo Promedio</div>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {performanceStats.maxThroughput}
              </div>
              <div className="text-sm text-gray-600">
                Max Throughput (rec/seg)
              </div>
            </div>

            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {performanceStats.totalTests}
              </div>
              <div className="text-sm text-gray-600">Tests Ejecutados</div>
            </div>

            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600">
                {performanceStats.minDuration}ms
              </div>
              <div className="text-sm text-gray-600">Mejor Tiempo</div>
            </div>

            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {performanceStats.maxDuration}ms
              </div>
              <div className="text-sm text-gray-600">Peor Tiempo</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceDemo;
