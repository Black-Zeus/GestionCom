import React, { useState } from "react";
import ExportButton from "@/components/common/exporter/ExportButton";
import DownloadButton from "@/components/common/exporter/DownloadButton";
import { generateLargeDataset, userColumns } from "./mockData";

const PerformanceDemo = () => {
  const [status, setStatus] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [metrics, setMetrics] = useState({});

  const handleStart = (testName) => {
    setIsRunning(true);
    setStatus(`Ejecutando ${testName}...`);
  };

  const handleSuccess = (result, testName, startTime) => {
    const duration = Date.now() - startTime;
    const newMetric = {
      size: formatFileSize(result.size),
      duration: `${duration}ms`,
      success: true,
      timestamp: new Date().toLocaleString(),
    };

    setMetrics((prev) => ({ ...prev, [testName]: newMetric }));
    setStatus(`✅ ${testName} completado en ${duration}ms`);
    setIsRunning(false);
    setTimeout(() => setStatus(""), 3000);
  };

  const handleError = (error, testName, startTime) => {
    const duration = Date.now() - startTime;
    const newMetric = {
      error: error.message,
      duration: `${duration}ms`,
      success: false,
      timestamp: new Date().toLocaleString(),
    };

    setMetrics((prev) => ({ ...prev, [testName]: newMetric }));
    setStatus(`❌ Error en ${testName}: ${error.message}`);
    setIsRunning(false);
    setTimeout(() => setStatus(""), 3000);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Datasets de prueba
  const datasets = {
    small: { size: 100, label: "Pequeño (100 registros)" },
    medium: { size: 1000, label: "Mediano (1,000 registros)" },
    large: { size: 5000, label: "Grande (5,000 registros)" },
    xlarge: { size: 10000, label: "Extra Grande (10,000 registros)" },
  };

  const formats = ["csv", "json", "xlsx"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Performance Demo</h1>
        <p className="text-gray-600">
          Pruebas de rendimiento con datasets grandes
        </p>

        {status && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
            {status}
          </div>
        )}

        {isRunning && (
          <div className="mt-2">
            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          </div>
        )}
      </div>

      {/* Info del navegador */}
      <section className="bg-gray-50 rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">Info del sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">Navegador:</span>{" "}
            {navigator.userAgent.split(" ")[0]}
          </div>
          <div>
            <span className="font-medium">API Memory:</span>{" "}
            {performance.memory ? "✅ Disponible" : "❌ No disponible"}
          </div>
          <div>
            <span className="font-medium">Tests ejecutados:</span>{" "}
            {Object.keys(metrics).length}
          </div>
        </div>
      </section>

      {/* Tests de escalabilidad */}
      <section className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">Tests de escalabilidad</h2>
        <p className="text-gray-600 text-sm mb-4">
          Prueba el rendimiento con diferentes tamaños de datasets
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(datasets).map(([key, dataset]) => (
            <div key={key} className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">{dataset.label}</h3>

              {metrics[key] && (
                <div className="bg-gray-50 rounded p-2 mb-3 text-xs">
                  <div
                    className={`font-medium ${
                      metrics[key].success ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {metrics[key].success ? "✅ Éxito" : "❌ Error"}
                  </div>
                  <div>Tiempo: {metrics[key].duration}</div>
                  {metrics[key].size && <div>Tamaño: {metrics[key].size}</div>}
                  {metrics[key].error && (
                    <div className="text-red-600">
                      Error: {metrics[key].error}
                    </div>
                  )}
                </div>
              )}

              <ExportButton
                data={generateLargeDataset(dataset.size)}
                columns={userColumns}
                formats={["csv"]} // CSV es más rápido
                filename={`performance_${key}`}
                disabled={isRunning}
                onStart={() => handleStart(key)}
                onSuccess={(result) => handleSuccess(result, key, Date.now())}
                onError={(error) => handleError(error, key, Date.now())}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Comparación de formatos */}
      <section className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">Comparación de formatos</h2>
        <p className="text-gray-600 text-sm mb-4">
          Compara el rendimiento entre diferentes formatos con 1000 registros
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {formats.map((format) => (
            <div key={format} className="border rounded-lg p-4">
              <h3 className="font-medium mb-2 uppercase">{format}</h3>

              {metrics[`format_${format}`] && (
                <div className="bg-gray-50 rounded p-2 mb-3 text-xs">
                  <div
                    className={`font-medium ${
                      metrics[`format_${format}`].success
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {metrics[`format_${format}`].success
                      ? "✅ Éxito"
                      : "❌ Error"}
                  </div>
                  <div>Tiempo: {metrics[`format_${format}`].duration}</div>
                  {metrics[`format_${format}`].size && (
                    <div>Tamaño: {metrics[`format_${format}`].size}</div>
                  )}
                </div>
              )}

              <ExportButton
                data={generateLargeDataset(1000)}
                columns={userColumns}
                formats={[format]}
                filename={`comparison_${format}`}
                disabled={isRunning}
                onStart={() => handleStart(`format_${format}`)}
                onSuccess={(result) =>
                  handleSuccess(result, `format_${format}`, Date.now())
                }
                onError={(error) =>
                  handleError(error, `format_${format}`, Date.now())
                }
              />
            </div>
          ))}
        </div>
      </section>

      {/* Descarga de archivos grandes */}
      <section className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">
          Descarga de archivos grandes
        </h2>
        <p className="text-gray-600 text-sm mb-4">
          Testing de descarga con archivos de diferentes tamaños
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">Archivo mediano (~1MB)</h3>
            <DownloadButton
              url="https://file-examples.com/storage/fe68c9c451234d69647323d/2017/10/file_example_JPG_1MB.jpg"
              filename="test_1mb.jpg"
              showProgress={true}
              disabled={isRunning}
              onStart={() => handleStart("download_medium")}
              onSuccess={(result) =>
                handleSuccess(
                  { size: result.size || 1048576 },
                  "download_medium",
                  Date.now()
                )
              }
              onError={(error) =>
                handleError(error, "download_medium", Date.now())
              }
            />
            {metrics.download_medium && (
              <div className="bg-gray-50 rounded p-2 mt-2 text-xs">
                <div
                  className={`${
                    metrics.download_medium.success
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {metrics.download_medium.success ? "✅ Éxito" : "❌ Error"}
                </div>
                <div>Tiempo: {metrics.download_medium.duration}</div>
              </div>
            )}
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">Archivo grande (~5MB)</h3>
            <DownloadButton
              url="https://file-examples.com/storage/fe68c9c451234d69647323d/2017/10/file_example_JPG_2500kB.jpg"
              filename="test_5mb.jpg"
              showProgress={true}
              disabled={isRunning}
              onStart={() => handleStart("download_large")}
              onSuccess={(result) =>
                handleSuccess(
                  { size: result.size || 5242880 },
                  "download_large",
                  Date.now()
                )
              }
              onError={(error) =>
                handleError(error, "download_large", Date.now())
              }
            />
            {metrics.download_large && (
              <div className="bg-gray-50 rounded p-2 mt-2 text-xs">
                <div
                  className={`${
                    metrics.download_large.success
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {metrics.download_large.success ? "✅ Éxito" : "❌ Error"}
                </div>
                <div>Tiempo: {metrics.download_large.duration}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Resumen de métricas */}
      {Object.keys(metrics).length > 0 && (
        <section className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <h2 className="text-lg font-semibold mb-3">Resumen de resultados</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Tests exitosos:</h4>
              <div>
                {Object.values(metrics).filter((m) => m.success).length} /{" "}
                {Object.keys(metrics).length}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Tiempo promedio:</h4>
              <div>
                {Object.values(metrics)
                  .filter((m) => m.success)
                  .reduce((acc, m) => acc + parseInt(m.duration), 0) /
                  Object.values(metrics).filter((m) => m.success).length || 0}
                ms
              </div>
            </div>
          </div>

          <button
            onClick={() => setMetrics({})}
            className="mt-3 px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Limpiar métricas
          </button>
        </section>
      )}
    </div>
  );
};

export default PerformanceDemo;
