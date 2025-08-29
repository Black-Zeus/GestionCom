// src/pages/demos/exporters/AdvancedDemo.jsx
// Demo de casos avanzados coherente con el módulo refactorizado
// Utiliza ExportForm, ExportDropdown y configuraciones avanzadas

import React, { useState, useCallback, useMemo } from "react";
import {
  ExportButton,
  ExportDropdown,
  ExportForm,
  ExportFormPDF,
  ExportFormExcel,
  ExportFormCSV,
  createSampleData,
  downloadFile,
  presetConfigs,
} from "@/components/common/exporter";

const AdvancedDemo = () => {
  const [status, setStatus] = useState("");
  const [activeSection, setActiveSection] = useState("forms");
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState("pdf");

  // Datos complejos generados dinámicamente
  const complexData = useMemo(() => {
    const baseData = createSampleData(20);
    return {
      ...baseData,
      data: baseData.data.map((item, index) => ({
        ...item,
        // Agregar datos complejos
        metadata: {
          priority:
            index % 3 === 0 ? "alta" : index % 2 === 0 ? "media" : "baja",
          tags: [`tag${index % 5}`, `categoria${index % 3}`],
          nested: {
            level1: `nivel_${index}`,
            level2: {
              deep: `profundo_${index}`,
              value: Math.random() * 1000,
            },
          },
        },
        specialChars: `Carácter ${index}: áéíóú ñ ¿¡ "comillas" 'apostrofes'`,
        nullValue: index % 7 === 0 ? null : `valor_${index}`,
        booleanValue: index % 2 === 0,
        dateValue: new Date(2024, index % 12, (index % 28) + 1),
        numberWithDecimals: (index * 3.14159).toFixed(4),
      })),
    };
  }, []);

  // Configuraciones predefinidas corregidas
  const demoPresetConfigs = {
    reporteEjecutivo: {
      pdf: {
        pageSize: "A4",
        pageOrientation: "portrait",
        pageMargins: [60, 80, 60, 80],
        header: {
          enabled: true,
          text: "REPORTE EJECUTIVO",
          height: 40,
        },
        footer: {
          enabled: true,
          text: "Confidencial - Solo uso interno",
          pageNumbers: true,
          height: 30,
        },
        cover: {
          enabled: true,
          title: "Reporte Ejecutivo",
          subtitle: "Análisis de datos completo",
          backgroundColor: "#FFFFFF",
        },
        branding: {
          orgName: "Empresa Demo S.A.",
          primaryColor: "#1e40af",
          secondaryColor: "#3b82f6",
        },
        styles: {
          fontSize: 11,
          headerSize: 16,
          titleSize: 20,
          lineHeight: 1.4,
        },
        filename: "reporte_ejecutivo",
        timestamp: true,
        autoDownload: true,
      },
    },
    hojaDatos: {
      excel: {
        useExcelJS: true,
        autoFitColumns: true,
        freezeHeader: true,
        autoFilter: true,
        showBorders: true,
        includeMetadata: true,
        sheetName: "Datos Completos",
        zoom: 90,
        headerStyle: {
          bold: true,
          backgroundColor: "366092",
          textColor: "FFFFFF",
          fontSize: 12,
          height: 25,
        },
        cellStyle: {
          fontSize: 10,
          textColor: "000000",
          backgroundColor: "FFFFFF",
        },
        filename: "datos_completos",
        timestamp: true,
        autoDownload: true,
      },
    },
    csvEuropeo: {
      csv: {
        delimiter: ";",
        includeHeader: true,
        encoding: "utf-8-bom",
        quoteStrings: true,
        dateFormat: "DD/MM/YYYY",
        filename: "datos_europeo",
        timestamp: true,
        autoDownload: true,
      },
    },
  };

  // Handler para status
  const handleStatus = useCallback((message) => {
    setStatus(message);
    console.log("Demo Status:", message);
    setTimeout(() => setStatus(""), 4000);
  }, []);

  // Handler para exportación exitosa
  const handleExportSuccess = useCallback(
    (result, format) => {
      console.log(`Exportación ${format} exitosa:`, result);
      handleStatus(`✅ Archivo ${format.toUpperCase()} generado exitosamente`);
    },
    [handleStatus]
  );

  // Handler para errores de exportación
  const handleExportError = useCallback(
    (error, format) => {
      console.error(`Error en exportación ${format}:`, error);
      handleStatus(
        `❌ Error al generar ${format.toUpperCase()}: ${error.message}`
      );
    },
    [handleStatus]
  );

  // Secciones del demo
  const sections = [
    { id: "forms", title: "Formularios de Configuración", icon: "📝" },
    { id: "presets", title: "Configuraciones Predefinidas", icon: "⚙️" },
    { id: "complex", title: "Datos Complejos", icon: "🔧" },
    { id: "interactive", title: "Configurador Interactivo", icon: "🎛️" },
  ];

  // Renderizar formularios de configuración
  const renderForms = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          📝 Formularios Especializados
        </h3>
        <p className="text-blue-700 mb-4">
          Cada formato tiene su formulario especializado con opciones
          específicas
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario PDF */}
        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-semibold mb-4 flex items-center">
            <span className="text-2xl mr-2">📄</span>
            Configuración PDF
          </h4>
          <ExportFormPDF
            data={complexData}
            initialConfig={demoPresetConfigs.reporteEjecutivo.pdf}
            showPreview={true}
            showEstimation={true}
            onConfigChange={(config) => {
              console.log("PDF config changed:", config);
              handleStatus("🔧 Configuración PDF actualizada");
            }}
            onExport={async (config) => {
              try {
                handleStatus(
                  "📄 Exportando PDF con configuración personalizada..."
                );
                // Aquí se realizaría la exportación real
                const result = await new Promise((resolve) => {
                  setTimeout(() => {
                    resolve({
                      success: true,
                      format: "pdf",
                      filename: `${config.filename || "export"}.pdf`,
                      size: 245760, // 240KB simulado
                    });
                  }, 2000);
                });
                handleExportSuccess(result, "PDF");
              } catch (error) {
                handleExportError(error, "PDF");
              }
            }}
            className="space-y-4"
          />
        </div>

        {/* Formulario Excel */}
        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-semibold mb-4 flex items-center">
            <span className="text-2xl mr-2">📊</span>
            Configuración Excel
          </h4>
          <ExportFormExcel
            data={complexData}
            initialConfig={demoPresetConfigs.hojaDatos.excel}
            showPreview={true}
            showEstimation={true}
            onConfigChange={(config) => {
              console.log("Excel config changed:", config);
              handleStatus("🔧 Configuración Excel actualizada");
            }}
            onExport={async (config) => {
              try {
                handleStatus(
                  "📊 Exportando Excel con estilos personalizados..."
                );
                // Aquí se realizaría la exportación real
                const result = await new Promise((resolve) => {
                  setTimeout(() => {
                    resolve({
                      success: true,
                      format: "excel",
                      filename: `${config.filename || "export"}.xlsx`,
                      size: 89344, // 87KB simulado
                    });
                  }, 1500);
                });
                handleExportSuccess(result, "Excel");
              } catch (error) {
                handleExportError(error, "Excel");
              }
            }}
            className="space-y-4"
          />
        </div>

        {/* Formulario CSV */}
        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-semibold mb-4 flex items-center">
            <span className="text-2xl mr-2">📋</span>
            Configuración CSV
          </h4>
          <ExportFormCSV
            data={complexData}
            initialConfig={demoPresetConfigs.csvEuropeo.csv}
            showPreview={true}
            showEstimation={true}
            onConfigChange={(config) => {
              console.log("CSV config changed:", config);
              handleStatus("🔧 Configuración CSV actualizada");
            }}
            onExport={async (config) => {
              try {
                handleStatus("📋 Exportando CSV con formato europeo...");
                const result = await new Promise((resolve) => {
                  setTimeout(() => {
                    resolve({
                      success: true,
                      format: "csv",
                      filename: `${config.filename || "export"}.csv`,
                      size: 15360, // 15KB simulado
                    });
                  }, 800);
                });
                handleExportSuccess(result, "CSV");
              } catch (error) {
                handleExportError(error, "CSV");
              }
            }}
            className="space-y-4"
          />
        </div>

        {/* Formulario Unificado */}
        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-semibold mb-4 flex items-center">
            <span className="text-2xl mr-2">🎯</span>
            Formulario Unificado
          </h4>
          <button
            onClick={() => setShowFormModal(true)}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
          >
            <span className="mr-2">🚀</span>
            Abrir Configurador Completo
          </button>
          <p className="text-sm text-gray-600 mt-2">
            Formulario modal con todas las opciones disponibles
          </p>
        </div>
      </div>
    </div>
  );

  // Renderizar configuraciones predefinidas
  const renderPresets = () => (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-green-900 mb-2">
          ⚙️ Configuraciones Predefinidas
        </h3>
        <p className="text-green-700 mb-4">
          Usa configuraciones preestablecidas para casos de uso comunes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Reporte Ejecutivo */}
        <div className="bg-white border rounded-lg p-6">
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">📊</div>
            <h4 className="font-semibold">Reporte Ejecutivo</h4>
            <p className="text-sm text-gray-600">
              PDF profesional con branding
            </p>
          </div>
          <ExportButton
            data={complexData}
            format="pdf"
            config={demoPresetConfigs.reporteEjecutivo.pdf}
            onExportStart={() =>
              handleStatus("📄 Generando reporte ejecutivo...")
            }
            onExportComplete={(result) =>
              handleExportSuccess(result, "PDF Ejecutivo")
            }
            onExportError={(error) => handleExportError(error, "PDF Ejecutivo")}
            className="w-full"
            variant="solid"
            color="blue"
          >
            📄 Generar Reporte
          </ExportButton>
        </div>

        {/* Hoja de Datos */}
        <div className="bg-white border rounded-lg p-6">
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">📗</div>
            <h4 className="font-semibold">Hoja de Datos</h4>
            <p className="text-sm text-gray-600">
              Excel con formato profesional
            </p>
          </div>
          <ExportButton
            data={complexData}
            format="excel"
            config={demoPresetConfigs.hojaDatos.excel}
            onExportStart={() => handleStatus("📊 Generando hoja de datos...")}
            onExportComplete={(result) => handleExportSuccess(result, "Excel")}
            onExportError={(error) => handleExportError(error, "Excel")}
            className="w-full"
            variant="solid"
            color="green"
          >
            📊 Generar Excel
          </ExportButton>
        </div>

        {/* CSV Europeo */}
        <div className="bg-white border rounded-lg p-6">
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">📋</div>
            <h4 className="font-semibold">Formato Europeo</h4>
            <p className="text-sm text-gray-600">
              CSV con separador punto y coma
            </p>
          </div>
          <ExportButton
            data={complexData}
            format="csv"
            config={demoPresetConfigs.csvEuropeo.csv}
            onExportStart={() => handleStatus("📋 Generando CSV europeo...")}
            onExportComplete={(result) => handleExportSuccess(result, "CSV")}
            onExportError={(error) => handleExportError(error, "CSV")}
            className="w-full"
            variant="solid"
            color="gray"
          >
            📋 Generar CSV
          </ExportButton>
        </div>
      </div>
    </div>
  );

  // Renderizar datos complejos
  const renderComplexData = () => (
    <div className="space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-purple-900 mb-2">
          🔧 Manejo de Datos Complejos
        </h3>
        <p className="text-purple-700 mb-4">
          El sistema puede manejar datos con estructuras anidadas, valores
          nulos, caracteres especiales y tipos de datos mixtos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vista de datos */}
        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-semibold mb-4">🔍 Vista de Datos</h4>
          <div className="bg-gray-50 rounded p-4 max-h-64 overflow-auto">
            <pre className="text-xs">
              {JSON.stringify(complexData.data.slice(0, 2), null, 2)}
            </pre>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>📊 Total registros: {complexData.data.length}</p>
            <p>📋 Columnas: {complexData.columns.length}</p>
            <p>
              🔧 Incluye: datos anidados, valores nulos, caracteres especiales
            </p>
          </div>
        </div>

        {/* Opciones de exportación */}
        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-semibold mb-4">📤 Exportación Rápida</h4>
          <ExportDropdown
            data={complexData}
            onExportStart={(format) =>
              handleStatus(`🚀 Exportando ${format.toUpperCase()}...`)
            }
            onExportComplete={(result) =>
              handleExportSuccess(result, result.format)
            }
            onExportError={(error, format) => handleExportError(error, format)}
            className="w-full"
            variant="outline"
            position="bottom"
            enabledFormats={["json", "csv", "excel", "pdf"]}
            showIcons={true}
          >
            📤 Exportar Datos Complejos
          </ExportDropdown>

          <div className="mt-4 space-y-2">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Formatos disponibles:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-purple-100 px-2 py-1 rounded">
                📄 PDF - Tabular
              </div>
              <div className="bg-green-100 px-2 py-1 rounded">
                📊 Excel - Completo
              </div>
              <div className="bg-blue-100 px-2 py-1 rounded">
                📋 CSV - Plano
              </div>
              <div className="bg-yellow-100 px-2 py-1 rounded">
                {"{}"} JSON - Estructura
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Renderizar configurador interactivo
  const renderInteractive = () => (
    <div className="space-y-6">
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-indigo-900 mb-2">
          🎛️ Configurador Interactivo
        </h3>
        <p className="text-indigo-700 mb-4">
          Experimenta con diferentes configuraciones y ve el resultado en tiempo
          real
        </p>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Formato de exportación:
          </label>
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="pdf">📄 PDF - Documento portátil</option>
            <option value="excel">📊 Excel - Hoja de cálculo</option>
            <option value="csv">📋 CSV - Valores separados</option>
            <option value="json">📝 JSON - Estructura de datos</option>
          </select>
        </div>

        <ExportForm
          data={complexData}
          initialFormat={selectedFormat}
          initialConfig={
            demoPresetConfigs.reporteEjecutivo[selectedFormat] || {}
          }
          showFormatSelector={false}
          enabledFormats={[selectedFormat]}
          showPreview={true}
          showEstimation={true}
          onExport={async (result) => {
            handleExportSuccess(result, selectedFormat);
          }}
          onCancel={() => handleStatus("❌ Exportación cancelada")}
          onFormatChange={(format) => setSelectedFormat(format)}
          onConfigChange={(config) => {
            console.log("Interactive config changed:", config);
          }}
          className="mt-4"
          title="Configuración Personalizada"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                ⚡ Demo Casos Avanzados
              </h1>
              <p className="text-gray-600">
                Formularios especializados, configuraciones predefinidas y
                manejo de datos complejos
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Módulo Export v2.0</div>
              <div className="text-lg font-semibold text-indigo-600">
                Advanced Demo
              </div>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        {status && (
          <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800 font-medium">{status}</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeSection === section.id
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span className="mr-2">{section.icon}</span>
                {section.title}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {activeSection === "forms" && renderForms()}
          {activeSection === "presets" && renderPresets()}
          {activeSection === "complex" && renderComplexData()}
          {activeSection === "interactive" && renderInteractive()}
        </div>

        {/* Modal del formulario unificado */}
        {showFormModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">
                    🎯 Configurador Completo
                  </h3>
                  <button
                    onClick={() => setShowFormModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-6">
                <ExportForm
                  data={complexData}
                  initialFormat="pdf"
                  showFormatSelector={true}
                  enabledFormats={["json", "csv", "excel", "pdf", "txt"]}
                  showPreview={true}
                  showEstimation={true}
                  onExport={async (result) => {
                    handleExportSuccess(result, result.format);
                    setShowFormModal(false);
                  }}
                  onCancel={() => {
                    setShowFormModal(false);
                    handleStatus("❌ Configuración cancelada");
                  }}
                  title="Configuración Completa de Exportación"
                  className="space-y-6"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedDemo;
