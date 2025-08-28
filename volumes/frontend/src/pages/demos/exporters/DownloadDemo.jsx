// src/pages/demos/exporters/DownloadDemo.jsx
// Demo de descarga de archivos coherente con el módulo refactorizado
// Utiliza DownloadManager y downloadFile del sistema de descargas

import React, { useState, useCallback } from "react";
import {
  downloadFile,
  downloadUtils,
  createSampleData,
} from "@/components/common/exporter";

const DownloadDemo = () => {
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState({
    loaded: 0,
    total: 0,
    percentage: 0,
  });
  const [activeDownloads, setActiveDownloads] = useState(new Map());

  // Handlers para feedback
  const handleStatus = useCallback((message) => {
    setStatus(message);
    setTimeout(() => setStatus(""), 3000);
  }, []);

  const handleProgress = useCallback((loaded, total, percentage) => {
    setProgress({ loaded, total, percentage });
  }, []);

  // Función para descargar usando el nuevo sistema
  const handleDownload = useCallback(
    async (content, filename, format, options = {}) => {
      const downloadId = `download_${Date.now()}`;

      try {
        handleStatus(`🔄 Iniciando descarga: ${filename}`);

        // Registrar descarga activa
        setActiveDownloads(
          (prev) =>
            new Map(
              prev.set(downloadId, {
                filename,
                format,
                status: "downloading",
                startTime: Date.now(),
              })
            )
        );

        // Usar el downloadFile del módulo refactorizado
        const success = await downloadFile(content, filename, format, {
          autoDownload: true,
          showProgress: true,
          ...options,
        });

        if (success) {
          handleStatus(`✅ ${filename} descargado correctamente`);
          setActiveDownloads((prev) => {
            const updated = new Map(prev);
            const download = updated.get(downloadId);
            if (download) {
              download.status = "completed";
              download.endTime = Date.now();
            }
            return updated;
          });
        } else {
          throw new Error("La descarga falló");
        }
      } catch (error) {
        handleStatus(`❌ Error en ${filename}: ${error.message}`);
        setActiveDownloads((prev) => {
          const updated = new Map(prev);
          const download = updated.get(downloadId);
          if (download) {
            download.status = "error";
            download.error = error.message;
          }
          return updated;
        });
      }
    },
    [handleStatus]
  );

  // Generar contenido dinámico para testing
  const generateContent = useCallback((type) => {
    const timestamp = new Date().toLocaleString();

    switch (type) {
      case "json":
        return {
          metadata: {
            title: "Datos de Prueba JSON",
            generated: timestamp,
            version: "2.0",
          },
          data: [
            { id: 1, name: "Elemento 1", active: true },
            { id: 2, name: "Elemento 2", active: false },
            { id: 3, name: "Elemento 3", active: true },
          ],
          statistics: {
            total: 3,
            active: 2,
            inactive: 1,
          },
        };

      case "csv":
        return `ID,Nombre,Email,Departamento,Activo
1,"Ana García","ana.garcia@empresa.com","Ventas",true
2,"Carlos López","carlos.lopez@empresa.com","IT",true
3,"María Rodríguez","maria.rodriguez@empresa.com","Marketing",false
4,"Juan Martínez","juan.martinez@empresa.com","Finanzas",true
5,"Laura Fernández","laura.fernandez@empresa.com","RRHH",true`;

      case "text":
        return `REPORTE GENERADO AUTOMÁTICAMENTE
========================================

Fecha: ${timestamp}
Sistema: Módulo de Exportación v2.0
Tipo: Demo de descarga

CONTENIDO:
----------
Este archivo fue generado usando el nuevo sistema de descargas
del módulo de exportación refactorizado.

Características:
• Descarga automática con DownloadManager
• Soporte para múltiples métodos de descarga
• Manejo de errores mejorado
• Sistema de progreso integrado

Generado para testing del nuevo sistema.`;

      case "xml":
        return `<?xml version="1.0" encoding="UTF-8"?>
<reporte>
  <metadata>
    <titulo>Datos de Prueba XML</titulo>
    <generado>${timestamp}</generado>
    <version>2.0</version>
  </metadata>
  <datos>
    <elemento id="1">
      <nombre>Elemento 1</nombre>
      <activo>true</activo>
    </elemento>
    <elemento id="2">
      <nombre>Elemento 2</nombre>
      <activo>false</activo>
    </elemento>
    <elemento id="3">
      <nombre>Elemento 3</nombre>
      <activo>true</activo>
    </elemento>
  </datos>
</reporte>`;

      default:
        return `Contenido de prueba generado: ${timestamp}`;
    }
  }, []);

  // URLs de testing externas
  const externalUrls = {
    smallImage: "https://picsum.photos/400/300",
    mediumImage: "https://picsum.photos/800/600",
    jsonApi: "https://jsonplaceholder.typicode.com/users/1",
    csvSample:
      "https://raw.githubusercontent.com/holtzy/data_to_viz/master/Example_dataset/1_OneNum.csv",
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg border p-6">
        <h1 className="text-3xl font-bold mb-2">🔽 Demo de Descargas</h1>
        <p className="text-gray-600 mb-4">
          Sistema de descargas usando el módulo refactorizado con{" "}
          <code className="bg-gray-100 px-1 rounded">DownloadManager</code>
        </p>

        {/* Status global */}
        {status && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="text-blue-800 text-sm font-medium">{status}</div>
          </div>
        )}

        {/* Indicador de progreso */}
        {progress.total > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progreso de descarga</span>
              <span>{progress.percentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {downloadUtils.formatFileSize(progress.loaded)} /{" "}
              {downloadUtils.formatFileSize(progress.total)}
            </div>
          </div>
        )}
      </div>

      {/* 1. Contenido generado dinámicamente */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">📄 Contenido Generado</h2>
        <p className="text-gray-600 mb-4">
          Archivos generados en tiempo real usando el nuevo{" "}
          <code className="bg-gray-100 px-1 rounded">downloadFile()</code>
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() =>
              handleDownload(generateContent("json"), "datos_prueba", "json", {
                includeTimestamp: true,
              })
            }
            className="p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors text-center"
          >
            <div className="text-2xl mb-2">📊</div>
            <div className="font-medium">JSON</div>
            <div className="text-xs text-gray-600">Datos estructurados</div>
          </button>

          <button
            onClick={() =>
              handleDownload(generateContent("csv"), "empleados_demo", "csv")
            }
            className="p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors text-center"
          >
            <div className="text-2xl mb-2">📋</div>
            <div className="font-medium">CSV</div>
            <div className="text-xs text-gray-600">Tabla de datos</div>
          </button>

          <button
            onClick={() =>
              handleDownload(generateContent("text"), "reporte_demo", "txt")
            }
            className="p-4 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg transition-colors text-center"
          >
            <div className="text-2xl mb-2">📝</div>
            <div className="font-medium">TXT</div>
            <div className="text-xs text-gray-600">Reporte de texto</div>
          </button>

          <button
            onClick={() =>
              handleDownload(generateContent("xml"), "datos_xml", "xml")
            }
            className="p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors text-center"
          >
            <div className="text-2xl mb-2">🏷️</div>
            <div className="font-medium">XML</div>
            <div className="text-xs text-gray-600">Estructura XML</div>
          </button>
        </div>
      </div>

      {/* 2. Archivos externos */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">🌐 Recursos Externos</h2>
        <p className="text-gray-600 mb-4">
          Descarga desde URLs externas con manejo de errores y reintentos
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">🖼️ Imagen pequeña (400x300)</h3>
            <p className="text-sm text-gray-600 mb-3">
              Testing de imagen desde Picsum
            </p>
            <button
              onClick={() => {
                // Para URLs externas, creamos un fetch manual
                fetch(externalUrls.smallImage)
                  .then((response) => response.blob())
                  .then((blob) => handleDownload(blob, "imagen_pequena", "jpg"))
                  .catch((error) => handleStatus(`❌ Error: ${error.message}`));
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Descargar Imagen
            </button>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">📊 Datos JSON (API)</h3>
            <p className="text-sm text-gray-600 mb-3">
              Usuario desde JSONPlaceholder
            </p>
            <button
              onClick={() => {
                fetch(externalUrls.jsonApi)
                  .then((response) => response.json())
                  .then((data) => handleDownload(data, "usuario_api", "json"))
                  .catch((error) => handleStatus(`❌ Error: ${error.message}`));
              }}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Descargar JSON
            </button>
          </div>
        </div>
      </div>

      {/* 3. Testing de métodos de descarga */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">🔧 Métodos de Descarga</h2>
        <p className="text-gray-600 mb-4">
          Testing de diferentes métodos de descarga del DownloadManager
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">⚡ Nativo (Anchor)</h3>
            <p className="text-sm text-gray-600 mb-3">
              Método estándar del navegador
            </p>
            <button
              onClick={() =>
                handleDownload(generateContent("json"), "test_nativo", "json", {
                  useFileSystemAPI: false,
                  useFileSaver: false,
                })
              }
              className="w-full px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
            >
              Test Nativo
            </button>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">🚀 FileSaver.js</h3>
            <p className="text-sm text-gray-600 mb-3">Librería especializada</p>
            <button
              onClick={() =>
                handleDownload(
                  generateContent("csv"),
                  "test_filesaver",
                  "csv",
                  { useFileSaver: true, useFileSystemAPI: false }
                )
              }
              className="w-full px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 transition-colors"
            >
              Test FileSaver
            </button>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">💾 File System API</h3>
            <p className="text-sm text-gray-600 mb-3">API moderna (Chrome)</p>
            <button
              onClick={() =>
                handleDownload(
                  generateContent("text"),
                  "test_filesystem",
                  "txt",
                  { useFileSystemAPI: true, useFileSaver: false }
                )
              }
              className="w-full px-3 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 transition-colors"
            >
              Test File System
            </button>
          </div>
        </div>
      </div>

      {/* 4. Información del sistema */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">
          💡 Información del Sistema
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h3 className="font-medium text-blue-800 mb-2">
              Soporte del Navegador
            </h3>
            <div className="space-y-1 text-blue-700">
              <div>
                • Descargas:{" "}
                {downloadUtils.isDownloadSupported()
                  ? "✅ Soportadas"
                  : "❌ No soportadas"}
              </div>
              <div>
                • File System API:{" "}
                {"showSaveFilePicker" in window
                  ? "✅ Disponible"
                  : "❌ No disponible"}
              </div>
              <div>
                • Blob Support:{" "}
                {typeof Blob !== "undefined"
                  ? "✅ Soportado"
                  : "❌ No soportado"}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-blue-800 mb-2">
              Características Activas
            </h3>
            <div className="space-y-1 text-blue-700">
              <div>• Manejo de errores automático</div>
              <div>• Múltiples métodos de respaldo</div>
              <div>• Progreso de descarga</div>
              <div>• Sanitización de nombres</div>
              <div>• Timeout configurable (30s)</div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Descargas activas */}
      {activeDownloads.size > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">📋 Descargas Activas</h2>

          <div className="space-y-2">
            {Array.from(activeDownloads.entries()).map(([id, download]) => (
              <div
                key={id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{download.filename}</div>
                  <div className="text-xs text-gray-600">
                    {download.format?.toUpperCase()} • {download.status}
                  </div>
                </div>

                <div className="text-right text-xs text-gray-500">
                  {download.endTime && download.startTime && (
                    <div>⏱️ {download.endTime - download.startTime}ms</div>
                  )}
                  {download.status === "completed" && (
                    <div className="text-green-600">✅ Completado</div>
                  )}
                  {download.status === "error" && (
                    <div className="text-red-600">❌ Error</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DownloadDemo;
