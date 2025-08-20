import React, { useState, useEffect, useCallback, useRef } from "react";
import ExportButton from "@/components/common/exporter/ExportButton";
import DownloadButton from "@/components/common/exporter/DownloadButton";
import {
  complexData,
  complexColumns,
  specialTypesData,
  corporateBranding,
  dataGenerators,
  simulateDelay,
} from "./mockData";

// Iconos corregidos (fix de UTF-8)
const ICONS = {
  loading: "⏳",
  file: "📄",
  success: "✅",
  error: "❌",
  chart: "📊",
  clean: "🗑️",
  download: "📥",
  world: "🌍",
  target: "🎯",
  office: "🏢",
  warning: "⚠️",
  bug: "🛠️",
  rocket: "🚀",
};

const AdvancedDemo = () => {
  const [status, setStatus] = useState("");
  const [realTimeData, setRealTimeData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const intervalRef = useRef(null);

  // ✅ SOLUCIÓN 1: useEffect sin dependencias problemáticas
  useEffect(() => {
    const interval = setInterval(() => {
      setRealTimeData((prev) => {
        // Solo agregar si hay menos de 10 elementos
        if (prev.length < 10) {
          return [
            ...prev,
            {
              ...dataGenerators.randomSalesData(),
              timestamp: new Date(),
              id: Date.now(),
            },
          ];
        }
        return prev; // No cambiar si ya hay 10 elementos
      });
    }, 2000);

    intervalRef.current = interval;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // ✅ Array vacío - solo se ejecuta una vez

  // ✅ SOLUCIÓN 2: Función memoizada para manejar status
  const handleStatus = useCallback((message) => {
    setStatus(message);
    setTimeout(() => setStatus(""), 3000);
  }, []);

  // ✅ SOLUCIÓN 3: Función optimizada para generar datos
  const generateLiveData = useCallback(async () => {
    setIsGenerating(true);
    setStatus(`${ICONS.loading} Generando datos en tiempo real...`);

    try {
      // Simular generación de datos
      for (let i = 0; i < 5; i++) {
        await simulateDelay(500);
        setRealTimeData((prev) => [
          ...prev,
          {
            ...dataGenerators.randomUser(),
            timestamp: new Date(),
            batchId: `BATCH_${Date.now()}`,
          },
        ]);
      }
      setStatus(`${ICONS.success} Datos generados`);
    } catch (error) {
      setStatus(`${ICONS.error} Error generando datos: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // ✅ SOLUCIÓN 4: Función memoizada para limpiar datos
  const clearData = useCallback(() => {
    setRealTimeData([]);
    setStatus(`${ICONS.clean} Datos limpiados`);
  }, []);

  // ✅ SOLUCIÓN 5: Limpiar interval al desmontar componente
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
          Ejemplos avanzados de exportación y descarga con casos edge y
          configuraciones complejas
        </p>
        {status && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
            {status}
          </div>
        )}
      </div>

      {/* Datos con Objetos Anidados */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          1. Datos con Objetos Anidados
        </h2>
        <p className="text-gray-600 mb-4">
          Exportación de datos complejos con objetos anidados y arrays.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="font-medium mb-2">Estructura de datos:</h3>
          <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
            {JSON.stringify(complexData[0], null, 2).substring(0, 400)}...
          </pre>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">
              Exportación con aplanado de objetos:
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
              formats={["json"]}
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

      {/* Tipos de Datos Especiales */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          2. Tipos de Datos Especiales
        </h2>
        <p className="text-gray-600 mb-4">
          Manejo de null, undefined, objetos, arrays, fechas y caracteres
          especiales.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="font-medium mb-2">Datos de prueba:</h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <strong>Valores especiales:</strong>
              <ul className="mt-1 space-y-1">
                <li>• null: {String(specialTypesData[0].nullValue)}</li>
                <li>
                  • undefined: {String(specialTypesData[0].undefinedValue)}
                </li>
                <li>• string vacío: "{specialTypesData[0].emptyString}"</li>
                <li>• cero: {specialTypesData[0].zeroNumber}</li>
              </ul>
            </div>
            <div>
              <strong>Tipos complejos:</strong>
              <ul className="mt-1 space-y-1">
                <li>• boolean: {String(specialTypesData[0].booleanTrue)}</li>
                <li>• fecha: {specialTypesData[0].dateValue.toISOString()}</li>
                <li>
                  • objeto: {JSON.stringify(specialTypesData[0].objectValue)}
                </li>
                <li>
                  • array: {JSON.stringify(specialTypesData[0].arrayValue)}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ExportButton
            data={specialTypesData}
            filename="tipos_especiales_csv"
            formats={["csv"]}
            onStart={() => handleStatus(`${ICONS.file} Exportando a CSV...`)}
            onSuccess={() =>
              handleStatus(`${ICONS.success} CSV con tipos especiales`)
            }
            onError={(error) =>
              handleStatus(`${ICONS.error} Error CSV: ${error}`)
            }
          />

          <ExportButton
            data={specialTypesData}
            filename="tipos_especiales_excel"
            formats={["xlsx"]}
            onStart={() => handleStatus(`${ICONS.chart} Exportando a Excel...`)}
            onSuccess={() =>
              handleStatus(`${ICONS.success} Excel con tipos especiales`)
            }
            onError={(error) =>
              handleStatus(`${ICONS.error} Error Excel: ${error}`)
            }
          />

          <ExportButton
            data={specialTypesData}
            filename="tipos_especiales_json"
            formats={["json"]}
            onStart={() => handleStatus(`⚙️ Exportando a JSON...`)}
            onSuccess={() =>
              handleStatus(`${ICONS.success} JSON con tipos especiales`)
            }
            onError={(error) =>
              handleStatus(`${ICONS.error} Error JSON: ${error}`)
            }
          />
        </div>
      </section>

      {/* Datos en Tiempo Real - VERSIÓN CORREGIDA */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          3. Exportación de Datos en Tiempo Real
        </h2>
        <p className="text-gray-600 mb-4">
          Exporta datos que se actualizan dinámicamente mientras el usuario
          interactúa.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium">
              Datos en tiempo real ({realTimeData.length} registros):
            </h3>
            <div className="flex gap-2">
              <button
                onClick={generateLiveData}
                disabled={isGenerating}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {isGenerating
                  ? `${ICONS.loading} Generando...`
                  : `${ICONS.file} Generar Más`}
              </button>
              <button
                onClick={clearData}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                {ICONS.clean} Limpiar
              </button>
            </div>
          </div>

          {realTimeData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 px-2">Timestamp</th>
                    <th className="text-left py-1 px-2">Dato</th>
                    <th className="text-left py-1 px-2">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {realTimeData.slice(-5).map((item, index) => (
                    <tr key={item.id || index} className="border-b">
                      <td className="py-1 px-2">
                        {item.timestamp.toLocaleTimeString()}
                      </td>
                      <td className="py-1 px-2">{item.name || item.month}</td>
                      <td className="py-1 px-2">
                        {item.email || item.revenue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {realTimeData.length > 5 && (
                <p className="text-xs text-gray-500 mt-2">
                  Mostrando últimos 5 de {realTimeData.length}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              No hay datos. Haz click en "Generar Más" para crear datos
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
            formats={["xlsx", "csv"]}
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

      {/* El resto de las secciones permanecen igual... */}
      {/* Aquí van todas las demás secciones sin cambios, solo corrigiendo los iconos */}

      {/* Información de Debug */}
      <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-yellow-900 mb-3">
          {ICONS.bug} Información de Debug
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-800">
          <div>
            <h4 className="font-medium mb-2">Estado actual:</h4>
            <ul className="space-y-1">
              <li>• Datos en tiempo real: {realTimeData.length} registros</li>
              <li>• Datos complejos: {complexData.length} objetos</li>
              <li>• Tipos especiales: {specialTypesData.length} casos</li>
              <li>• Generando datos: {isGenerating ? "Sí" : "No"}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Último estado:</h4>
            <p className="bg-white p-2 rounded border text-xs font-mono">
              {status || "Sin actividad reciente"}
            </p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-yellow-100 rounded">
          <p className="text-xs text-yellow-700">
            💡 <strong>Tip:</strong> Abre las herramientas de desarrollador para
            ver logs detallados de las operaciones de exportación y descarga.
          </p>
        </div>
      </section>
    </div>
  );
};

export default AdvancedDemo;
