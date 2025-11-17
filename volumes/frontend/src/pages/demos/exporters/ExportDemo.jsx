// src/pages/demos/exporters/ExportDemo.jsx
// Demo básico de ExportButton coherente con el módulo refactorizado
// Ejemplos simples y directos de exportación en diferentes formatos

import React, { useState, useCallback, useMemo } from "react";
import {
  ExportButton,
  ExportDropdown,
  createSampleData,
} from "@/components/common/exporter";

const ExportDemo = () => {
  const [status, setStatus] = useState("");
  const [hasData, setHasData] = useState(true);
  const [exportHistory, setExportHistory] = useState([]);

  // Generar datos de ejemplo usando el módulo refactorizado
  const sampleData = useMemo(() => createSampleData(25), []);
  const largeSampleData = useMemo(() => createSampleData(1000), []);

  // Datos de ventas para branding
  const salesData = useMemo(
    () => ({
      data: [
        {
          id: 1,
          producto: "Laptop Dell XPS",
          categoria: "Tecnología",
          precio: 1299.99,
          vendido: true,
          fecha: new Date("2024-12-15"),
        },
        {
          id: 2,
          producto: "iPhone 15 Pro",
          categoria: "Tecnología",
          precio: 999.99,
          vendido: true,
          fecha: new Date("2024-12-14"),
        },
        {
          id: 3,
          producto: "Silla Ergonómica",
          categoria: "Oficina",
          precio: 299.99,
          vendido: false,
          fecha: new Date("2024-12-13"),
        },
        {
          id: 4,
          producto: "Monitor 4K",
          categoria: "Tecnología",
          precio: 599.99,
          vendido: true,
          fecha: new Date("2024-12-12"),
        },
        {
          id: 5,
          producto: "Teclado Mecánico",
          categoria: "Accesorios",
          precio: 149.99,
          vendido: true,
          fecha: new Date("2024-12-11"),
        },
      ],
      columns: [
        { key: "id", header: "ID" },
        { key: "producto", header: "Producto" },
        { key: "categoria", header: "Categoría" },
        {
          key: "precio",
          header: "Precio",
          formatter: (value) => `$${value.toFixed(2)}`,
        },
        {
          key: "vendido",
          header: "Estado",
          formatter: (value) => (value ? "Vendido" : "Disponible"),
        },
        {
          key: "fecha",
          header: "Fecha",
          formatter: (value) => value.toLocaleDateString("es-ES"),
        },
      ],
    }),
    []
  );

  // Configuración de branding corporativo
  const corporateBranding = {
    orgName: "Empresa Demo S.A.",
    createdBy: "Sistema de Exportación v2.0",
    footerText: "Documento generado automáticamente",
    primaryColor: "#2563eb",
    secondaryColor: "#1e40af",
    watermark: false,
    pageNumbers: true,
    logoPosition: "top-left",
  };

  // Handlers para feedback
  const handleStatus = useCallback((message) => {
    setStatus(message);
    setTimeout(() => setStatus(""), 3000);
  }, []);

  const handleExportStart = useCallback(
    (info) => {
      handleStatus(`🔄 Iniciando exportación...`);
    },
    [handleStatus]
  );

  const handleExportSuccess = useCallback(
    (result) => {
      const exportRecord = {
        id: Date.now(),
        format: result.format || "unknown",
        filename: result.filename || "export",
        size: result.size || 0,
        timestamp: new Date().toLocaleString(),
        success: true,
      };

      setExportHistory((prev) => [exportRecord, ...prev.slice(0, 4)]);
      handleStatus(
        `✅ ${result.filename || "Archivo"} listo (${formatBytes(
          result.size || 0
        )})`
      );
    },
    [handleStatus]
  );

  const handleExportError = useCallback(
    (error) => {
      const exportRecord = {
        id: Date.now(),
        error: error.message,
        timestamp: new Date().toLocaleString(),
        success: false,
      };

      setExportHistory((prev) => [exportRecord, ...prev.slice(0, 4)]);
      handleStatus(`❌ Error: ${error.message}`);
    },
    [handleStatus]
  );

  // Formatear bytes
  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Datos actuales según el toggle
  const currentData = hasData ? sampleData.data : [];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg border p-6">
        <h1 className="text-3xl font-bold mb-2">📊 Demo ExportButton</h1>
        <p className="text-gray-600 mb-4">
          Ejemplos básicos de exportación usando el módulo refactorizado
        </p>

        {/* Status y controles */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {status && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-blue-800 text-sm font-medium">
                  {status}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setHasData(!hasData)}
            className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              hasData
                ? "bg-green-100 text-green-800 hover:bg-green-200"
                : "bg-red-100 text-red-800 hover:bg-red-200"
            }`}
          >
            {hasData ? "✅ Con datos" : "❌ Sin datos"}
          </button>
        </div>

        {/* Información de datos */}
        {hasData && (
          <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
            <strong>Dataset actual:</strong> {currentData.length} registros •
            <strong> Columnas:</strong> {sampleData.columns.length} campos •
            <strong> Generado:</strong>{" "}
            {sampleData.metadata.createdAt.split("T")[0]}
          </div>
        )}
      </div>

      {/* 1. Formatos básicos individuales */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">🎯 Formatos Individuales</h2>
        <p className="text-gray-600 mb-4">
          ExportButton básico para cada formato soportado
        </p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <ExportButton
            data={currentData}
            columns={sampleData.columns}
            formats={["csv"]}
            filename="usuarios_basico"
            onStart={handleExportStart}
            onSuccess={handleExportSuccess}
            onError={handleExportError}
            className="w-full"
          >
            📋 CSV
          </ExportButton>

          <ExportButton
            data={currentData}
            columns={sampleData.columns}
            formats={["json"]}
            filename="usuarios_basico"
            onStart={handleExportStart}
            onSuccess={handleExportSuccess}
            onError={handleExportError}
            className="w-full"
          >
            🔧 JSON
          </ExportButton>

          <ExportButton
            data={currentData}
            columns={sampleData.columns}
            formats={["excel"]}
            filename="usuarios_basico"
            onStart={handleExportStart}
            onSuccess={handleExportSuccess}
            onError={handleExportError}
            className="w-full"
          >
            📊 Excel
          </ExportButton>

          <ExportButton
            data={currentData}
            columns={sampleData.columns}
            formats={["pdf"]}
            filename="usuarios_basico"
            onStart={handleExportStart}
            onSuccess={handleExportSuccess}
            onError={handleExportError}
            className="w-full"
          >
            📄 PDF
          </ExportButton>

          <ExportButton
            data={currentData}
            columns={sampleData.columns}
            formats={["txt"]}
            filename="usuarios_basico"
            onStart={handleExportStart}
            onSuccess={handleExportSuccess}
            onError={handleExportError}
            className="w-full"
          >
            📝 TXT
          </ExportButton>
        </div>
      </div>

      {/* 2. Exportación múltiple */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">🚀 Exportación Múltiple</h2>
        <p className="text-gray-600 mb-4">
          Un solo botón que genera múltiples formatos simultáneamente
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">Formatos Básicos</h3>
            <p className="text-sm text-gray-600 mb-3">CSV, JSON y TXT</p>
            <ExportButton
              data={currentData}
              columns={sampleData.columns}
              formats={["csv", "json", "txt"]}
              filename="export_basico"
              onStart={handleExportStart}
              onSuccess={handleExportSuccess}
              onError={handleExportError}
              className="w-full"
            >
              Exportar Básicos
            </ExportButton>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">Todos los Formatos</h3>
            <p className="text-sm text-gray-600 mb-3">Paquete completo</p>
            <ExportButton
              data={currentData}
              columns={sampleData.columns}
              formats={["csv", "json", "excel", "pdf", "txt"]}
              filename="export_completo"
              onStart={handleExportStart}
              onSuccess={handleExportSuccess}
              onError={handleExportError}
              className="w-full"
            >
              Exportar Todo
            </ExportButton>
          </div>
        </div>
      </div>

      {/* 3. ExportDropdown */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">🎛️ ExportDropdown</h2>
        <p className="text-gray-600 mb-4">
          Selector desplegable para elegir formato antes de exportar
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <h3 className="font-medium mb-2">Básico</h3>
            <ExportDropdown
              data={currentData}
              columns={sampleData.columns}
              enabledFormats={["csv", "json", "excel"]}
              placeholder="Seleccionar formato"
              filename="dropdown_basico"
              onExport={(format) =>
                handleStatus(`🔄 Exportando ${format.toUpperCase()}...`)
              }
              onExportComplete={handleExportSuccess}
              onExportError={handleExportError}
              className="w-full"
            />
          </div>

          <div className="text-center">
            <h3 className="font-medium mb-2">Con Iconos</h3>
            <ExportDropdown
              data={currentData}
              columns={sampleData.columns}
              enabledFormats={["csv", "json", "excel", "pdf"]}
              showIcons={true}
              showDescriptions={true}
              placeholder="Con iconos y descripción"
              filename="dropdown_iconos"
              onExport={(format) =>
                handleStatus(`🔄 ${format.toUpperCase()} con iconos...`)
              }
              onExportComplete={handleExportSuccess}
              onExportError={handleExportError}
              className="w-full"
            />
          </div>

          <div className="text-center">
            <h3 className="font-medium mb-2">Agrupado</h3>
            <ExportDropdown
              data={currentData}
              columns={sampleData.columns}
              enabledFormats={["csv", "json", "excel", "pdf", "txt"]}
              groupByType={true}
              showEstimatedSize={true}
              placeholder="Agrupado por tipo"
              filename="dropdown_agrupado"
              onExport={(format) =>
                handleStatus(`🔄 Formato agrupado: ${format.toUpperCase()}...`)
              }
              onExportComplete={handleExportSuccess}
              onExportError={handleExportError}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* 4. Con branding corporativo */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">🏢 Branding Corporativo</h2>
        <p className="text-gray-600 mb-4">
          Exportación con configuración de marca y estilos personalizados
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded p-4">
            <h3 className="font-medium mb-2">PDF Corporativo</h3>
            <p className="text-sm text-gray-600 mb-3">
              Con marca de agua y colores de empresa
            </p>
            <ExportButton
              data={salesData.data}
              columns={salesData.columns}
              formats={["pdf"]}
              config={{
                branding: {
                  ...corporateBranding,
                  watermark: true,
                  watermarkText: "CONFIDENCIAL",
                },
              }}
              filename="reporte_corporativo"
              onStart={handleExportStart}
              onSuccess={handleExportSuccess}
              onError={handleExportError}
              className="w-full"
            >
              PDF Corporativo
            </ExportButton>
          </div>

          <div className="bg-white rounded p-4">
            <h3 className="font-medium mb-2">Excel con Estilos</h3>
            <p className="text-sm text-gray-600 mb-3">
              Colores de encabezado y formato
            </p>
            <ExportButton
              data={salesData.data}
              columns={salesData.columns}
              formats={["excel"]}
              config={{
                branding: corporateBranding,
                excel: {
                  sheetName: "Datos Corporativos",
                  includeHeader: true,
                  autoWidth: true,
                  freezeRow: 1,
                },
              }}
              filename="datos_corporativos"
              onStart={handleExportStart}
              onSuccess={handleExportSuccess}
              onError={handleExportError}
              className="w-full"
            >
              Excel Estilizado
            </ExportButton>
          </div>
        </div>
      </div>

      {/* 5. Dataset grande */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">📈 Dataset Grande</h2>
        <p className="text-gray-600 mb-4">
          Testing con 1000 registros para probar rendimiento
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-blue-600 mb-1">1,000</div>
            <div className="text-sm text-gray-600 mb-3">Registros</div>
            <ExportButton
              data={largeSampleData.data}
              columns={largeSampleData.columns}
              formats={["csv"]}
              filename="dataset_grande_csv"
              showProgress={true}
              onStart={handleExportStart}
              onSuccess={handleExportSuccess}
              onError={handleExportError}
              className="w-full text-sm"
            >
              CSV Rápido
            </ExportButton>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-green-600 mb-1">Excel</div>
            <div className="text-sm text-gray-600 mb-3">Con progreso</div>
            <ExportButton
              data={largeSampleData.data}
              columns={largeSampleData.columns}
              formats={["excel"]}
              filename="dataset_grande_excel"
              showProgress={true}
              onStart={handleExportStart}
              onSuccess={handleExportSuccess}
              onError={handleExportError}
              className="w-full text-sm"
            >
              Excel Grande
            </ExportButton>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              Múltiple
            </div>
            <div className="text-sm text-gray-600 mb-3">CSV + JSON</div>
            <ExportButton
              data={largeSampleData.data}
              columns={largeSampleData.columns}
              formats={["csv", "json"]}
              filename="dataset_grande_multiple"
              showProgress={true}
              confirmBeforeExport={true}
              onStart={handleExportStart}
              onSuccess={handleExportSuccess}
              onError={handleExportError}
              className="w-full text-sm"
            >
              Múltiple Grande
            </ExportButton>
          </div>
        </div>
      </div>

      {/* 6. Múltiples hojas Excel */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">📚 Múltiples Hojas Excel</h2>
        <p className="text-gray-600 mb-4">
          Excel con múltiples datasets en hojas separadas
        </p>

        <ExportButton
          datasets={[
            {
              name: "Usuarios",
              data: sampleData.data,
              columns: sampleData.columns,
            },
            {
              name: "Ventas",
              data: salesData.data,
              columns: salesData.columns,
            },
            {
              name: "Resumen",
              data: [
                { concepto: "Total Usuarios", valor: sampleData.data.length },
                { concepto: "Total Ventas", valor: salesData.data.length },
                {
                  concepto: "Fecha Generación",
                  valor: new Date().toLocaleString(),
                },
              ],
            },
          ]}
          formats={["excel"]}
          filename="reporte_multihoja"
          onStart={handleExportStart}
          onSuccess={handleExportSuccess}
          onError={handleExportError}
          className="w-full max-w-md mx-auto"
        >
          📚 Generar Excel Multi-hoja
        </ExportButton>
      </div>

      {/* Historial de exportaciones */}
      {exportHistory.length > 0 && (
        <div className="bg-gray-50 rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">
            📋 Historial de Exportaciones
          </h2>

          <div className="space-y-2">
            {exportHistory.map((export_record) => (
              <div
                key={export_record.id}
                className="flex items-center justify-between p-3 bg-white rounded border text-sm"
              >
                <div className="flex-1">
                  <div className="font-medium">
                    {export_record.success
                      ? `${export_record.format?.toUpperCase() || "N/A"} - ${
                          export_record.filename
                        }`
                      : "Error en exportación"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {export_record.timestamp}
                  </div>
                </div>

                <div className="text-right">
                  {export_record.success ? (
                    <div>
                      <div className="text-green-600 font-medium">✅ Éxito</div>
                      <div className="text-xs text-gray-500">
                        {formatBytes(export_record.size)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-red-600 text-xs">
                      ❌ {export_record.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setExportHistory([])}
            className="mt-3 text-sm text-gray-600 hover:text-gray-800"
          >
            🗑️ Limpiar historial
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportDemo;
