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

  // Configuraciones predefinidas
  const presetConfigs = {
    reporteEjecutivo: {
      pdf: {
        pageSize: "A4",
        orientation: "portrait",
        margins: [60, 80, 60, 80],
        header: {
          text: "REPORTE EJECUTIVO",
          fontSize: 18,
          bold: true,
          alignment: "center",
        },
        footer: {
          text: "Confidencial - Solo uso interno",
          fontSize: 10,
          alignment: "right",
        },
        watermark: {
          text: "DRAFT",
          opacity: 0.1,
          fontSize: 72,
        },
        branding: {
          primaryColor: "#1e40af",
          logoPosition: "top-left",
          companyName: "Empresa Demo S.A.",
        },
      },
    },
    hojaDatos: {
      excel: {
        sheetName: "Datos Completos",
        includeHeader: true,
        autoWidth: true,
        freezeRow: 1,
        styles: {
          header: {
            font: { bold: true, color: { argb: "FFFFFF" } },
            fill: {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "366092" },
            },
          },
        },
      },
    },
    csvEuropeo: {
      csv: {
        delimiter: ";",
        includeHeader: true,
        encoding: "utf-8-bom",
        quoteStrings: true,
        dateFormat: "DD/MM/YYYY",
      },
    },
  };

  // Handler para status
  const handleStatus = useCallback((message) => {
    setStatus(message);
    setTimeout(() => setStatus(""), 4000);
  }, []);

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
            initialConfig={presetConfigs.reporteEjecutivo.pdf}
            showPreview={true}
            showEstimation={true}
            onConfigChange={(config) => {
              console.log("PDF config changed:", config);
              handleStatus("🔧 Configuración PDF actualizada");
            }}
            onExport={(config) => {
              handleStatus(
                "📄 Exportando PDF con configuración personalizada..."
              );
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
            initialConfig={presetConfigs.hojaDatos.excel}
            showPreview={true}
            showEstimation={true}
            onConfigChange={(config) => {
              console.log("Excel config changed:", config);
              handleStatus("🔧 Configuración Excel actualizada");
            }}
            onExport={(config) => {
              handleStatus("📊 Exportando Excel con estilos personalizados...");
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
            initialConfig={presetConfigs.csvEuropeo.csv}
            showPreview={true}
            showEstimation={true}
            onConfigChange={(config) => {
              console.log("CSV config changed:", config);
              handleStatus("🔧 Configuración CSV actualizada");
            }}
            onExport={(config) => {
              handleStatus("📋 Exportando CSV con formato europeo...");
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
              PDF corporativo con branding
            </p>
          </div>

          <div className="space-y-2 text-xs text-gray-600 mb-4">
            <div>• Marca de agua "DRAFT"</div>
            <div>• Encabezado personalizado</div>
            <div>• Colores corporativos</div>
            <div>• Márgenes ejecutivos</div>
          </div>

          <ExportButton
            data={complexData.data.slice(0, 10)}
            formats={["pdf"]}
            config={presetConfigs.reporteEjecutivo}
            filename="reporte_ejecutivo"
            onStart={() => handleStatus("📊 Generando reporte ejecutivo...")}
            onSuccess={() => handleStatus("✅ Reporte ejecutivo listo")}
            onError={(error) => handleStatus(`❌ Error: ${error.message}`)}
            className="w-full"
          >
            Generar Reporte
          </ExportButton>
        </div>

        {/* Hoja de Datos */}
        <div className="bg-white border rounded-lg p-6">
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">📈</div>
            <h4 className="font-semibold">Hoja de Datos</h4>
            <p className="text-sm text-gray-600">Excel con estilos y formato</p>
          </div>

          <div className="space-y-2 text-xs text-gray-600 mb-4">
            <div>• Encabezados con color</div>
            <div>• Ancho automático</div>
            <div>• Primera fila congelada</div>
            <div>• Formateo de datos</div>
          </div>

          <ExportButton
            data={complexData.data}
            formats={["excel"]}
            config={presetConfigs.hojaDatos}
            filename="hoja_datos_completa"
            onStart={() => handleStatus("📈 Creando hoja de datos...")}
            onSuccess={() => handleStatus("✅ Hoja de datos lista")}
            onError={(error) => handleStatus(`❌ Error: ${error.message}`)}
            className="w-full"
          >
            Crear Hoja
          </ExportButton>
        </div>

        {/* CSV Europeo */}
        <div className="bg-white border rounded-lg p-6">
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">🇪🇺</div>
            <h4 className="font-semibold">CSV Europeo</h4>
            <p className="text-sm text-gray-600">Formato europeo con BOM</p>
          </div>

          <div className="space-y-2 text-xs text-gray-600 mb-4">
            <div>• Separador punto y coma (;)</div>
            <div>• Codificación UTF-8-BOM</div>
            <div>• Fechas DD/MM/YYYY</div>
            <div>• Comillas automáticas</div>
          </div>

          <ExportButton
            data={complexData.data}
            formats={["csv"]}
            config={presetConfigs.csvEuropeo}
            filename="datos_europeo"
            onStart={() => handleStatus("🇪🇺 Exportando formato europeo...")}
            onSuccess={() => handleStatus("✅ CSV europeo listo")}
            onError={(error) => handleStatus(`❌ Error: ${error.message}`)}
            className="w-full"
          >
            Exportar CSV
          </ExportButton>
        </div>
      </div>
    </div>
  );

  // Renderizar datos complejos
  const renderComplex = () => (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
          🔧 Manejo de Datos Complejos
        </h3>
        <p className="text-yellow-700 mb-4">
          Testing con objetos anidados, valores null, caracteres especiales y
          tipos mixtos
        </p>
      </div>

      {/* Información de los datos */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-semibold mb-4">📊 Análisis de Datos</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center p-3 bg-blue-50 rounded">
            <div className="font-bold text-lg text-blue-600">
              {complexData.data.length}
            </div>
            <div className="text-gray-600">Registros</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded">
            <div className="font-bold text-lg text-green-600">
              {Object.keys(complexData.data[0] || {}).length}
            </div>
            <div className="text-gray-600">Campos base</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded">
            <div className="font-bold text-lg text-purple-600">5</div>
            <div className="text-gray-600">Campos anidados</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded">
            <div className="font-bold text-lg text-red-600">8</div>
            <div className="text-gray-600">Tipos de datos</div>
          </div>
        </div>
      </div>

      {/* Vista previa de datos complejos */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-semibold mb-4">🔍 Vista Previa de Datos</h4>
        <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
          <pre className="text-xs text-gray-700">
            {JSON.stringify(complexData.data[0], null, 2)}
          </pre>
        </div>
      </div>

      {/* Opciones de exportación para datos complejos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-semibold mb-4">🔨 Procesamiento Automático</h4>
          <p className="text-gray-600 text-sm mb-4">
            El sistema procesa automáticamente objetos anidados y tipos
            especiales
          </p>

          <ExportDropdown
            data={complexData.data}
            enabledFormats={["json", "csv"]}
            config={{
              flattenObjects: true,
              handleNulls: "empty",
              dateFormat: "iso",
            }}
            filename="datos_procesados"
            placeholder="Exportar con procesamiento"
            onExport={(format) =>
              handleStatus(
                `🔨 Procesando datos para ${format.toUpperCase()}...`
              )
            }
            onExportComplete={() =>
              handleStatus("✅ Datos complejos procesados")
            }
            onExportError={(error) =>
              handleStatus(`❌ Error: ${error.message}`)
            }
            className="w-full"
          />
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-semibold mb-4">📋 Exportación Selectiva</h4>
          <p className="text-gray-600 text-sm mb-4">
            Exporta solo los campos que necesitas, sin procesamiento adicional
          </p>

          <ExportButton
            data={complexData.data}
            columns={[
              { key: "id", header: "ID" },
              { key: "name", header: "Nombre" },
              { key: "email", header: "Email" },
              { key: "active", header: "Activo" },
              { key: "metadata.priority", header: "Prioridad" },
            ]}
            formats={["excel"]}
            filename="datos_selectivos"
            onStart={() =>
              handleStatus("📋 Exportando campos seleccionados...")
            }
            onSuccess={() => handleStatus("✅ Exportación selectiva completa")}
            onError={(error) => handleStatus(`❌ Error: ${error.message}`)}
            className="w-full"
          >
            Exportar Selección
          </ExportButton>
        </div>
      </div>
    </div>
  );

  // Renderizar configurador interactivo
  const renderInteractive = () => (
    <div className="space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-purple-900 mb-2">
          🎛️ Configurador Interactivo
        </h3>
        <p className="text-purple-700 mb-4">
          Herramientas interactivas para personalizar exportaciones en tiempo
          real
        </p>
      </div>

      {/* Selector de formato interactivo */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-semibold mb-4">🎯 Selector de Formato</h4>
        <div className="flex flex-wrap gap-2 mb-4">
          {["json", "csv", "excel", "pdf", "txt"].map((format) => (
            <button
              key={format}
              onClick={() => setSelectedFormat(format)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedFormat === format
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {format.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">
            Formato seleccionado:{" "}
            <strong>{selectedFormat.toUpperCase()}</strong>
          </p>
          <ExportButton
            data={complexData.data.slice(0, 5)}
            formats={[selectedFormat]}
            filename={`interactivo_${selectedFormat}`}
            onStart={() =>
              handleStatus(
                `🎛️ Exportando ${selectedFormat.toUpperCase()} interactivo...`
              )
            }
            onSuccess={() =>
              handleStatus(
                `✅ ${selectedFormat.toUpperCase()} interactivo listo`
              )
            }
            onError={(error) => handleStatus(`❌ Error: ${error.message}`)}
          >
            Exportar {selectedFormat.toUpperCase()}
          </ExportButton>
        </div>
      </div>

      {/* Generador de archivos múltiples */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-semibold mb-4">⚡ Generación Múltiple</h4>
        <p className="text-gray-600 text-sm mb-4">
          Genera múltiples archivos con diferentes configuraciones
          simultáneamente
        </p>

        <ExportDropdown
          data={complexData.data}
          enabledFormats={["csv", "json", "excel"]}
          groupByType={true}
          showIcons={true}
          showDescriptions={true}
          placeholder="Seleccionar formatos múltiples"
          filename="paquete_completo"
          onExport={(format) =>
            handleStatus(`⚡ Generando ${format.toUpperCase()} del paquete...`)
          }
          onExportComplete={() => handleStatus("✅ Paquete completo generado")}
          onExportError={(error) =>
            handleStatus(`❌ Error en paquete: ${error.message}`)
          }
          className="w-full max-w-md"
        />
      </div>
    </div>
  );

  // Modal del formulario unificado
  const renderFormModal = () => {
    if (!showFormModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">
                🎯 Configurador Completo
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-6">
            <ExportForm
              data={complexData}
              enabledFormats={["json", "csv", "excel", "pdf"]}
              showFormatSelector={true}
              showPreview={true}
              showEstimation={true}
              title="Exportación Personalizada"
              onExport={(result) => {
                handleStatus(`✅ Exportación desde modal: ${result.format}`);
                setShowFormModal(false);
              }}
              onCancel={() => setShowFormModal(false)}
              className="space-y-6"
            />
          </div>
        </div>
      </div>
    );
  };

  // Renderizar contenido según sección activa
  const renderContent = () => {
    switch (activeSection) {
      case "presets":
        return renderPresets();
      case "complex":
        return renderComplex();
      case "interactive":
        return renderInteractive();
      default:
        return renderForms();
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg border p-6">
        <h1 className="text-3xl font-bold mb-2">⚡ Demo Casos Avanzados</h1>
        <p className="text-gray-600 mb-4">
          Configuraciones avanzadas, formularios especializados y casos
          complejos del módulo refactorizado
        </p>

        {/* Status global */}
        {status && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="text-blue-800 text-sm font-medium">{status}</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-lg border p-1">
        <div className="flex flex-wrap gap-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="mr-2">{section.icon}</span>
              {section.title}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {renderContent()}

      {/* Form Modal */}
      {renderFormModal()}
    </div>
  );
};

export default AdvancedDemo;
