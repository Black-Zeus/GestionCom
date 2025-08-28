// src/pages/demos/exporters/Index.jsx
// Página principal del módulo Demo/Export completamente nueva
// Coherente con el módulo de exportación refactorizado

import React, { useState } from "react";
import {
  ExportButton,
  ExportDropdown,
  createSampleData,
} from "@/components/common/exporter";

const DemoIndex = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [status, setStatus] = useState("");

  // Tabs de navegación
  const tabs = [
    { id: "overview", title: "Vista General", icon: "🎯" },
    { id: "basic", title: "Exportación Básica", icon: "📊" },
    { id: "advanced", title: "Casos Avanzados", icon: "⚡" },
    { id: "performance", title: "Rendimiento", icon: "🚀" },
  ];

  // Datos de ejemplo usando la función del módulo refactorizado
  const sampleData = createSampleData(5);
  const largeData = createSampleData(1000);

  // Handlers para feedback
  const handleStatus = (message) => {
    setStatus(message);
    setTimeout(() => setStatus(""), 3000);
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Sistema de información */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          🎯 Módulo de Exportación Refactorizado
        </h3>
        <p className="text-blue-700 mb-4">
          Sistema modular de exportación con soporte para múltiples formatos,
          configuración avanzada y componentes reutilizables.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded p-3">
            <div className="font-medium text-gray-900">Formatos Soportados</div>
            <div className="text-gray-600 mt-1">CSV, JSON, Excel, PDF, TXT</div>
          </div>
          <div className="bg-white rounded p-3">
            <div className="font-medium text-gray-900">Componentes</div>
            <div className="text-gray-600 mt-1">
              ExportButton, ExportDropdown, ExportForm
            </div>
          </div>
          <div className="bg-white rounded p-3">
            <div className="font-medium text-gray-900">Características</div>
            <div className="text-gray-600 mt-1">
              Hooks, Validación, Progreso
            </div>
          </div>
        </div>
      </div>

      {/* Prueba rápida */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">🚀 Prueba Rápida</h3>
        <p className="text-gray-600 mb-4">
          Exporta datos de ejemplo con un click. Utiliza la función{" "}
          <code className="bg-gray-100 px-1 rounded">createSampleData()</code>{" "}
          del módulo.
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
          <ExportButton
            data={sampleData.data}
            columns={sampleData.columns}
            formats={["csv"]}
            filename="datos_ejemplo"
            onStart={() => handleStatus("🔄 Exportando CSV...")}
            onSuccess={(result) =>
              handleStatus(`✅ CSV exportado: ${result.filename}`)
            }
            onError={(error) => handleStatus(`❌ Error: ${error.message}`)}
          />

          <ExportButton
            data={sampleData.data}
            columns={sampleData.columns}
            formats={["json"]}
            filename="datos_ejemplo"
            onStart={() => handleStatus("🔄 Exportando JSON...")}
            onSuccess={(result) =>
              handleStatus(`✅ JSON exportado: ${result.filename}`)
            }
            onError={(error) => handleStatus(`❌ Error: ${error.message}`)}
          />

          <ExportDropdown
            data={sampleData.data}
            columns={sampleData.columns}
            enabledFormats={["csv", "json", "excel"]}
            filename="datos_ejemplo"
            onExport={(format) =>
              handleStatus(`🔄 Exportando ${format.toUpperCase()}...`)
            }
            onExportComplete={(result) =>
              handleStatus(`✅ ${result.format?.toUpperCase()} completado`)
            }
            onExportError={(error) =>
              handleStatus(`❌ Error: ${error.message}`)
            }
          />
        </div>

        <div className="bg-gray-50 rounded p-3 text-sm">
          <strong>Datos:</strong> {sampleData.data.length} registros •
          <strong> Columnas:</strong> {sampleData.columns.length} campos •
          <strong> Metadatos:</strong> {sampleData.metadata.title}
        </div>
      </div>
    </div>
  );

  const renderBasic = () => (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          📊 ExportButton Individual
        </h3>
        <p className="text-gray-600 mb-4">
          Botones individuales para cada formato
        </p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {["csv", "json", "excel", "pdf", "txt"].map((format) => (
            <ExportButton
              key={format}
              data={sampleData.data}
              columns={sampleData.columns}
              formats={[format]}
              filename={`export_${format}`}
              onStart={() =>
                handleStatus(`🔄 Exportando ${format.toUpperCase()}...`)
              }
              onSuccess={(result) =>
                handleStatus(`✅ ${format.toUpperCase()} listo`)
              }
              onError={(error) =>
                handleStatus(`❌ Error en ${format}: ${error.message}`)
              }
            >
              {format.toUpperCase()}
            </ExportButton>
          ))}
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">🎛️ ExportDropdown</h3>
        <p className="text-gray-600 mb-4">
          Selector múltiple con configuración
        </p>

        <div className="flex flex-wrap gap-4">
          <ExportDropdown
            data={sampleData.data}
            columns={sampleData.columns}
            enabledFormats={["csv", "json", "excel"]}
            showIcons={true}
            showDescriptions={true}
            placeholder="Seleccionar formato"
            onExport={(format) =>
              handleStatus(`🔄 Dropdown: ${format.toUpperCase()}`)
            }
            onExportComplete={(result) =>
              handleStatus(`✅ Dropdown completado`)
            }
            onExportError={(error) =>
              handleStatus(`❌ Dropdown error: ${error.message}`)
            }
          />

          <ExportDropdown
            data={sampleData.data}
            enabledFormats={["pdf", "excel"]}
            groupByType={true}
            variant="secondary"
            placeholder="Reportes"
            onExport={(format) =>
              handleStatus(`🔄 Reporte: ${format.toUpperCase()}`)
            }
            onExportComplete={(result) => handleStatus(`✅ Reporte listo`)}
            onExportError={(error) =>
              handleStatus(`❌ Reporte error: ${error.message}`)
            }
          />
        </div>
      </div>
    </div>
  );

  const renderAdvanced = () => (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          ⚡ Configuración Avanzada
        </h3>
        <p className="text-gray-600 mb-4">
          Exportación con metadatos, configuración personalizada y múltiples
          hojas
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExportButton
            data={sampleData.data}
            columns={sampleData.columns}
            formats={["excel"]}
            filename="reporte_completo"
            config={{
              metadata: {
                title: "Reporte Avanzado",
                author: "Sistema Demo",
                subject: "Datos de prueba",
                keywords: ["demo", "exportación", "refactorizado"],
              },
              excel: {
                sheetName: "Datos Principales",
                includeHeader: true,
                autoWidth: true,
                freezeRow: 1,
              },
            }}
            onStart={() => handleStatus("🔄 Excel avanzado...")}
            onSuccess={() => handleStatus("✅ Excel con metadatos listo")}
            onError={(error) =>
              handleStatus(`❌ Error avanzado: ${error.message}`)
            }
          >
            Excel con Metadatos
          </ExportButton>

          <ExportButton
            datasets={[
              { name: "Pequeño", data: sampleData.data.slice(0, 3) },
              { name: "Completo", data: sampleData.data },
              { name: "Grande", data: largeData.data.slice(0, 100) },
            ]}
            formats={["excel"]}
            filename="multi_hoja"
            onStart={() => handleStatus("🔄 Múltiples hojas...")}
            onSuccess={() => handleStatus("✅ Excel multi-hoja listo")}
            onError={(error) =>
              handleStatus(`❌ Error multi-hoja: ${error.message}`)
            }
          >
            Múltiples Hojas
          </ExportButton>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-800 mb-2">
          💡 Configuraciones Disponibles
        </h4>
        <div className="text-sm text-yellow-700 space-y-1">
          <div>
            • <strong>metadata:</strong> título, autor, fecha, descripción
          </div>
          <div>
            • <strong>csv:</strong> separador, codificación, incluir BOM
          </div>
          <div>
            • <strong>excel:</strong> nombre de hoja, ancho automático, formato
          </div>
          <div>
            • <strong>pdf:</strong> orientación, márgenes, marca de agua
          </div>
          <div>
            • <strong>json:</strong> espaciado, formato, compresión
          </div>
        </div>
      </div>
    </div>
  );

  const renderPerformance = () => (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          🚀 Pruebas de Rendimiento
        </h3>
        <p className="text-gray-600 mb-4">
          Testing con datasets de diferentes tamaños
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-green-600">
              {sampleData.data.length}
            </div>
            <div className="text-sm text-gray-600 mb-3">Registros pequeños</div>
            <ExportButton
              data={sampleData.data}
              formats={["csv"]}
              filename="pequeno_dataset"
              size="small"
              onStart={() => handleStatus("🔄 Dataset pequeño...")}
              onSuccess={() => handleStatus("✅ Pequeño completado")}
              onError={(error) =>
                handleStatus(`❌ Error pequeño: ${error.message}`)
              }
            >
              Exportar
            </ExportButton>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-yellow-600">1,000</div>
            <div className="text-sm text-gray-600 mb-3">Registros medianos</div>
            <ExportButton
              data={largeData.data}
              formats={["csv"]}
              filename="mediano_dataset"
              showProgress={true}
              onStart={() => handleStatus("🔄 Dataset mediano...")}
              onSuccess={() => handleStatus("✅ Mediano completado")}
              onError={(error) =>
                handleStatus(`❌ Error mediano: ${error.message}`)
              }
            >
              Exportar
            </ExportButton>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-red-600">5,000</div>
            <div className="text-sm text-gray-600 mb-3">Registros grandes</div>
            <ExportButton
              data={createSampleData(5000).data}
              formats={["csv"]}
              filename="grande_dataset"
              showProgress={true}
              confirmBeforeExport={true}
              onStart={() => handleStatus("🔄 Dataset grande...")}
              onSuccess={() => handleStatus("✅ Grande completado")}
              onError={(error) =>
                handleStatus(`❌ Error grande: ${error.message}`)
              }
            >
              Exportar
            </ExportButton>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">
          ⚡ Optimizaciones del Sistema
        </h4>
        <div className="text-sm text-blue-700 space-y-1">
          <div>• Procesamiento por lotes para datasets grandes</div>
          <div>• Indicadores de progreso integrados</div>
          <div>• Validación automática de datos</div>
          <div>• Manejo inteligente de memoria</div>
          <div>• Confirmación para operaciones pesadas</div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "basic":
        return renderBasic();
      case "advanced":
        return renderAdvanced();
      case "performance":
        return renderPerformance();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Demo Módulo Export
                </h1>
                <p className="mt-1 text-gray-600">
                  Sistema de exportación refactorizado - Versión 2.0
                </p>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-500">Sistema Modular</div>
                <div className="text-xs text-green-600">
                  ✅ Completamente funcional
                </div>
              </div>
            </div>

            {/* Status global */}
            {status && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-blue-800 text-sm font-medium">
                  {status}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                  ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.title}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              Demo del módulo de exportación refactorizado • Creado desde cero
            </div>
            <div>Coherente con la nueva API del sistema</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DemoIndex;
