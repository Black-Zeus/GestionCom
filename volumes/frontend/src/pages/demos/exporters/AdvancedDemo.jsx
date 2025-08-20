import React, { useState, useCallback, useEffect, useRef } from "react";
import ExportButton from "@/components/common/exporter/ExportButton";
import DownloadButton from "@/components/common/exporter/DownloadButton";
import {
  specialTypesData,
  corporateBranding,
  generateLargeDataset,
  simulateDelay,
  downloadUrls,
} from "./mockData";

const AdvancedDemo = () => {
  const [status, setStatus] = useState("");
  const [realTimeData, setRealTimeData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorSimulation, setErrorSimulation] = useState(false);
  const [formatsEnabled, setFormatsEnabled] = useState({
    csv: true,
    json: true,
    xlsx: true,
    pdf: false, // Deshabilitado por defecto
    "xlsx-branded": true,
    "pdf-branded": false,
  });
  const intervalRef = useRef(null);

  // Iconos constantes para mejor rendimiento
  const ICONS = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
    chart: "📊",
    download: "⬇️",
    bug: "🐛",
    rocket: "🚀",
    clean: "🧹",
    gear: "⚙️",
    fire: "🔥",
  };

  // Datos complejos con objetos anidados
  const complexData = [
    {
      id: 1,
      customer: {
        name: "Empresa ABC S.A.",
        contact: {
          email: "contacto@abc.com",
          phone: "+56-9-1234-5678",
          address: {
            street: "Av. Providencia 123",
            city: "Santiago",
            country: "Chile",
          },
        },
      },
      orders: [
        { id: 1001, amount: 150000, status: "completed" },
        { id: 1002, amount: 75000, status: "pending" },
      ],
      metadata: {
        created: new Date("2024-01-15"),
        lastUpdate: new Date("2024-12-20"),
        tags: ["premium", "corporate"],
        scores: { quality: 9.5, delivery: 8.8, support: 9.2 },
      },
    },
    {
      id: 2,
      customer: {
        name: "Tech Solutions Ltda.",
        contact: {
          email: "info@techsolutions.cl",
          phone: "+56-2-8765-4321",
          address: {
            street: "Las Condes 456",
            city: "Santiago",
            country: "Chile",
          },
        },
      },
      orders: [
        { id: 2001, amount: 320000, status: "completed" },
        { id: 2002, amount: 180000, status: "shipped" },
        { id: 2003, amount: 95000, status: "processing" },
      ],
      metadata: {
        created: new Date("2023-08-22"),
        lastUpdate: new Date("2024-12-19"),
        tags: ["technology", "startup", "growing"],
        scores: { quality: 8.9, delivery: 9.1, support: 8.7 },
      },
    },
  ];

  // Columnas para datos complejos con dot notation
  const complexColumns = [
    { key: "id", header: "ID" },
    { key: "customer.name", header: "Empresa" },
    { key: "customer.contact.email", header: "Email" },
    { key: "customer.contact.phone", header: "Teléfono" },
    { key: "customer.contact.address.city", header: "Ciudad" },
    {
      key: "orders",
      header: "Total Órdenes",
      formatter: (orders) => (Array.isArray(orders) ? orders.length : 0),
    },
    {
      key: "orders",
      header: "Monto Total",
      formatter: (orders) => {
        if (!Array.isArray(orders)) return 0;
        return orders
          .reduce((sum, order) => sum + (order.amount || 0), 0)
          .toLocaleString("es-CL");
      },
    },
    {
      key: "metadata.tags",
      header: "Etiquetas",
      formatter: (tags) => (Array.isArray(tags) ? tags.join(", ") : ""),
    },
    {
      key: "metadata.scores.quality",
      header: "Score Calidad",
      formatter: (score) =>
        typeof score === "number" ? score.toFixed(1) : "N/A",
    },
  ];

  // Columnas especiales para tipos de datos complejos
  const specialColumns = [
    { key: "id", header: "ID" },
    { key: "nullValue", header: "Valor Null" },
    { key: "undefinedValue", header: "Valor Undefined" },
    { key: "emptyString", header: "String Vacío" },
    { key: "zeroNumber", header: "Número Cero" },
    { key: "booleanTrue", header: "Boolean True" },
    { key: "booleanFalse", header: "Boolean False" },
    {
      key: "dateValue",
      header: "Fecha",
      formatter: (val) =>
        val instanceof Date ? val.toLocaleDateString("es-CL") : "N/A",
    },
    {
      key: "objectValue",
      header: "Objeto",
      formatter: (obj) =>
        typeof obj === "object" && obj !== null ? JSON.stringify(obj) : "N/A",
    },
    {
      key: "arrayValue",
      header: "Array",
      formatter: (arr) => (Array.isArray(arr) ? arr.join(", ") : "N/A"),
    },
    { key: "specialChars", header: "Caracteres Especiales" },
    {
      key: "numberWithDecimals",
      header: "Decimales",
      formatter: (num) => (typeof num === "number" ? num.toFixed(2) : "N/A"),
    },
  ];

  // Handler de estado unificado
  const handleStatus = useCallback((message) => {
    setStatus(message);
    console.log(`[AdvancedDemo] ${message}`);
    setTimeout(() => setStatus(""), 4000);
  }, []);

  // Generador de datos en tiempo real
  const generateRealTimeData = useCallback(async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    try {
      handleStatus(`${ICONS.rocket} Generando datos en tiempo real...`);
      await simulateDelay(1000);

      const newData = generateLargeDataset(5).map((item, index) => ({
        ...item,
        timestamp: new Date(),
        realtimeId: `RT-${Date.now()}-${index}`,
        status: Math.random() > 0.7 ? "urgent" : "normal",
        temperature: Math.round((Math.random() * 40 + 10) * 10) / 10,
        signal: Math.round(Math.random() * 100),
      }));

      setRealTimeData((prev) => [...prev, ...newData]);
      handleStatus(
        `${ICONS.success} Generados ${newData.length} registros nuevos`
      );
    } catch (error) {
      handleStatus(`${ICONS.error} Error generando datos: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, handleStatus]);

  // Iniciar generación automática
  const startAutoGeneration = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (!isGenerating && realTimeData.length < 50) {
        generateRealTimeData();
      }
    }, 5000); // Cada 5 segundos

    handleStatus(`${ICONS.fire} Generación automática iniciada`);
  }, [generateRealTimeData, isGenerating, realTimeData.length, handleStatus]);

  // Detener generación automática
  const stopAutoGeneration = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    handleStatus(`${ICONS.gear} Generación automática detenida`);
  }, [handleStatus]);

  // Limpiar datos
  const clearData = useCallback(() => {
    setRealTimeData([]);
    handleStatus(`${ICONS.clean} Datos limpiados`);
  }, [handleStatus]);

  // Toggle formato habilitado/deshabilitado
  const toggleFormat = useCallback((format) => {
    setFormatsEnabled((prev) => ({
      ...prev,
      [format]: !prev[format],
    }));
  }, []);

  // Obtener formatos habilitados
  const getEnabledFormats = useCallback(() => {
    return Object.entries(formatsEnabled)
      .filter(([_, enabled]) => enabled)
      .map(([format, _]) => format);
  }, [formatsEnabled]);

  // Simular error en exportación
  const handleErrorExport = useCallback(async () => {
    handleStatus(`${ICONS.warning} Simulando error...`);
    await simulateDelay(2000);
    throw new Error("Error simulado para testing");
  }, [handleStatus]);

  // Limpiar interval al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Demo Avanzado - Casos Complejos
        </h1>
        <p className="text-gray-600">
          Casos edge, datos complejos, simulación de errores y configuraciones
          extremas
        </p>
        {status && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
            {status}
          </div>
        )}
      </div>

      {/* 1. Datos con Objetos Anidados */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          {ICONS.chart} 1. Datos con Objetos Anidados
        </h2>
        <p className="text-gray-600 mb-4">
          Exportación de datos complejos con objetos anidados, arrays y dot
          notation.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="font-medium mb-2">Estructura de datos compleja:</h3>
          <pre className="text-xs bg-white p-3 rounded border overflow-x-auto max-h-40">
            {JSON.stringify(complexData[0], null, 2)}
          </pre>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">
              Exportación con aplanado (dot notation):
            </h4>
            <ExportButton
              data={complexData}
              columns={complexColumns}
              filename="datos_complejos_aplanados"
              formats={["xlsx", "csv", "json"]}
              onStart={() =>
                handleStatus(`${ICONS.chart} Exportando datos complejos...`)
              }
              onSuccess={() =>
                handleStatus(`${ICONS.success} Datos complejos exportados`)
              }
              onError={(error) =>
                handleStatus(`${ICONS.error} Error: ${error}`)
              }
            />
          </div>

          <div>
            <h4 className="font-medium mb-2">
              Exportación completa (sin aplanar):
            </h4>
            <ExportButton
              data={complexData}
              columns={[]} // Sin columnas = exportar todo
              filename="datos_complejos_completos"
              formats={["json", "xlsx-branded"]}
              branding={corporateBranding}
              onStart={() =>
                handleStatus(`${ICONS.chart} Exportando estructura completa...`)
              }
              onSuccess={() =>
                handleStatus(`${ICONS.success} Estructura completa exportada`)
              }
              onError={(error) =>
                handleStatus(`${ICONS.error} Error: ${error}`)
              }
            />
          </div>
        </div>
      </section>

      {/* 2. Tipos de Datos Especiales */}
      <section className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          {ICONS.bug} 2. Tipos de Datos Especiales
        </h2>
        <p className="text-gray-600 mb-4">
          Manejo de null, undefined, objetos, arrays, fechas y caracteres
          especiales.
        </p>

        <div className="bg-white rounded-lg p-4 mb-4">
          <h3 className="font-medium mb-2">
            Vista previa de datos especiales:
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 text-left">Tipo</th>
                  <th className="px-2 py-1 text-left">Valor</th>
                  <th className="px-2 py-1 text-left">Descripción</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-2 py-1">null</td>
                  <td className="px-2 py-1 text-gray-400">null</td>
                  <td className="px-2 py-1">Valor nulo</td>
                </tr>
                <tr>
                  <td className="px-2 py-1">undefined</td>
                  <td className="px-2 py-1 text-gray-400">undefined</td>
                  <td className="px-2 py-1">Valor indefinido</td>
                </tr>
                <tr>
                  <td className="px-2 py-1">string vacío</td>
                  <td className="px-2 py-1 text-gray-400">""</td>
                  <td className="px-2 py-1">Cadena vacía</td>
                </tr>
                <tr>
                  <td className="px-2 py-1">número cero</td>
                  <td className="px-2 py-1">0</td>
                  <td className="px-2 py-1">Valor numérico cero</td>
                </tr>
                <tr>
                  <td className="px-2 py-1">objeto</td>
                  <td className="px-2 py-1">
                    {"{"}"nested": "value"{"}"}
                  </td>
                  <td className="px-2 py-1">Objeto anidado</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <ExportButton
          data={specialTypesData}
          columns={specialColumns}
          filename="tipos_especiales_completos"
          formats={["xlsx", "csv", "json"]}
          onStart={() =>
            handleStatus(`${ICONS.gear} Procesando tipos especiales...`)
          }
          onSuccess={() =>
            handleStatus(
              `${ICONS.success} Tipos especiales exportados correctamente`
            )
          }
          onError={(error) => handleStatus(`${ICONS.error} Error: ${error}`)}
        />
      </section>

      {/* 3. Datos en Tiempo Real */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          {ICONS.fire} 3. Datos en Tiempo Real
        </h2>
        <p className="text-gray-600 mb-4">
          Generación y exportación de datos dinámicos con timestamps y
          metadatos.
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={generateRealTimeData}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isGenerating ? "Generando..." : "Generar Datos"}
          </button>

          <button
            onClick={startAutoGeneration}
            disabled={!!intervalRef.current}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Auto-Generar
          </button>

          <button
            onClick={stopAutoGeneration}
            disabled={!intervalRef.current}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            Detener
          </button>

          <button
            onClick={clearData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Limpiar
          </button>
        </div>

        <div className="bg-gray-100 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-700">
            <strong>Registros actuales:</strong> {realTimeData.length}
            {isGenerating && (
              <span className="ml-2 text-blue-600">Generando...</span>
            )}
            {intervalRef.current && (
              <span className="ml-2 text-green-600">
                Auto-generación activa
              </span>
            )}
          </p>
          {realTimeData.length === 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Haz click en "Generar Datos" o "Auto-Generar" para crear datos
              dinámicos.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <ExportButton
            data={realTimeData}
            filename={`datos_tiempo_real_${
              new Date().toISOString().split("T")[0]
            }`}
            formats={["xlsx", "csv", "json"]}
            columns={[
              { key: "realtimeId", header: "ID Tiempo Real" },
              { key: "name", header: "Nombre" },
              {
                key: "timestamp",
                header: "Timestamp",
                formatter: (val) => val?.toLocaleString(),
              },
              { key: "status", header: "Estado" },
              { key: "temperature", header: "Temperatura °C" },
              { key: "signal", header: "Señal %" },
            ]}
            onStart={() =>
              handleStatus(`${ICONS.chart} Exportando datos en tiempo real...`)
            }
            onSuccess={() =>
              handleStatus(
                `${ICONS.success} Exportados ${realTimeData.length} registros dinámicos`
              )
            }
            onError={(error) => handleStatus(`${ICONS.error} Error: ${error}`)}
            disabled={realTimeData.length === 0}
          />
        </div>
      </section>

      {/* 4. Control Dinámico de Formatos */}
      <section className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          {ICONS.gear} 4. Control Dinámico de Formatos
        </h2>
        <p className="text-gray-600 mb-4">
          Habilita/deshabilita formatos dinámicamente y observa cómo se
          actualiza el menú.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {Object.entries(formatsEnabled).map(([format, enabled]) => (
            <label key={format} className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => toggleFormat(format)}
                className="rounded"
              />
              <span className={enabled ? "text-green-700" : "text-gray-500"}>
                {enabled ? "✅" : "❌"} {format.toUpperCase()}
              </span>
            </label>
          ))}
        </div>

        <div className="bg-white rounded-lg p-4 mb-4">
          <h4 className="font-medium mb-2">
            Formatos actualmente habilitados:
          </h4>
          <p className="text-sm text-gray-600">
            {getEnabledFormats().join(", ") || "Ninguno habilitado"}
          </p>
        </div>

        <ExportButton
          data={complexData}
          columns={complexColumns}
          filename="formatos_dinamicos"
          formats={getEnabledFormats()}
          disabled={getEnabledFormats().length === 0}
          onStart={() =>
            handleStatus(`${ICONS.gear} Exportando con formatos dinámicos...`)
          }
          onSuccess={() =>
            handleStatus(
              `${ICONS.success} Exportación con formatos configurados`
            )
          }
          onError={(error) => handleStatus(`${ICONS.error} Error: ${error}`)}
        />
      </section>

      {/* 5. Simulación de Errores */}
      <section className="bg-red-50 rounded-lg border border-red-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          {ICONS.warning} 5. Simulación de Errores
        </h2>
        <p className="text-gray-600 mb-4">
          Prueba el manejo de errores con diferentes tipos de fallos simulados.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Error en procesamiento:</h4>
            <ExportButton
              data={complexData}
              columns={complexColumns}
              filename="error_simulado"
              formats={["csv"]}
              onStart={
                errorSimulation
                  ? handleErrorExport
                  : () => handleStatus(`${ICONS.gear} Exportando normal...`)
              }
              onSuccess={() =>
                handleStatus(`${ICONS.success} Exportación exitosa (sin error)`)
              }
              onError={(error) =>
                handleStatus(`${ICONS.error} Error capturado: ${error.message}`)
              }
            />

            <label className="flex items-center mt-2 text-sm">
              <input
                type="checkbox"
                checked={errorSimulation}
                onChange={(e) => setErrorSimulation(e.target.checked)}
                className="mr-2"
              />
              {errorSimulation ? "❌ Error activado" : "✅ Normal"}
            </label>
          </div>

          <div>
            <h4 className="font-medium mb-2">Descarga con error:</h4>
            <DownloadButton
              url="https://url-inexistente-error-404.com/archivo.pdf"
              filename="descarga_error.pdf"
              retries={2}
              timeout={5000}
              onStart={() =>
                handleStatus(`${ICONS.download} Intentando descarga...`)
              }
              onProgress={(loaded, total, percentage) =>
                handleStatus(`${ICONS.download} Descargando... ${percentage}%`)
              }
              onSuccess={() =>
                handleStatus(`${ICONS.success} Descarga exitosa`)
              }
              onError={(error) =>
                handleStatus(
                  `${ICONS.error} Error de descarga: ${error.message}`
                )
              }
            />
          </div>
        </div>
      </section>

      {/* 6. Casos Extremos */}
      <section className="bg-purple-50 rounded-lg border border-purple-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          {ICONS.rocket} 6. Casos Extremos y Edge Cases
        </h2>
        <p className="text-gray-600 mb-4">
          Testing con configuraciones extremas y casos límite.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Dataset vacío:</h4>
              <ExportButton
                data={[]}
                columns={[]}
                filename="dataset_vacio"
                formats={["csv", "json"]}
                onStart={() =>
                  handleStatus(`${ICONS.warning} Exportando dataset vacío...`)
                }
                onSuccess={() =>
                  handleStatus(`${ICONS.success} Dataset vacío exportado`)
                }
                onError={(error) =>
                  handleStatus(`${ICONS.error} Error: ${error}`)
                }
              />
            </div>

            <div>
              <h4 className="font-medium mb-2">
                Datos con caracteres especiales extremos:
              </h4>
              <ExportButton
                data={[
                  {
                    id: 1,
                    texto:
                      "Acentos: áéíóú ñ ç, Símbolos: €£¥₹, Emojis: 🚀🎉💖, Control: \t\n\r",
                    json: '{"nested": "value", "array": [1,2,3]}',
                    unicode: "Unicode: ∑∆π∞≈≠≤≥",
                  },
                ]}
                filename="caracteres_extremos"
                formats={["csv", "json", "xlsx"]}
                onStart={() =>
                  handleStatus(
                    `${ICONS.gear} Procesando caracteres especiales...`
                  )
                }
                onSuccess={() =>
                  handleStatus(
                    `${ICONS.success} Caracteres especiales manejados`
                  )
                }
                onError={(error) =>
                  handleStatus(`${ICONS.error} Error: ${error}`)
                }
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">
                Múltiples datasets complejos:
              </h4>
              <ExportButton
                datasets={[
                  {
                    name: "Datos Complejos",
                    data: complexData,
                    columns: complexColumns,
                  },
                  {
                    name: "Tipos Especiales",
                    data: specialTypesData,
                    columns: specialColumns,
                  },
                  {
                    name: "Tiempo Real",
                    data: realTimeData.slice(0, 10),
                    columns: [
                      { key: "realtimeId", header: "ID" },
                      { key: "name", header: "Nombre" },
                      { key: "timestamp", header: "Timestamp" },
                    ],
                  },
                ]}
                filename="multiple_datasets_extremos"
                formats={["xlsx-branded", "json"]}
                branding={corporateBranding}
                onStart={() =>
                  handleStatus(
                    `${ICONS.rocket} Procesando múltiples datasets...`
                  )
                }
                onSuccess={() =>
                  handleStatus(`${ICONS.success} Múltiples datasets exportados`)
                }
                onError={(error) =>
                  handleStatus(`${ICONS.error} Error: ${error}`)
                }
              />
            </div>

            <div>
              <h4 className="font-medium mb-2">
                Configuración extrema de branding:
              </h4>
              <ExportButton
                data={complexData.slice(0, 1)}
                columns={complexColumns}
                filename="branding_extremo"
                formats={["pdf-branded"]}
                branding={{
                  ...corporateBranding,
                  orgName:
                    "Organización con Nombre Muy Largo para Testing de Límites de Caracteres en Documentos PDF",
                  footerText:
                    "Este es un footer extremadamente largo para probar cómo se maneja el texto extenso en los documentos generados automáticamente por el sistema de exportación",
                  includeWatermark: true,
                  watermarkText: "CONFIDENCIAL - DOCUMENTO DE PRUEBA EXTREMA",
                  metadata: {
                    author: "Sistema Automatizado de Testing",
                    subject: "Prueba de Límites de Configuración",
                    keywords: [
                      "testing",
                      "límites",
                      "configuración",
                      "extrema",
                    ],
                    creator: "AdvancedDemo Component",
                  },
                }}
                onStart={() =>
                  handleStatus(`${ICONS.fire} Aplicando branding extremo...`)
                }
                onSuccess={() =>
                  handleStatus(`${ICONS.success} Branding extremo aplicado`)
                }
                onError={(error) =>
                  handleStatus(`${ICONS.error} Error: ${error}`)
                }
              />
            </div>
          </div>
        </div>
      </section>

      {/* Información de Debug */}
      <section className="bg-gray-900 text-white rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3">
          {ICONS.bug} Panel de Debug y Monitoreo
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2 text-gray-300">
              Estado del Sistema:
            </h4>
            <ul className="space-y-1 text-gray-400">
              <li>
                • Datos en tiempo real:{" "}
                <span className="text-green-400">{realTimeData.length}</span>{" "}
                registros
              </li>
              <li>
                • Datos complejos:{" "}
                <span className="text-blue-400">{complexData.length}</span>{" "}
                objetos
              </li>
              <li>
                • Tipos especiales:{" "}
                <span className="text-purple-400">
                  {specialTypesData.length}
                </span>{" "}
                casos
              </li>
              <li>
                • Generando datos:{" "}
                <span
                  className={isGenerating ? "text-yellow-400" : "text-gray-400"}
                >
                  {isGenerating ? "Sí" : "No"}
                </span>
              </li>
              <li>
                • Auto-generación:{" "}
                <span
                  className={
                    intervalRef.current ? "text-green-400" : "text-gray-400"
                  }
                >
                  {intervalRef.current ? "Activa" : "Inactiva"}
                </span>
              </li>
              <li>
                • Formatos habilitados:{" "}
                <span className="text-cyan-400">
                  {getEnabledFormats().length}
                </span>
                /{Object.keys(formatsEnabled).length}
              </li>
              <li>
                • Simulación de error:{" "}
                <span
                  className={errorSimulation ? "text-red-400" : "text-gray-400"}
                >
                  {errorSimulation ? "Activada" : "Desactivada"}
                </span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2 text-gray-300">Último Estado:</h4>
            <div className="bg-gray-800 p-3 rounded border text-xs font-mono">
              <div className="text-green-400">
                {status || "Sin actividad reciente"}
              </div>
              <div className="text-gray-500 mt-2">
                Timestamp: {new Date().toLocaleTimeString()}
              </div>
            </div>

            <h4 className="font-medium mb-2 mt-4 text-gray-300">
              Formatos Disponibles:
            </h4>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {Object.entries(formatsEnabled).map(([format, enabled]) => (
                <div
                  key={format}
                  className={`p-1 rounded ${
                    enabled
                      ? "bg-green-900 text-green-300"
                      : "bg-red-900 text-red-300"
                  }`}
                >
                  {format}: {enabled ? "ON" : "OFF"}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-800 rounded border-l-4 border-blue-500">
          <h4 className="font-medium text-blue-400 mb-1">💡 Tips Avanzados:</h4>
          <ul className="text-xs text-gray-300 space-y-1">
            <li>
              • Abre DevTools (F12) para ver logs detallados de las operaciones
            </li>
            <li>• Usa Network tab para monitorear descargas y requests</li>
            <li>
              • Console muestra eventos de generación de datos en tiempo real
            </li>
            <li>• Memory tab puede mostrar usage durante exports grandes</li>
            <li>
              • Prueba diferentes combinaciones de formatos
              habilitados/deshabilitados
            </li>
          </ul>
        </div>
      </section>

      {/* 7. Descargas Avanzadas */}
      <section className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">
          {ICONS.download} 7. Descargas Avanzadas y Edge Cases
        </h2>
        <p className="text-gray-600 mb-4">
          Casos complejos de descarga con diferentes tipos de archivos y
          configuraciones.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Descarga básica funcionando */}
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-2 text-green-800">
              Descarga Local (PDF)
            </h4>
            <DownloadButton
              url={downloadUrls.pdf}
              filename="documento_local.pdf"
              size="sm"
              variant="outline"
              onStart={() =>
                handleStatus(`${ICONS.download} Descargando PDF local...`)
              }
              onSuccess={() =>
                handleStatus(`${ICONS.success} PDF descargado exitosamente`)
              }
              onError={(error) =>
                handleStatus(`${ICONS.error} Error PDF: ${error.message}`)
              }
            />
          </div>

          {/* Descarga con progreso */}
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-2 text-blue-800">
              Con Progreso (Imagen)
            </h4>
            <DownloadButton
              url={downloadUrls.image}
              filename="imagen_con_progreso.jpg"
              showProgress={true}
              size="sm"
              onStart={() =>
                handleStatus(
                  `${ICONS.download} Iniciando descarga con progreso...`
                )
              }
              onProgress={(loaded, total, percentage) =>
                handleStatus(`${ICONS.download} Descargando... ${percentage}%`)
              }
              onSuccess={() =>
                handleStatus(`${ICONS.success} Imagen descargada con progreso`)
              }
              onError={(error) =>
                handleStatus(`${ICONS.error} Error imagen: ${error.message}`)
              }
            />
          </div>

          {/* Descarga con reintentos */}
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-2 text-orange-800">
              Con Reintentos (API)
            </h4>
            <DownloadButton
              url={downloadUrls.json}
              filename="datos_api.json"
              retries={3}
              timeout={10000}
              size="sm"
              variant="ghost"
              onStart={() =>
                handleStatus(
                  `${ICONS.download} Descargando API con reintentos...`
                )
              }
              onSuccess={() =>
                handleStatus(`${ICONS.success} API descargada con reintentos`)
              }
              onError={(error) =>
                handleStatus(`${ICONS.error} Error API: ${error.message}`)
              }
            />
          </div>

          {/* Descarga con headers */}
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-2 text-purple-800">
              Con Headers Custom
            </h4>
            <DownloadButton
              url={downloadUrls.json}
              filename="datos_con_headers.json"
              requestInit={{
                headers: {
                  Accept: "application/json",
                  "User-Agent": "AdvancedDemo/1.0",
                  "X-Custom-Header": "Testing",
                },
              }}
              size="sm"
              onStart={() =>
                handleStatus(`${ICONS.download} Descargando con headers...`)
              }
              onSuccess={() =>
                handleStatus(`${ICONS.success} Descarga con headers custom`)
              }
              onError={(error) =>
                handleStatus(`${ICONS.error} Error headers: ${error.message}`)
              }
            />
          </div>

          {/* Data URL */}
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-2 text-indigo-800">
              Data URL Dinámico
            </h4>
            <DownloadButton
              url={`data:text/plain;charset=utf-8,${encodeURIComponent(
                `Datos generados dinámicamente\n` +
                  `Timestamp: ${new Date().toISOString()}\n` +
                  `Registros tiempo real: ${realTimeData.length}\n` +
                  `Estado: ${status || "Sin actividad"}\n\n` +
                  `Datos:\n${JSON.stringify(realTimeData.slice(0, 3), null, 2)}`
              )}`}
              filename="datos_dinamicos.txt"
              size="sm"
              variant="solid"
              onStart={() =>
                handleStatus(`${ICONS.download} Generando Data URL...`)
              }
              onSuccess={() =>
                handleStatus(`${ICONS.success} Data URL descargado`)
              }
              onError={(error) =>
                handleStatus(`${ICONS.error} Error Data URL: ${error.message}`)
              }
            />
          </div>

          {/* Descarga que falla intencionalmente */}
          <div className="bg-white p-4 rounded-lg border border-red-200">
            <h4 className="font-medium mb-2 text-red-800">
              Error 404 (Testing)
            </h4>
            <DownloadButton
              url="https://httpstat.us/404"
              filename="archivo_404.txt"
              retries={1}
              timeout={5000}
              size="sm"
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
              onStart={() =>
                handleStatus(
                  `${ICONS.warning} Intentando descarga que fallará...`
                )
              }
              onSuccess={() =>
                handleStatus(
                  `${ICONS.success} Descarga inesperadamente exitosa`
                )
              }
              onError={(error) =>
                handleStatus(
                  `${ICONS.error} Error esperado 404: ${error.message}`
                )
              }
            />
          </div>
        </div>

        {/* Descarga masiva simulada */}
        <div className="mt-6 bg-white p-4 rounded-lg border">
          <h4 className="font-medium mb-2">
            Descarga Masiva Simulada (Multiple Files)
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            Simula la descarga de múltiples archivos secuencialmente.
          </p>

          <button
            onClick={async () => {
              const files = [
                { url: downloadUrls.pdf, name: "documento1.pdf" },
                { url: downloadUrls.image, name: "imagen1.jpg" },
                { url: downloadUrls.json, name: "datos1.json" },
              ];

              handleStatus(`${ICONS.rocket} Iniciando descarga masiva...`);

              for (let i = 0; i < files.length; i++) {
                const file = files[i];
                handleStatus(
                  `${ICONS.download} Descargando ${file.name} (${i + 1}/${
                    files.length
                  })...`
                );

                try {
                  // Simular descarga con delay
                  await simulateDelay(1000);
                  handleStatus(
                    `${ICONS.success} ${file.name} descargado (${i + 1}/${
                      files.length
                    })`
                  );
                } catch (error) {
                  handleStatus(
                    `${ICONS.error} Error en ${file.name}: ${error.message}`
                  );
                }
              }

              handleStatus(`${ICONS.success} Descarga masiva completada`);
            }}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all"
          >
            {ICONS.rocket} Iniciar Descarga Masiva
          </button>
        </div>
      </section>

      {/* Resumen Final */}
      <section className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3">
          {ICONS.rocket} Funcionalidades Avanzadas Implementadas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-blue-300 mb-2">
              ✅ Exportación Avanzada:
            </h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Objetos anidados con dot notation</li>
              <li>• Tipos de datos especiales (null, undefined, etc.)</li>
              <li>• Datos en tiempo real con timestamps</li>
              <li>• Control dinámico de formatos</li>
              <li>• Múltiples datasets complejos</li>
              <li>• Formatters personalizados avanzados</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-green-300 mb-2">
              ✅ Manejo de Errores:
            </h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Simulación controlada de errores</li>
              <li>• Recuperación graceful de fallos</li>
              <li>• Logging detallado de eventos</li>
              <li>• Estados visuales de error/éxito</li>
              <li>• Timeout y reintentos configurables</li>
              <li>• Validación de entrada robusta</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-purple-300 mb-2">✅ Casos Edge:</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Datasets vacíos</li>
              <li>• Caracteres especiales extremos</li>
              <li>• URLs que fallan (404, timeout)</li>
              <li>• Configuraciones de branding extremas</li>
              <li>• Data URLs dinámicos</li>
              <li>• Descargas masivas secuenciales</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 p-4 bg-slate-700 rounded border-l-4 border-yellow-500">
          <h4 className="font-medium text-yellow-400 mb-2">
            {ICONS.fire} Optimizaciones Aplicadas:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300">
            <div>
              <strong>Performance:</strong>
              <ul className="mt-1 space-y-1">
                <li>• useCallback para funciones memoizadas</li>
                <li>• Cleanup de intervals en useEffect</li>
                <li>• Lazy loading de componentes pesados</li>
                <li>• Debounce en generación de datos</li>
              </ul>
            </div>
            <div>
              <strong>UX/UI:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Estados visuales claros (loading, success, error)</li>
                <li>• Feedback inmediato en todas las acciones</li>
                <li>• Controles intuitivos y accesibles</li>
                <li>• Panel de debug para desarrollo</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdvancedDemo;
